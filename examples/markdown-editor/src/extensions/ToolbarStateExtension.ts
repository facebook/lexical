/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {computed, EditorStateExtension, signal} from '@lexical/extension';
import {$isListNode} from '@lexical/list';
import {$isHeadingNode} from '@lexical/rich-text';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  defineExtension,
} from 'lexical';

import {MarkdownExtension} from './MarkdownExtension';

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'number'
  | 'check';

interface ToolbarSelectionState {
  blockType: BlockType;
  isBold: boolean;
  isItalic: boolean;
  isCode: boolean;
}

const DEFAULT_SELECTION_STATE: ToolbarSelectionState = {
  blockType: 'paragraph',
  isBold: false,
  isCode: false,
  isItalic: false,
};

function $readSelectionState(): ToolbarSelectionState {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return DEFAULT_SELECTION_STATE;
  }
  const anchorNode = selection.anchor.getNode();
  const topLevelElement =
    $findMatchingParent(anchorNode, e => {
      const parent = e.getParent();
      return parent !== null && $isRootOrShadowRoot(parent);
    }) ?? anchorNode.getTopLevelElementOrThrow();
  let blockType: BlockType = 'paragraph';
  if ($isHeadingNode(topLevelElement)) {
    const tag = topLevelElement.getTag();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blockType = tag;
    }
  } else if ($isListNode(topLevelElement)) {
    blockType = topLevelElement.getListType();
  }
  return {
    blockType,
    isBold: selection.hasFormat('bold'),
    isCode: selection.hasFormat('code'),
    isItalic: selection.hasFormat('italic'),
  };
}

/**
 * Owns all of the reactive state the formatting toolbar reads:
 *
 * - `canUndo` / `canRedo` are updated from the editor's
 *   {@link CAN_UNDO_COMMAND} / {@link CAN_REDO_COMMAND} broadcasts.
 * - The selection-derived signals (`blockType`, `isBold`, `isItalic`,
 *   `isCode`) are computed off the {@link EditorStateExtension} signal,
 *   so they recompute lazily whenever the editor state changes.
 *
 * The React `<ToolbarPlugin />` component only consumes these signals
 * via `useExtensionSignalValue` and otherwise dispatches commands.
 */
export const ToolbarStateExtension = defineExtension({
  build(editor, _config, state) {
    const editorState = state.getDependency(EditorStateExtension).output;
    const selection = computed(() =>
      editorState.value.read($readSelectionState, {editor}),
    );
    return {
      blockType: computed(() => selection.value.blockType),
      canRedo: signal(false),
      canUndo: signal(false),
      isBold: computed(() => selection.value.isBold),
      isCode: computed(() => selection.value.isCode),
      isItalic: computed(() => selection.value.isItalic),
    };
  },
  dependencies: [MarkdownExtension, EditorStateExtension],
  name: '@lexical/markdown-editor-example/ToolbarState',
  register(editor, _config, state) {
    const {canUndo, canRedo} = state.getOutput();
    return mergeRegister(
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        payload => {
          canUndo.value = payload;
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        payload => {
          canRedo.value = payload;
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  },
});
