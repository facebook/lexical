/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

/**
 * collab-v2: a text run whose head is replaced by an inline element must be
 * updated in place, so a peer's concurrent insert later in the run survives.
 *
 * In v2 a paragraph's adjacent TextNodes share one Y.XmlText run, and every
 * other inline child (MarkNode, LinkNode, LineBreakNode, ...) is its own
 * sibling. Wrapping the first word of a paragraph in a mark, or inserting a
 * line break before it, turns the children from `[XmlText]` into
 * `[XmlElement, XmlText]`. `$updateYFragment` used to reuse a run in place only
 * when it paired with the left edge, so here it deleted the whole XmlText and
 * created a new one, dropping whatever a peer had concurrently typed into it.
 *
 * Peers are wired like useYjsCollaborationV2 over an in-memory transport that
 * queues updates while a peer is offline.
 */

import {$isMarkNode, $wrapSelectionInMarkNode, MarkNode} from '@lexical/mark';
import {
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  $setSelection,
  createEditor,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';
import * as Y from 'yjs';

const RELAY = {relay: true};

type Peer = {
  binding: BindingV2;
  doc: Y.Doc;
  editor: LexicalEditor;
  online: boolean;
  pending: Uint8Array[];
};

function makePeer(name: string): Peer {
  const doc = new Y.Doc();
  const editor = createEditor({
    namespace: name,
    nodes: [MarkNode],
    onError: (e: Error) => {
      throw e;
    },
  });
  const binding = createBindingV2__EXPERIMENTAL(
    editor,
    'main',
    doc,
    new Map([['main', doc]]),
  );
  const provider = {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off() {},
      on() {},
      setLocalState() {},
      setLocalStateField() {},
    },
  } as unknown as Provider;
  binding.root.observeDeep((events, transaction) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexicalV2__EXPERIMENTAL(
        binding,
        provider,
        events,
        transaction,
        false,
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
    }) => {
      syncLexicalUpdateToYjsV2__EXPERIMENTAL(
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
    return JSON.stringify(node.getTextContent());
  }
  if ($isLineBreakNode(node)) {
    return 'br';
  }
  if ($isMarkNode(node)) {
    return `mark(${node.getChildren().map(describeNode).join(' ')})`;
  }
  if ($isElementNode(node)) {
    return `${node.getType()}(${node.getChildren().map(describeNode).join(' ')})`;
  }
  return node.getType();
}

function snapshot(peer: Peer): string {
  return peer.editor.read(() =>
    $getRoot().getChildren().map(describeNode).join(' / '),
  );
}

// What a fresh client loading this peer's yjs document would see.
function reload(peer: Peer): string {
  const fresh = makePeer('reload');
  deliver(fresh, [Y.encodeStateAsUpdate(peer.doc)]);
  return snapshot(fresh);
}

function $paragraph(): ElementNode {
  const paragraph = $getRoot().getFirstChild();
  assert($isElementNode(paragraph));
  return paragraph;
}

function $lastText(): TextNode {
  const text = $paragraph().getAllTextNodes().at(-1);
  assert(text !== undefined);
  return text;
}

const TEXT = 'Revenue grew 4% in Q3.';

function setup() {
  const a = makePeer('A');
  const b = makePeer('B');
  connectPeers([a, b]);
  a.editor.update(
    () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(TEXT)));
    },
    {discrete: true},
  );
  expect(snapshot(b)).toBe(snapshot(a));
  return {a, b};
}

describe('collab-v2: text run reuse on the right edge', () => {
  it('keeps a concurrent insert when the first word is wrapped in a mark', () => {
    const {a, b} = setup();
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
        $lastText().spliceText(TEXT.length, 0, ' more');
      },
      {discrete: true},
    );

    goOnline([a, b]);

    const expected = 'paragraph(mark("Revenue") " grew 4% in Q3. more")';
    expect(snapshot(a)).toBe(expected);
    expect(snapshot(b)).toBe(expected);
    expect(reload(a)).toBe(expected);
    expect(reload(b)).toBe(expected);
  });

  it('keeps a concurrent insert when the first word is replaced by a line break', () => {
    const {a, b} = setup();
    goOffline([a, b]);

    a.editor.update(
      () => {
        const text = $paragraph().getFirstChild();
        assert($isTextNode(text));
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 8, 'text');
        $setSelection(selection);
        selection.insertLineBreak();
        $setSelection(null);
      },
      {discrete: true},
    );
    b.editor.update(
      () => {
        $lastText().spliceText(TEXT.length, 0, ' more');
      },
      {discrete: true},
    );

    goOnline([a, b]);

    const expected = 'paragraph(br "grew 4% in Q3. more")';
    expect(snapshot(a)).toBe(expected);
    expect(snapshot(b)).toBe(expected);
    expect(reload(a)).toBe(expected);
    expect(reload(b)).toBe(expected);
  });

  it('updates the run in place when its head is wrapped (no concurrency)', () => {
    const {a, b} = setup();
    const paragraphY = a.binding.root.get(0);
    assert(paragraphY instanceof Y.XmlElement);
    const runBefore = paragraphY.get(0);
    assert(runBefore instanceof Y.XmlText);

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

    // The tail run is the original XmlText, not a recreated one.
    expect(paragraphY.length).toBe(2);
    expect(paragraphY.get(1)).toBe(runBefore);
    expect(runBefore.toString()).toBe(' grew 4% in Q3.');
    const expected = 'paragraph(mark("Revenue") " grew 4% in Q3.")';
    expect(snapshot(a)).toBe(expected);
    expect(snapshot(b)).toBe(expected);
  });
});
