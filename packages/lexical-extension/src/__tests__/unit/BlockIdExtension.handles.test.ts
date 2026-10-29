/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $getBlockById,
  $getBlockHandle,
  $getBlockHandles,
  $getBlockId,
  $resolveBlockHandle,
  BlockIdExtension,
  blockIdState,
  buildEditorFromExtensions,
  configExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
  MIN_BLOCK_HANDLE_LENGTH,
} from '@lexical/extension';
import {HeadlessExtension} from '@lexical/headless';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setState,
  COLLABORATION_TAG,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type SerializedEditorState,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {
  buildHandleTable,
  handleInTable,
  idsWithPrefix,
} from '../../internal/blockHandles';

/** A generateId that hands out `ids` in order, then a counter. */
function fixedIds(ids: readonly string[]): () => string {
  let i = 0;
  let n = 0;
  return () => (i < ids.length ? ids[i++] : `zz${++n}`);
}

/**
 * The first content an empty editor gets is a load, which gets positional
 * ids. These editors have had content once, so the blocks the tests add get
 * the ids of `generateId`.
 */
function asEdited<T extends LexicalEditor>(editor: T): T {
  const options = {discrete: true, tag: HISTORY_MERGE_TAG} as const;
  editor.update(() => {
    $getRoot().append($createParagraphNode());
  }, options);
  editor.update(() => {
    $getRoot().clear();
  }, options);
  return editor;
}

function build(
  ids: readonly string[],
  options: {disabled?: boolean; headless?: boolean} = {},
): LexicalEditorWithDispose {
  return asEdited(
    buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [
        ...(options.headless ? [HeadlessExtension] : []),
        RichTextExtension,
        ListExtension,
        configExtension(BlockIdExtension, {
          disabled: options.disabled || false,
          generateId: fixedIds(ids),
        }),
      ],
      name: '[block-handle-test]',
    }),
  );
}

function update(editor: LexicalEditor, fn: () => void, tag?: string): void {
  editor.update(fn, {discrete: true, tag});
}

/** Appends one paragraph per text and returns their ids. */
function appendParagraphs(editor: LexicalEditor, texts: string[]): string[] {
  update(editor, () => {
    for (const text of texts) {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    }
  });
  return editor.read(() =>
    $getRoot()
      .getChildren()
      .slice(-texts.length)
      .map(node => $getBlockId(node)!),
  );
}

/** Id → handle of every top-level block, through $getBlockHandle. */
function handlesOf(editor: LexicalEditor): Record<string, string | null> {
  return editor.read(() =>
    Object.fromEntries(
      $getRoot()
        .getChildren()
        .map(node => [$getBlockId(node), $getBlockHandle(node)]),
    ),
  );
}

function resolve(editor: LexicalEditor, handle: string) {
  return editor.read(() => {
    const result = $resolveBlockHandle(handle);
    return result.status === 'found'
      ? {id: $getBlockId(result.node), status: result.status}
      : result;
  });
}

const V1ST = 'V1StGXR8_Z5jdHi6B-myT';
const XQE = '9xQeLm2Pq0aK7cTb_wYuA';
const RK8P = 'Rk8pZc41Uo-HsVd2NnFjB';

