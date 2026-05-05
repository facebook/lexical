/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
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
} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

import {
  MARKDOWN_TRANSFORMERS,
  MarkdownExtension,
} from '../../extensions/MarkdownExtension';
import {ToolbarStateExtension} from '../../extensions/ToolbarStateExtension';

let activeEditor: LexicalEditorWithDispose | null = null;

function createTestEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [MarkdownExtension, ToolbarStateExtension],
      name: 'toolbar-state-test',
      namespace: 'toolbar-state-test',
    }),
  );
  activeEditor = editor;
  return editor;
}

function getOutputs(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, ToolbarStateExtension).output;
}

afterEach(() => {
  if (activeEditor) {
    activeEditor.dispose();
    activeEditor = null;
  }
});

describe('ToolbarStateExtension', () => {
  test('canUndo / canRedo reflect command broadcasts', () => {
    const editor = createTestEditor();
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

  function $selectFirstLeaf(): void {
    let leaf: import('lexical').LexicalNode | null = $getRoot().getFirstChild();
    while (leaf !== null && $isElementNode(leaf)) {
      leaf = leaf.getFirstChild();
    }
    if (leaf !== null) {
      leaf.selectStart();
    }
  }

  test('blockType reflects the current top-level block', () => {
    const editor = createTestEditor();
    const {blockType} = getOutputs(editor);
    const dispose = blockType.subscribe(() => {});
    try {
      editor.update(
        () => {
          $convertFromMarkdownString('# heading', MARKDOWN_TRANSFORMERS);
          $selectFirstLeaf();
        },
        {discrete: true},
      );
      expect(blockType.value).toBe('h1');
      editor.update(
        () => {
          $convertFromMarkdownString('- one', MARKDOWN_TRANSFORMERS);
          $selectFirstLeaf();
        },
        {discrete: true},
      );
      expect(blockType.value).toBe('bullet');
      editor.update(
        () => {
          $convertFromMarkdownString('- [x] done', MARKDOWN_TRANSFORMERS);
          $selectFirstLeaf();
        },
        {discrete: true},
      );
      expect(blockType.value).toBe('check');
    } finally {
      dispose();
    }
  });

  test('isBold / isItalic / isCode start false and follow FORMAT_TEXT_COMMAND', () => {
    const editor = createTestEditor();
    const {isBold, isItalic, isCode} = getOutputs(editor);
    // Hold subscriptions so the computed signals stay watched and
    // pick up editor state updates eagerly.
    const dispose = [
      isBold.subscribe(() => {}),
      isItalic.subscribe(() => {}),
      isCode.subscribe(() => {}),
    ];
    try {
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
      expect(isBold.value).toBe(false);
      expect(isItalic.value).toBe(false);
      expect(isCode.value).toBe(false);
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      // Force a re-read of the editor state via a discrete no-op so
      // the test is robust regardless of when listeners settle.
      editor.read(() => undefined);
      // The selection's format flag is updated by formatText via the
      // command, so the selection-derived signals should now reflect
      // bold.
      expect(isBold.value).toBe(true);
    } finally {
      for (const fn of dispose) {
        fn();
      }
    }
  });
});
