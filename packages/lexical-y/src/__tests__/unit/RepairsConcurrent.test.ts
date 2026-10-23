/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Repairs written by several clients at once (each before seeing another's):
// they must be the same items whatever each client's editor shows (a client
// composing in the moved list does not show a peer's keystroke yet) and
// however each client's items happen to be split (undo and redo leave the
// author's items split).

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
  $setCompositionKey,
  createEditor,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {YBinding} from '../..';
import {describeNode, NODES} from '../utils/harness';

type P = {
  doc: Y.Doc;
  editor: ReturnType<typeof createEditor>;
  binding: YBinding;
  warnings: string[];
};

function peer(id: number, state?: Uint8Array): P {
  const doc = new Y.Doc({gc: false});
  doc.clientID = id;
  if (state !== undefined) {
    Y.applyUpdate(doc, state, 'load');
  }
  const warnings: string[] = [];
  const editor = createEditor({
    namespace: 'repairs',
    nodes: NODES,
    onError: e => {
      throw e;
    },
    onWarn: e => warnings.push(String(e)),
  });
  const binding = new YBinding(editor, doc, {
    selfCheck: true,
  });
  binding.start();
  return {binding, doc, editor, warnings};
}

function fresh(p: P): P {
  const f = peer(99, Y.encodeStateAsUpdate(p.doc));
  f.binding.initialize();
  return f;
}

const describeP = (p: P) =>
  p.editor
    .getEditorState()
    .read(() => $getRoot().getChildren().map(describeNode).join(' / '));

const update = (p: P, fn: () => void) => {
  p.binding.undoManager?.stopCapturing();
  p.editor.update(fn, {discrete: true});
};

const send = (a: P, b: P) =>
  Y.applyUpdate(
    b.doc,
    Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc)),
    'net',
  );

function exchange(peers: P[]): void {
  for (let round = 0; round < 3; round++) {
    for (const a of peers) {
      for (const b of peers) {
        if (a !== b) {
          send(a, b);
        }
      }
    }
  }
}

const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));

function $at(path: number[]): ElementNode {
  let n: ElementNode = $getRoot();
  for (const i of path) {
    n = n.getChildAtIndex(i) as ElementNode;
  }
  return n;
}

function $cell(r: number, c: number): ElementNode {
  const t = $getRoot().getChildren().find($isTableNode) as ElementNode;
  return (t.getChildAtIndex(r) as ElementNode).getChildAtIndex(
    c,
  ) as ElementNode;
}

const shape = (p: P) =>
  p.editor.getEditorState().read(() => {
    const t = $getRoot().getChildren().find($isTableNode) as ElementNode;
    return t.getChildren().map(r => (r as ElementNode).getChildrenSize());
  });

function undoRedo(p: P, $line: () => ElementNode): void {
  update(p, () => $line().selectEnd().insertText('ab'));
  update(p, () => $line().selectEnd().insertText('cd'));
  p.binding.undoManager!.stopCapturing();
  p.binding.undo();
  p.binding.undoManager!.stopCapturing();
  p.binding.undo();
  p.binding.undoManager!.stopCapturing();
  p.binding.redo();
}

function listPeers(n: number): P[] {
  const p1 = peer(1);
  update(p1, () =>
    $getRoot().append(
      $createListNode('bullet').append($li('item'), $li('next')),
    ),
  );
  p1.binding.initialize();
  const base = Y.encodeStateAsUpdate(p1.doc);
  const peers = [p1];
  for (let id = 2; id <= n; id++) {
    const p = peer(id, base);
    p.binding.initialize();
    peers.push(p);
  }
  return peers;
}

function expectSame(peers: P[], extra: P[] = []): string {
  const d = describeP(peers[0]);
  for (const p of [...peers, ...extra]) {
    expect(describeP(p)).toBe(d);
    expect(p.warnings).toEqual([]);
  }
  return d;
}

