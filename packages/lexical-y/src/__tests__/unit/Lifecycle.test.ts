/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Version gate, concurrent initialization, NodeState on lines, undo across peers.
// @vitest-environment node
import type {ListItemNode} from '@lexical/list';

import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import * as Y from '@y/y';
import {
  $createTextNode,
  $getRoot,
  $getState,
  $setState,
  createEditor,
  createState,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {YBinding} from '../..';
import {
  $block,
  $p,
  $selectIn,
  expectConverged,
  freshReader,
  NODES,
  Peer,
  setup,
} from '../utils/harness';

const ORDERS = [
  {delivery: 'causal' as const, ids: [1, 2]},
  {delivery: 'causal' as const, ids: [2, 1]},
  {delivery: 'sender' as const, ids: [1, 2]},
  {delivery: 'sender' as const, ids: [2, 1]},
];
const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));

const lineState = createState('note', {
  parse: v => (typeof v === 'string' ? v : ''),
});
const objState = createState('obj', {
  parse: v =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : null,
});

function mkEditor(warnings: string[]) {
  return createEditor({
    namespace: 'p',
    nodes: NODES,
    onError: e => {
      throw e;
    },
    onWarn: e => warnings.push(String((e as Error).message)),
  });
}

describe('version gate', () => {
  test('foreign root content arriving by update (not doc.get) is detected', () => {
    const old = new Y.Doc();
    old.get('root').insert(0, 'old layout text');
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(old));
    const warnings: string[] = [];
    const editor = mkEditor(warnings);
    const b = new YBinding(editor, doc, {
      selfCheck: true,
    });
    b.start();
    b.initialize();
    expect(b.status).toBe('readonly');
  });

  test('foreign root content in a Yjs-13-style XmlText root by update', () => {
    // content written under the v2 root name used by @lexical/yjs
    const old = new Y.Doc();
    old.get('root-v2').insert(0, [new Y.Node('paragraph')]);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(old));
    const warnings: string[] = [];
    const b = new YBinding(mkEditor(warnings), doc, {
      selfCheck: true,
    });
    b.start();
    b.initialize();
    expect(b.status).toBe('readonly');
  });

  test('version as string, NaN, 0, negative, float', () => {
    for (const v of ['1', NaN, 0, -1, 0.5, 1.5, null, true]) {
      const doc = new Y.Doc();
      doc.get('lexical-y').setAttr('lexical-y', v as never);
      const warnings: string[] = [];
      const editor = mkEditor(warnings);
      const b = new YBinding(editor, doc, {
        selfCheck: true,
      });
      b.start();
      b.initialize();
      expect(b.status).toBe('readonly');
      expect(editor.isEditable()).toBe(false);
    }
  });

  test('dispose of a read-only binding gives the editor back its editability', () => {
    for (const editable of [true, false]) {
      const doc = new Y.Doc();
      doc.get('lexical-y').setAttr('lexical-y', 999);
      const warnings: string[] = [];
      const editor = mkEditor(warnings);
      editor.setEditable(editable);
      const b = new YBinding(editor, doc, {
        selfCheck: true,
      });
      b.start();
      b.initialize();
      expect(b.status).toBe('readonly');
      expect(editor.isEditable()).toBe(false);
      b.dispose();
      expect(editor.isEditable()).toBe(editable);
    }
  });

  test('root content without version, version arrives later', async () => {
    const src = new Y.Doc();
    src.clientID = 5;
    const warnings: string[] = [];
    const e1 = mkEditor(warnings);
    const b1 = new YBinding(e1, src, {selfCheck: true});
    b1.start();
    e1.update(() => $getRoot().clear().append($p('hello')), {discrete: true});
    b1.initialize();
    // Strip the version: copy the doc and delete the attr on a copy.
    const doc = new Y.Doc();
    doc.clientID = 6;
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(src));
    doc.get('lexical-y').deleteAttr('lexical-y');
    const e2 = mkEditor(warnings);
    const b2 = new YBinding(e2, doc, {selfCheck: true});
    b2.start();
    b2.initialize();
    expect(b2.status).toBe('readonly');
  });

  test('active client receives a newer version mid session', async () => {
    const t = await setup(() => $getRoot().append($p('abc')));
    t.b.doc.transact(() => t.b.doc.get('lexical-y').setAttr('lexical-y', 2));
    await t.sync();
    // b's binding: its own transaction with origin != binding is treated as remote
    expect(t.a.binding.status).toBe('readonly');
    t.a.update(() => $selectIn([0], 3).insertText('X'));
    await t.sync();
  });
});

describe('concurrent init', () => {
  for (const o of ORDERS) {
    test(`two clients initialize an empty doc ${o.ids} ${o.delivery}`, async () => {
      const net = {
        delivery: o.delivery,
        peers: [] as Peer[],
        pumping: false,
        queue: [] as [Peer, Uint8Array][],
      };
      const a = new Peer(o.ids[0], net as never);
      const b = new Peer(o.ids[1], net as never);
      a.online = false;
      b.online = false;
      a.update(() => $getRoot().clear().append($p('from a')));
      b.update(() => $getRoot().clear().append($p('from b')));
      a.binding.initialize();
      b.binding.initialize();
      // exchange
      Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc), net);
      Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc), net);
      expect(a.describe()).toBe(b.describe());
      const f = await freshReader(a);
      expect(f.describe()).toBe(a.describe());
      expect([...a.warnings, ...b.warnings]).toEqual([]);
    });
  }
  test('two clients initialize with default empty editor (one empty paragraph each)', async () => {
    const net = {
      delivery: 'causal',
      peers: [] as Peer[],
      pumping: false,
      queue: [] as [Peer, Uint8Array][],
    };
    const a = new Peer(1, net as never);
    const b = new Peer(2, net as never);
    a.online = false;
    b.online = false;
    a.update(() => $getRoot().clear().append($p('')));
    b.update(() => $getRoot().clear().append($p('')));
    a.binding.initialize();
    b.binding.initialize();
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc), net);
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc), net);
    // Identical initial content dedupes into one paragraph.
    expect(a.describe()).toBe('paragraph()');
    expect(b.describe()).toBe(a.describe());
  });
});

