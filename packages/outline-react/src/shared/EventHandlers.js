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

import {IS_SAFARI} from 'shared/environment';
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
import isImmutableOrInertOrSegmented from 'shared/isImmutableOrInertOrSegmented';
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
import {createTextNode, isTextNode} from 'outline';

const ZERO_WIDTH_SPACE_CHAR = '\u200B';
const ZERO_WIDTH_JOINER_CHAR = '\u2060';

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
  const prevSelection = editor.getViewModel()._selection;

  // This update also functions as a way of reconciling a bad selection
  // to a good selection. So if the below logic is removed, remember to
  // not remove the editor update.
  editor.update((view) => {
    const selection = view.getSelection();
    // In some cases, selection can move without an precursor operation
    // occuring. For example, iOS Voice Control moves selection without
    // triggering keydown events. In order to account for zero-width
    // characters, and moving selection to the right place, we need to
    // do the below.
    if (
      prevSelection !== null &&
      selection !== null &&
      selection.isCaret() &&
      prevSelection.isCaret()
    ) {
      const prevAnchorOffset = prevSelection.anchorOffset;
      const prevAnchorKey = prevSelection.anchorKey;
      const anchorOffset = selection.anchorOffset;
      const anchorNode = selection.getAnchorNode();

      if (
        prevAnchorOffset === 0 &&
        anchorOffset === anchorNode.getTextContentSize()
      ) {
        const nextSibling = anchorNode.getNextSibling();
        if (isTextNode(nextSibling) && nextSibling.getKey() === prevAnchorKey) {
          const isRTL = isTopLevelBlockRTL(selection);
          moveBackward(selection, false, isRTL);
        }
      } else if (anchorOffset === 0) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (
          isTextNode(prevSibling) &&
          prevSibling.getKey() === prevAnchorKey &&
          prevSibling.getTextContentSize() === prevAnchorOffset
        ) {
          const isRTL = isTopLevelBlockRTL(selection);
          moveForward(selection, false, isRTL);
        }
      }
    }
  });
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
    const selection = view.getSelection();
    if (selection !== null) {
      const key = anchorNode.getKey();
      const lastSelection = getLastSelection(editor);
      const lastAnchorOffset =
        lastSelection !== null ? lastSelection.anchorOffset : null;
      if (lastAnchorOffset !== null) {
        selection.setRange(key, lastAnchorOffset, key, lastAnchorOffset);
      }
    }
    return true;
  }
  return false;
}

