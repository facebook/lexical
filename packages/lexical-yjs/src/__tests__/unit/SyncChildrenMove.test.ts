/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  createBinding,
  type Provider,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  defineExtension,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';
import {applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector} from 'yjs';

import {type CollabElementNode} from '../../CollabElementNode';

const noop = () => {};
const provider = {
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    off: noop,
    on: noop,
    setLocalState: noop,
    setLocalStateField: noop,
  },
  connect: noop,
  disconnect: noop,
  off: noop,
  on: noop,
} as unknown as Provider;

describe('syncChildrenFromLexical: moving children among siblings', () => {
  const editors: LexicalEditorWithDispose[] = [];
  afterEach(() => {
    for (const editor of editors) {
      editor.dispose();
    }
    editors.length = 0;
  });

  // A client that mirrors useYjsCollaboration: local updates are written to
  // its own Doc, and Doc changes from other origins are applied to the editor.
  function buildClient() {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[sync-children-move]',
        onError: (error: Error) => {
          throw error;
        },
      }),
    );
    editors.push(editor);
    const doc = new Doc();
    const binding = createBinding(
      editor,
      provider,
      'test',
      doc,
      new Map([['test', doc]]),
    );
    let syncMs = 0;
    editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) => {
        const start = performance.now();
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
        syncMs = performance.now() - start;
      },
    );
    binding.root.getSharedType().observeDeep((events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexical(
          binding,
          provider,
          events,
          transaction.origin instanceof Object &&
            'undo' in (transaction.origin as object),
          noop,
        );
      }
    });
    return {
      binding,
      doc,
      editor,
      getSyncMs: () => syncMs,
      texts: () =>
        editor.read(() =>
          $getRoot()
            .getChildren()
            .map(child => child.getTextContent()),
        ),
    };
  }

  type Client = ReturnType<typeof buildClient>;

  async function flush() {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async function syncClients(a: Client, b: Client) {
    applyUpdate(
      b.doc,
      encodeStateAsUpdate(a.doc, encodeStateVector(b.doc)),
      'remote',
    );
    applyUpdate(
      a.doc,
      encodeStateAsUpdate(b.doc, encodeStateVector(a.doc)),
      'remote',
    );
    await flush();
  }

  function seed(client: Client, count: number) {
    client.editor.update(
      () => {
        $getRoot().append(
          ...Array.from({length: count}, (_, i) =>
            $createParagraphNode().append($createTextNode(`P${i}`)),
          ),
        );
      },
      {discrete: true},
    );
  }

  function rootChildren(client: Client): CollabElementNode['_children'] {
    return client.binding.root._children.slice();
  }

  const labels = (count: number) =>
    Array.from({length: count}, (_, i) => `P${i}`);

  function $move(from: number, to: number) {
    // Moves the child at `from` so that it ends up at index `to`
    const root = $getRoot();
    const children = root.getChildren();
    const [node] = children.splice(from, 1);
    children.splice(to, 0, node);
    root.splice(0, root.getChildrenSize(), children);
  }

  test.each([
    ['last to front', 9, 0],
    ['first to end', 0, 9],
    ['middle to front', 5, 0],
    ['middle to end', 5, 9],
    ['forward by one', 3, 4],
    ['backward by one', 4, 3],
    ['middle to middle', 2, 7],
  ])(
    'moving %s re-creates only the moved collab node',
    async (_name, from, to) => {
      const a = buildClient();
      const b = buildClient();
      seed(a, 10);
      await syncClients(a, b);
      const before = rootChildren(a);

      a.editor.update(() => $move(from, to), {discrete: true});

      const after = rootChildren(a);
      const expected = labels(10);
      const [moved] = expected.splice(from, 1);
      expected.splice(to, 0, moved);
      expect(a.texts()).toEqual(expected);
      expect(after.filter(child => !before.includes(child))).toHaveLength(1);

      await syncClients(a, b);
      expect(b.texts()).toEqual(expected);
      expect(a.texts()).toEqual(expected);
    },
  );

  test('a concurrent edit to a sibling that shifted position is preserved', async () => {
    const a = buildClient();
    const b = buildClient();
    seed(a, 20);
    await syncClients(a, b);

    // A moves the last paragraph to the front, shifting all the others, while
    // B concurrently types in a paragraph that merely shifts.
    a.editor.update(() => $move(19, 0), {discrete: true});
    b.editor.update(
      () => {
        const paragraph = $getRoot().getChildAtIndex<ElementNode>(7)!;
        expect($isElementNode(paragraph)).toBe(true);
        paragraph.getFirstChildOrThrow<TextNode>().setTextContent('P7 edited');
      },
      {discrete: true},
    );
    await syncClients(a, b);

    const expected = labels(20);
    expected.unshift(expected.pop()!);
    expected[8] = 'P7 edited';
    expect(a.texts()).toEqual(expected);
    expect(b.texts()).toEqual(expected);
  });

  test('moves combined with inserts and removals converge', async () => {
    const a = buildClient();
    const b = buildClient();
    seed(a, 12);
    await syncClients(a, b);

    a.editor.update(
      () => {
        const root = $getRoot();
        const children = root.getChildren();
        // reverse a run, drop one, add one, and move one to the front
        const next = [
          children[11],
          children[0],
          children[3],
          children[2],
          children[1],
          $createParagraphNode().append($createTextNode('new')),
          children[5],
          children[6],
          children[8],
          children[7],
          children[9],
        ];
        children[4].remove();
        children[10].remove();
        root.splice(0, root.getChildrenSize(), next);
      },
      {discrete: true},
    );
    const expected = [
      'P11',
      'P0',
      'P3',
      'P2',
      'P1',
      'new',
      'P5',
      'P6',
      'P8',
      'P7',
      'P9',
    ];
    expect(a.texts()).toEqual(expected);
    await syncClients(a, b);
    expect(b.texts()).toEqual(expected);
  });

  test('moving one of many siblings syncs in roughly linear time', () => {
    const a = buildClient();
    seed(a, 8000);
    const before = rootChildren(a);
    a.editor.update(() => $move(7999, 0), {discrete: true});
    const after = rootChildren(a);
    expect(after.filter(child => !before.includes(child))).toHaveLength(1);
    // Quadratic behavior took over a second here; leave generous headroom
    expect(a.getSyncMs()).toBeLessThan(500);
  });
});