describe('handle computation (pure)', () => {
  test('the shortest unique prefix, at least 4 characters', () => {
    const table = buildHandleTable([V1ST, XQE, RK8P]);
    expect(Object.fromEntries(table.handles)).toEqual({
      [RK8P]: 'Rk8p',
      [V1ST]: 'V1St',
      [XQE]: '9xQe',
    });
    expect(MIN_BLOCK_HANDLE_LENGTH).toBe(4);
  });

  test('ids sharing a prefix get handles one character past it', () => {
    const table = buildHandleTable([
      'V1StGaaaaaaaaaaaaaaaa',
      'V1StQbbbbbbbbbbbbbbbb',
      'V1StQbXcccccccccccccc',
      'abcdefghiXXXXXXXXXXXX',
      'abcdefghiYYYYYYYYYYYY',
      'zzzzzzzzzzzzzzzzzzzzz',
    ]);
    expect(Object.fromEntries(table.handles)).toEqual({
      V1StGaaaaaaaaaaaaaaaa: 'V1StG',
      V1StQbXcccccccccccccc: 'V1StQbX',
      V1StQbbbbbbbbbbbbbbbb: 'V1StQbb',
      abcdefghiXXXXXXXXXXXX: 'abcdefghiX',
      abcdefghiYYYYYYYYYYYY: 'abcdefghiY',
      zzzzzzzzzzzzzzzzzzzzz: 'zzzz',
    });
  });

  test('an id shorter than 4 characters is its own handle', () => {
    const table = buildHandleTable(['b1', 'b2', 'xyz', 'q']);
    expect(Object.fromEntries(table.handles)).toEqual({
      b1: 'b1',
      b2: 'b2',
      q: 'q',
      xyz: 'xyz',
    });
  });

  test('an id that is a prefix of another is its own handle', () => {
    const table = buildHandleTable(['b1', 'b12', 'b123456', 'b1234567890']);
    expect(Object.fromEntries(table.handles)).toEqual({
      b1: 'b1',
      b12: 'b12',
      b123456: 'b123456',
      b1234567890: 'b1234567',
    });
  });

  test('duplicates are counted once', () => {
    const table = buildHandleTable([V1ST, V1ST, XQE]);
    expect(table.sorted).toEqual([V1ST, XQE].sort());
    expect(table.handles.get(V1ST)).toBe('V1St');
  });

  test('the handle of an id outside the table, against the table', () => {
    const table = buildHandleTable(['V1StGaaaaaaaaaaaaaaaa', XQE]);
    expect(handleInTable(table, 'V1StQbbbbbbbbbbbbbbbb')).toBe('V1StQ');
    expect(handleInTable(table, 'Rk8pZc41Uo')).toBe('Rk8p');
    expect(handleInTable(table, XQE)).toBe('9xQe');
  });

  test('matches the brute-force definition', () => {
    const ids = [
      'b1',
      'b12',
      'b123',
      'b1234',
      'b12345',
      'c',
      'cc',
      'ccc',
      'cccc',
      'ccccc',
      'abcdXYZ',
      'abcdXYW',
      'abcdX',
      V1ST,
      XQE,
    ];
    const table = buildHandleTable(ids);
    for (const id of ids) {
      let length = Math.min(MIN_BLOCK_HANDLE_LENGTH, id.length);
      while (
        length < id.length &&
        ids.some(other => other !== id && other.startsWith(id.slice(0, length)))
      ) {
        length++;
      }
      expect(table.handles.get(id), id).toBe(id.slice(0, length));
    }
  });

  test('idsWithPrefix lists the ids that start with a prefix', () => {
    const table = buildHandleTable(['b1', 'b12', 'b123', 'b2', 'a12']);
    expect(idsWithPrefix(table, 'b1')).toEqual(['b1', 'b12', 'b123']);
    expect(idsWithPrefix(table, 'b12')).toEqual(['b12', 'b123']);
    expect(idsWithPrefix(table, 'b3')).toEqual([]);
  });
});

