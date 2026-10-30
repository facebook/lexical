/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// #9592. Three v2 clients share a list with two items between two
// paragraphs. At the same time, A removes the first item and C the second.
// Both removals reach B: its list is left with no items, as the Y document
// holds it (each client deleted one item). B should keep the empty list a
// fresh reader of the document shows, and A's item added to the list later
// should reach it. Before the fix, Lexical's splice, run with a range
// selection, removed the list (a node that cannot be empty) on B, the Y list
// stayed mapped to the removed node, and A's item made B throw "Lexical node
// does not exist in active editor state".

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  ListExtension,
} from '@lexical/list';
import {
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type ElementNode,
  type LexicalEditor,
  SKIP_COLLAB_TAG,
} from 'lexical';
import {expect, onTestFinished, test} from 'vitest';
import {
  applyUpdate,
  Doc,
  encodeStateAsUpdate,
  UndoManager,
  type XmlElement,
} from 'yjs';

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

/** A v2 client, wired as the React collaboration plugin wires it. */
class Peer {
  readonly doc = new Doc({gc: false});
  readonly editor: LexicalEditor & {dispose: () => void};
  readonly binding: BindingV2;
  constructor(clientID: number) {
    this.doc.clientID = clientID;
    this.editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [ListExtension],
      name: `v2-list-${clientID}`,
      onError: e => {
        throw e;
      },
    });
    const binding = createBindingV2__EXPERIMENTAL(
      this.editor,
      'main',
      this.doc,
      new Map([['main', this.doc]]),
    );
    this.binding = binding;
    (binding.root as XmlElement).observeDeep(((
      events: never,
      transaction: {origin: unknown},
    ) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events,
          transaction as never,
          transaction.origin instanceof UndoManager,
        );
      }
    }) as never);
    this.editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) => {
        if (!tags.has(SKIP_COLLAB_TAG)) {
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
        }
      },
    );
    this.flush();
    onTestFinished(() => {
      this.editor.dispose();
      this.doc.destroy();
    });
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
  /** Applies everything `from` has that this client has not seen. */
  sync(from: Peer) {
    applyUpdate(this.doc, encodeStateAsUpdate(from.doc), 'remote');
    this.flush();
  }
  json() {
    this.flush();
    return this.editor.getEditorState().toJSON();
  }
}

const $p = (text: string) =>
  $createParagraphNode().append($createTextNode(text));

// Where B's selection is when the removals reach it.
const SELECTIONS = {
  'a caret after the list': () =>
    ($getRoot().getLastChildOrThrow() as ElementNode).selectEnd(),
  'a caret in the first item': () =>
    (
      $getRoot()
        .getChildren()
        .find($isListNode)!
        .getFirstChildOrThrow() as ElementNode
    ).selectEnd(),
  'a caret in the second item': () =>
    (
      $getRoot()
        .getChildren()
        .find($isListNode)!
        .getLastChildOrThrow() as ElementNode
    ).selectStart(),
  'a selection across the list': () => {
    ($getRoot().getFirstChildOrThrow() as ElementNode).selectStart();
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const last = (
        $getRoot().getLastChildOrThrow() as ElementNode
      ).getFirstChildOrThrow();
      selection.focus.set(last.getKey(), 2, 'text');
    }
  },
  'no selection': () => $setSelection(null),
};

for (const [where, $select] of Object.entries(SELECTIONS)) {
  test(`v2: a list emptied by two clients' removals, the receiver with ${where}`, () => {
    const a = new Peer(1);
    const b = new Peer(2);
    const c = new Peer(3);
    a.update(() => {
      $getRoot()
        .clear()
        .append(
          $p('before'),
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('x')),
            $createListItemNode().append($createTextNode('y')),
          ),
          $p('after'),
        );
    });
    b.sync(a);
    c.sync(a);
    b.update($select);
    // At the same time, A removes the first item and C the second.
    a.update(() => {
      $getRoot()
        .getChildren()
        .find($isListNode)!
        .getFirstChildOrThrow()
        .remove();
    });
    c.update(() => {
      $getRoot()
        .getChildren()
        .find($isListNode)!
        .getLastChildOrThrow()
        .remove();
    });
    b.sync(a);
    b.sync(c);
    // B's editor shows what its document holds: an empty list.
    const fresh = new Peer(99);
    fresh.sync(b);
    expect(b.json()).toEqual(fresh.json());
    // A gets C's removal, keeps the empty list and adds an item to it.
    a.sync(c);
    a.update(() => {
      $getRoot()
        .getChildren()
        .find($isListNode)!
        .append($createListItemNode().append($createTextNode('z')));
    });
    b.sync(a);
    c.sync(a);
    expect(b.json()).toEqual(a.json());
    expect(c.json()).toEqual(a.json());
  });
}
