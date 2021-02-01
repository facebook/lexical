/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineEditor,
  View,
  NodeKey,
  Selection,
  OutlineNode,
} from 'outline';

import {BlockNode, TextNode} from 'outline';
import {useCallback, useEffect} from 'react';
import useOutlineEventWrapper from 'outline-react/useOutlineEventWrapper';
import {CAN_USE_BEFORE_INPUT, IS_SAFARI} from 'outline-react/OutlineEnv';
import {
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isLineBreak,
  isParagraph,
  isBold,
  isItalic,
} from 'outline-react/OutlineHotKeys';
import {
  deleteBackward,
  deleteForward,
  deleteLineBackward,
  deleteLineForward,
  deleteWordBackward,
  deleteWordForward,
  insertParagraph,
  formatText,
  insertNodes,
  insertText,
  removeText,
  getNodesInRange,
} from 'outline-selection-helpers';
import {IS_CHROME} from './OutlineEnv';

// FlowFixMe: Flow doesn't know of the CompositionEvent?
// $FlowFixMe: TODO
type CompositionEvent = Object;
// $FlowFixMe: TODO
type UnknownState = Object;

const emptyObject: {} = {};

const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;

function createNodeFromNodeData(nodeData: {...}, NodeType): OutlineNode {
  const node = new NodeType();
  for (const property in nodeData) {
    if (property !== 'key' && property !== 'children') {
      // $FlowFixMe: need to fix this
      node[property] = nodeData[property];
    }
  }
  return node;
}

function generateNode(
  key: NodeKey,
  parentKey: null | NodeKey,
  nodeMap: {[NodeKey]: OutlineNode},
  editor: OutlineEditor,
): OutlineNode {
  const nodeData = nodeMap[key];
  const type = nodeData.type;
  const NodeType = editor._registeredNodeTypes.get(type);
  if (NodeType === undefined) {
    throw new Error('generateNode: type "' + type + '" + not found');
  }
  const node = createNodeFromNodeData(nodeData, NodeType);
  node.parent = parentKey;
  const newKey = node.key;
  if (node instanceof BlockNode) {
    // $FlowFixMe: valid code
    const children = nodeData.children;
    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const child = generateNode(childKey, newKey, nodeMap, editor);
      const newChildKey = child.key;
      node.children.push(newChildKey);
    }
  }
  return node;
}

function generateNodes(
  nodeRange: {range: Array<NodeKey>, nodeMap: {[NodeKey]: OutlineNode}},
  editor: OutlineEditor,
): Array<OutlineNode> {
  const {range, nodeMap} = nodeRange;
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const node = generateNode(key, null, nodeMap, editor);
    nodes.push(node);
  }
  return nodes;
}

function insertDataTransfer(
  dataTransfer: DataTransfer,
  selection: Selection,
  state: UnknownState,
  view: View,
  editor: OutlineEditor,
) {
  if (state.richText) {
    const outlineNodesString = dataTransfer.getData(
      'application/x-outline-nodes',
    );

    if (outlineNodesString) {
      const nodeRange = JSON.parse(outlineNodesString);
      const nodes = generateNodes(nodeRange, editor);
      insertNodes(selection, nodes);
      return;
    }
  }
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    insertText(selection, text);
  }
}

function isEmojiText(node: OutlineNode): boolean {
  if (node instanceof TextNode) {
    return node.getTextContent().replace(/[\u0000-\u1eeff]/g, '').length === 0;
  }
  return false;
}

function isModifierActive(event: KeyboardEvent): boolean {
  // We don't need to check for metaKey here as we already
  // do this before we reach this block.
  return event.shiftKey || event.altKey || event.ctrlKey;
}