describe('$getBlockHandle', () => {
  test('gives each block its shortest unique prefix', () => {
    using editor = build([V1ST, XQE, RK8P]);
    appendParagraphs(editor, ['Q3 plan', 'Revenue grew 4% in Q3.', 'Hiring']);
    expect(handlesOf(editor)).toEqual({
      [RK8P]: 'Rk8p',
      [V1ST]: 'V1St',
      [XQE]: '9xQe',
    });
    expect(editor.read($getBlockHandles)).toEqual(
      new Map([
        [RK8P, 'Rk8p'],
        [V1ST, 'V1St'],
        [XQE, '9xQe'],
      ]),
    );
  });

  test('ids shorter than 4 and ids that prefix other ids', () => {
    using editor = build(['b1', 'b12', 'b123456', 'xy']);
    appendParagraphs(editor, ['a', 'b', 'c', 'd']);
    expect(handlesOf(editor)).toEqual({
      b1: 'b1',
      b12: 'b12',
      b123456: 'b123',
      xy: 'xy',
    });
  });

  test('non-random ids give longer handles', () => {
    // Counter ids, and `b` + base36 ids.
    const counterIds = Array.from(
      {length: 300},
      (_, i) => `block-${String(i).padStart(6, '0')}`,
    );
    const base36Ids = Array.from(
      {length: 300},
      (_, i) => `b${(i + 1).toString(36)}`,
    );
    for (const ids of [counterIds, base36Ids]) {
      using editor = build(ids);
      appendParagraphs(
        editor,
        ids.map((_, i) => `p${i}`),
      );
      const handles = editor.read($getBlockHandles);
      expect(handles.size).toBe(ids.length);
      for (const id of ids) {
        const handle = handles.get(id)!;
        // Counter ids share everything but their last characters.
        expect(handle).toBe(id);
        expect(resolve(editor, handle)).toEqual({id, status: 'found'});
      }
    }
  });

  test('null for a node without an id or that is not an identified block', () => {
    using editor = build(['listid', 'item1', 'item2']);
    update(editor, () => {
      $getRoot().append(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('one')),
          $createListItemNode().append(
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('nested')),
            ),
          ),
        ),
      );
    });
    editor.read(() => {
      const list = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(list));
      const item = list.getFirstChildOrThrow();
      assert($isElementNode(item));
      expect($getBlockHandle(list)).toBe('list');
      expect($getBlockHandle(item)).toBe('item1');
      // A text node, and a nested list (a wrapper, not identified).
      expect($getBlockHandle(item.getFirstChildOrThrow())).toBe(null);
      const secondItem = list.getLastChildOrThrow();
      assert($isElementNode(secondItem));
      expect($getBlockHandle(secondItem)).toBe('item2');
      const nestedList = secondItem.getFirstChildOrThrow();
      assert($isElementNode(nestedList));
      expect($getBlockHandle(nestedList)).toBe(null);
    });
    // Detached.
    update(editor, () => {
      const list = $getRoot().getFirstChildOrThrow();
      list.remove();
      expect($getBlockHandle(list)).toBe(null);
    });
  });

  test('null for a block named since the last commit', () => {
    using editor = build(['b123456', XQE]);
    appendParagraphs(editor, ['a', 'b']);
    update(editor, () => {
      // Its id is a prefix of an indexed id: a handle computed now would
      // name the other block.
      const block = $createParagraphNode();
      $setState(block, blockIdState, 'b123');
      $getRoot().append(block);
      expect($getBlockHandle(block)).toBe(null);
      expect($getBlockById('b123')).toBe(null);
    });
    // Once committed, it has its handle, and the other block a longer one.
    expect(handlesOf(editor)).toEqual({
      [XQE]: '9xQe',
      b123: 'b123',
      b123456: 'b1234',
    });
    expect(resolve(editor, 'b123')).toEqual({id: 'b123', status: 'found'});
    expect(resolve(editor, 'b1234')).toEqual({id: 'b123456', status: 'found'});
  });

  test('null for a block of an earlier state whose id is gone', () => {
    using editor = build(['b123', 'b123456', XQE]);
    appendParagraphs(editor, ['a', 'b', 'c']);
    const earlier = editor.getEditorState();
    update(editor, () => {
      $getBlockById('b123')!.remove();
    });
    const handle = earlier.read(
      () => $getBlockHandle($getRoot().getFirstChildOrThrow()),
      {editor},
    );
    expect(handle).toBe(null);
    expect(resolve(editor, 'b123')).toEqual({
      id: 'b123456',
      status: 'found',
    });
  });

  test('null for a copy whose repeated id awaits its repair', () => {
    using editor = build([V1ST, XQE, 'cccc12345']);
    appendParagraphs(editor, ['a', 'b', 'c']);
    // Read in the commit that brings the duplicate, before the repair update
    // that the extension's own listener (registered first) schedules.
    const seen: unknown[] = [];
    const unregister = editor.registerUpdateListener(({editorState, tags}) => {
      if (tags.has(COLLABORATION_TAG)) {
        editorState.read(
          () => {
            const [first, , last] = $getRoot().getChildren();
            const result = $resolveBlockHandle('V1St');
            seen.push(
              $getBlockId(last),
              $getBlockHandle(first),
              $getBlockHandle(last),
              result.status === 'found' && result.node.is(first),
            );
          },
          {editor},
        );
      }
    });
    // A duplicate committed without transforms, as a remote merge is.
    editor.update(
      () => {
        $setState($getRoot().getLastChildOrThrow(), blockIdState, V1ST);
      },
      {discrete: true, skipTransforms: true, tag: COLLABORATION_TAG},
    );
    unregister();
    expect(seen).toEqual([V1ST, 'V1St', null, true]);
    // After the repair, the copy has an id and a handle of its own.
    const handles = handlesOf(editor);
    expect(Object.keys(handles)).toHaveLength(3);
    expect(handles[V1ST]).toBe('V1St');
  });

  test('handles change only when ids do, and at once', () => {
    using editor = build([V1ST, XQE]);
    appendParagraphs(editor, ['a', 'b']);
    const first = handlesOf(editor);
    // Typing changes no id: same handles.
    update(editor, () => {
      const text = $getRoot().getFirstDescendant();
      assert($isTextNode(text));
      text.setTextContent('changed');
    });
    expect(handlesOf(editor)).toEqual(first);
    // A new id sharing V1St makes the handle longer at once.
    const [added] = appendParagraphs(editor, ['c']);
    expect(added).toBe('zz1');
    update(editor, () => {
      $setState($getRoot().getLastChildOrThrow(), blockIdState, 'V1StQ123');
    });
    expect(handlesOf(editor)).toEqual({
      [V1ST]: 'V1StG',
      V1StQ123: 'V1StQ',
      [XQE]: '9xQe',
    });
  });
});

