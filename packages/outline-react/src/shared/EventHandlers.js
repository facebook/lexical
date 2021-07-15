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

import {IS_SAFARI, CAN_USE_BEFORE_INPUT} from 'shared/environment';
import {
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isLineBreak,
  isOpenLineBreak,
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
} from 'outline/KeyHelpers';
import isImmutableOrInert from 'shared/isImmutableOrInert';
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
} from 'outline/SelectionHelpers';
import {
  createTextNode,
  isTextNode,
  isBlockNode,
  isDecoratorNode,
} from 'outline';

const ZERO_WIDTH_JOINER_CHAR = '\u2060';

let compositonStartOffset = 0;
let compositonStartKey = null;
let lastKeyWasMaybeAndroidSoftKey = false;

// TODO the Flow types here needs fixing
export type EventHandler = (
  // $FlowFixMe: not sure how to handle this generic properly
  event: Object,
  editor: OutlineEditor,
  state: EventHandlerState,
) => void;

export type EventHandlerState = {
  isReadOnly: boolean,
};

function updateAndroidSoftKeyFlagIfAny(event: KeyboardEvent): void {
  lastKeyWasMaybeAndroidSoftKey =
    event.key === 'Unidentified' && event.keyCode === 229;
}

function getNodeFromDOMNode(view: View, dom: Node): OutlineNode | null {
  let node = dom;
  while (node != null) {
    // $FlowFixMe: internal field
    const key: NodeKey | undefined = node.__outlineInternalRef;
    if (key !== undefined) {
      return view.getNodeByKey(key);
    }
    node = node.parentNode;
  }
  return null;
}

function getDOMFromNode(editor: OutlineEditor, node: null | OutlineNode) {
  if (node === null) {
    return null;
  }
  return editor.getElementByKey(node.getKey());
}

function getLastSelection(editor: OutlineEditor): null | Selection {
  return editor.getViewModel().read((lastView) => lastView.getSelection());
}

function generateNodes(
  nodeRange: {range: Array<NodeKey>, nodeMap: ParsedNodeMap},
  view: View,
): Array<OutlineNode> {
  const {range, nodeMap} = nodeRange;
  const parsedNodeMap: ParsedNodeMap = new Map(nodeMap);
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const parsedNode = parsedNodeMap.get(key);
    if (parsedNode !== undefined) {
      const node = view.createNodeFromParse(parsedNode, parsedNodeMap);
      nodes.push(node);
    }
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
  if (editor.isComposing()) {
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
    } else if (isOpenLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection, true);
    } else if (isDeleteBackward(event)) {
      event.preventDefault();
      deleteBackward(selection);
    } else if (isDeleteForward(event)) {
      event.preventDefault();
      deleteForward(selection);
    } else if (isMoveWordBackward(event)) {
      if (
        IS_SAFARI ||
        shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)
      ) {
        event.preventDefault();
        moveWordBackward(selection, isHoldingShift, isRTL);
      }
    } else if (isMoveWordForward(event)) {
      if (
        IS_SAFARI ||
        shouldOverrideBrowserDefault(selection, isHoldingShift, isRTL)
      ) {
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
  if (editor.isComposing()) {
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
    } else if (isOpenLineBreak(event)) {
      event.preventDefault();
      insertLineBreak(selection, true);
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
      if (
        IS_SAFARI ||
        shouldOverrideBrowserDefault(selection, isHoldingShift, !isRTL)
      ) {
        event.preventDefault();
        moveWordBackward(selection, isHoldingShift, isRTL);
      }
    } else if (isMoveWordForward(event)) {
      if (
        IS_SAFARI ||
        shouldOverrideBrowserDefault(selection, isHoldingShift, isRTL)
      ) {
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

export function onCutForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  onCopyForPlainText(event, editor, state);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

export function onCutForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  onCopyForRichText(event, editor, state);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

export function onCopyForPlainText(
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
      }
    }
  });
}

export function onCopyForRichText(
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
    if (selection !== null && !editor.isComposing()) {
      compositonStartOffset = selection.anchorOffset;
      compositonStartKey = selection.anchorKey;
      editor.setCompositionKey(selection.anchorKey);
      const data = event.data;
      if (data != null && !lastKeyWasMaybeAndroidSoftKey) {
        // We insert an empty space, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        insertText(selection, ' ');
      }
    }
  });
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.setCompositionKey(null);
  editor.update((view) => {});
}