function onKeyDown(
  event: KeyboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  editor.setKeyDown(true);
  if (editor.isComposing()) {
    return;
  }
  const selection = view.getSelection();
  if (selection === null) {
    return;
  }
  let shouldPreventDefault = false;
  // If we can use native beforeinput, we handle
  // these cases in that function.
  if (!CAN_USE_BEFORE_INPUT) {
    if (isDeleteBackward(event)) {
      shouldPreventDefault = true;
      deleteBackward(selection);
    } else if (isDeleteForward(event)) {
      shouldPreventDefault = true;
      deleteForward(selection);
    } else if (isDeleteLineBackward(event)) {
      shouldPreventDefault = true;
      deleteLineBackward(selection);
    } else if (isDeleteLineForward(event)) {
      shouldPreventDefault = true;
      deleteLineForward(selection);
    } else if (isDeleteWordBackward(event)) {
      shouldPreventDefault = true;
      deleteWordBackward(selection);
    } else if (isDeleteWordForward(event)) {
      shouldPreventDefault = true;
      deleteWordForward(selection);
    } else if (isParagraph(event)) {
      shouldPreventDefault = true;
      if (state.richText) {
        insertParagraph(selection);
      }
    } else if (isLineBreak(event)) {
      shouldPreventDefault = true;
      insertText(selection, '\n');
    }
  }
  // Used for screen readers and speech tooling
  if (state.richText) {
    if (isBold(event)) {
      shouldPreventDefault = true;
      formatText(selection, FORMAT_BOLD);
    } else if (isItalic(event)) {
      shouldPreventDefault = true;
      formatText(selection, FORMAT_ITALIC);
    }
  }
  const editorElement = editor.getEditorElement();
  // We need to do some extra work that normal default
  // browser controls don't offer us. Specifically, we need
  // to do some work around handling of selecting nodes
  // that are either immutable or segmented, as these
  // nodes aren't selectable by default. The logic below
  // makes them selectable though. We also need to do some
  // work around moving selection to the next block when
  // the right-arrow is pressed, otherwise it gets stuck
  // at the end of the block. We don't need to do this for
  // left-arrow (strangely) but it's maybe worth while that
  // we keep the logic for both for now.
  if (selection.isCaret() && editorElement !== null && !event.metaKey) {
    const key = event.key;
    const isLeftArrow = key === 'ArrowLeft';
    const isRightArrow = key === 'ArrowRight';
    const isDelete = key === 'Delete';
    const isBackspace = key === 'Backspace';

    if (isLeftArrow || isRightArrow || isDelete || isBackspace) {
      const anchorNode = selection.getAnchorNode();
      const offset = selection.anchorOffset;

      if (isLeftArrow || isBackspace) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (prevSibling !== null) {
          if (
            offset === 0 &&
            (prevSibling.isImmutable() || prevSibling.isSegmented())
          ) {
            if (isLeftArrow && !isEmojiText(prevSibling)) {
              // TODO Announce node for screen readers
            } else if (!isModifierActive(event)) {
              deleteBackward(selection);
              shouldPreventDefault = true;
            }
          }
        }
      } else {
        const nextSibling = anchorNode.getNextSibling();
        const textContent = anchorNode.getTextContent();
        const selectionAtEnd = textContent.length === offset;

        if (nextSibling === null) {
          // When we are on an empty text node, native right arrow
          // doesn't work correctly in some browsers. So to ensure it
          // does work correctly, we can force it and prevent the native
          // event so that our fix is always used.
          if (isRightArrow && textContent === '' && selectionAtEnd) {
            const parent = anchorNode.getParentOrThrow();
            const parentSibling = parent.getNextSibling();

            if (parentSibling instanceof BlockNode) {
              const firstChild = parentSibling.getFirstChild();
              if (firstChild instanceof TextNode) {
                firstChild.select(0, 0);
                shouldPreventDefault = true;
              }
            }
          }
        } else {
          if (
            selectionAtEnd &&
            (nextSibling.isImmutable() || nextSibling.isSegmented())
          ) {
            if (isRightArrow && !isEmojiText(nextSibling)) {
              // TODO Announce node for screen readers
            } else if (!isModifierActive(event)) {
              deleteForward(selection);
              shouldPreventDefault = true;
            }
          }
        }
      }
    }
  }
  if (shouldPreventDefault) {
    event.preventDefault();
  }
}

function onPastePolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  const selection = view.getSelection();
  const clipboardData = event.clipboardData;
  if (clipboardData != null && selection !== null) {
    insertDataTransfer(clipboardData, selection, state, view, editor);
  }
}

function onDropPolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO
  event.preventDefault();
}

function onDragStartPolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO: seems to be only FF that supports dragging content
  event.preventDefault();
}

function onCut(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  onCopy(event, view, state, editor);
  const selection = view.getSelection();
  if (selection !== null) {
    removeText(selection);
  }
}

function onCopy(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  const clipboardData = event.clipboardData;
  const selection = view.getSelection();
  if (selection !== null) {
    if (clipboardData != null) {
      const domSelection = window.getSelection();
      const range = domSelection.getRangeAt(0);
      if (range) {
        const container = document.createElement('div');
        const frag = range.cloneContents();
        container.appendChild(frag);
        clipboardData.setData('text/html', container.innerHTML);
      }
      clipboardData.setData('text/plain', selection.getTextContent());
      clipboardData.setData(
        'application/x-outline-nodes',
        JSON.stringify(getNodesInRange(selection)),
      );
    }
  }
}