describe('$resolveBlockHandle', () => {
  test('finds the block of a handle, or of a whole id', () => {
    using editor = build([V1ST, XQE, RK8P]);
    appendParagraphs(editor, ['a', 'b', 'c']);
    expect(resolve(editor, '9xQe')).toEqual({id: XQE, status: 'found'});
    expect(resolve(editor, XQE)).toEqual({id: XQE, status: 'found'});
    // A longer prefix than needed (a handle read while another id shared
    // more of it) still finds the block.
    expect(resolve(editor, '9xQeLm2')).toEqual({id: XQE, status: 'found'});
  });

  test('an exact id wins over ids that it prefixes', () => {
    using editor = build(['b1', 'b12', 'b123456']);
    appendParagraphs(editor, ['a', 'b', 'c']);
    expect(resolve(editor, 'b1')).toEqual({id: 'b1', status: 'found'});
    expect(resolve(editor, 'b12')).toEqual({id: 'b12', status: 'found'});
    expect(resolve(editor, 'b123')).toEqual({id: 'b123456', status: 'found'});
    expect(resolve(editor, 'b123456')).toEqual({
      id: 'b123456',
      status: 'found',
    });
  });

  test('a typo is not found; a prefix shorter than 4 characters is too short', () => {
    using editor = build([V1ST, XQE, RK8P, 'b1']);
    appendParagraphs(editor, ['a', 'b', 'c', 'd']);
    expect(resolve(editor, '9xQf')).toEqual({
      handle: '9xQf',
      status: 'not-found',
    });
    // Case matters.
    expect(resolve(editor, '9XQE')).toEqual({
      handle: '9XQE',
      status: 'not-found',
    });
    // Never a handle: a dropped character, not a deleted block.
    for (const short of ['9xQ', '9x', '9', 'b']) {
      expect(resolve(editor, short)).toEqual({
        handle: short,
        reason: 'too-short',
        status: 'invalid',
      });
    }
    // A whole id shorter than 4 characters is still found.
    expect(resolve(editor, 'b1')).toEqual({id: 'b1', status: 'found'});
  });

  test('invalid input', () => {
    using editor = build([V1ST]);
    appendParagraphs(editor, ['a']);
    for (const input of [
      '',
      'V1St ',
      ' V1St',
      'V1St!',
      'V1St/Q',
      'a'.repeat(65),
      'V1St\n',
      'ß123',
    ]) {
      expect(resolve(editor, input), JSON.stringify(input)).toEqual({
        handle: input,
        reason: 'malformed',
        status: 'invalid',
      });
    }
    // Untrusted input that is not even a string, including objects that
    // cannot be turned into one.
    for (const input of [
      null,
      undefined,
      42,
      {handle: 'V1St'},
      JSON.parse('{"toString":null}'),
      Object.create(null),
    ]) {
      expect(
        editor.read(() => $resolveBlockHandle(input as unknown as string)),
      ).toMatchObject({reason: 'malformed', status: 'invalid'});
    }
    expect(
      editor.read(() =>
        $resolveBlockHandle(JSON.parse('{"toString":null}') as string),
      ),
    ).toEqual({handle: '', reason: 'malformed', status: 'invalid'});
  });

  test('a deleted block is not found', () => {
    using editor = build([V1ST, XQE, RK8P]);
    appendParagraphs(editor, ['a', 'b', 'c']);
    const handle = handlesOf(editor)[RK8P]!;
    update(editor, () => {
      $getBlockById(RK8P)!.remove();
    });
    expect(resolve(editor, handle)).toEqual({handle, status: 'not-found'});
    expect(resolve(editor, RK8P)).toEqual({handle: RK8P, status: 'not-found'});
  });

  test('a block deleted earlier in the same update is not found', () => {
    using editor = build([V1ST, XQE]);
    appendParagraphs(editor, ['a', 'b']);
    update(editor, () => {
      $getBlockById(XQE)!.remove();
      expect($resolveBlockHandle('9xQe')).toEqual({
        handle: '9xQe',
        status: 'not-found',
      });
      const found = $resolveBlockHandle('V1St');
      assert(found.status === 'found');
      expect($getBlockId(found.node)).toBe(V1ST);
    });
  });

  test('a new block sharing the prefix makes an old handle ambiguous', () => {
    using editor = build([V1ST, XQE, 'V1StQ9mWc0-bE3rT7yLpA']);
    appendParagraphs(editor, ['Q3 plan', 'Revenue']);
    const oldHandle = handlesOf(editor)[V1ST];
    expect(oldHandle).toBe('V1St');
    // A collaborator adds a block whose id also starts with V1St.
    appendParagraphs(editor, ['Q4 plan']);
    expect(resolve(editor, oldHandle!)).toEqual({
      candidates: ['V1StG', 'V1StQ'],
      handle: 'V1St',
      status: 'ambiguous',
    });
    // The next handles computed are longer, and each resolves.
    expect(handlesOf(editor)).toEqual({
      [V1ST]: 'V1StG',
      'V1StQ9mWc0-bE3rT7yLpA': 'V1StQ',
      [XQE]: '9xQe',
    });
    expect(resolve(editor, 'V1StG')).toEqual({id: V1ST, status: 'found'});
    expect(resolve(editor, 'V1StQ')).toEqual({
      id: 'V1StQ9mWc0-bE3rT7yLpA',
      status: 'found',
    });
    // Once the new block is deleted, the old handle works again.
    update(editor, () => {
      $getRoot().getLastChildOrThrow().remove();
    });
    expect(resolve(editor, 'V1St')).toEqual({id: V1ST, status: 'found'});
    expect(resolve(editor, 'V1StG')).toEqual({id: V1ST, status: 'found'});
  });

  test('lists at most 10 candidates', () => {
    const ids = Array.from({length: 15}, (_, i) => `same${i}`);
    using editor = build(ids);
    appendParagraphs(
      editor,
      ids.map(id => id),
    );
    const result = editor.read(() => $resolveBlockHandle('same'));
    assert(result.status === 'ambiguous');
    expect(result.candidates).toEqual([
      'same0',
      'same1',
      'same10',
      'same11',
      'same12',
      'same13',
      'same14',
      'same2',
      'same3',
      'same4',
    ]);
  });
});