describe('@lexical/y repairs by several clients at once', () => {
  for (const moving of [false, true]) {
    test(`a client composing in ${moving ? 'the list that moves' : 'the list that stays'} while a peer types there and everyone merges`, () => {
      const [p1, p2, p3, p4] = listPeers(4);
      // P2 and P4 add a list to the item at once.
      update(p2, () =>
        $at([0, 0]).append($createListNode('check').append($li('yy'))),
      );
      update(p4, () =>
        $at([0, 0]).append($createListNode('check').append($li('xx'))),
      );
      const first = moving ? p4 : p2;
      const second = moving ? p2 : p4;
      send(first, p1);
      send(first, p3);
      // P1 composes in that list's item; P3 types there (hidden on P1).
      update(p1, () => {
        const t = $at([0, 0, 1, 0]).getFirstChild() as TextNode;
        $setCompositionKey(t.getKey());
        t.select(2, 2);
      });
      update(p3, () =>
        ($at([0, 0, 1, 0]).getFirstChild() as TextNode)
          .select(0, 0)
          .insertText('Z'),
      );
      send(p3, p1);
      send(p3, first);
      // The other list reaches everyone; each merges before seeing another
      // merge.
      for (const p of [p1, p3, first]) {
        send(second, p);
      }
      update(p1, () => $setCompositionKey(null));
      const peers = [p1, p2, p3, p4];
      exchange(peers);
      const d = expectSame(peers, [fresh(p1), fresh(p4)]);
      expect(d.match(/list\[check\]/g)).toHaveLength(1);
      expect(d).toContain('Z');
      expect(d.match(/xx/g)).toHaveLength(1);
      expect(d.match(/yy/g)).toHaveLength(1);
    });
  }

  for (const split of [false, true]) {
    test(`two clients merge the same lists at once (author's items ${split ? 'split by undo/redo' : 'unsplit'})`, () => {
      const [p1, p2, p3] = listPeers(3);
      const sv = Y.encodeStateVector(p1.doc);
      update(p1, () =>
        $at([0, 0]).append($createListNode('check').append($li('x'))),
      );
      update(p2, () =>
        $at([0, 0]).append($createListNode('check').append($li('y'))),
      );
      if (split) {
        undoRedo(p2, () => $at([0, 0, 1, 0]));
      }
      const u1 = Y.encodeStateAsUpdate(p1.doc, sv);
      const u2 = Y.encodeStateAsUpdate(p2.doc, sv);
      Y.applyUpdate(p1.doc, u2, 'net');
      Y.applyUpdate(p2.doc, u1, 'net');
      Y.applyUpdate(p3.doc, Y.mergeUpdates([u1, u2]), 'net');
      exchange([p1, p2, p3]);
      const d = expectSame([p1, p2, p3], [fresh(p1)]);
      expect(d.match(/list\[check\]/g)).toHaveLength(1);
      expect(d.match(/"x"/g)).toHaveLength(1);
      expect(d.match(/"y(ab)?"/g)).toHaveLength(1);
    });

    test(`two clients pad the same table at once (row inserter's items ${split ? 'split by undo/redo' : 'unsplit'})`, () => {
      const p1 = peer(1);
      update(p1, () => {
        $getRoot().append(
          $createTableNodeWithDimensions(3, 3, false),
          $createParagraphNode(),
        );
      });
      p1.binding.initialize();
      const p2 = peer(2, Y.encodeStateAsUpdate(p1.doc));
      p2.binding.initialize();
      const p3 = peer(3, Y.encodeStateAsUpdate(p1.doc));
      p3.binding.initialize();
      if (split) {
        undoRedo(p1, () => $cell(1, 1).getFirstChild() as ElementNode);
        exchange([p1, p2, p3]);
      }
      const sv = Y.encodeStateVector(p1.doc);
      update(p1, () => {
        ($cell(0, 0).getFirstChild() as ElementNode).selectEnd();
        $insertTableRowAtSelection(true);
      });
      update(p2, () => {
        ($cell(0, 1).getFirstChild() as ElementNode).selectEnd();
        $insertTableColumnAtSelection(true);
      });
      const u1 = Y.encodeStateAsUpdate(p1.doc, sv);
      const u2 = Y.encodeStateAsUpdate(p2.doc, sv);
      Y.applyUpdate(p1.doc, u2, 'net');
      Y.applyUpdate(p2.doc, u1, 'net');
      Y.applyUpdate(p3.doc, Y.mergeUpdates([u1, u2]), 'net');
      exchange([p1, p2, p3]);
      expectSame([p1, p2, p3], [fresh(p1)]);
      expect(shape(p1)).toEqual([4, 4, 4, 4]);
    });
  }

  test('two clients holding the same list with different item boundaries both merge it once', () => {
    const [p1, p2, p3] = listPeers(3);
    const sync = (a: P, b: P) => {
      send(a, b);
      send(b, a);
    };
    update(p1, () =>
      $at([0, 0]).append($createListNode('check').append($li('x'))),
    );
    update(p3, () =>
      $at([0, 0]).append($createListNode('check').append($li('y'))),
    );
    update(p3, () => $at([0, 0, 1, 0]).selectEnd().insertText('ab'));
    update(p3, () => $at([0, 0, 1, 0]).selectEnd().insertText('cd'));
    sync(p3, p2);
    p3.binding.undoManager!.stopCapturing();
    p3.binding.undo();
    p3.binding.undoManager!.stopCapturing();
    p3.binding.undo();
    p3.binding.undoManager!.stopCapturing();
    p3.binding.redo();
    sync(p3, p2);
    // P2 and P3 each receive P1's list before seeing the other's merge.
    const ua = Y.encodeStateAsUpdate(p1.doc, Y.encodeStateVector(p2.doc));
    Y.applyUpdate(p2.doc, ua, 'net');
    Y.applyUpdate(p3.doc, ua, 'net');
    exchange([p1, p2, p3]);
    const d = expectSame([p1, p2, p3], [fresh(p1)]);
    expect(d.match(/"x"/g)).toHaveLength(1);
    expect(d.match(/"y[a-d]*"/g)).toHaveLength(1);
  });
});
