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

import {BlockNode} from 'outline';
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
  isMoveBackward,
  isMoveForward,
  isMoveWordBackward,
  isMoveWordForward,
  isParagraph,
} from 'outline-react/OutlineHotKeys';

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
      selection.insertNodes(nodes);
      return;
    }
  }
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    selection.insertText(text);
  }
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

  if (isDeleteBackward(event)) {
    shouldPreventDefault = true;
    selection.deleteBackward();
  } else if (isDeleteForward(event)) {
    shouldPreventDefault = true;
    selection.deleteForward();
  } else if (isLineBreak(event)) {
    shouldPreventDefault = true;
    selection.insertText('\n');
  } else if (isParagraph(event)) {
    shouldPreventDefault = true;
    if (state.richText) {
      selection.insertParagraph();
    }
  } else if (isMoveBackward(event)) {
    shouldPreventDefault = true;
    selection.moveBackward();
  } else if (isMoveForward(event)) {
    shouldPreventDefault = true;
    selection.moveForward();
  } else if (isMoveWordBackward(event)) {
    shouldPreventDefault = true;
    selection.moveWordBackward();
  } else if (isMoveWordForward(event)) {
    shouldPreventDefault = true;
    selection.moveWordForward();
  } else if (isDeleteLineBackward(event)) {
    shouldPreventDefault = true;
    selection.deleteLineBackward();
  } else if (isDeleteLineForward(event)) {
    shouldPreventDefault = true;
    selection.deleteLineForward();
  } else if (isDeleteWordBackward(event)) {
    shouldPreventDefault = true;
    selection.deleteWordBackward();
  } else if (isDeleteWordForward(event)) {
    shouldPreventDefault = true;
    selection.deleteWordForward();
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
    selection.removeText();
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
        JSON.stringify(selection.getNodesInRange()),
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
      selection.removeText();
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
      selection.insertText(data);
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

  // Safari is the only browser where we can reliably use the
  // target range to update selection without causing bugs around
  // composition/on-screen keyboard entry.
  if (
    (IS_SAFARI && !inputType.startsWith('delete')) ||
    inputType.startsWith('deleteBy')
  ) {
    // $FlowFixMe: Flow doens't know of getTargetRanges
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
  }

  switch (inputType) {
    case 'formatBold': {
      if (state.richText) {
        selection.formatText(FORMAT_BOLD);
      }
      break;
    }
    case 'formatItalic': {
      if (state.richText) {
        selection.formatText(FORMAT_ITALIC);
      }
      break;
    }
    case 'formatStrikeThrough': {
      if (state.richText) {
        selection.formatText(FORMAT_STRIKETHROUGH);
      }
      break;
    }
    case 'formatUnderline': {
      if (state.richText) {
        selection.formatText(FORMAT_UNDERLINE);
      }
      break;
    }
    case 'insertText':
    case 'insertFromComposition': {
      const data = event.data;
      if (data) {
        selection.insertText(data);
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
    case 'deleteByComposition':
    case 'deleteByDrag':
    case 'deleteByCut': {
      selection.removeText();
      break;
    }
    // These are handled in onKeyDown, so we don't need to do
    // anything here. So if we get an issue with these occuring here
    // then we need to re-visit adding logic for these event types
    // again.

    // case 'insertLineBreak':
    // case 'insertParagraph':
    // case 'deleteContentBackward':
    // case 'deleteContent':
    // case 'deleteContentForward':
    // case 'deleteSoftLineBackward':
    // case 'deleteSoftLineForward':
    // case 'deleteWordBackward':
    // case 'deleteWordForward':

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
    selection.insertText(data);
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
  ]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
