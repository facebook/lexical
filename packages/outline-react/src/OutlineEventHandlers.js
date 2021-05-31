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

import {isTextNode} from 'outline';

import {CAN_USE_BEFORE_INPUT, IS_FIREFOX} from './OutlineEnv';
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
  isUnderline,
  isTab,
  isSelectAll,
  isMoveWordBackward,
  isMoveBackward,
  isMoveForward,
  isMoveWordForward,
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
  selectAll,
  moveWordBackward,
  insertRichText,
  moveBackward,
  moveForward,
  moveWordForward,
} from './OutlineSelectionHelpers';
import {announceString, doesContainGraheme} from './OutlineTextHelpers';

// Safari triggers composition before keydown, meaning
// we need to account for this when handling key events.
let wasRecentlyComposing = false;
let lastKeyWasMaybeAndroidSoftKey = false;
const RESOLVE_DELAY = 20;

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
    insertRichText(selection, text);
  }
}

function shouldOverrideBrowserDefault(
  selection: Selection,
  isHoldingShift: boolean,
  isBackward: boolean,
): boolean {
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const selectionAtBoundary = isBackward
    ? anchorOffset === 0 || focusOffset === 0
    : anchorOffset === selection.getAnchorNode().getTextContentSize() ||
      focusOffset === selection.getFocusNode().getTextContentSize();

  return selection.isCaret()
    ? isHoldingShift || selectionAtBoundary
    : isHoldingShift && selectionAtBoundary;
}

function checkIfLastKeyWasMaybeAndroidSoftKey(event: KeyboardEvent): void {
  lastKeyWasMaybeAndroidSoftKey =
    event.key === 'Unidentified' && event.isComposing && event.keyCode === 229;
}

function isTopLevelBlockRTL(selection: Selection) {
  const anchorNode = selection.getAnchorNode();
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();
  const direction = topLevelBlock.getDirection();
  return direction === 'rtl';
}

export function onKeyDownForPlainText(
  event: KeyboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  checkIfLastKeyWasMaybeAndroidSoftKey(event);
  if (editor.isComposing() || wasRecentlyComposing) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const isHoldingShift = event.shiftKey;
    const isRTL = isTopLevelBlockRTL(selection);

    if (isMoveBackward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)) {
        event.preventDefault();
        moveBackward(selection, isHoldingShift, isRTL);
      }
    } else if (isMoveForward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, isRTL)) {
        event.preventDefault();
        moveForward(selection, isHoldingShift, isRTL);
      }
    } else if (isParagraph(event) || isLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection);
    } else if (isDeleteBackward(event)) {
      event.preventDefault();
      deleteBackward(selection);
    } else if (isDeleteForward(event)) {
      event.preventDefault();
      deleteForward(selection);
    } else if (isMoveWordBackward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)) {
        event.preventDefault();
        moveWordBackward(selection, isHoldingShift, isRTL);
      }
    } else if (isMoveWordForward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)) {
        event.preventDefault();
        moveWordForward(selection, isHoldingShift, isRTL);
      }
    } else if (isDeleteWordBackward(event)) {
      event.preventDefault();
      deleteWordBackward(selection);
    } else if (isDeleteWordForward(event)) {
      event.preventDefault();
      deleteWordForward(selection);
    } else if (isDeleteLineBackward(event)) {
      event.preventDefault();
      deleteLineBackward(selection);
    } else if (isDeleteLineForward(event)) {
      event.preventDefault();
      deleteLineForward(selection);
    } else if (isSelectAll(event)) {
      event.preventDefault();
      selectAll(selection);
    }
  });
}