function updateTextNodeFromDOMContent(
  dom: Node,
  view: View,
  editor: OutlineEditor,
): void {
  const node = getNodeFromDOMNode(view, dom);
  if (node !== null && !node.isDirty()) {
    const rawTextContent = dom.nodeValue;
    const textContent = rawTextContent.replace(/[\u200B\u2060]/g, '');

    if (isTextNode(node) && textContent !== node.getTextContent()) {
      if (handleBlockTextInputOnNode(node, view, editor)) {
        return;
      }
      node.setTextContent(textContent);
      const selection = view.getSelection();
      if (
        selection !== null &&
        selection.isCaret() &&
        selection.anchorKey === node.getKey()
      ) {
        const domSelection = window.getSelection();
        let offset = domSelection.focusOffset;
        const firstCharacter = rawTextContent[0];
        if (
          firstCharacter === ZERO_WIDTH_SPACE_CHAR ||
          firstCharacter === ZERO_WIDTH_JOINER_CHAR
        ) {
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
      updateTextNodeFromDOMContent(anchorDOM, view, editor);
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
    !isImmutableOrInertOrSegmented(anchorNode) ||
    !isImmutableOrInertOrSegmented(focusNode)
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
    // We let the browser do its own thing for these composition
    // events. We handle their updates in our mutation observer.
    if (
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      return;
    }
    const anchorNode = selection.getAnchorNode();
    const focusNode = selection.getAnchorNode();

    // Standard text insertion goes through a different path.
    // For most text insertion, we let the browser do its own thing.
    // We update the view model in our mutation observer. However,
    // we do have a few exceptions.
    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertLineBreak(selection);
        insertLineBreak(selection);
      } else if (data == null && IS_SAFARI && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        insertRichText(selection, text);
      } else if (data != null) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;

        if (anchorKey === focusKey) {
          const isAtEnd =
            selection.anchorOffset === anchorNode.getTextContentSize();
          const canInsertAtEnd = anchorNode.canInsertTextAtEnd();

          // We should always block text insertion to imm/seg/inert nodes.
          // We should also do the same when at the end of nodes that do not
          // allow text insertion at the end (like links). When we do have
          // text to go at the end, we can insert into a sibling node instead.
          if (
            isImmutableOrInertOrSegmented(anchorNode) ||
            (isAtEnd && !canInsertAtEnd && selection.isCaret())
          ) {
            event.preventDefault();
            if (isAtEnd && data != null) {
              const nextSibling = anchorNode.getNextSibling();
              if (nextSibling === null) {
                const textNode = createTextNode(data);
                textNode.select();
                anchorNode.insertAfter(textNode);
              } else if (isTextNode(nextSibling)) {
                nextSibling.select(0, 0);
                insertText(selection, data);
              }
            }
          }
        } else {
          // For range text insertion, always over override
          // default and control outselves
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
    // We let the browser do its own thing for these composition
    // events. We handle their updates in our mutation observer.
    if (
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      return;
    }
    const anchorNode = selection.getAnchorNode();
    const focusNode = selection.getAnchorNode();

    // Standard text insertion goes through a different path.
    // For most text insertion, we let the browser do its own thing.
    // We update the view model in our mutation observer. However,
    // we do have a few exceptions.
    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        insertLineBreak(selection);
      } else if (data === '\n\n') {
        event.preventDefault();
        insertParagraph(selection);
      } else if (data == null && IS_SAFARI && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        insertRichText(selection, text);
      } else if (data != null) {
        const anchorKey = selection.anchorKey;
        const focusKey = selection.focusKey;

        if (anchorKey === focusKey) {
          const isAtEnd =
            selection.anchorOffset === anchorNode.getTextContentSize();
          const canInsertAtEnd = anchorNode.canInsertTextAtEnd();

          // We should always block text insertion to imm/seg/inert nodes.
          // We should also do the same when at the end of nodes that do not
          // allow text insertion at the end (like links). When we do have
          // text to go at the end, we can insert into a sibling node instead.
          if (
            isImmutableOrInertOrSegmented(anchorNode) ||
            (isAtEnd && !canInsertAtEnd && selection.isCaret())
          ) {
            event.preventDefault();
            if (isAtEnd && data != null) {
              const nextSibling = anchorNode.getNextSibling();
              if (nextSibling === null) {
                const textNode = createTextNode(data);
                textNode.select();
                anchorNode.insertAfter(textNode);
              } else if (isTextNode(nextSibling)) {
                nextSibling.select(0, 0);
                insertText(selection, data);
              }
            }
          }
        } else {
          // For range text insertion, always over override
          // default and control outselves
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
    const selection = view.getSelection();

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      const type = mutation.type;

      if (type === 'characterData') {
        updateTextNodeFromDOMContent(mutation.target, view, editor);
      } else if (type === 'childList') {
        // This occurs when the DOM tree has been mutated in terms of
        // structure. This is actually not good. Outline should control
        // the contenteditable. This can typically happen because of
        // third party extensions and tools that directly mutate the DOM.
        // Given this code-path shouldn't happen often so we can use
        // slightly slower code but code that takes up less bytes.
        const {addedNodes, removedNodes} = mutation;

        addedNodes.forEach((addedDOM) => {
          const addedNode = getNodeFromDOMNode(view, addedDOM);
          // For now we don't want nodes that weren't added by Outline.
          // So lets remove this node if it's not managed by Outline
          if (addedNode === null) {
            const parent = addedDOM.parentNode;
            console.log('remove', addedDOM);
            if (parent != null) {
              parent.removeChild(addedDOM);
            }
          } else {
            console.log('remove', null);
          }
        });
        removedNodes.forEach((removedDOM) => {
          // If a node was removed that we control, we should re-attach it!
          const removedNode = getNodeFromDOMNode(view, removedDOM);
          if (removedNode !== null) {
            const parentDOM = getDOMFromNode(editor, removedNode.getParent());
            // We should be re-adding this back to the DOM
            if (parentDOM !== null) {
              // See if we have a sibling to insert before
              const siblingDOM = getDOMFromNode(
                editor,
                removedNode.getNextSibling(),
              );
              console.log('add', removedNode);
              if (siblingDOM === null) {
                parentDOM.appendChild(removedDOM);
              } else {
                parentDOM.insertBefore(removedDOM, siblingDOM);
              }
            }
          }
        });
        if (selection === null) {
          // Looks like a text node was added and selection was moved to it.
          // We can attempt to restore the last selection.
          const lastSelection = getLastSelection(editor);
          if (lastSelection !== null) {
            view.setSelection(lastSelection);
          }
        }
      }
    }
  });
}