describe('$resolveBlockHandle with the handles of a read', () => {
  function readOf(editor: LexicalEditor): Map<string, string> {
    return editor.read($getBlockHandles);
  }
  function resolveRead(
    editor: LexicalEditor,
    handle: string,
    read: Map<string, string>,
  ) {
    return editor.read(() => {
      const result = $resolveBlockHandle(handle, {read});
      return result.status === 'found'
        ? {id: $getBlockId(result.node), status: result.status}
        : result;
    });
  }

  test('a block deleted since the read is not found, even if another id now starts with the handle', () => {
    using editor = build(['b123', 'b123456', XQE]);
    appendParagraphs(editor, ['a', 'b', 'c']);
    const read = readOf(editor);
    expect(read.get('b123')).toBe('b123');
    expect(read.get('b123456')).toBe('b1234');
    update(editor, () => {
      $getBlockById('b123')!.remove();
    });
    // Without the read, the handle now names the surviving block.
    expect(resolve(editor, 'b123')).toEqual({id: 'b123456', status: 'found'});
    // With it, the block the model read is gone.
    expect(resolveRead(editor, 'b123', read)).toEqual({
      handle: 'b123',
      status: 'not-found',
    });
    expect(resolveRead(editor, 'b1234', read)).toEqual({
      id: 'b123456',
      status: 'found',
    });
  });

  test('a block added since cannot take the handle or make it ambiguous', () => {
    using editor = build([V1ST, XQE, 'V1StQ9mWc0-bE3rT7yLpA', 'Rk8pNEW']);
    appendParagraphs(editor, ['a', 'b']);
    const read = readOf(editor);
    appendParagraphs(editor, ['c']);
    expect(resolve(editor, 'V1St').status).toBe('ambiguous');
    expect(resolveRead(editor, 'V1St', read)).toEqual({
      id: V1ST,
      status: 'found',
    });
    // A prefix freed by a deletion and taken by a block added since.
    update(editor, () => {
      $getBlockById(XQE)!.remove();
      const node = $createParagraphNode();
      $setState(node, blockIdState, '9xQeNEW');
      $getRoot().append(node);
    });
    expect(resolve(editor, '9xQe')).toEqual({id: '9xQeNEW', status: 'found'});
    expect(resolveRead(editor, '9xQe', read)).toEqual({
      handle: '9xQe',
      status: 'not-found',
    });
    // The whole id of a block the model did not read is not one of its blocks.
    expect(resolveRead(editor, '9xQeNEW', read)).toEqual({
      handle: '9xQeNEW',
      status: 'not-found',
    });
  });

  test('typos fail against the ids of the read', () => {
    using editor = build([
      'V1StGaaaaaaaaaaaaaaaa',
      'V1StQbbbbbbbbbbbbbbbb',
      XQE,
    ]);
    appendParagraphs(editor, ['a', 'b', 'c']);
    const read = readOf(editor);
    expect(resolveRead(editor, '9xQf', read)).toEqual({
      handle: '9xQf',
      status: 'not-found',
    });
    // Shorter than the handles shown: the read's handles as candidates.
    expect(resolveRead(editor, 'V1St', read)).toEqual({
      candidates: ['V1StG', 'V1StQ'],
      handle: 'V1St',
      status: 'ambiguous',
    });
    expect(resolveRead(editor, '9xQ', read)).toEqual({
      handle: '9xQ',
      reason: 'too-short',
      status: 'invalid',
    });
    expect(resolveRead(editor, '9xQe!', read)).toEqual({
      handle: '9xQe!',
      reason: 'malformed',
      status: 'invalid',
    });
    // A longer prefix and the whole id work.
    expect(resolveRead(editor, '9xQeLm', read)).toEqual({
      id: XQE,
      status: 'found',
    });
    expect(resolveRead(editor, XQE, read)).toEqual({id: XQE, status: 'found'});
  });

  test('a map changed between calls is read as it is now', () => {
    using editor = build(['abcd1111', 'wxyz2222', 'abcd9999']);
    appendParagraphs(editor, ['a', 'b']);
    const shown = readOf(editor);
    expect(resolveRead(editor, 'abcd', shown)).toEqual({
      id: 'abcd1111',
      status: 'found',
    });
    // The same map, refilled from a later read.
    appendParagraphs(editor, ['c']);
    shown.clear();
    for (const [id, handle] of readOf(editor)) {
      shown.set(id, handle);
    }
    const fresh = new Map(shown);
    for (const read of [shown, fresh]) {
      expect(resolveRead(editor, 'abcd', read)).toEqual({
        candidates: ['abcd1', 'abcd9'],
        handle: 'abcd',
        status: 'ambiguous',
      });
    }
  });

  test('works with a read of another editor state of the same document', () => {
    using editor = build([V1ST, XQE]);
    appendParagraphs(editor, ['a', 'b']);
    const json = editor.getEditorState().toJSON();
    const read = readOf(editor);
    using other = build([]);
    other.setEditorState(other.parseEditorState(json));
    expect(resolveRead(other, '9xQe', read)).toEqual({
      id: XQE,
      status: 'found',
    });
  });
});