export function onSelectionChange(
  event: Event,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const domSelection = window.getSelection();
  const rootElement = editor.getRootElement();
  // This is a hot-path, so let's avoid doing an update when
  // the anchorNode is not actually inside the editor.
  if (rootElement && !rootElement.contains(domSelection.anchorNode)) {
    return;
  }

  // This update functions as a way of reconciling a bad selection
  // to a good selection.
  editor.update((view) => {});
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
  // If we are mutating an immutable or inert node, then reset
  // the content back to what it was before, as this is not allowed.
  if (isImmutableOrInert(anchorNode)) {
    view.markNodeAsDirty(anchorNode);
    return true;
  }
  return false;
}

function shouldInsertTextAfterTextNode(
  selection: Selection,
  node: TextNode,
  validateOffset: boolean,
): boolean {
  return (
    node.isSegmented() ||
    (selection.isCaret() &&
      (!validateOffset ||
        node.getTextContentSize() === selection.anchorOffset) &&
      !node.canInsertTextAtEnd())
  );
}

function updateTextNodeFromDOMContent(
  dom: Text,
  view: View,
  editor: OutlineEditor,
): void {
  let node = getNodeFromDOMNode(view, dom);
  if (node !== null && !node.isDirty()) {
    const rawTextContent = dom.nodeValue;
    const textContent = rawTextContent.replace('\u2060', '');
    const nodeKey = node.getKey();

    if (isTextNode(node) && textContent !== node.getTextContent()) {
      if (handleBlockTextInputOnNode(node, view, editor)) {
        return;
      }
      if (editor.isComposing() && !node.isComposing()) {
        view.markNodeAsDirty(node);
        return;
      }
      const originalTextContent = node.getTextContent();
      const selection = view.getSelection();

      if (
        !CAN_USE_BEFORE_INPUT &&
        selection !== null &&
        selection.anchorKey === nodeKey &&
        textContent.indexOf(originalTextContent) === 0 &&
        shouldInsertTextAfterTextNode(selection, node, false)
      ) {
        const insertionText = textContent.slice(originalTextContent.length);
        view.markNodeAsDirty(node);
        selection.anchorOffset -= insertionText.length;
        insertText(selection, insertionText);
        return;
      } else if (node.isSegmented()) {
        const replacement = createTextNode(originalTextContent);
        node.replace(replacement, true);
        node = replacement;
      }

      node.setTextContent(textContent);

      if (
        selection !== null &&
        selection.isCaret() &&
        selection.anchorKey === nodeKey
      ) {
        const domSelection = window.getSelection();
        let offset = domSelection.focusOffset;
        if (rawTextContent[0] === ZERO_WIDTH_JOINER_CHAR) {
          offset--;
        }
        node.select(offset, offset);
      }
    }
  }
}

export function onInput(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;
  if (
    inputType === 'insertText' ||
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    editor.update((view) => {
      const domSelection = window.getSelection();
      const anchorDOM = domSelection.anchorNode;
      if (anchorDOM !== null && anchorDOM.nodeType === 3) {
        updateTextNodeFromDOMContent(anchorDOM, view, editor);
      }
    });
  }
}

function applyTargetRange(selection: Selection, event: InputEvent): void {
  if (event.getTargetRanges) {
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
  }
}

function canRemoveText(anchorNode: TextNode, focusNode: TextNode): boolean {
  return (
    anchorNode !== focusNode ||
    !isImmutableOrInert(anchorNode) ||
    !isImmutableOrInert(focusNode)
  );
}

// Block double space auto-period insertion if we're
// at the start of a an empty text node. This happens
// because the BOM gets treated like "text".
function isBadDoubleSpacePeriodReplacment(
  event: InputEvent,
  selection: Selection,
): boolean {
  const inputType = event.inputType;
  if (
    (inputType === 'insertText' || inputType === 'insertReplacementText') &&
    selection.anchorOffset === 0 &&
    selection.focusOffset === 1 &&
    selection.anchorKey === selection.focusKey
  ) {
    const dataTransfer = event.dataTransfer;
    const data =
      dataTransfer != null ? dataTransfer.getData('text/plain') : event.data;
    return data === '. ';
  }
  return false;
}