export function onKeyDownForRichText(
  event: KeyboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  checkIfLastKeyWasMaybeAndroidSoftKey(event);
  if (editor.isComposing() || wasRecentlyComposing) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const isHoldingShift = event.shiftKey;
    const isRTL = isTopLevelBlockRTL(selection);

    if (isMoveBackward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)) {
        event.preventDefault();
        moveBackward(selection, isHoldingShift, isRTL);
      }
    } else if (isMoveForward(event)) {
      if (shouldOverrideBrowserDefault(selection, isHoldingShift, isRTL)) {
        event.preventDefault();
        moveForward(selection, isHoldingShift, isRTL);
      }
    } else if (isLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection);
    } else if (isParagraph(event)) {
      event.preventDefault();
      insertParagraph(selection);
    } else if (isDeleteBackward(event)) {
      event.preventDefault();
      deleteBackward(selection);
    } else if (isDeleteForward(event)) {
      event.preventDefault();
      deleteForward(selection);
    } else if (isMoveWordBackward(event)) {
      event.preventDefault();
      moveWordBackward(selection, isHoldingShift, isRTL);
    } else if (isMoveWordForward(event)) {
      event.preventDefault();
      moveWordForward(selection, isHoldingShift, isRTL);
    } else if (isDeleteWordBackward(event)) {
      event.preventDefault();
      deleteWordBackward(selection);
    } else if (isDeleteWordForward(event)) {
      event.preventDefault();
      deleteWordForward(selection);
    } else if (isDeleteLineBackward(event)) {
      event.preventDefault();
      deleteLineBackward(selection);
    } else if (isDeleteLineForward(event)) {
      event.preventDefault();
      deleteLineForward(selection);
    } else if (isBold(event)) {
      event.preventDefault();
      formatText(selection, 'bold');
    } else if (isUnderline(event)) {
      event.preventDefault();
      formatText(selection, 'underline');
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
      event.preventDefault();
      selectAll(selection);
    }
  });
}

export function onPasteForPlainText(
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

export function onPasteForRichText(
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
  // This should only occur without beforeInput. Block it as it's too much
  // hassle to make work at this point.
  event.preventDefault();
}

export function onDragStartPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  // Block dragging.
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
        // If we haven't selected a range, then don't copy anything
        if (domSelection.isCollapsed) {
          return;
        }
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
    if (selection !== null) {
      if (!CAN_USE_BEFORE_INPUT) {
        // We only have native beforeinput composition events for
        // Safari, so we have to apply the composition selection for
        // other browsers.
        state.compositionSelection = selection;
      }
      if (!selection.isCaret()) {
        removeText(selection);
      }
      if (IS_FIREFOX) {
        // Not sure why we have to do this, but it seems to fix a bunch
        // of FF related composition bugs to do with selection.
        selection.isDirty = true;
      }
      editor.setCompositionKey(selection.anchorKey);
    }
  });
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.setCompositionKey(null);
  wasRecentlyComposing = true;
  setTimeout(() => {
    wasRecentlyComposing = false;
  }, RESOLVE_DELAY);
}

