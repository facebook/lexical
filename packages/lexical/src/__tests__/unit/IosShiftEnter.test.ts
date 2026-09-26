/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  INSERT_LINE_BREAK_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: true,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: true,
  IS_SAFARI: true,
}));

function createTestEditor($initialEditorState: () => void) {
  return buildEditorFromExtensions({
    $initialEditorState,
    afterRegistration: editor => {
      const root = document.createElement('div');
      root.contentEditable = 'true';
      document.body.append(root);
      editor.setRootElement(root);
      return () => {
        editor.setRootElement(null);
        root.remove();
      };
    },
    dependencies: [RichTextExtension, ListExtension],
    name: '[test]',
  });
}

function pressEnter(editor: LexicalEditor, shiftKey: boolean) {
  const root = editor.getRootElement()!;
  const keydown = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    shiftKey,
  });
  root.dispatchEvent(keydown);
  expect(keydown.defaultPrevented).toBe(false);
  const beforeinput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertParagraph',
  });
  Object.defineProperty(beforeinput, 'getTargetRanges', {value: () => []});
  root.dispatchEvent(beforeinput);
  expect(beforeinput.defaultPrevented).toBe(true);
}

function paragraphs(editor: LexicalEditor) {
  return editor.read(() =>
    $getRoot()
      .getChildren()
      .map(node => ({
        text: node.getTextContent(),
        type: node.getType(),
      })),
  );
}

describe('iOS line breaks and auto-capitalization', () => {
  test('inserts a line break through an explicit command', () => {
    using editor = createTestEditor(() => {
      const text = $createTextNode('Some words');
      $getRoot().append($createParagraphNode().append(text));
      text.selectEnd();
    });
    editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
    expect(paragraphs(editor)).toEqual([
      {text: 'Some words\n', type: 'paragraph'},
    ]);
  });

  test('inserts a paragraph for unshifted Enter', () => {
    using editor = createTestEditor(() => {
      const text = $createTextNode('Some words');
      $getRoot().append($createParagraphNode().append(text));
      text.selectEnd();
    });
    pressEnter(editor, false);
    expect(paragraphs(editor)).toEqual([
      {text: 'Some words', type: 'paragraph'},
      {text: '', type: 'paragraph'},
    ]);
  });

  test('inserts another paragraph when iOS auto-shifts after Enter', () => {
    using editor = createTestEditor(() => {
      const text = $createTextNode('Some words');
      $getRoot().append($createParagraphNode().append(text));
      text.selectEnd();
    });
    pressEnter(editor, false);
    editor.read(() => {});
    pressEnter(editor, true);
    expect(paragraphs(editor)).toEqual([
      {text: 'Some words', type: 'paragraph'},
      {text: '', type: 'paragraph'},
      {text: '', type: 'paragraph'},
    ]);
  });

  test('inserts a paragraph before a heading with auto-shift active (#4335)', () => {
    using editor = createTestEditor(() => {
      const text = $createTextNode('Heading');
      $getRoot().append($createHeadingNode('h2').append(text));
      text.selectStart();
    });
    pressEnter(editor, true);
    expect(paragraphs(editor)).toEqual([
      {text: '', type: 'paragraph'},
      {text: 'Heading', type: 'heading'},
    ]);
  });

  test('exits an empty list item with auto-shift active (#4266)', () => {
    using editor = createTestEditor(() => {
      const item = $createListItemNode();
      $getRoot().append($createListNode('bullet').append(item));
      item.selectStart();
    });
    pressEnter(editor, true);
    expect(paragraphs(editor)).toEqual([{text: '', type: 'paragraph'}]);
  });
});