export function onBeforeInputForPlainText(
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

    if (selection.isCaret()) {
      applyTargetRange(selection, event);
    }
    if (isBadDoubleSpacePeriodReplacment(event, selection)) {
      event.preventDefault();
      insertText(selection, '  ');
      return;
    }
    // We let the browser do its own thing for composition.
    if (
      inputType === 'deleteCompositionText' ||
      inputType === 'insertCompositionText'
    ) {
      return;
    }
    const anchorNode = selection.getAnchorNode();
    const focusNode = selection.getAnchorNode();

    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertLineBreak(selection);
        insertLineBreak(selection);
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        insertRichText(selection, text);
      } else if (data != null) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;

        if (
          anchorKey !== focusKey ||
          shouldInsertTextAfterTextNode(selection, anchorNode, true)
        ) {
          event.preventDefault();
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
          // This is the end of composition
          editor._compositionKey = null;
          // This fixes a Safari issue when composition starts
          // in another node and gets moved to the next sibling.
          // The offset is always off.
          if (compositonStartKey !== null) {
            if (compositonStartKey !== anchorNode.getKey()) {
              const prevSibling = anchorNode.getPreviousSibling();
              if (
                isTextNode(prevSibling) &&
                prevSibling.getKey() === compositonStartKey &&
                compositonStartOffset === prevSibling.getTextContentSize()
              ) {
                anchorNode.select(0, 0);
              }
            }
            compositonStartKey = null;
          }
          insertText(selection, data);
        }
        break;
      }
      case 'insertLineBreak':
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
      case 'deleteByComposition': {
        if (canRemoveText(anchorNode, focusNode)) {
          removeText(selection);
        }
        break;
      }
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
      case 'deleteContentForward':
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