describe('without the index', () => {
  test('a disabled extension falls back to a scan', () => {
    using editor = build([V1ST, XQE]);
    appendParagraphs(editor, ['a', 'b']);
    const before = handlesOf(editor);
    using disabled = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        configExtension(BlockIdExtension, {disabled: true}),
      ],
      name: '[block-handle-disabled]',
    });
    disabled.setEditorState(
      disabled.parseEditorState(editor.getEditorState().toJSON()),
    );
    expect(handlesOf(disabled)).toEqual(before);
    expect(resolve(disabled, '9xQe')).toEqual({id: XQE, status: 'found'});
    expect(resolve(disabled, 'V1St')).toEqual({id: V1ST, status: 'found'});
    expect(resolve(disabled, 'zzzz')).toEqual({
      handle: 'zzzz',
      status: 'not-found',
    });
    // A block added while disabled gets no id, and no handle.
    update(disabled, () => {
      $getRoot().append($createParagraphNode());
    });
    expect(
      disabled.read(() => $getBlockHandle($getRoot().getLastChildOrThrow())),
    ).toBe(null);
    // Its id set by hand is seen at once by the scan.
    update(disabled, () => {
      $setState($getRoot().getLastChildOrThrow(), blockIdState, 'V1StQabc');
    });
    expect(handlesOf(disabled)).toEqual({
      [V1ST]: 'V1StG',
      V1StQabc: 'V1StQ',
      [XQE]: '9xQe',
    });
  });

  test('disabling and enabling at runtime', () => {
    using editor = build([V1ST, XQE, 'V1StQabc']);
    appendParagraphs(editor, ['a', 'b']);
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      BlockIdExtension,
    ).output;
    disabled.value = true;
    expect(handlesOf(editor)).toEqual({[V1ST]: 'V1St', [XQE]: '9xQe'});
    update(editor, () => {
      $getRoot().append($createParagraphNode());
      $setState($getRoot().getLastChildOrThrow(), blockIdState, 'V1StQabc');
    });
    // The scan sees the id set by hand while disabled.
    expect(resolve(editor, 'V1St')).toEqual({
      candidates: ['V1StG', 'V1StQ'],
      handle: 'V1St',
      status: 'ambiguous',
    });
    disabled.value = false;
    // Indexed again, with the same handles.
    expect(handlesOf(editor)).toEqual({
      [V1ST]: 'V1StG',
      V1StQabc: 'V1StQ',
      [XQE]: '9xQe',
    });
    expect(resolve(editor, 'V1StQ')).toEqual({id: 'V1StQabc', status: 'found'});
  });
});

