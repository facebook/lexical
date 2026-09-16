/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $isPageCountNode,
  $isPageNumberNode,
  DEFAULT_SLOT_SETUP,
  INSERT_PAGE_COUNT_COMMAND,
  INSERT_PAGE_NUMBER_COMMAND,
  PageCounterNodesExtension,
  pageHeaderState,
  resolveSlotVariant,
} from '../../plugins/PagesExtension';

const STATE = {
  root: {
    children: [],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

describe('pageHeaderState', () => {
  it('keeps serialized states per variant and drops junk', () => {
    expect(
      pageHeaderState.parse({default: STATE, even: null, first: 'nope'}),
    ).toEqual({default: STATE, even: null});
  });

  it('returns null when nothing usable is present', () => {
    expect(pageHeaderState.parse(null)).toBeNull();
    expect(pageHeaderState.parse([STATE])).toBeNull();
    expect(pageHeaderState.parse({})).toBeNull();
    expect(pageHeaderState.parse({default: {}})).toBeNull();
  });

  it('compares content structurally', () => {
    expect(
      pageHeaderState.isEqual({default: STATE}, {default: {...STATE}}),
    ).toBe(true);
    expect(pageHeaderState.isEqual({default: STATE}, {even: STATE})).toBe(
      false,
    );
    expect(pageHeaderState.isEqual(null, {default: STATE})).toBe(false);
  });
});

describe('resolveSlotVariant', () => {
  const both = {
    differentEvenPages: true,
    differentFirstPage: true,
    enabled: true,
  };
  it.each([
    [DEFAULT_SLOT_SETUP, 0, 'default'],
    [DEFAULT_SLOT_SETUP, 1, 'default'],
    [{...DEFAULT_SLOT_SETUP, differentFirstPage: true}, 0, 'first'],
    [{...DEFAULT_SLOT_SETUP, differentFirstPage: true}, 1, 'default'],
    [{...DEFAULT_SLOT_SETUP, differentEvenPages: true}, 0, 'default'],
    [{...DEFAULT_SLOT_SETUP, differentEvenPages: true}, 1, 'even'],
    [{...DEFAULT_SLOT_SETUP, differentEvenPages: true}, 2, 'default'],
    [{...DEFAULT_SLOT_SETUP, differentEvenPages: true}, 3, 'even'],
    [both, 0, 'first'],
    [both, 1, 'even'],
    [both, 2, 'default'],
  ] as const)('%o page %i -> %s', (setup, pageIndex, expected) => {
    expect(resolveSlotVariant(setup, pageIndex)).toBe(expected);
  });
});

describe('page counter nodes', () => {
  function buildEditor() {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RichTextExtension, PageCounterNodesExtension],
        name: 'PagesHeaderFooter.test',
      }),
    );
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createTextNode('Page '),
        );
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    return editor;
  }

  it('inserts inline placeholders with a textual stand-in', () => {
    const editor = buildEditor();
    editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, undefined);
    editor.update(
      () => {
        $getRoot().getLastDescendant()!.selectEnd();
        $getRoot().getFirstChild()!.selectEnd().insertText(' of ');
      },
      {discrete: true},
    );
    editor.dispatchCommand(INSERT_PAGE_COUNT_COMMAND, undefined);
    editor.read(() => {
      const nodes = $getRoot().getAllTextNodes();
      expect(nodes.map(n => n.getTextContent()).join('')).toBe('Page  of ');
      const paragraph = $getRoot().getFirstChild();
      const children = paragraph!.getChildren();
      expect(children.some($isPageNumberNode)).toBe(true);
      expect(children.some($isPageCountNode)).toBe(true);
      expect($getRoot().getTextContent()).toBe('Page # of ##');
    });
    editor.setRootElement(null);
  });

  it('round-trips through JSON', () => {
    const editor = buildEditor();
    editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, undefined);
    // Commands update on a microtask; force the commit before serializing.
    const json = editor.read(() =>
      JSON.stringify(editor.getEditorState().toJSON()),
    );
    expect(json).toContain('"type":"page-number"');
    const restored = buildEditor();
    restored.setEditorState(restored.parseEditorState(json));
    restored.read(() => {
      expect($getRoot().getTextContent()).toBe('Page #');
    });
    editor.setRootElement(null);
    restored.setRootElement(null);
  });
});
