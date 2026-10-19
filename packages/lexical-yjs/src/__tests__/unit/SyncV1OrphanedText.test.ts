/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

/**
 * collab v1: text left without a text node by a concurrent removal must not
 * take neighbouring content with it.
 *
 * In v1 a TextNode is a Y.Map embed followed by its characters in the parent's
 * Y.XmlText. When one peer removes a TextNode while another types into it, the
 * typed characters survive in Yjs with no embed in front of them. On the
 * typist's side `CollabElementNode.applyChildrenYjsDelta` used to delete that
 * "dangling" text with a node-relative offset (0) instead of its absolute
 * index, deleting from the start of the parent: the deletion removed unrelated
 * siblings and propagated to every peer.
 *
 * Peers are wired like useYjsCollaboration over an in-memory transport that
 * queues updates while a peer is offline. v1 outcomes depend on Yjs clientID
 * order, so every case runs with both orders.
 */

import {$isMarkNode, $wrapSelectionInMarkNode, MarkNode} from '@lexical/mark';
import {
  type Binding,
  createBinding,
  type Provider,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  createEditor,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';
import * as Y from 'yjs';

const RELAY = {relay: true};

type Peer = {
  binding: Binding;
  doc: Y.Doc;
  editor: LexicalEditor;
  online: boolean;
  pending: Uint8Array[];
};

function makeProvider(): Provider {
  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off() {},
      on() {},
      setLocalState() {},
      setLocalStateField() {},
    },
    connect() {},
    disconnect() {},
    off() {},
    on() {},
  } as unknown as Provider;
}

function createPeerEditor(name: string): LexicalEditor {
  return createEditor({
    namespace: name,
    nodes: [MarkNode],
    onError: (e: Error) => {
      throw e;
    },
  });
}

function makePeer(name: string, clientID: number): Peer {
  const doc = new Y.Doc({gc: false});
  doc.clientID = clientID;
  const editor = createPeerEditor(name);
  const provider = makeProvider();
  const binding = createBinding(
    editor,
    provider,
    'main',
    doc,
    new Map([['main', doc]]),
  );
  binding.root.getSharedType().observeDeep((events, transaction) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexical(
        binding,
        provider,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events as any,
        transaction.origin instanceof Y.UndoManager,
      );
    }
  });
  editor.registerUpdateListener(
    ({
      prevEditorState,
      editorState,
      dirtyLeaves,
      dirtyElements,
      normalizedNodes,
      tags,
    }) => {
      syncLexicalUpdateToYjs(
        binding,
        provider,
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      );
    },
  );
  return {binding, doc, editor, online: true, pending: []};
}

function connectPeers(peers: Peer[]) {
  for (const peer of peers) {
    peer.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === RELAY) {
        return;
      }
      for (const other of peers) {
        if (other !== peer) {
          if (peer.online && other.online) {
            deliver(other, [update]);
          } else {
            other.pending.push(update);
          }
        }
      }
    });
  }
}

function deliver(peer: Peer, updates: Uint8Array[]) {
  Y.applyUpdate(peer.doc, Y.mergeUpdates(updates), RELAY);
  // Commit the editor update scheduled by the yjs observer.
  peer.editor.read(() => {});
}

function goOffline(peers: Peer[]) {
  for (const peer of peers) {
    peer.online = false;
  }
}

function goOnline(peers: Peer[]) {
  for (const peer of peers) {
    peer.online = true;
  }
  for (const peer of peers) {
    if (peer.pending.length > 0) {
      const updates = peer.pending;
      peer.pending = [];
      deliver(peer, updates);
    }
  }
}

function describeNode(node: LexicalNode): string {
  if ($isTextNode(node)) {
    const format = node.getFormat() !== 0 ? `{${node.getFormat()}}` : '';
    return JSON.stringify(node.getTextContent()) + format;
  }
  if ($isMarkNode(node)) {
    return `mark(${node.getChildren().map(describeNode).join(' ')})`;
  }
  if ($isElementNode(node)) {
    return `${node.getType()}(${node.getChildren().map(describeNode).join(' ')})`;
  }
  return node.getType();
}