function onCompositionStart(
  event: CompositionEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  const selection = view.getSelection();
  editor.setComposing(true);
  if (selection !== null) {
    if (selection.isCaret()) {
      // We only have native beforeinput composition events for
      // Safari, so we have to apply the composition selection for
      // other browsers.
      if (!IS_SAFARI) {
        state.compositionSelection = selection;
      }
    } else {
      removeText(selection);
    }
  }
}

function onCompositionEnd(
  event: CompositionEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  const data = event.data;
  const selection = view.getSelection();
  editor.setComposing(false);
  if (data != null && selection !== null) {
    // We only have native beforeinput composition events for
    // Safari, so we have to apply the composition selection for
    // other browsers.
    if (!IS_SAFARI) {
      const compositionSelection = state.compositionSelection;
      state.compositionSelection = null;
      if (compositionSelection !== null) {
        selection.setRange(
          compositionSelection.anchorKey,
          compositionSelection.anchorOffset,
          compositionSelection.focusKey,
          compositionSelection.focusOffset,
        );
      }
    }
    // Handle the fact that Chromium/FF nightly doesn't fire beforeInput's
    // insertFromComposition/deleteByComposition composition events, so we
    // need to listen to the compositionend event to apply the composition
    // data and also handle composition selection. There's no good way of
    // detecting this, so we'll have to use browser agents.
    if (!IS_SAFARI && CAN_USE_BEFORE_INPUT) {
      insertText(selection, data);
    }
  }
}

function onSelectionChange(event, view, state, editor): void {
  view.getSelection();
}

function onNativeBeforeInput(
  event: InputEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  // $FlowFixMe: Flow doesn't know of the inputType field
  const inputType = event.inputType;

  // These two types occur while a user is composing text and can't be
  // cancelled. Let them through and wait for the composition to end.
  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  event.preventDefault();
  const selection = view.getSelection();

  if (selection === null) {
    return;
  }
  // Chromium has a bug with the wrong offsets for deleteSoftLineBackward.
  // See: https://bugs.chromium.org/p/chromium/issues/detail?id=1043564
  if (inputType !== 'deleteSoftLineBackward' || !IS_CHROME) {
    // $FlowFixMe: Flow doesn't know of getTargetRanges
    const targetRange = event.getTargetRanges()[0];
    const editorElement = editor.getEditorElement();

    if (targetRange != null && editorElement !== null) {
      selection.applyDOMRange(targetRange, editorElement);
    }
  }

  switch (inputType) {
    case 'formatBold': {
      if (state.richText) {
        formatText(selection, FORMAT_BOLD);
      }
      break;
    }
    case 'formatItalic': {
      if (state.richText) {
        formatText(selection, FORMAT_ITALIC);
      }
      break;
    }
    case 'formatStrikeThrough': {
      if (state.richText) {
        formatText(selection, FORMAT_STRIKETHROUGH);
      }
      break;
    }
    case 'formatUnderline': {
      if (state.richText) {
        formatText(selection, FORMAT_UNDERLINE);
      }
      break;
    }
    case 'insertText':
    case 'insertFromComposition': {
      const data = event.data;
      if (data) {
        insertText(selection, data);
      }
      break;
    }
    case 'insertFromYank':
    case 'insertFromDrop':
    case 'insertReplacementText':
    case 'insertFromPaste': {
      // $FlowFixMe: Flow doesn't know about the dataTransfer field
      const dataTransfer = event.dataTransfer;
      if (dataTransfer != null) {
        insertDataTransfer(dataTransfer, selection, state, view, editor);
      }
      break;
    }
    case 'insertLineBreak': {
      insertText(selection, '\n');
      break;
    }
    case 'insertParagraph': {
      if (state.richText) {
        insertParagraph(selection);
      }
      break;
    }
    case 'deleteByComposition':
    case 'deleteByDrag':
    case 'deleteByCut': {
      removeText(selection);
      break;
    }
    case 'deleteContentBackward': {
      deleteBackward(selection);
      break;
    }
    case 'deleteContent':
    case 'deleteContentForward': {
      deleteForward(selection);
      break;
    }
    case 'deleteWordBackward': {
      deleteWordBackward(selection);
      break;
    }
    case 'deleteWordForward': {
      deleteWordForward(selection);
      break;
    }
    case 'deleteHardLineBackward':
    case 'deleteSoftLineBackward': {
      deleteLineBackward(selection);
      break;
    }
    case 'deleteSoftLineForward': {
      deleteLineForward(selection);
      break;
    }
    case 'historyUndo':
    case 'historyRedo':
      // Handled with useOutlineHistory
      break;
    default: {
      throw new Error('TODO - ' + inputType);
    }
  }
}

