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

import {IS_SAFARI, CAN_USE_BEFORE_INPUT, IS_FIREFOX} from 'shared/environment';
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
import {createTextNode, isTextNode, isDecoratorNode} from 'outline';

const ZERO_WIDTH_JOINER_CHAR = '\u2060';

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
  // $FlowFixMe: internal field
  const key: NodeKey | undefined = dom.__outlineInternalRef;
  if (key !== undefined) {
    return view.getNodeByKey(key);
  }
  return null;
}

function getClosestNodeFromDOMNode(
  view: View,
  startingDOM: Node,
): OutlineNode | null {
  let dom = startingDOM;
  while (dom != null) {
    const node = getNodeFromDOMNode(view, dom);
    if (node !== null) {
      return node;
    }
    dom = dom.parentNode;
  }
  return null;
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

  return selection.isCollapsed()
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
      view.setCompositionKey(selection.anchorKey);
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
  // There's a bug in FF where doing an update during
  // compositionend can cause diacritics to be lost.
  if (IS_FIREFOX) {
    setTimeout(() => {
      editor.update((view) => {
        view.setCompositionKey(null);
      });
    });
  } else {
    editor.update((view) => {
      view.setCompositionKey(null);
    });
  }
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
    (selection.isCollapsed() &&
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
  let node = getClosestNodeFromDOMNode(view, dom);
  if (node !== null && !node.isDirty()) {
    const rawTextContent = dom.nodeValue;
    const textContent = rawTextContent.replace(/[\u2060\u00A0]/g, '');
    const nodeKey = node.getKey();

    if (isTextNode(node) && textContent !== node.getTextContent()) {
      if (handleBlockTextInputOnNode(node, view)) {
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
        selection.isCollapsed() &&
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
      view.setCompositionKey(null);
      event.preventDefault();
      deleteBackward(selection);
      return;
    }
    const data = event.data;

    if (selection.isCollapsed()) {
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
          shouldInsertTextAfterTextNode(selection, anchorNode, true) ||
          data.length > 1
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
          view.setCompositionKey(null);
          insertText(selection, data);
        }
        break;
      }
      case 'insertLineBreak':
      case 'insertParagraph': {
        // Used for Android
        view.setCompositionKey(null);
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
      view.setCompositionKey(null);
      event.preventDefault();
      deleteBackward(selection);
      return;
    }
    const data = event.data;

    if (selection.isCollapsed()) {
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
          shouldInsertTextAfterTextNode(selection, anchorNode, true) ||
          data.length > 1
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
          view.setCompositionKey(null);
          insertText(selection, data);
        }
        break;
      }
      case 'insertLineBreak': {
        // Used for Android
        view.setCompositionKey(null);
        insertLineBreak(selection);
        break;
      }
      case 'insertParagraph': {
        // Used for Android
        view.setCompositionKey(null);
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
      case 'formatBold': {
        formatText(selection, 'bold');
        break;
      }
      case 'formatItalic': {
        formatText(selection, 'italic');
        break;
      }
      case 'formatUnderline': {
        formatText(selection, 'underline');
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
  observer: MutationObserver,
): void {
  editor.update((view: View) => {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      const type = mutation.type;
      const target = mutation.target;
      const targetNode = getClosestNodeFromDOMNode(view, target);

      if (isDecoratorNode(targetNode)) {
        continue;
      }
      if (type === 'characterData') {
        if (target.nodeType === 3) {
          // $FlowFixMe: nodeType === 3 is a Text DOM node
          updateTextNodeFromDOMContent(((target: any): Text), view, editor);
        }
      } else if (type === 'childList') {
        // We attempt to "undo" any changes that have occured outside
        // of Outline. We want Outline's view model to be source of truth.
        // To the user, these will look like no-ops.
        const nextSibling = mutation.nextSibling;
        const addedNodes = mutation.addedNodes;
        const removedNodes = mutation.removedNodes;

        for (let s = 0; s < removedNodes.length; s++) {
          const removedDOM = removedNodes[s];
          if (nextSibling != null) {
            let ancestor = nextSibling;

            while (ancestor != null) {
              const parentDOM = ancestor.parentNode;
              if (parentDOM === target) {
                target.insertBefore(removedDOM, ancestor);
                break;
              }
              ancestor = parentDOM;
            }
          } else {
            target.appendChild(removedDOM);
          }
        }
        for (let s = 0; s < addedNodes.length; s++) {
          const addedDOM = addedNodes[s];
          const node = getNodeFromDOMNode(view, addedDOM);
          const parentDOM = addedDOM.parentNode;
          if (parentDOM != null && node === null) {
            parentDOM.removeChild(addedDOM);
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

    // Capture all the mutations made during this function. This
    // also prevents us having to process them on the next cycle
    // of onMutation, as these mutations were made by us.
    const records = observer.takeRecords();

    // Check for any random auto-added <br> elements, and remove them.
    // These get added by the browser when we undo the above mutations
    // and this can lead to a broken UI.
    if (records.length > 0) {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const addedNodes = record.addedNodes;
        for (let s = 0; s < addedNodes.length; s++) {
          const addedDOM = addedNodes[s];
          const parentDOM = addedDOM.parentNode;
          if (parentDOM != null && addedDOM.nodeName === 'BR') {
            parentDOM.removeChild(addedDOM);
          }
        }
      }
      // Clear any of those removal mutations
      observer.takeRecords();
    }
  });
}
