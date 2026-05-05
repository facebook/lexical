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
  $createTextNode,
  $getRoot,
  $isElementNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  defineExtension,
  FORMAT_TEXT_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  MARKDOWN_TRANSFORMERS,
  MarkdownExtension,
} from '../../extensions/MarkdownExtension';
import {
  type BlockType,
  ToolbarStateExtension,
} from '../../extensions/ToolbarStateExtension';

function createTestEditor(): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [MarkdownExtension, ToolbarStateExtension],
      name: 'toolbar-state-test',
      namespace: 'toolbar-state-test',
    }),
  );
}

function getOutputs(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, ToolbarStateExtension).output;
}

function $selectFirstLeaf(): void {
  let leaf: LexicalNode | null = $getRoot().getFirstChild();
  while (leaf !== null && $isElementNode(leaf)) {
    leaf = leaf.getFirstChild();
  }
  if (leaf !== null) {
    leaf.selectStart();
  }
}

describe('ToolbarStateExtension', () => {
  test('canUndo / canRedo reflect command broadcasts', () => {
    using editor = createTestEditor();
    const {canUndo, canRedo} = getOutputs(editor);
    expect(canUndo.value).toBe(false);
    expect(canRedo.value).toBe(false);
    editor.dispatchCommand(CAN_UNDO_COMMAND, true);
    expect(canUndo.value).toBe(true);
    editor.dispatchCommand(CAN_REDO_COMMAND, true);
    expect(canRedo.value).toBe(true);
    editor.dispatchCommand(CAN_UNDO_COMMAND, false);
    expect(canUndo.value).toBe(false);
  });

  test('blockType reflects the current top-level block', () => {
    using editor = createTestEditor();
    const {blockType} = getOutputs(editor);
    let currentBlockType: BlockType = 'paragraph';
    using _watch = effect(() => {
      currentBlockType = blockType.value;
    });
    editor.update(
      () => {
        $convertFromMarkdownString('# heading', MARKDOWN_TRANSFORMERS);
        $selectFirstLeaf();
      },
      {discrete: true},
    );
    expect(currentBlockType).toBe('h1');
    editor.update(
      () => {
        $convertFromMarkdownString('- one', MARKDOWN_TRANSFORMERS);
        $selectFirstLeaf();
      },
      {discrete: true},
    );
    expect(currentBlockType).toBe('bullet');
    editor.update(
      () => {
        $convertFromMarkdownString('- [x] done', MARKDOWN_TRANSFORMERS);
        $selectFirstLeaf();
      },
      {discrete: true},
    );
    expect(currentBlockType).toBe('check');
  });

  test('isBold / isItalic / isCode start false and follow FORMAT_TEXT_COMMAND', () => {
    using editor = createTestEditor();
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
    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChild();
        if (!$isElementNode(paragraph)) {
          return;
        }
        const text = $createTextNode('hello');
        paragraph.append(text);
        text.select(0, 5);
      },
      {discrete: true},
    );
    expect(bold).toBe(false);
    expect(italic).toBe(false);
    expect(code).toBe(false);
    // Wrap the dispatch in a discrete update so listeners fire
    // synchronously before control returns, ensuring the watched
    // signals have settled.
    editor.update(
      () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      },
      {discrete: true},
    );
    // The selection's format flag is updated by formatText via the
    // command, so the selection-derived locals should now reflect bold.
    expect(bold).toBe(true);
  });
});