function onPolyfilledBeforeInput(
  event: SyntheticInputEvent<EventTarget>,
  view: View,
  state: UnknownState,
): void {
  event.preventDefault();
  const selection = view.getSelection();
  const data = event.data;
  if (data != null && selection !== null) {
    insertText(selection, data);
  }
}

export default function useOutlineInputEvents<T>(
  editor: OutlineEditor,
  stateRef: RefObject<T>,
): {} | {onBeforeInput: (event: SyntheticInputEvent<T>) => void} {
  const handleNativeBeforeInput = useOutlineEventWrapper(
    onNativeBeforeInput,
    editor,
    stateRef,
  );
  const handlePolyfilledBeforeInput = useOutlineEventWrapper(
    onPolyfilledBeforeInput,
    editor,
    stateRef,
  );
  const handleKeyDown = useOutlineEventWrapper(onKeyDown, editor, stateRef);
  const handleKeyUp = useCallback(() => {
    editor.setKeyDown(false);
  }, [editor]);
  const handlePointerDown = useCallback(() => {
    editor.setPointerDown(true);
  }, [editor]);
  const handlePointerUp = useCallback(() => {
    editor.setPointerDown(false);
  }, [editor]);
  const handlePaste = useOutlineEventWrapper(onPastePolyfill, editor, stateRef);
  const handleCut = useOutlineEventWrapper(onCut, editor, stateRef);
  const handleCopy = useOutlineEventWrapper(onCopy, editor, stateRef);
  const handleDrop = useOutlineEventWrapper(onDropPolyfill, editor, stateRef);
  const handleDragStart = useOutlineEventWrapper(
    onDragStartPolyfill,
    editor,
    stateRef,
  );
  const handleCompositionStart = useOutlineEventWrapper(
    onCompositionStart,
    editor,
    stateRef,
  );
  const handleCompositionEnd = useOutlineEventWrapper(
    onCompositionEnd,
    editor,
    stateRef,
  );
  const handleSelectionChange = useOutlineEventWrapper(
    onSelectionChange,
    editor,
    stateRef,
  );
  useEffect(() => {
    if (editor !== null) {
      const target: null | HTMLElement = editor.getEditorElement();

      if (target !== null) {
        target.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        target.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        target.addEventListener('compositionstart', handleCompositionStart);
        target.addEventListener('compositionend', handleCompositionEnd);
        target.addEventListener('cut', handleCut);
        target.addEventListener('copy', handleCopy);
        document.addEventListener('selectionchange', handleSelectionChange);

        if (CAN_USE_BEFORE_INPUT) {
          target.addEventListener('beforeinput', handleNativeBeforeInput);
        } else {
          target.addEventListener('paste', handlePaste);
          target.addEventListener('drop', handleDrop);
          target.addEventListener('dragstart', handleDragStart);
        }
        return () => {
          target.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          target.removeEventListener(
            'compositionstart',
            handleCompositionStart,
          );
          target.removeEventListener('compositionend', handleCompositionEnd);
          target.removeEventListener('cut', handleCut);
          target.removeEventListener('copy', handleCopy);
          document.removeEventListener(
            'selectionchange',
            handleSelectionChange,
          );

          if (CAN_USE_BEFORE_INPUT) {
            target.removeEventListener('beforeinput', handleNativeBeforeInput);
          } else {
            target.removeEventListener('paste', handlePaste);
            target.removeEventListener('drop', handleDrop);
            target.removeEventListener('dragstart', handleDragStart);
          }
        };
      }
    }
  }, [
    editor,
    handleCompositionStart,
    handleCompositionEnd,
    handleCut,
    handleKeyDown,
    handleKeyUp,
    handleNativeBeforeInput,
    handlePaste,
    handleSelectionChange,
    handleDrop,
    handleDragStart,
    handleCopy,
    handlePointerDown,
    handlePointerUp,
  ]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
