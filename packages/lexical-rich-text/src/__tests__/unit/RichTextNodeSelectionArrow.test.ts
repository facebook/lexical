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
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function createEditor() {
  return buildEditorFromExtensions({
    $initialEditorState: () => {
      $getRoot()
        .clear()
        .append(
          $createTestDecoratorNode().setIsInline(false),
          $createTestDecoratorNode().setIsInline(false),
          $createTestDecoratorNode().setIsInline(false),
          $createParagraphNode().append($createTextNode('text')),
        );
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode],
  });
}

function makeArrowEvent(key: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    shiftKey,
  });
}

function selectNodes(editor: LexicalEditor, indexes: number[]): void {
  editor.update(
    () => {
      const selection = $createNodeSelection();
      for (const index of indexes) {
        selection.add($getRoot().getChildAtIndex(index)!.getKey());
      }
      $setSelection(selection);
    },
    {discrete: true},
  );
}

function expectRootRange(
  editor: LexicalEditor,
  anchorOffset: number,
  focusOffset: number,
): void {
  editor.read(() => {
    const selection = $getSelection();
    assert($isRangeSelection(selection));
    expect(selection.anchor).toMatchObject({
      key: $getRoot().getKey(),
      offset: anchorOffset,
      type: 'element',
    });
    expect(selection.focus).toMatchObject({
      key: $getRoot().getKey(),
      offset: focusOffset,
      type: 'element',
    });
  });
}

describe('Shift+Arrow on a NodeSelection (#9062)', () => {
  test.for<{
    command: LexicalCommand<KeyboardEvent>;
    key: string;
  }>([
    {command: KEY_ARROW_RIGHT_COMMAND, key: 'ArrowRight'},
    {command: KEY_ARROW_DOWN_COMMAND, key: 'ArrowDown'},
  ])(
    '$key extends the selected decorator to the next node',
    ({command, key}) => {
      using editor = createEditor();
      selectNodes(editor, [0]);

      const event = makeArrowEvent(key, true);
      const handled = editor.dispatchCommand(command, event);

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expectRootRange(editor, 0, 2);
    },
  );

  test.for<{
    command: LexicalCommand<KeyboardEvent>;
    key: string;
  }>([
    {command: KEY_ARROW_LEFT_COMMAND, key: 'ArrowLeft'},
    {command: KEY_ARROW_UP_COMMAND, key: 'ArrowUp'},
  ])(
    '$key extends the selected decorator to the previous node',
    ({command, key}) => {
      using editor = createEditor();
      selectNodes(editor, [1]);

      const event = makeArrowEvent(key, true);
      const handled = editor.dispatchCommand(command, event);

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expectRootRange(editor, 2, 0);
    },
  );

  test('orders an adjacent multi-node selection before extending it', () => {
    using editor = createEditor();
    selectNodes(editor, [1, 0]);

    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight', true),
    );

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor).toMatchObject({
        key: $getRoot().getKey(),
        offset: 0,
        type: 'element',
      });
      expect(selection.focus).toMatchObject({
        key: $getRoot().getKey(),
        offset: 3,
        type: 'element',
      });
    });
  });

  test('does not convert a discontiguous NodeSelection to a range', () => {
    using editor = createEditor();
    selectNodes(editor, [0, 2]);

    const event = makeArrowEvent('ArrowRight', true);
    const handled = editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expectRootRange(editor, 1, 1);
  });
});
