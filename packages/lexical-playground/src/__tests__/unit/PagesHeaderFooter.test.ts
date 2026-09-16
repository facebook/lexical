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
  type ElementNode,
  type SerializedEditorState,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $isPageCountNode,
  $isPageNumberNode,
  $writeCountersIntoEditor,
  DEFAULT_SLOT_SETUP,
  INSERT_PAGE_COUNT_COMMAND,
  INSERT_PAGE_NUMBER_COMMAND,
  PageCounterNodesExtension,
  pageHeaderState,
  resolveSlotVariant,
  writeCountersIntoDOM,
} from '../../plugins/PagesExtension';

const STATE: SerializedEditorState = {
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

  it('inserts token text nodes that format like text', () => {
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
      expect(nodes.map(n => n.getTextContent()).join('')).toBe('Page # of ##');
      const children = $getRoot()
        .getFirstChildOrThrow<ElementNode>()
        .getChildren();
      const pageNumber = children.find($isPageNumberNode)!;
      expect(pageNumber.isToken()).toBe(true);
      expect(children.some($isPageCountNode)).toBe(true);
      expect($getRoot().getTextContent()).toBe('Page # of ##');
    });
    editor.update(
      () => {
        const pageNumber = $getRoot()
          .getFirstChildOrThrow<ElementNode>()
          .getChildren()
          .find($isPageNumberNode)!;
        pageNumber.toggleFormat('bold');
      },
      {discrete: true},
    );
    editor.read(() => {
      const pageNumber = $getRoot()
        .getFirstChildOrThrow<ElementNode>()
        .getChildren()
        .find($isPageNumberNode)!;
      expect(pageNumber.hasFormat('bold')).toBe(true);
    });
    editor.setRootElement(null);
  });

  it('writes real numbers into the editor and into rendered DOM', () => {
    const editor = buildEditor();
    editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, undefined);
    editor.dispatchCommand(INSERT_PAGE_COUNT_COMMAND, undefined);
    editor.update(() => $writeCountersIntoEditor(3, 7), {discrete: true});
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Page 37');
    });
    const dom = document.createElement('div');
    dom.innerHTML =
      '<p><span data-lexical-page-number="true"><strong>#</strong></span>' +
      ' of <span data-lexical-page-count="true">##</span></p>';
    writeCountersIntoDOM(dom, 2, 9);
    expect(dom.textContent).toBe('2 of 9');
    expect(dom.querySelector('strong')!.textContent).toBe('2');
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
