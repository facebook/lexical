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
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function makeArrowEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });
}

// Structure used across tests:
//   root
//     decorator (block)   — index 0
//     paragraph > text    — index 1
//     decorator (block)   — index 2
function createBoundaryEditor() {
  return buildEditorFromExtensions({
    $initialEditorState: () => {
      const decorator1 = $createTestDecoratorNode().setIsInline(false);
      const paragraph = $createParagraphNode().append($createTextNode('text'));
      const decorator2 = $createTestDecoratorNode().setIsInline(false);
      $getRoot().clear().append(decorator1, paragraph, decorator2);
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode],
  });
}

function expectBlockCursorAt(editor: LexicalEditor, offset: number) {
  editor.read(() => {
    const s = $getSelection();
    assert($isRangeSelection(s));
    expect(s.isCollapsed()).toBe(true);
    expect(s.anchor.type).toBe('element');
    expect(s.anchor.key).toBe($getRoot().getKey());
    expect(s.anchor.offset).toBe(offset);
  });
}

describe('block cursor root boundary navigation (#8886)', () => {
  test('ArrowUp at block cursor before the top decorator does not leave the editor', () => {
    using editor = createBoundaryEditor();

    // Select the leading decorator (NodeSelection)
    editor.update(
      () => {
        const decorator = $getRoot().getChildAtIndex(0)!;
        const ns = $createNodeSelection();
        ns.add(decorator.getKey());
        $setSelection(ns);
      },
      {discrete: true},
    );

    // First ArrowUp collapses the NodeSelection to a block cursor at root:0
    editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));
    expectBlockCursorAt(editor, 0);

    // Second ArrowUp must be handled (preventDefault) so the native selection
    // cannot escape above the editor, and the lexical selection stays put.
    const event = makeArrowEvent('ArrowUp');
    const handled = editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event);
    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expectBlockCursorAt(editor, 0);
  });

  test('ArrowDown at block cursor after the bottom decorator does not leave the editor', () => {
    using editor = createBoundaryEditor();

    // Select the trailing decorator (NodeSelection)
    editor.update(
      () => {
        const decorator = $getRoot().getChildAtIndex(2)!;
        const ns = $createNodeSelection();
        ns.add(decorator.getKey());
        $setSelection(ns);
      },
      {discrete: true},
    );

    // First ArrowDown collapses the NodeSelection to a block cursor at root:3
    editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, makeArrowEvent('ArrowDown'));
    expectBlockCursorAt(editor, 3);

    // Second ArrowDown must be handled (preventDefault) so the native
    // selection cannot escape below the editor.
    const event = makeArrowEvent('ArrowDown');
    const handled = editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event);
    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expectBlockCursorAt(editor, 3);
  });
});
