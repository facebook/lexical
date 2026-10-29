/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isTextNode,
  $setCompositionKey,
  type ElementNode,
  type NodeKey,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$block, expectConverged, setup} from '../utils/harness';

// A client composes (IME) at the end of text it typed itself, while a
// collaborator's text typed at the same place at the same time comes in,
// ordered before the composer's own text, in a change that also deletes
// other text of the line (so the reader shows it at once rather than
// holding it back until the composition ends). The browser goes on composing at its offset
// in the composed DOM text node: that offset must stay right after the
// composer's own text, not inside the collaborator's word.

describe('@lexical/y a composition at text a collaborator typed next to at the same time', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`the composed text stays after the composer's own text (ids ${ids})`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('xx ').toggleFormat('bold'),
              $createTextNode('t12dz t18ez'),
            ),
          ),
        {ids},
      );
      t.offline();
      // A types " t" at the end of the line, B types " t20ez" there and
      // deletes the line's bold word in the same update.
      t.a.update(() => void $block([0]).selectEnd().insertText(' t'));
      t.b.update(() => {
        $block([0]).selectEnd().insertText(' t20ez');
        ($block([0]) as ElementNode).getFirstChildOrThrow().remove();
      });
      // A composes at the end of its text
      let key: NodeKey = '';
      let offset = 0;
      t.a.update(() => {
        const node = ($block([0]) as ElementNode).getLastChild();
        if (!$isTextNode(node)) {
          throw new Error('no text');
        }
        offset = node.getTextContentSize();
        node.select(offset, offset);
        $setCompositionKey(node.getKey());
        key = node.getKey();
      });
      await t.sync();
      // The input method writes at its offset in the composed node
      t.a.update(() => {
        const node = $getNodeByKey(key);
        if (!$isTextNode(node)) {
          throw new Error('no composed node');
        }
        node.spliceText(offset, 0, '3', true);
      });
      t.a.update(() => $setCompositionKey(null));
      await t.sync();
      const line = t.a.read(() => $block([0]).getTextContent());
      // Both words whole, in either order the room gave them
      expect(['t12dz t18ez t20ez t3', 't12dz t18ez t3 t20ez']).toContain(line);
      await expectConverged(t.peers);
    });
  }
});
