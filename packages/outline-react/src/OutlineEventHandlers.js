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
  TextNode,
  View,
} from 'outline';

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
  getDOMTextNodeFromElement,
  invariant,
  isImmutableOrInertOrSegmented,
} from './OutlineReactUtils';
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

// Safari triggers composition before keydown, meaning
// we need to account for this when handling key events.
let wasRecentlyComposing = false;
let lastKeyWasMaybeAndroidSoftKey = false;
const RESOLVE_DELAY = 20;
const BYTE_ORDER_MARK = '\uFEFF';

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
  const anchorTextContentSize = selection.getAnchorNode().getTextContentSize();
  const selectionAtBoundary = isBackward
    ? anchorOffset < 2 || focusOffset < 2
    : anchorOffset > anchorTextContentSize - 2 ||
      focusOffset > anchorTextContentSize - 2;

  return selection.isCaret()
    ? isHoldingShift || selectionAtBoundary
    : isHoldingShift && selectionAtBoundary;
}

function updateAndroidSoftKeyFlagIfAny(event: KeyboardEvent): void {
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
  updateAndroidSoftKeyFlagIfAny(event);
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
  updateAndroidSoftKeyFlagIfAny(event);
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
        const focusKey = selection.focusKey;
        const anchorNode = selection.getAnchorNode();
        const focusNode = selection.getAnchorNode();
        // If we have a range that starts on an immutable/segmented node
        // then move it to the next node so that we insert text at the
        // right place.
        if (selection.anchorKey !== focusKey) {
          if (
            (anchorNode.isImmutable() || anchorNode.isSegmented()) &&
            anchorNode.getNextSibling() === selection.getFocusNode()
          ) {
            selection.setRange(focusKey, 0, focusKey, selection.focusOffset);
          }
        }
        if (
          !isImmutableOrInertOrSegmented(anchorNode) ||
          !isImmutableOrInertOrSegmented(focusNode)
        ) {
          removeText(selection);
        }
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

  editor.update((view) => {
    // This update also functions as a way of reconciling a bad selection
    // to a good selection.
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

export function checkForBadInsertion(
  anchorElement: HTMLElement,
  anchorNode: TextNode,
  editor: OutlineEditor,
): boolean {
  const nextSibling = anchorNode.getNextSibling();

  return (
    anchorElement.parentNode === null ||
    (nextSibling !== null &&
      editor.getElementByKey(nextSibling.getKey()) !==
        anchorElement.nextSibling)
  );
}

export function handleBlockTextInputOnNode(
  anchorNode: TextNode,
  view: View,
  editor: OutlineEditor,
): boolean {
  // If we are mutating an immutable or segmented node, then reset
  // the content back to what it was before, as this is not allowed.
  if (isImmutableOrInertOrSegmented(anchorNode)) {
    // If this node has a decorator, then we'll make it as needing an
    // update by React.
    anchorNode.markDirtyDecorator();
    view.markNodeAsDirty(anchorNode);
    editor._compositionKey = null;
    return true;
  }
  return false;
}

export function onNativeInput(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;
  const isInsertText = inputType === 'insertText';
  const isInsertCompositionText = inputType === 'insertCompositionText';
  const isDeleteCompositionText = inputType === 'deleteCompositionText';

  if (!isInsertText && !isInsertCompositionText && !isDeleteCompositionText) {
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
    // we need to support a few extra heuristics. Notably,
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
    if (data != null) {
      const focusKey = selection.focusKey;
      const anchorElement = editor.getElementByKey(anchorKey);
      const anchorNode = selection.getAnchorNode();

      // Let's try and detect a bad update here. This usually comes from text transformation
      // tools that attempt to insertText across a range of nodes – which obviously we can't
      // detect unless we rely on the DOM being the source of truth. We can try and recover
      // by dispatching an Undo event, and then capturing the previous selection and trying to
      // apply the text on that.
      if (
        anchorElement !== null &&
        checkForBadInsertion(anchorElement, anchorNode, editor)
      ) {
        window.requestAnimationFrame(() => {
          document.execCommand('Undo', false, null);
          editor.update((undoneView) => {
            const undoneSelection = undoneView.getSelection();
            if (undoneSelection !== null) {
              insertText(undoneSelection, data);
            }
          });
        });
        return;
      }

      if (handleBlockTextInputOnNode(anchorNode, view, editor)) {
        return;
      }

      // If we are inserting text into the same anchor as is our focus
      // node, then we can apply a faster optimization that also handles
      // text replacement tools that use execCommand (which doesn't trigger
      // beforeinput in some browsers).
      if (anchorElement !== null && isInsertText && anchorKey === focusKey) {
        // Let's read what is in the DOM already, and use that as the value
        // for our anchor node.
        const textNode = getDOMTextNodeFromElement(anchorElement);

        invariant(
          textNode != null,
          'onNativeInput: cannot find DOM text node for anchor node',
        );

        // We get the text content from the anchor element's text node
        const rawTextContent = textNode.nodeValue;
        const textContent = rawTextContent.replace(BYTE_ORDER_MARK, '');
        let anchorOffset = window.getSelection().anchorOffset;
        // If the first character is a BOM, then we need to offset this because
        // this character isn't really apart of our offset.
        if (rawTextContent[0] === BYTE_ORDER_MARK) {
          anchorOffset--;
        }

        // We set the range before content, as hashtags might skew the offset
        selection.setRange(anchorKey, anchorOffset, anchorKey, anchorOffset);
        anchorNode.setTextContent(textContent);
      } else {
        insertText(selection, data);
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
      const anchorNode = selection.getAnchorNode();
      if (selection.isCaret() && isImmutableOrInertOrSegmented(anchorNode)) {
        event.preventDefault();
        return;
      }
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
        const focusNode = selection.getAnchorNode();

        if (
          !isImmutableOrInertOrSegmented(anchorNode) ||
          !isImmutableOrInertOrSegmented(focusNode)
        ) {
          removeText(selection);
        }
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
      const anchorNode = selection.getAnchorNode();
      if (selection.isCaret() && isImmutableOrInertOrSegmented(anchorNode)) {
        event.preventDefault();
        return;
      }
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertParagraph(selection);
      } else if (!selection.isCaret()) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;
        const focusNode = selection.getAnchorNode();

        if (
          !isImmutableOrInertOrSegmented(anchorNode) ||
          !isImmutableOrInertOrSegmented(focusNode)
        ) {
          removeText(selection);
        }
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
      if (handleBlockTextInputOnNode(selection.getAnchorNode(), view, editor)) {
        return;
      }
      insertText(selection, data);
    }
  });
}
