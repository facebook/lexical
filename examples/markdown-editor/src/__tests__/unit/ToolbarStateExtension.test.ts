/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  effect,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {$convertFromMarkdownString} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  defineExtension,
  FORMAT_TEXT_COMMAND,
  HISTORY_PUSH_TAG,
  type LexicalEditorWithDispose,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {
  MARKDOWN_TRANSFORMERS,
  MarkdownExtension,
} from '../../extensions/MarkdownExtension';
import {
  type BlockType,
  ToolbarStateExtension,
} from '../../extensions/ToolbarStateExtension';

function createTestEditor(
  $initialEditorState?: () => void,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState,
      dependencies: [MarkdownExtension, ToolbarStateExtension],
      name: 'toolbar-state-test',
      namespace: 'toolbar-state-test',
    }),
  );
}

function getOutputs(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, ToolbarStateExtension).output;
}

function $importAndSelect(markdown: string): void {
  $convertFromMarkdownString(markdown, MARKDOWN_TRANSFORMERS);
  $getRoot().selectEnd();
}

describe('ToolbarStateExtension', () => {
  test('canUndo / canRedo follow the history stacks', () => {
    using editor = createTestEditor();
    const {canUndo, canRedo} = getOutputs(editor);
    let undoVal = false;
    let redoVal = false;
    using _watch = effect(() => {
      undoVal = canUndo.value;
      redoVal = canRedo.value;
    });
    expect(undoVal).toBe(false);
    expect(redoVal).toBe(false);
    // History only pushes on the second push (the first establishes
    // `current`). HISTORY_PUSH_TAG forces a push and bypasses the
    // typing-merge heuristic.
    function appendChar(ch: string): void {
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild();
          assert($isElementNode(paragraph), 'Expecting ElementNode');
          paragraph.append($createTextNode(ch));
        },
        {discrete: true, tag: HISTORY_PUSH_TAG},
      );
    }
    appendChar('a');
    appendChar('b');
    expect(undoVal).toBe(true);
    expect(redoVal).toBe(false);
    editor.update(() => editor.dispatchCommand(UNDO_COMMAND, undefined), {
      discrete: true,
    });
    expect(undoVal).toBe(false);
    expect(redoVal).toBe(true);
    editor.update(() => editor.dispatchCommand(REDO_COMMAND, undefined), {
      discrete: true,
    });
    expect(undoVal).toBe(true);
    expect(redoVal).toBe(false);
  });

  test('blockType reflects the current top-level block', () => {
    using editor = createTestEditor();
    const {blockType} = getOutputs(editor);
    let currentBlockType: BlockType = 'paragraph';
    using _watch = effect(() => {
      currentBlockType = blockType.value;
    });
    editor.update(() => $importAndSelect('# heading'), {discrete: true});
    expect(currentBlockType).toBe('h1');
    editor.update(() => $importAndSelect('- one'), {discrete: true});
    expect(currentBlockType).toBe('bullet');
    editor.update(() => $importAndSelect('- [x] done'), {discrete: true});
    expect(currentBlockType).toBe('check');
  });

  test('isBold / isItalic / isCode start false and follow FORMAT_TEXT_COMMAND', () => {
    using editor = createTestEditor(() => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('hello')))
        .selectEnd();
    });
    const {isBold, isItalic, isCode} = getOutputs(editor);
    // Mirror the signals into locals via an effect so the computed
    // signals stay watched and the assertions can read the locals.
    let bold = false;
    let italic = false;
    let code = false;
    using _watch = effect(() => {
      bold = isBold.value;
      italic = isItalic.value;
      code = isCode.value;
    });
    expect(bold).toBe(false);
    expect(italic).toBe(false);
    expect(code).toBe(false);
    // Wrap the dispatch in a discrete update so listeners fire
    // synchronously before control returns, ensuring the watched
    // signals have settled.
    editor.update(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'), {
      discrete: true,
    });
    // The selection's format flag is updated by formatText via the
    // command, so the selection-derived locals should now reflect bold.
    expect(bold).toBe(true);
  });
});