describe('headless and JSON-only use', () => {
  const stored: SerializedEditorState = {
    root: {
      children: [V1ST, XQE, RK8P].map((id, i) => ({
        $: {blockId: id},
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: `Block ${i}`,
            type: 'text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        type: 'paragraph',
        version: 1,
      })),
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as unknown as SerializedEditorState;

  test('a headless editor reads handles and applies an edit by handle', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [HeadlessExtension, RichTextExtension, BlockIdExtension],
      name: '[block-handle-headless]',
    });
    editor.setEditorState(editor.parseEditorState(stored));
    expect(handlesOf(editor)).toEqual({
      [RK8P]: 'Rk8p',
      [V1ST]: 'V1St',
      [XQE]: '9xQe',
    });
    update(editor, () => {
      const result = $resolveBlockHandle('9xQe');
      assert(result.status === 'found');
      result.node.replace(
        $createParagraphNode().append($createTextNode('Revenue grew 6%.')),
      );
    });
    const json = editor.getEditorState().toJSON();
    const second = json.root.children[1] as unknown as {
      $: {blockId: string};
      children: {text: string}[];
    };
    // The replacement keeps the id, so the handle keeps working.
    expect(second.$.blockId).toBe(XQE);
    expect(second.children[0].text).toBe('Revenue grew 6%.');
  });

  test('reading handles from a parsed state, without a DOM', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, BlockIdExtension],
      name: '[block-handle-json]',
    });
    const state = editor.parseEditorState(JSON.stringify(stored));
    editor.setEditorState(state);
    const handles = editor
      .getEditorState()
      .read(() => $getBlockHandles(), {editor});
    expect(handles).toEqual(
      new Map([
        [RK8P, 'Rk8p'],
        [V1ST, 'V1St'],
        [XQE, '9xQe'],
      ]),
    );
  });

  test('a document stored without ids gets handles of its positional ids', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, BlockIdExtension],
      name: '[block-handle-positional]',
    });
    const withoutIds = JSON.parse(JSON.stringify(stored));
    for (const child of withoutIds.root.children) {
      delete child.$;
    }
    editor.setEditorState(editor.parseEditorState(withoutIds));
    const handles = handlesOf(editor);
    expect(Object.keys(handles)).toHaveLength(3);
    for (const [id, handle] of Object.entries(handles)) {
      expect(id).toHaveLength(21);
      expect(handle!.length).toBeGreaterThanOrEqual(4);
      expect(id.startsWith(handle!)).toBe(true);
      expect(resolve(editor, handle!)).toEqual({id, status: 'found'});
    }
  });
});