export function onSelectionChange(
  event: Event,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const domSelection = window.getSelection();
  const editorElement = editor.getEditorElement();
  // This is a hot-path, so let's avoid doing an update when
  // the anchorNode is not actually inside the editor.
  if (editorElement && !editorElement.contains(domSelection.anchorNode)) {
    return;
  }
  // This update also functions as a way of reconciling a bad selection
  // to a good selection. So if we do remove the a11y logic below, we need
  // to ensure that we keep the editor.update() in place.
  editor.update((view) => {
    const selection = view.getSelection();
    // Handle screen reader announcements of immutable and segmented nodes.
    if (selection !== null && selection.isCaret()) {
      const anchorNode = selection.getAnchorNode();
      const anchorOffset = selection.anchorOffset;
      const textContentSize = anchorNode.getTextContentSize();
      // This is a hot-path, so let's only get the next sibling
      // if we know we're at the end of a node first.
      if (anchorOffset === textContentSize) {
        const nextSibling = anchorNode.getNextSibling();
        if (
          isTextNode(nextSibling) &&
          (nextSibling.isSegmented() || nextSibling.isImmutable())
        ) {
          const announceText = nextSibling.getTextContent();
          // If the string is not a string with a surrogate pair then we don't
          // bother announcing it, as it will likely be picked up by the screen
          // reader. The exception to this is if we're not really next to the
          // text (because we move native offset to 0 when dealing with empty
          // text nodes).
          if (
            !doesContainGraheme(announceText) ||
            (domSelection.anchorOffset === 0 && textContentSize === 0)
          ) {
            announceString(announceText);
          }
        }
      }
    }
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
  const isInsertText = inputType === 'insertText';
  const isInsertCompositionText = inputType === 'insertCompositionText';

  if (
    !isInsertText &&
    !isInsertCompositionText &&
    inputType !== 'deleteCompositionText'
  ) {
    return;
  }

  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    const anchorKey = selection.anchorKey;

    // To ensure we handle Android software keyboard
    // text entry properly (which is usually composed text),
    // we need to support a few extra heuristics. Notbaly,
    // we need to disable composition for "insertText" or
    // "insertCompositionText" when the last key press was
    // likely to be an android soft key press. Android will
    // then enable composition again automatically.
    if (
      anchorKey === editor._compositionKey &&
      (isInsertText ||
        (isInsertCompositionText && lastKeyWasMaybeAndroidSoftKey))
    ) {
      editor._compositionKey = null;
    }
    const data = event.data;
    if (data) {
      const anchorTextBeforeInsertion = selection
        .getAnchorNode()
        .getTextContent();
      insertText(selection, data);
      if (
        isInsertText &&
        anchorKey === selection.focusKey &&
        // If we're dealing with empty text node heuristics, skip this logic
        anchorTextBeforeInsertion !== ''
      ) {
        const {anchorOffset, focusOffset} = window.getSelection();
        // Re-adjust the selection to what the browser thinks it should be
        if (
          selection.anchorOffset !== anchorOffset ||
          selection.focusOffset !== focusOffset
        ) {
          selection.setRange(anchorKey, anchorOffset, anchorKey, focusOffset);
        }
      }
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

  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    if (inputType === 'deleteContentBackward') {
      // Used for Android
      editor.setCompositionKey(null);
      event.preventDefault();
      deleteBackward(selection);
      return;
    }
    const data = event.data;

    const inputText = inputType === 'insertText';

    if (selection.isCaret()) {
      applyTargetRange(selection, event);
    }

    if (
      inputText ||
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertLineBreak(selection);
        insertLineBreak(selection);
      } else if (!selection.isCaret()) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;
        removeText(selection);
        if (inputText && anchorKey !== focusKey && data) {
          event.preventDefault();
          editor.setCompositionKey(null);
          insertText(selection, data);
        }
      }
      return;
    }

    // Prevent the browser from carrying out
    // the input event, so we can control the
    // output.
    event.preventDefault();

    switch (inputType) {
      case 'insertFromComposition': {
        if (data) {
          insertText(selection, data);
        }
        break;
      }
      case 'insertParagraph': {
        // Used for Android
        editor.setCompositionKey(null);
        insertLineBreak(selection);
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
      case 'deleteByComposition':
      case 'deleteByDrag':
      case 'deleteByCut': {
        removeText(selection);
        break;
      }
      case 'deleteContent': {
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

  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    if (inputType === 'deleteContentBackward') {
      // Used for Android
      editor.setCompositionKey(null);
      event.preventDefault();
      deleteBackward(selection);
      return;
    }
    const data = event.data;

    const inputText = inputType === 'insertText';

    if (selection.isCaret()) {
      applyTargetRange(selection, event);
    }

    if (
      inputText ||
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertParagraph(selection);
      } else if (!selection.isCaret()) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;
        removeText(selection);
        if (inputText && anchorKey !== focusKey && data) {
          event.preventDefault();
          editor.setCompositionKey(null);
          insertText(selection, data);
        }
      }
      return;
    }

    // Prevent the browser from carrying out
    // the input event, so we can control the
    // output.
    event.preventDefault();

    switch (inputType) {
      case 'insertFromComposition': {
        if (data) {
          insertText(selection, data);
        }
        break;
      }
      case 'insertParagraph': {
        // Used for Android
        editor.setCompositionKey(null);
        insertParagraph(selection);
        break;
      }
      case 'formatStrikeThrough': {
        formatText(selection, 'strikethrough');
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
      case 'deleteByComposition':
      case 'deleteByDrag':
      case 'deleteByCut': {
        removeText(selection);
        break;
      }
      case 'deleteContent': {
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
      insertText(selection, data);
    }
  });
}
