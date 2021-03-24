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
  Selection,
  OutlineNode,
  ParsedNodeMap,
  NodeKey,
  View,
} from 'outline';

import {createLineBreakNode, createTextNode} from 'outline';
import {
  CAN_USE_BEFORE_INPUT,
  IS_SAFARI,
  IS_CHROME,
  IS_FIREFOX,
} from './OutlineEnv';
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
  isTab,
  isSelectAll,
} from './OutlineKeyHelpers';
import {
  deleteBackward,
  deleteForward,
  deleteLineBackward,
  deleteLineForward,
  deleteWordBackward,
  deleteWordForward,
  insertParagraph,
  formatText,
  insertText,
  removeText,
  getNodesInRange,
  insertNodes,
  insertLineBreak,
  handleKeyDownSelection,
  selectAll,
} from './OutlineSelectionHelpers';

// TODO the Flow types here needs fixing
export type EventHandler = (
  // $FlowFixMe: not sure how to handle this generic properly
  event: Object,
  editor: OutlineEditor,
  state: EventHandlerState,
) => void;

export type EventHandlerState = {
  isReadOnly: boolean,
  compositionSelection: null | Selection,
  isHandlingPointer: boolean,
};

function generateNodes(
  nodeRange: {range: Array<NodeKey>, nodeMap: ParsedNodeMap},
  view: View,
): Array<OutlineNode> {
  const {range, nodeMap: parsedNodeMap} = nodeRange;
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const parsedNode = parsedNodeMap[key];
    const node = view.createNodeFromParse(parsedNode, parsedNodeMap);
    nodes.push(node);
  }
  return nodes;
}

function insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: Selection,
  view: View,
): void {
  const outlineNodesString = dataTransfer.getData(
    'application/x-outline-nodes',
  );

  if (outlineNodesString) {
    const nodeRange = JSON.parse(outlineNodesString);
    const nodes = generateNodes(nodeRange, view);
    insertNodes(selection, nodes);
    return;
  }
  insertDataTransferForPlainText(dataTransfer, selection, view);
}

function insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: Selection,
  view: View,
): void {
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    const parts = text.split(/\r?\n/);
    if (parts.length === 1) {
      insertText(selection, text);
    } else {
      const nodes = [];
      const length = parts.length;
      for (let i = 0; i < length; i++) {
        const part = parts[i];
        nodes.push(createTextNode(part));
        if (i !== length - 1) {
          nodes.push(createLineBreakNode());
        }
      }
      insertNodes(selection, nodes);
    }
  }
}

export function onKeyDownForPlainText(
  event: KeyboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.setKeyDown(true);
  if (editor.isComposing()) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    // If we can use native beforeinput, we handle
    // these cases in that function.
    if (!CAN_USE_BEFORE_INPUT) {
      if (isDeleteForward(event)) {
        event.preventDefault();
        deleteForward(selection);
      } else if (isDeleteLineBackward(event)) {
        event.preventDefault();
        deleteLineBackward(selection);
      } else if (isDeleteLineForward(event)) {
        event.preventDefault();
        deleteLineForward(selection);
      } else if (isDeleteWordBackward(event)) {
        event.preventDefault();
        deleteWordBackward(selection);
      } else if (isDeleteWordForward(event)) {
        event.preventDefault();
        deleteWordForward(selection);
      }
    }
    if (isDeleteBackward(event)) {
      // This is used to better support Dragon Dictation
      event.preventDefault();
      deleteBackward(selection);
    } else if (isParagraph(event) || isLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection);
    } else if (isSelectAll(event)) {
      if (IS_FIREFOX) {
        event.preventDefault();
        selectAll(selection);
      }
    } else {
      handleKeyDownSelection(event, selection);
    }
  });
}

export function onKeyDownForRichText(
  event: KeyboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.setKeyDown(true);
  if (editor.isComposing()) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    // If we can use native beforeinput, we handle
    // these cases in that function.
    if (!CAN_USE_BEFORE_INPUT) {
      if (isDeleteForward(event)) {
        event.preventDefault();
        deleteForward(selection);
      } else if (isDeleteLineBackward(event)) {
        event.preventDefault();
        deleteLineBackward(selection);
      } else if (isDeleteLineForward(event)) {
        event.preventDefault();
        deleteLineForward(selection);
      } else if (isDeleteWordBackward(event)) {
        event.preventDefault();
        deleteWordBackward(selection);
      } else if (isDeleteWordForward(event)) {
        event.preventDefault();
        deleteWordForward(selection);
      }
    }
    // Various browser struggle with these events in
    // beforeinput, so we ensure they work here
    if (isDeleteBackward(event)) {
      // This is used to better support Dragon Dictation
      event.preventDefault();
      deleteBackward(selection);
    } else if (isLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection);
    } else if (isParagraph(event)) {
      // This is used to better support Dragon Dictation
      event.preventDefault();
      insertParagraph(selection);
    } else if (isBold(event)) {
      event.preventDefault();
      formatText(selection, 'bold');
    } else if (isItalic(event)) {
      event.preventDefault();
      formatText(selection, 'italic');
    } else if (isTab(event)) {
      // Handle code blocks
      const anchorNode = selection.getAnchorNode();
      const parentBlock = anchorNode.getParentBlockOrThrow();
      if (parentBlock.canInsertTab()) {
        if (event.shiftKey) {
          const textContent = anchorNode.getTextContent();
          const character = textContent[selection.anchorOffset - 1];
          if (character === '\t') {
            deleteBackward(selection);
          }
        } else {
          insertText(selection, '\t');
        }
        event.preventDefault();
      }
    } else if (isSelectAll(event)) {
      if (IS_FIREFOX) {
        event.preventDefault();
        selectAll(selection);
      }
    } else {
      handleKeyDownSelection(event, selection);
    }
  });
}

