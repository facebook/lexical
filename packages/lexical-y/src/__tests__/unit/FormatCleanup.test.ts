/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Yjs cleans up the formats of every type a remote transaction changed that
// has formats, in a transaction of the receiver's own (a write). The binding
// opts its containers out, including one this client no longer shows (a
// table it deleted while a peer formatted text in it): Yjs never schedules
// that cleanup for them, and applying the change writes nothing.

import type * as Y from '@y/y';

import {$createTableNodeWithDimensions} from '@lexical/table';
import {
  $createTextNode,
  $getRoot,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {flush, setup} from '../utils/harness';

test('a remote format change in a table this client deleted: no format cleanup, nothing written', async () => {
  const {a, b, sync, offline} = await setup(() => {
    const table = $createTableNodeWithDimensions(1, 1, false);
    const cell = (
      table.getFirstChild() as ElementNode
    ).getFirstChild() as ElementNode;
    (cell.getFirstChild() as ElementNode).append(
      $createTextNode('alpha beta gamma'),
    );
    $getRoot().append(table);
  });
  offline();
  b.update(() => {
    ($getRoot().getFirstChild() as ElementNode).remove();
  });
  a.update(() => {
    ($getRoot().getAllTextNodes()[0] as TextNode)
      .select(6, 10)
      .formatText('bold');
  });
  // Whether Yjs would clean up a type B's binding does not map any more.
  const flagged: string[] = [];
  b.doc.on('afterTransaction', (tr: Y.Transaction) => {
    tr.changed.forEach((_subs, type) => {
      if ((type as Y.Node)._hasFormatting) {
        flagged.push(String((type as Y.Node).name));
      }
    });
  });
  const before = (b.doc.store.clients.get(b.doc.clientID) ?? []).length;
  await sync();
  await flush();
  expect(flagged).toEqual([]);
  expect((b.doc.store.clients.get(b.doc.clientID) ?? []).length).toBe(before);
  expect(a.describe()).toBe(b.describe());
});
