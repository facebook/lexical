/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  NormalizeTripleClickSelectionExtension,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  type LexicalEditor,
  type ParagraphNode,
  type TextNode,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

function setUpEditor() {
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Paragraph 1')),
          $createParagraphNode().append($createTextNode('Paragraph 2')),
        );
      },
      dependencies: [NormalizeTripleClickSelectionExtension],
      name: 'normalize-triple-click-selection-test',
      register: ed => {
        const rootElement = document.createElement('div');
        rootElement.contentEditable = 'true';
        document.body.appendChild(rootElement);
        ed.setRootElement(rootElement);
        return () => {
          ed.setRootElement(null);
          rootElement.remove();
        };
      },
    }),
  );
  // Render the initial paragraphs before selecting into them
  editor.read(() => {});
  return editor;
}

/** What a triple click selects: all of paragraph 1 up to the start of paragraph 2 */
function overselect(editor: LexicalEditor) {
  editor.update(
    () => {
      const [p1, p2] = $getRoot().getChildren<ParagraphNode>();
      p1.getFirstChildOrThrow<TextNode>().select(0, 0);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.focus.set(p2.getKey(), 0, 'element');
      }
    },
    {discrete: true},
  );
}

function readFocus(editor: LexicalEditor) {
  return editor.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }
    return {
      offset: selection.focus.offset,
      text: selection.focus.getNode().getTextContent(),
    };
  });
}

function mouseDown(editor: LexicalEditor, detail: number) {
  editor
    .getRootElement()!
    .dispatchEvent(new MouseEvent('mousedown', {bubbles: true, detail}));
}

const FIXED = {offset: 'Paragraph 1'.length, text: 'Paragraph 1'};
const OVERSELECTED = {offset: 0, text: 'Paragraph 2'};

describe('NormalizeTripleClickSelectionExtension', () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ['Date']});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('trims the selection change that follows a triple click', () => {
    using editor = setUpEditor();
    mouseDown(editor, 3);
    overselect(editor);
    expect(readFocus(editor)).toEqual(FIXED);
  });

  test('trims the selection change however late it arrives', () => {
    using editor = setUpEditor();
    mouseDown(editor, 3);
    vi.advanceTimersByTime(1000);
    overselect(editor);
    expect(readFocus(editor)).toEqual(FIXED);
  });

  test('trims after a fourth click', () => {
    using editor = setUpEditor();
    mouseDown(editor, 4);
    overselect(editor);
    expect(readFocus(editor)).toEqual(FIXED);
  });

  test('only trims the first selection change', () => {
    using editor = setUpEditor();
    mouseDown(editor, 3);
    overselect(editor);
    editor.update(() => $getRoot().selectStart(), {discrete: true});
    overselect(editor);
    expect(readFocus(editor)).toEqual(OVERSELECTED);
  });

  test('a keydown cancels it', () => {
    using editor = setUpEditor();
    mouseDown(editor, 3);
    editor
      .getRootElement()!
      .dispatchEvent(new KeyboardEvent('keydown', {bubbles: true}));
    overselect(editor);
    expect(readFocus(editor)).toEqual(OVERSELECTED);
  });

  test('a single or double click cancels it', () => {
    for (const detail of [1, 2]) {
      using editor = setUpEditor();
      mouseDown(editor, 3);
      mouseDown(editor, detail);
      overselect(editor);
      expect(readFocus(editor)).toEqual(OVERSELECTED);
    }
  });

  test('a modifier key on its own does not cancel it', () => {
    using editor = setUpEditor();
    mouseDown(editor, 3);
    for (const key of ['Control', 'Alt', 'Shift', 'Meta']) {
      editor
        .getRootElement()!
        .dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key}));
    }
    overselect(editor);
    expect(readFocus(editor)).toEqual(FIXED);
  });

  test('a click or keydown outside the editor cancels it', () => {
    for (const event of [
      new MouseEvent('mousedown', {bubbles: true, detail: 1}),
      new KeyboardEvent('keydown', {bubbles: true, key: 'z'}),
    ]) {
      using editor = setUpEditor();
      mouseDown(editor, 3);
      const toolbar = document.createElement('button');
      document.body.appendChild(toolbar);
      toolbar.dispatchEvent(event);
      toolbar.remove();
      overselect(editor);
      expect(readFocus(editor)).toEqual(OVERSELECTED);
    }
  });

  test('a triple click outside the editor does not arm it', () => {
    using editor = setUpEditor();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(
      new MouseEvent('mousedown', {bubbles: true, detail: 3}),
    );
    outside.remove();
    overselect(editor);
    expect(readFocus(editor)).toEqual(OVERSELECTED);
  });

  test('does nothing without a triple click', () => {
    using editor = setUpEditor();
    overselect(editor);
    expect(readFocus(editor)).toEqual(OVERSELECTED);
  });
});