export function onKeyUp(event: KeyboardEvent, editor: OutlineEditor): void {
  editor.setKeyDown(false);
}

export function onPastePolyfillForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      insertDataTransferForPlainText(clipboardData, selection, view);
    }
  });
}

export function onPastePolyfillForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      insertDataTransferForRichText(clipboardData, selection, view);
    }
  });
}

export function onDropPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  // TODO
  event.preventDefault();
}

export function onDragStartPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  // TODO: seems to be only FF that supports dragging content
  event.preventDefault();
}

export function onCut(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  onCopy(event, editor, state);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

export function onCopy(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
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
  });
}

export function onCompositionStart(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.update((view) => {
    const selection = view.getSelection();
    editor.setComposing(true);
    if (selection !== null) {
      // We only have native beforeinput composition events for
      // Safari, so we have to apply the composition selection for
      // other browsers.
      if (!IS_SAFARI) {
        state.compositionSelection = selection;
      }
      if (!selection.isCaret()) {
        removeText(selection);
      }
    }
  });
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const data = event.data;
  editor.update((view) => {
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
  });
}

export function onSelectionChange(
  event: Event,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const selection = window.getSelection();
  const editorElement = editor.getEditorElement();
  if (editorElement && !editorElement.contains(selection.anchorNode)) {
    return;
  }
  editor.update((view) => {
    view.getSelection();
  });
}

export function onPointerDown(
  event: PointerEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  state.isHandlingPointer = true;
  // Throttle setting of the flag for 50ms, as we don't want this to trigger
  // for simple clicks.
  setTimeout(() => {
    if (state.isHandlingPointer) {
      editor.setPointerDown(true);
    }
  }, 50);
}

export function onPointerUp(
  event: PointerEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  state.isHandlingPointer = false;
  editor.setPointerDown(false);
}

export function onNativeInput(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;

  if (inputType !== 'insertText') {
    return;
  }

  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }

    const data = event.data;
    if (data) {
      insertText(selection, data);
    }
  });
}

function applyTargetRange(selection: Selection, event: InputEvent): void {
  if (event.getTargetRanges) {
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
  }
}

export function onNativeBeforeInputForPlainText(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;

  // These two types occur while a user is composing text and can't be
  // cancelled. Let them through and wait for the composition to end.
  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    // Chromium has a bug with the wrong offsets for deleteSoftLineBackward.
    // See: https://bugs.chromium.org/p/chromium/issues/detail?id=1043564
    if (inputType !== 'deleteSoftLineBackward' || !IS_CHROME) {
      applyTargetRange(selection, event);
    }
    if (inputType === 'insertText') {
      if (!selection.isCaret()) {
        insertText(selection, '');
      }
      return;
    }
    const data = event.data;
    event.preventDefault();

    switch (inputType) {
      case 'insertText':
      case 'insertFromComposition': {
        if (data) {
          insertText(selection, data);
        }
        break;
      }
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText':
      case 'insertFromPaste': {
        const dataTransfer = event.dataTransfer;
        if (dataTransfer != null) {
          insertDataTransferForPlainText(dataTransfer, selection, view);
        } else {
          if (data) {
            insertText(selection, data);
          }
        }
        break;
      }
      case 'insertLineBreak':
      case 'insertParagraph': {
        insertLineBreak(selection);
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
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        deleteLineForward(selection);
        break;
      }
      case 'historyUndo':
      case 'historyRedo':
        // Handled with useOutlineHistory
        break;
      default:
      // NO-OP
    }
  });
}

export function onNativeBeforeInputForRichText(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;

  // These two types occur while a user is composing text and can't be
  // cancelled. Let them through and wait for the composition to end.
  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    // Chromium has a bug with the wrong offsets for deleteSoftLineBackward.
    // See: https://bugs.chromium.org/p/chromium/issues/detail?id=1043564
    if (inputType !== 'deleteSoftLineBackward' || !IS_CHROME) {
      applyTargetRange(selection, event);
    }
    if (inputType === 'insertText') {
      if (!selection.isCaret()) {
        insertText(selection, '');
      }
      return;
    }
    const data = event.data;
    event.preventDefault();

    switch (inputType) {
      case 'formatBold': {
        formatText(selection, 'bold');
        break;
      }
      case 'formatItalic': {
        formatText(selection, 'italic');
        break;
      }
      case 'formatStrikeThrough': {
        formatText(selection, 'strikethrough');
        break;
      }
      case 'formatUnderline': {
        formatText(selection, 'underline');
        break;
      }
      case 'insertText':
      case 'insertFromComposition': {
        if (data) {
          insertText(selection, data);
        }
        break;
      }
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText':
      case 'insertFromPaste': {
        const dataTransfer = event.dataTransfer;
        if (dataTransfer != null) {
          insertDataTransferForRichText(dataTransfer, selection, view);
        } else {
          if (data) {
            insertText(selection, data);
          }
        }
        break;
      }
      case 'insertLineBreak': {
        insertLineBreak(selection);
        break;
      }
      case 'insertParagraph': {
        insertParagraph(selection);
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
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        deleteLineForward(selection);
        break;
      }
      case 'historyUndo':
      case 'historyRedo':
        // Handled with useOutlineHistory
        break;
      default:
      // NO-OP
    }
  });
}

export function onPolyfilledBeforeInput(
  event: SyntheticInputEvent<EventTarget>,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const data = event.data;
    if (data != null && selection !== null) {
      insertText(selection, data);
    }
  });
}
