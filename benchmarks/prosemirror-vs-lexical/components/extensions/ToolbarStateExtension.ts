import {computed, EditorStateExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {$isListNode} from '@lexical/list';
import {$isHeadingNode, $isQuoteNode} from '@lexical/rich-text';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  defineExtension,
} from 'lexical';
import {$isCodeNode} from '@lexical/code';

// All block types this benchmark's toolbar can switch between.
export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'code';

interface ToolbarSelectionState {
  blockType: BlockType;
  isBold: boolean;
  isItalic: boolean;
  isCode: boolean;
  isLink: boolean;
}

const DEFAULT_SELECTION_STATE: ToolbarSelectionState = {
  blockType: 'paragraph',
  isBold: false,
  isCode: false,
  isItalic: false,
  isLink: false,
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
    blockType = topLevelElement.getTag() as BlockType;
  } else if ($isListNode(topLevelElement)) {
    blockType = topLevelElement.getListType() as BlockType;
  } else if ($isQuoteNode(topLevelElement)) {
    blockType = 'quote';
  } else if ($isCodeNode(topLevelElement)) {
    blockType = 'code';
  }
  // Detect a link in the surrounding inline scope (an ancestor LinkNode
  // counts as "current selection is in a link").
  const parentLink = $findMatchingParent(
    anchorNode,
    node => node.getType() === 'link' || node.getType() === 'autolink',
  );
  return {
    blockType,
    isBold: selection.hasFormat('bold'),
    isCode: selection.hasFormat('code'),
    isItalic: selection.hasFormat('italic'),
    isLink: parentLink !== null,
  };
}

/**
 * Toolbar state — modeled after the markdown-editor example's
 * `ToolbarStateExtension`. Computes per-selection signals lazily off
 * the `EditorStateExtension` signal so the React toolbar only
 * re-renders when its inputs actually change.
 *
 * canUndo/canRedo are forwarded directly from `HistoryExtension`'s
 * output signals (those are already cheap ReadonlySignal<boolean>
 * derivations).
 */
export const ToolbarStateExtension = defineExtension({
  build(editor, _config, state) {
    const editorState = state.getDependency(EditorStateExtension).output;
    const historyOutput = state.getDependency(HistoryExtension).output;
    const selection = computed(() =>
      editorState.value.read($readSelectionState, {editor}),
    );
    return {
      blockType: computed(() => selection.value.blockType),
      canRedo: historyOutput.canRedo,
      canUndo: historyOutput.canUndo,
      isBold: computed(() => selection.value.isBold),
      isCode: computed(() => selection.value.isCode),
      isItalic: computed(() => selection.value.isItalic),
      isLink: computed(() => selection.value.isLink),
    };
  },
  dependencies: [EditorStateExtension, HistoryExtension],
  name: 'prosemirror-vs-lexical-benchmark/ToolbarState',
});
