/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Three @lexical/yjs v1 clients (wired like the React collaboration plugin)
// share a paragraph "before [commented] after", where "commented" is in a
// MarkNode with id comment-1 (inside a second mark at depth 2). One client
// wraps the "o" of "commented" in a MarkNode c1 and then types "x" in the
// rest ("mmented"); another receives only the first change, and wraps the
// "m" at the start of "mmented" in c1 too, which writes "mmented" again. The
// "x" then lands where no text node is, and the binding removes it from the
// document: that removal was read back as a remote change and deleted the
// collab child at its index (the new c1 mark), so the editor lost text its
// document held (#9583). Once every message is delivered, every editor must
// show what its own Y.Doc holds, and the clients must agree.

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from '@lexical/mark';
import {
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
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
  type SerializedEditorState,
  SKIP_COLLAB_TAG,
  type TextNode,
} from 'lexical';
import {expect, test} from 'vitest';
import {applyUpdate, Doc, encodeStateAsUpdate, UndoManager} from 'yjs';

const REMOTE = 'remote';
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

type Message = {from: Client; to: Client; update: Uint8Array};

class Client {
  readonly doc = new Doc({gc: false});
  readonly editor: LexicalEditor;

  constructor(
    readonly name: string,
    clientID: number,
    queue: Message[] | null,
    clients: Client[],
  ) {
    this.doc.clientID = clientID;
    const editor = buildEditorFromExtensions({
      $initialEditorState: null,
      name: `[v1-marks-${name}]`,
      nodes: [MarkNode],
      onError: e => {
        throw e;
      },
    });
    this.editor = editor;
    const binding = createBinding(
      editor,
      provider,
      'main',
      this.doc,
      new Map([['main', this.doc]]),
    );
    binding.root.getSharedType().observeDeep(((
      events: never,
      transaction: {origin: unknown},
    ) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexical(
          binding,
          provider,
          events,
          transaction.origin instanceof UndoManager,
          () => {},
        );
      }
    }) as never);
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
    if (queue !== null) {
      this.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== REMOTE) {
          for (const to of clients) {
            if (to !== this) {
              queue.push({from: this, to, update});
            }
          }
        }
      });
    }
  }

  flush() {
    for (let i = 0; i < 20 && this.editor._pendingEditorState !== null; i++) {
      this.editor.read(() => {});
    }
  }

  update(fn: () => void) {
    this.editor.update(fn, {discrete: true});
    this.flush();
  }

  apply(update: Uint8Array) {
    applyUpdate(this.doc, update, REMOTE);
    this.flush();
  }

  json(): SerializedEditorState {
    return this.editor.getEditorState().toJSON();
  }
}

function $text(content: string): TextNode {
  let found: TextNode | null = null;
  const walk = (node: LexicalNode) => {
    if (
      found === null &&
      $isTextNode(node) &&
      node.getTextContent() === content
    ) {
      found = node;
    }
    if ($isElementNode(node)) {
      node.getChildren().forEach(walk);
    }
  };
  walk($getRoot());
  return found!;
}

function $select(content: string, from: number, to: number) {
  const node = $text(content);
  const s = $createRangeSelection();
  s.anchor.set(node.getKey(), from, 'text');
  s.focus.set(node.getKey(), to, 'text');
  $setSelection(s);
}

function $mark(content: string, from: number, to: number, id: string) {
  $select(content, from, to);
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    $wrapSelectionInMarkNode(selection, false, id);
  }
}

for (const depth of [1, 2]) {
  for (const typer of ['B', 'C'] as const) {
    for (const ids of [
      [1000, 1001, 1002],
      [1002, 1001, 1000],
    ]) {
      test(`v1 clients agree with their documents after nested marks and typing (depth ${depth}, ${typer} types, ids ${ids})`, () => {
        const queue: Message[] = [];
        const clients: Client[] = [];
        for (const [i, name] of ['A', 'B', 'C'].entries()) {
          clients.push(new Client(name, ids[i], queue, clients));
        }
        const [a, b, c] = clients;
        // The client that marks and types first, and the one that marks
        // concurrently having seen only the first mark.
        const [first, second] = typer === 'B' ? [b, c] : [c, b];
        const drain = () => {
          while (queue.length > 0) {
            const m = queue.shift()!;
            m.to.apply(m.update);
          }
        };
        a.update(() => {
          let inner: LexicalNode = $createMarkNode(['comment-1']).append(
            $createTextNode('commented'),
          );
          if (depth === 2) {
            inner = $createMarkNode(['outer']).append(inner);
          }
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode('before '),
                inner,
                $createTextNode(' after'),
              ),
            );
        });
        drain();
        first.update(() => $mark('commented', 1, 2, 'c1'));
        first.update(() => {
          $select('mmented', 6, 6);
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText('x');
          }
        });
        const index = queue.findIndex(m => m.from === first && m.to === second);
        const [m] = queue.splice(index, 1);
        second.apply(m.update);
        second.update(() => $mark('mmented', 0, 1, 'c1'));
        drain();
        for (const client of clients) {
          const fresh = new Client('F', 2000, null, []);
          fresh.apply(encodeStateAsUpdate(client.doc));
          expect(
            client.json(),
            `${client.name} equals its own document`,
          ).toEqual(fresh.json());
        }
        expect(b.json()).toEqual(a.json());
        expect(c.json()).toEqual(a.json());
      });
    }
  }
}
