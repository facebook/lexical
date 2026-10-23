/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Repairs: writes every client makes when it sees a shape that concurrent
// edits left (a ragged table, two equal lists side by side in a line). They
// are deterministic (several clients writing the same repair is one write),
// need no particular client online, and stay out of the undo history.

import {$createListItemNode, $createListNode} from '@lexical/list';
import {
  $createTableNodeWithDimensions,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableNode,
} from '@lexical/table';
import * as Y from '@y/y';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type ElementNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {YBinding} from '../..';
import {
  $block,
  describeNode,
  expectConverged,
  NODES,
  type Peer,
  setup,
} from '../utils/harness';

const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));

function tableShape(p: Peer): number[] {
  return p.read(() => {
    const t = $getRoot().getChildren().find($isTableNode) as ElementNode;
    return t.getChildren().map(r => (r as ElementNode).getChildrenSize());
  });
}

function $cell(r: number, c: number): ElementNode {
  const t = $getRoot().getChildren().find($isTableNode) as ElementNode;
  return (t.getChildAtIndex(r) as ElementNode).getChildAtIndex(
    c,
  ) as ElementNode;
}

describe('@lexical/y table repair', () => {
  for (const ids of [
    [1, 2, 3],
    [2, 1, 3],
  ]) {
    for (const who of ['row', 'column'] as const) {
      test(`row ‖ column insert, then the ${who} inserter undoes: the table stays rectangular (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append($createTableNodeWithDimensions(3, 3, false));
            $getRoot().append($createParagraphNode());
          },
          {ids},
        );
        const [a, b] = t.peers;
        t.offline();
        a.update(() => {
          ($cell(0, 0).getFirstChild() as ElementNode).selectEnd();
          $insertTableRowAtSelection(true);
        });
        b.update(() => {
          ($cell(0, 1).getFirstChild() as ElementNode).selectEnd();
          $insertTableColumnAtSelection(true);
        });
        await t.sync();
        await expectConverged(t.peers);
        expect(tableShape(a)).toEqual([4, 4, 4, 4]);
        (who === 'row' ? a : b).undo();
        await t.sync();
        await expectConverged(t.peers);
        expect(tableShape(a)).toEqual(who === 'row' ? [4, 4, 4] : [3, 3, 3, 3]);
      });
    }
  }
});

function client(id: number, state?: Uint8Array) {
  const doc = new Y.Doc({gc: false});
  doc.clientID = id;
  if (state !== undefined) {
    Y.applyUpdate(doc, state, 'load');
  }
  const editor = createEditor({
    namespace: 'repairs',
    nodes: NODES,
    onError: e => {
      throw e;
    },
    onWarn: () => {},
  });
  const binding = new YBinding(editor, doc, {selfCheck: true});
  binding.start();
  return {binding, doc, editor};
}

const describeClient = (c: ReturnType<typeof client>) =>
  c.editor
    .getEditorState()
    .read(() => $getRoot().getChildren().map(describeNode).join(' / '));

describe('@lexical/y list merge repair', () => {
  for (const reloaded of [false, true]) {
    test(`two lists added to one item merge when the second list's author ${reloaded ? 'has reloaded' : 'is online'}`, () => {
      const p1 = client(1);
      p1.editor.update(
        () =>
          $getRoot().append(
            $createListNode('bullet').append($li('item'), $li('next')),
          ),
        {discrete: true},
      );
      p1.binding.initialize();
      let p2 = client(2, Y.encodeStateAsUpdate(p1.doc));
      p2.binding.initialize();
      const sv = Y.encodeStateVector(p1.doc);
      const $item = () =>
        (
          $getRoot().getFirstChild() as ElementNode
        ).getFirstChild() as ElementNode;
      p1.editor.update(
        () => $item().append($createListNode('check').append($li('x'))),
        {discrete: true},
      );
      p2.editor.update(
        () => $item().append($createListNode('check').append($li('y'))),
        {discrete: true},
      );
      const u1 = Y.encodeStateAsUpdate(p1.doc, sv);
      const u2 = Y.encodeStateAsUpdate(p2.doc, sv);
      if (reloaded) {
        p2.binding.dispose();
        p2 = client(22, Y.encodeStateAsUpdate(p2.doc));
        p2.binding.initialize();
      }
      for (const [from, to] of [
        [p1, p2],
        [p2, p1],
      ]) {
        from.doc.on('update', (u: Uint8Array, origin: unknown) => {
          if (origin !== 'net') {
            Y.applyUpdate(to.doc, u, 'net');
          }
        });
      }
      Y.applyUpdate(p2.doc, u1, 'net');
      Y.applyUpdate(p1.doc, u2, 'net');
      const d = describeClient(p1);
      expect(describeClient(p2)).toBe(d);
      expect(d.match(/list\[check\]/g)).toHaveLength(1);
      expect(d).toContain('"x"');
      expect(d).toContain('"y"');
      // A fresh reader agrees.
      const fresh = client(99, Y.encodeStateAsUpdate(p1.doc));
      fresh.binding.initialize();
      expect(describeClient(fresh)).toBe(d);
    });
  }

  test('after a merge, undoing either added list keeps the merged list whole (documented)', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append($li('item'), $li('next')),
        ),
      {ids: [1, 2, 3]},
    );
    const [p1, p2] = t.peers;
    t.offline();
    p1.update(() =>
      $block([0, 0]).append($createListNode('check').append($li('x'))),
    );
    p2.update(() =>
      $block([0, 0]).append($createListNode('check').append($li('y'))),
    );
    await t.sync();
    await expectConverged(t.peers);
    p1.undo();
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).toContain('"x"');
    expect(p1.describe()).toContain('"y"');
  });
});
