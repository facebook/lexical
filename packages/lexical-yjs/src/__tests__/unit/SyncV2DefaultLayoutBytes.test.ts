/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$toggleLink, LinkNode} from '@lexical/link';
import {
  createBindingV2__EXPERIMENTAL,
  createUndoManager,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  $setState,
  createEditor,
  createState,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {createHash} from 'node:crypto';
import {expect, test} from 'vitest';
import * as Y from 'yjs';

// Pins the bytes the V2 binding writes in its default layout for a scripted
// two-peer session (links, typing inside them, bold, NodeState, a line break,
// an inline decorator, an offline unlink and an undo), so that changes to the
// binding that are meant to leave the default layout alone provably do. The
// expected digest was recorded before the opt-in inline-format layout was
// added.

const commentState = createState('comment', {
  parse: v => (typeof v === 'string' ? v : ''),
});

type TestPeer = {
  doc: Y.Doc;
  update: (fn: () => void) => void;
  undoManager: Y.UndoManager;
  online: boolean;
  pending: Uint8Array[];
};

function createPeer(
  clientID: number,
  peers: TestPeer[],
  options: {inlineFormats?: boolean},
): TestPeer {
  const doc = new Y.Doc({gc: false});
  doc.clientID = clientID;
  const editor = createEditor({
    namespace: 'test',
    nodes: [LinkNode, TestDecoratorNode],
    onError: e => {
      throw e;
    },
  });
  const provider = {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {},
      on: () => {},
      setLocalState: () => {},
      setLocalStateField: () => {},
    },
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  } as unknown as Provider;
  const binding = createBindingV2__EXPERIMENTAL(
    editor,
    'main',
    doc,
    new Map([['main', doc]]),
    options,
  );
  binding.root.observeDeep((events, transaction) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexicalV2__EXPERIMENTAL(
        binding,
        provider,
        events as Y.YEvent<Y.XmlElement | Y.XmlText>[],
        transaction,
        transaction.origin instanceof Y.UndoManager,
      );
    }
  });
  editor.registerUpdateListener(
    ({
      prevEditorState,
      editorState,
      dirtyElements,
      dirtyLeaves,
      normalizedNodes,
      tags,
    }) =>
      syncLexicalUpdateToYjsV2__EXPERIMENTAL(
        binding,
        provider,
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      ),
  );
  const peer: TestPeer = {
    doc,
    online: true,
    pending: [],
    undoManager: createUndoManager(binding, binding.root),
    update: fn => {
      peer.undoManager.stopCapturing();
      editor.update(fn, {discrete: true});
    },
  };
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === peers) {
      return;
    }
    for (const other of peers) {
      if (other !== peer) {
        if (peer.online && other.online) {
          Y.applyUpdate(other.doc, update, peers);
        } else {
          other.pending.push(update);
        }
      }
    }
  });
  peers.push(peer);
  return peer;
}

function $select(start: number, end: number = start) {
  const texts = ($getRoot().getFirstChild() as ElementNode).getAllTextNodes();
  const locate = (offset: number): [TextNode, number] => {
    let acc = 0;
    for (let i = 0; i < texts.length; i++) {
      const size = texts[i].getTextContentSize();
      if (
        offset < acc + size ||
        (offset === acc + size && i === texts.length - 1)
      ) {
        return [texts[i], offset - acc];
      }
      acc += size;
    }
    throw new Error(`offset ${offset} out of range`);
  };
  const [startNode, startOffset] = locate(start);
  const [endNode, endOffset] = locate(end);
  const selection = $createRangeSelection();
  selection.anchor.set(startNode.getKey(), startOffset, 'text');
  selection.focus.set(endNode.getKey(), endOffset, 'text');
  $setSelection(selection);
  return selection;
}

test.each([
  ['no options', {}],
  ['inlineFormats: false', {inlineFormats: false}],
])(
  'the default layout writes the same Yjs updates as before (%s)',
  (_, options) => {
    const peers: TestPeer[] = [];
    const a = createPeer(1, peers, options);
    const b = createPeer(2, peers, options);
    a.update(() => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            $createTextNode('Revenue grew 4% in Q3.'),
          ),
        );
    });
    a.update(() => {
      $select(8, 15);
      $toggleLink('https://x');
    });
    b.update(() => $select(13).insertText('by '));
    a.update(() => $select(0, 7).formatText('bold'));
    b.update(() => {
      for (const node of $select(19, 21).extract()) {
        $setState(node, commentState, 'c1');
      }
    });
    b.update(() => $select(4).insertLineBreak());
    a.update(() => $select(23).insertNodes([$createTestDecoratorNode()]));
    for (const peer of peers) {
      peer.online = false;
    }
    a.update(() => $select(2).insertText('Z'));
    b.update(() => {
      $select(9, 18);
      $toggleLink(null);
    });
    for (const peer of peers) {
      peer.online = true;
    }
    for (const peer of peers) {
      if (peer.pending.length > 0) {
        const update = Y.mergeUpdates(peer.pending);
        peer.pending = [];
        Y.applyUpdate(peer.doc, update, peers);
      }
    }
    a.undoManager.undo();
    const digest = (peer: TestPeer) =>
      createHash('sha256')
        .update(Y.encodeStateAsUpdate(peer.doc))
        .digest('hex')
        .slice(0, 16);
    expect([digest(a), digest(b)]).toEqual([EXPECTED_DIGEST, EXPECTED_DIGEST]);
  },
);

const EXPECTED_DIGEST = 'cf52f1634a85a726';

test.each([
  ['no options', {}],
  ['inlineFormats: false', {inlineFormats: false}],
])(
  'creating a binding on a non-empty editor writes nothing (%s)',
  async (_, options) => {
    const editor = createEditor({
      namespace: 'test',
      nodes: [LinkNode, TestDecoratorNode],
      onError: e => {
        throw e;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('Revenue grew 4% in Q3.'),
            ),
          );
        $select(8, 15);
        $toggleLink('https://x');
      },
      {discrete: true},
    );
    const doc = new Y.Doc();
    const binding = createBindingV2__EXPERIMENTAL(
      editor,
      'main',
      doc,
      new Map([['main', doc]]),
      options,
    );
    const provider = {
      awareness: {
        getLocalState: () => null,
        getStates: () => new Map(),
        off: () => {},
        on: () => {},
        setLocalState: () => {},
        setLocalStateField: () => {},
      },
    } as unknown as Provider;
    editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) =>
        syncLexicalUpdateToYjsV2__EXPERIMENTAL(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        ),
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(Y.encodeStateAsUpdate(doc)).toEqual(
      Y.encodeStateAsUpdate(new Y.Doc()),
    );
  },
);