describe('NodeState on lines', () => {
  for (const o of ORDERS) {
    test(`concurrent different keys + same key ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $p('one'),
            $createHeadingNode('h2').append($createTextNode('two')),
          ),
        o,
      );
      t.offline();
      t.a.update(() => {
        $setState($block([0]), lineState, 'A');
        $setState($block([1]), objState, {x: 1, y: [1, 2]});
      });
      t.b.update(() => {
        $setState($block([0]), lineState, 'B');
        $setBlocksType($selectIn([1], 0), () => $createQuoteNode());
      });
      await t.sync();
      await expectConverged(t.peers);
      expect(t.a.read(() => $getState($block([1]), objState))).toEqual({
        x: 1,
        y: [1, 2],
      });
      // remove
      t.a.update(() => $setState($block([0]), lineState, ''));
      await t.sync();
      await expectConverged(t.peers);
      expect(t.b.read(() => $getState($block([0]), lineState))).toBe('');
    });
  }
  test('NodeState on a list item and a ListNode (group)', async () => {
    const t = await setup(() =>
      $getRoot().append($createListNode('bullet').append($li('a'), $li('b'))),
    );
    t.a.update(() => {
      $setState($block([0, 0]), lineState, 'item');
      $setState($block([0]), lineState, 'group');
    });
    await t.sync();
    await expectConverged(t.peers);
  });
  test('NodeState carried by a split', async () => {
    const t = await setup(() => $getRoot().append($p('Hello world')));
    t.a.update(() => $setState($block([0]), lineState, 'X'));
    await t.sync();
    t.a.update(() => $selectIn([0], 5).insertParagraph());
    await t.sync();
    await expectConverged(t.peers);
  });
});

describe('undo across peers', () => {
  for (const o of ORDERS) {
    test(`undo heading after peer changed it to quote ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(() => $getRoot().append($p('Title')), o);
      t.a.update(() =>
        $setBlocksType($selectIn([0], 0), () => $createHeadingNode('h1')),
      );
      await t.sync();
      t.b.update(() =>
        $setBlocksType($selectIn([0], 0), () => $createQuoteNode()),
      );
      await t.sync();
      t.a.undo();
      await t.sync();
      await expectConverged(t.peers);
    });
    test(`undo Enter while peer typed in both halves offline ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(() => $getRoot().append($p('Hello world')), o);
      t.a.update(() => $selectIn([0], 5).insertParagraph());
      await t.sync();
      t.offline();
      t.b.update(() => $selectIn([0], 5).insertText('B1'));
      t.b.update(() => $selectIn([1], 6).insertText('B2'));
      t.a.undo();
      await t.sync();
      await expectConverged(t.peers);
      expect(t.a.describe()).toContain('B1');
      expect(t.a.describe()).toContain('B2');
      t.a.binding.redo();
      await t.sync();
      await expectConverged(t.peers);
    });
    test(`undo paste of 3 lines while peer typed in middle line ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(() => $getRoot().append($p('top')), o);
      t.a.update(() => $getRoot().append($p('l1'), $p('l2'), $p('l3')));
      await t.sync();
      t.offline();
      t.b.update(() => $selectIn([2], 2).insertText('BB'));
      t.a.undo();
      await t.sync();
      await expectConverged(t.peers);
      expect(t.a.describe()).toContain('BB');
    });
    test(`undo indent while peer outdented/changed list type ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $createListNode('bullet').append(
              $li('one'),
              $li('two'),
              $li('three'),
            ),
          ),
        o,
      );
      t.a.update(() => ($block([0, 1]) as ListItemNode).setIndent(1));
      await t.sync();
      t.offline();
      t.b.update(() => ($block([0, 2]) as ListItemNode).setIndent(1));
      t.a.undo();
      await t.sync();
      await expectConverged(t.peers);
    });
    test(`undo of B's typing by B after A deleted the line ${o.ids} ${o.delivery}`, async () => {
      const t = await setup(
        () => $getRoot().append($p('one'), $p('two'), $p('three')),
        o,
      );
      t.b.update(() => $selectIn([1], 3).insertText('XX'));
      await t.sync();
      t.offline();
      t.a.update(() => $block([1]).remove());
      t.b.update(() => $selectIn([1], 5).insertText('YY'));
      await t.sync();
      t.b.undo();
      await t.sync();
      await expectConverged(t.peers);
      t.b.undo();
      await t.sync();
      await expectConverged(t.peers);
      t.b.binding.redo();
      t.b.binding.redo();
      await t.sync();
      await expectConverged(t.peers);
    });
  }
});

describe('text edge chars', () => {
  test('text containing pilcrow, broken bar, U+2029, U+2028, NUL', async () => {
    const t = await setup(() =>
      $getRoot().append($p('a¶b¦c\u2029d\u2028e\u0000f')),
    );
    t.b.update(() => $selectIn([0], 2).insertText('¶'));
    await t.sync();
    await expectConverged(t.peers);
  });
});

describe('document settings', () => {
  test('the binding leaves the document formatting cleanup alone', () => {
    const doc = new Y.Doc();
    const before = doc.cleanupFormatting;
    const b = new YBinding(mkEditor([]), doc, {selfCheck: true});
    const stop = b.start();
    expect(doc.cleanupFormatting).toBe(before);
    stop();
    expect(doc.cleanupFormatting).toBe(before);
  });
});