export function onBeforeInputForRichText(
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

    if (selection.isCaret()) {
      applyTargetRange(selection, event);
    }
    if (isBadDoubleSpacePeriodReplacment(event, selection)) {
      event.preventDefault();
      insertText(selection, '  ');
      return;
    }
    // We let the browser do its own thing for composition.
    if (
      inputType === 'deleteCompositionText' ||
      inputType === 'insertCompositionText'
    ) {
      return;
    }
    const anchorNode = selection.getAnchorNode();
    const focusNode = selection.getAnchorNode();

    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertParagraph(selection);
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        insertRichText(selection, text);
      } else if (data != null) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;

        if (
          anchorKey !== focusKey ||
          shouldInsertTextAfterTextNode(selection, anchorNode, true)
        ) {
          event.preventDefault();
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
          // This is the end of composition
          editor._compositionKey = null;
          // This fixes a Safari issue when composition starts
          // in another node and gets moved to the next sibling.
          // The offset is always off.
          if (compositonStartKey !== null) {
            if (compositonStartKey !== anchorNode.getKey()) {
              const prevSibling = anchorNode.getPreviousSibling();
              if (
                isTextNode(prevSibling) &&
                prevSibling.getKey() === compositonStartKey &&
                compositonStartOffset === prevSibling.getTextContentSize()
              ) {
                anchorNode.select(0, 0);
              }
            }
            compositonStartKey = null;
          }
          insertText(selection, data);
        }
        break;
      }
      case 'insertLineBreak': {
        // Used for Android
        editor.setCompositionKey(null);
        insertLineBreak(selection);
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
      case 'deleteByComposition': {
        if (canRemoveText(anchorNode, focusNode)) {
          removeText(selection);
        }
        break;
      }
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
      case 'deleteContentForward':
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

export function onMutation(
  editor: OutlineEditor,
  mutations: Array<MutationRecord>,
): void {
  editor.update((view: View) => {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      const type = mutation.type;
      const target = mutation.target;
      const targetNode = getNodeFromDOMNode(view, target);

      if (isDecoratorNode(targetNode)) {
        continue;
      }
      if (type === 'characterData') {
        if (target.nodeType === 3) {
          // $FlowFixMe: we refine the type by checking nodeType above
          updateTextNodeFromDOMContent(((target: any): Text), view, editor);
        }
      } else if (type === 'childList') {
        // This occurs when the DOM tree has been mutated in terms of
        // structure. This is actually not good. Outline should control
        // the contenteditable. This can typically happen because of
        // third party extensions and tools that directly mutate the DOM.
        const addedNodes = mutation.addedNodes;

        for (let s = 0; s < addedNodes.length; s++) {
          const addedDOM = addedNodes[s];
          const addedNode = getNodeFromDOMNode(view, addedDOM);
          // For now we don't want nodes that weren't added by Outline.
          // So lets remove this node if it's not managed by Outline
          let shouldRemoveNode =
            addedNode === null || addedDOM.nodeName === 'BR';

          // For some cases, we might want to incorporate the change into our
          // view. This happens on Chrome with the TouchBar replacements.
          if (isBlockNode(addedNode) && addedDOM.nodeType === 3) {
            const textContent: string = addedDOM.nodeValue;
            // If we're trying to add a text node directly into a block
            // we need to give it a bounding text node
            const textNode = createTextNode(textContent);
            textNode.select();
            // We need to find where to insert it.
            const nextDOMSibling = addedDOM.nextSibling;
            if (nextDOMSibling == null) {
              // End
              addedNode.append(textNode);
            } else {
              const nextSibling = getNodeFromDOMNode(view, nextDOMSibling);
              if (nextSibling !== null) {
                nextSibling.insertBefore(textNode);
              }
            }
            shouldRemoveNode = true;
          }
          if (shouldRemoveNode) {
            const parent = addedDOM.parentNode;
            if (parent != null) {
              parent.removeChild(addedDOM);
            }
          }
        }
        const removedNodes = mutation.removedNodes;

        for (let s = 0; s < removedNodes.length; s++) {
          const removedDOM = removedNodes[s];
          if (removedDOM.nodeType === 3) {
            // If the text node has been removed and the element is missing
            // a text node, we can assume this to be something clearing down
            // the TextNode.
            if (
              isTextNode(targetNode) &&
              (target.firstChild == null || target.firstChild.nodeType !== 3)
            ) {
              // Come out of composition
              editor._compositionKey = null;
              // Clear the text node if possible
              if (!targetNode.isImmutable()) {
                targetNode.setTextContent('');
              } else {
                view.markNodeAsDirty(targetNode);
              }
              target.textContent = '';
              targetNode.select();
            }
          } else {
            // If a node was removed that we control, we should re-attach it!
            const removedNode = getNodeFromDOMNode(view, removedDOM);
            if (removedNode !== null) {
              const parentDOM = getDOMFromNode(editor, removedNode.getParent());
              // We should be re-adding this back to the DOM (we may have already
              // done it though, so we need to confirm).
              if (parentDOM !== null) {
                // Here's an interesting problem. We used to just find the sibling
                // DOM and do parentDOM.insertBefore(removedDOM, siblingDOM);
                // However, what if a DOM mutation has forced the sibling to also be
                // disconnected? So instead, we can append this node, then proceed to
                // append all siblings.

                // First append this DOM.
                parentDOM.appendChild(removedDOM);
                // Append all siblings DOMs.
                let sibling = removedNode.getNextSibling();

                while (sibling !== null) {
                  const siblingDOM = getDOMFromNode(editor, sibling);
                  if (siblingDOM !== null) {
                    parentDOM.appendChild(siblingDOM);
                  }
                  sibling = sibling.getNextSibling();
                }

                // Come out of composition
                editor._compositionKey = null;

                if (isTextNode(removedNode)) {
                  // Clear the text node if possible
                  if (!removedNode.isImmutable()) {
                    removedNode.setTextContent('');
                  } else {
                    view.markNodeAsDirty(removedNode);
                  }
                  removedNode.select();
                  removedDOM.textContent = '';
                } else if (isBlockNode(removedNode)) {
                  const emptyText = createTextNode();
                  removedNode.clear();
                  removedNode.append(emptyText);
                  emptyText.select();
                }
              }
            }
          }
        }
      }
    }
    const selection = view.getSelection();
    if (selection === null) {
      // Looks like a text node was added and selection was moved to it.
      // We can attempt to restore the last selection.
      const lastSelection = getLastSelection(editor);
      if (lastSelection !== null) {
        view.setSelection(lastSelection);
      }
    }
  });
}