function snapshot(editor: LexicalEditor): string {
  return editor.read(() =>
    $getRoot().getChildren().map(describeNode).join(' / '),
  );
}

// What a fresh client loading this peer's yjs document would see.
function reload(peer: Peer): string {
  const doc = new Y.Doc({gc: false});
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(peer.doc));
  const editor = createPeerEditor('reload');
  const binding = createBinding(
    editor,
    makeProvider(),
    'main',
    doc,
    new Map([['main', doc]]),
  );
  editor.update(
    () => {
      binding.root.applyChildrenYjsDelta(
        binding,
        binding.root.getSharedType().toDelta(),
      );
      binding.root.syncChildrenFromYjs(binding);
    },
    {discrete: true},
  );
  return snapshot(editor);
}

function expectConverged(a: Peer, b: Peer): string {
  const result = snapshot(a.editor);
  expect(snapshot(b.editor)).toBe(result);
  expect(reload(a)).toBe(result);
  expect(reload(b)).toBe(result);
  return result;
}

function $paragraph(): ElementNode {
  const paragraph = $getRoot().getFirstChild();
  assert($isElementNode(paragraph));
  return paragraph;
}

function setup(clientIDs: [number, number], $init: () => void) {
  const a = makePeer('A', clientIDs[0]);
  const b = makePeer('B', clientIDs[1]);
  connectPeers([a, b]);
  a.editor.update(
    () => {
      $getRoot().clear();
      $init();
    },
    {discrete: true},
  );
  expect(snapshot(b.editor)).toBe(snapshot(a.editor));
  return {a, b};
}

describe.each([
  // [clientIDs, outcome of the mark case]
  [
    [1, 2] as [number, number],
    'paragraph(mark("Revenue") " grew 4% in Q3. more")',
  ],
  [[2, 1] as [number, number], 'paragraph(mark("Revenue") " grew 4% in Q3.")'],
])('collab v1: orphaned text (clientIDs %j)', (clientIDs, markOutcome) => {
  it('keeps the rest of the paragraph when a peer removes the text node being typed in', () => {
    const {a, b} = setup(clientIDs, () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('aaa '),
          $createTextNode('BOLD').toggleFormat('bold'),
          $createTextNode(' ccc'),
        ),
      );
    });
    goOffline([a, b]);

    a.editor.update(
      () => {
        const first = $paragraph().getFirstChild();
        assert($isTextNode(first));
        first.spliceText(1, 0, '!');
      },
      {discrete: true},
    );
    b.editor.update(
      () => {
        $paragraph().getFirstChildOrThrow().remove();
      },
      {discrete: true},
    );

    goOnline([a, b]);

    // The removed node's concurrent insert has no text node left to live in
    // and is dropped; its neighbours must survive on every peer.
    expect(expectConverged(a, b)).toBe('paragraph("BOLD"{1} " ccc")');
  });

  it('keeps the paragraph when a peer wraps its first word in a mark while another types at the end', () => {
    const {a, b} = setup(clientIDs, () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('Revenue grew 4% in Q3.'),
        ),
      );
    });
    goOffline([a, b]);

    a.editor.update(
      () => {
        const text = $paragraph().getFirstChild();
        assert($isTextNode(text));
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 7, 'text');
        $setSelection(selection);
        $wrapSelectionInMarkNode(selection, false, 'c1');
        $setSelection(null);
      },
      {discrete: true},
    );
    b.editor.update(
      () => {
        const text = $paragraph().getLastChild();
        assert($isTextNode(text));
        text.spliceText(text.getTextContentSize(), 0, ' more');
      },
      {discrete: true},
    );

    goOnline([a, b]);

    // The mark and the rest of the paragraph survive on every peer. Whether
    // " more" survives depends on the clientID order: it is kept when it ends
    // up after the new tail text node, and dropped when it is orphaned.
    expect(expectConverged(a, b)).toBe(markOutcome);
  });
});
