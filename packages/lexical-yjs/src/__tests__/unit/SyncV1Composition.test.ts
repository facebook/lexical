/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

/**
 * collab v1: a collaborator's change that leaves same-format text next to the
 * node being composed (IME) must not merge that text into it while the
 * composition lasts. The browser composes into the composed node's DOM text;
 * merging rewrites it, and the composition loses its node (the next
 * composition step then has nothing to write to).
 *
 * The peer's change and the composition are concurrent: the peer has not seen
 * the composed node yet, so its own normalization cannot merge it. Peers are
 * wired like useYjsCollaboration over an in-memory transport; the peer's
 * updates reach the composing editor at once, and the composing editor's
 * updates reach the peer after the composition. v1 outcomes depend on Yjs
 * clientID order, so every case runs with both orders.
 */

import {
  type Binding,
  createBinding,
  type Provider,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isTextNode,
  $setCompositionKey,
  createEditor,
  type ElementNode,
  type LexicalEditor,
  type NodeKey,
  SKIP_COLLAB_TAG,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';
import * as Y from 'yjs';

const RELAY = {relay: true};

type Peer = {
  doc: Y.Doc;
  editor: LexicalEditor;
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

function makePeer(clientID: number): Peer {
  const doc = new Y.Doc({gc: false});
  doc.clientID = clientID;
  const editor = createEditor({
    namespace: `peer${clientID}`,
    onError: (e: Error) => {
      throw e;
    },
  });
  const provider = makeProvider();
  const binding: Binding = createBinding(
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
  editor.registerUpdateListener(p => {
    if (!p.tags.has(SKIP_COLLAB_TAG)) {
      syncLexicalUpdateToYjs(
        binding,
        provider,
        p.prevEditorState,
        p.editorState,
        p.dirtyElements,
        p.dirtyLeaves,
        p.normalizedNodes,
        p.tags,
      );
    }
  });
  return {doc, editor, pending: []};
}

/** Updates are queued until `flush`. */
function connect(peers: Peer[]) {
  for (const peer of peers) {
    peer.doc.on('update', (u: Uint8Array, origin: unknown) => {
      if (origin !== RELAY) {
        for (const other of peers) {
          if (other !== peer) {
            other.pending.push(u);
          }
        }
      }
    });
  }
}

function flush(peer: Peer) {
  if (peer.pending.length > 0) {
    const updates = peer.pending;
    peer.pending = [];
    Y.applyUpdate(peer.doc, Y.mergeUpdates(updates), RELAY);
    // Commit the editor update scheduled by the yjs observer.
    peer.editor.read(() => {});
  }
}

function update(peer: Peer, fn: () => void) {
  peer.editor.update(fn, {discrete: true});
}

function $line(): ElementNode {
  return $getRoot().getFirstChildOrThrow<ElementNode>();
}

/** Each TextNode of the line, as `key:text`, the composed one as `*:text`. */
function nodes(peer: Peer, composedKey: NodeKey = ''): string[] {
  return peer.editor.read(() =>
    $line()
      .getChildren()
      .map(
        n =>
          `${n.getKey() === composedKey ? '*' : 'n'}:${n.getTextContent()}` +
          ($isTextNode(n) && n.getFormat() !== 0 ? '{b}' : ''),
      ),
  );
}

describe('collab v1: IME composition next to a collaborator’s change', () => {
  describe.each([
    [1, 2],
    [2, 1],
  ])('clientIDs %j', (...ids) => {
    for (const side of ['before', 'after'] as const) {
      test(`the bold text ${side} the composition is removed by a peer`, () => {
        const a = makePeer(ids[0]);
        const b = makePeer(ids[1]);
        connect([a, b]);
        // `ab` + bold `X` (or bold `X` + `cd`).
        update(a, () => {
          const bold = $createTextNode('X').toggleFormat('bold');
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                ...(side === 'before'
                  ? [$createTextNode('ab'), bold]
                  : [bold, $createTextNode('cd')]),
              ),
            );
        });
        flush(b);
        expect(nodes(b)).toEqual(
          side === 'before' ? ['n:ab', 'n:X{b}'] : ['n:X{b}', 'n:cd'],
        );

        // A composes into a new plain text node next to the bold text, while
        // B removes the bold text.
        let key = '';
        update(a, () => {
          const composed = $createTextNode('k');
          const bold = $line().getChildren()[side === 'before' ? 1 : 0];
          if (side === 'before') {
            bold.insertAfter(composed);
          } else {
            bold.insertBefore(composed);
          }
          key = composed.getKey();
          composed.select(1, 1);
          $setCompositionKey(key);
        });
        update(b, () => {
          $line()
            .getChildren()
            .find(n => $isTextNode(n) && n.hasFormat('bold'))!
            .remove();
        });

        // B's removal reaches A: the composed node stays separate, with its key.
        flush(a);
        expect(nodes(a, key)).toEqual(
          side === 'before' ? ['n:ab', '*:k'] : ['*:k', 'n:cd'],
        );
        // The next composition step writes to the composed node.
        update(a, () => {
          const node = $getNodeByKey(key) as TextNode;
          node.setTextContent('か');
          node.select(1, 1);
        });
        expect(nodes(a, key)).toEqual(
          side === 'before' ? ['n:ab', '*:か'] : ['*:か', 'n:cd'],
        );
        // The composition ends: the nodes merge, and both peers converge.
        update(a, () => $setCompositionKey(null));
        const text = side === 'before' ? 'abか' : 'かcd';
        expect(nodes(a).map(n => n.slice(2))).toEqual([text]);
        flush(b);
        flush(a);
        expect(nodes(b).map(n => n.slice(2))).toEqual([text]);
        expect(nodes(a).map(n => n.slice(2))).toEqual([text]);
      });
    }
  });
});
