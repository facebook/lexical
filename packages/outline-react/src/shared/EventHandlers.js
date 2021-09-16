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
  BlockNode,
  LineBreakNode,
  DecoratorNode,
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
import {createTextNode, isTextNode, isDecoratorNode} from 'outline';

const ZERO_WIDTH_JOINER_CHAR = '\u2060';
const NO_BREAK_SPACE_CHAR = '\u00A0';

let lastKeyWasMaybeAndroidSoftKey = false;

// TODO the Flow types here needs fixing
export type EventHandler = (
  // $FlowFixMe: not sure how to handle this generic properly
  event: Object,
  editor: OutlineEditor,
) => void;

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
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (anchor.type !== 'text' || focus.type !== 'text') {
    return true;
  }
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const anchorTextContentSize = anchor.getNode().getTextContentSize();
  const selectionAtBoundary = isBackward
    ? anchorOffset < 2 || focusOffset < 2
    : anchorOffset > anchorTextContentSize - 2 ||
      focusOffset > anchorTextContentSize - 2;

  return selection.isCollapsed()
    ? isHoldingShift || selectionAtBoundary
    : isHoldingShift && selectionAtBoundary;
}

function isTopLevelBlockRTL(selection: Selection) {
  const anchorNode = selection.anchor.getNode();
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();
  const direction = topLevelBlock.getDirection();
  return direction === 'rtl';
}

export function onKeyDownForPlainText(
  event: KeyboardEvent,
  editor: OutlineEditor,
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
  }, 'onKeyDownForPlainText');
}

export function onKeyDownForRichText(
  event: KeyboardEvent,
  editor: OutlineEditor,
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
      const anchor = selection.anchor;
      if (anchor.type === 'text') {
        const anchorNode = anchor.getNode();
        const parentBlock = anchorNode.getParentBlockOrThrow();
        if (parentBlock.canInsertTab()) {
          if (event.shiftKey) {
            const textContent = anchorNode.getTextContent();
            const character = textContent[anchor.offset - 1];
            if (character === '\t') {
              deleteBackward(selection);
            }
          } else {
            insertText(selection, '\t');
          }
          event.preventDefault();
        }
      }
    } else if (isSelectAll(event)) {
      event.preventDefault();
      selectAll(selection);
    }
  }, 'onKeyDownForRichText');
}

export function onPasteForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      insertDataTransferForPlainText(clipboardData, selection, view);
    }
  }, 'onPasteForPlainText');
}

export function onPasteForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      insertDataTransferForRichText(clipboardData, selection, view);
    }
  }, 'onPasteForRichText');
}

export function onDropPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  // This should only occur without beforeInput. Block it as it's too much
  // hassle to make work at this point.
  event.preventDefault();
}

export function onDragStartPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  // Block dragging.
  event.preventDefault();
}

export function onCutForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  onCopyForPlainText(event, editor);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  }, 'onCutForPlainText');
}

export function onCutForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  onCopyForRichText(event, editor);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  }, 'onCutForRichText');
}

export function onCopyForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
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
  }, 'onCopyForPlainText');
}

export function onCopyForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
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
  }, 'onCopyForRichText');
}

export function onCompositionStart(
  event: CompositionEvent,
  editor: OutlineEditor,
): void {
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null && !editor.isComposing()) {
      view.setCompositionKey(selection.anchor.key);
      const data = event.data;
      if (data != null && !lastKeyWasMaybeAndroidSoftKey) {
        // We insert an empty space, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        insertText(selection, ' ');
      }
    }
  }, 'onCompositionStart');
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
): void {
  editor.update((view) => {
    updateSelectedTextFromDOM(editor, view);
    view.setCompositionKey(null);
  }, 'onCompositionEnd');
}

export function onSelectionChange(event: Event, editor: OutlineEditor): void {
  const domSelection = window.getSelection();
  const rootElement = editor.getRootElement();
  // This is a hot-path, so let's avoid doing an update when
  // the anchorNode is not actually inside the editor.
  if (rootElement && !rootElement.contains(domSelection.anchorNode)) {
    return;
  }

  // This update functions as a way of reconciling a bad selection
  // to a good selection.
  editor.update((view) => {
    const selection = view.getSelection();
    // Update the selection textFormat
    if (selection !== null && selection.isCollapsed()) {
      const anchor = selection.anchor;
      if (anchor.type === 'text') {
        const anchorNode = anchor.getNode();
        selection.textFormat = anchorNode.getFormat();
      }
    }
  }, 'onSelectionChange');
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

function shouldInsertTextAfterOrBeforeTextNode(
  selection: Selection,
  node: TextNode,
  validateOffset: boolean,
): boolean {
  const offset = selection.anchor.offset;
  return (
    node.isSegmented() ||
    (selection.isCollapsed() &&
      (!validateOffset ||
        node.getTextContentSize() === offset ||
        offset === 0) &&
      (!node.canInsertTextAtEnd() || node.isImmutable()))
  );
}

function shouldInsertRawTextAfterOrBeforeTextNode(
  selection: Selection,
  node: TextNode,
  textContent: string,
  originalTextContent: string,
): boolean {
  return (
    textContent.indexOf(originalTextContent) !== -1 &&
    shouldInsertTextAfterOrBeforeTextNode(selection, node, false)
  );
}

function updateTextNodeFromDOMContent(
  dom: Text,
  view: View,
  editor: OutlineEditor,
): void {
  let node = getClosestNodeFromDOMNode(view, dom);
  if (isTextNode(node) && !node.isDirty()) {
    const rawTextContent = dom.nodeValue;
    let textContent = rawTextContent.replace(ZERO_WIDTH_JOINER_CHAR, '');

    if (
      node.isComposing() &&
      textContent[textContent.length - 1] === NO_BREAK_SPACE_CHAR
    ) {
      textContent = textContent.slice(0, -1);
    }

    if (textContent !== node.getTextContent()) {
      const originalTextContent = node.getTextContent();
      const selection = view.getSelection();
      const domSelection = window.getSelection();
      const range =
        domSelection === null || domSelection.rangeCount === 0
          ? null
          : domSelection.getRangeAt(0);

      if (
        (isImmutableOrInert(node) &&
          (selection === null ||
            !shouldInsertRawTextAfterOrBeforeTextNode(
              selection,
              node,
              textContent,
              originalTextContent,
            ))) ||
        (editor.isComposing() && !node.isComposing())
      ) {
        view.markNodeAsDirty(node);
        return;
      }
      if (domSelection === null || selection === null || range === null) {
        node.setTextContent(textContent);
        return;
      }
      selection.applyDOMRange(range);
      const nodeKey = node.getKey();

      if (!CAN_USE_BEFORE_INPUT && selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        if (
          anchor.type === 'text' &&
          focus.type === 'text' &&
          anchor.key === nodeKey &&
          (node.getFormat() !== selection.textFormat ||
            shouldInsertRawTextAfterOrBeforeTextNode(
              selection,
              node,
              textContent,
              originalTextContent,
            ))
        ) {
          const isCollapsed = selection.isCollapsed();
          const intersection = textContent.indexOf(originalTextContent);
          const insertionText =
            intersection === 0
              ? textContent.slice(originalTextContent.length)
              : textContent.slice(0, intersection);
          view.markNodeAsDirty(node);
          anchor.offset -=
            intersection === 0
              ? insertionText.length
              : originalTextContent.length;
          if (anchor.offset < 0) {
            anchor.offset = 0;
          }
          if (isCollapsed) {
            focus.offset = anchor.offset;
          }
          insertText(selection, insertionText);
          return;
        }
      }
      if (node.isSegmented()) {
        const replacement = createTextNode(originalTextContent);
        node.replace(replacement, true);
        node = replacement;
      }
      // TODO: somtimes we slip through to this even though this should
      // be captured above. We need to find out why.
      if (isImmutableOrInert(node)) {
        view.markNodeAsDirty(node);
        return;
      }
      node = node.setTextContent(textContent);

      if (
        selection.isCollapsed() &&
        selection.anchor.key === nodeKey &&
        rawTextContent[0] === ZERO_WIDTH_JOINER_CHAR
      ) {
        const offset = domSelection.focusOffset - 1;
        node.select(offset, offset);
      }
    }
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

function canRemoveText(
  anchorNode: TextNode | BlockNode | LineBreakNode | DecoratorNode,
  focusNode: TextNode | BlockNode | LineBreakNode | DecoratorNode,
): boolean {
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
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (
    (inputType === 'insertText' || inputType === 'insertReplacementText') &&
    anchor.offset === 0 &&
    focus.offset === 1 &&
    anchor.key === focus.key
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
): void {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    inputType === 'insertCompositionText'
  ) {
    return;
  }

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
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

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
        const anchorKey = anchor.key;
        const focusKey = focus.key;

        if (
          anchorKey !== focusKey ||
          !isTextNode(anchorNode) ||
          anchorNode.getFormat() !== selection.textFormat ||
          shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode, true) ||
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
  }, 'onBeforeInputForPlainText');
}

export function onBeforeInputForRichText(
  event: InputEvent,
  editor: OutlineEditor,
): void {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    inputType === 'insertCompositionText'
  ) {
    return;
  }

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
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

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
        const anchorKey = anchor.key;
        const focusKey = focus.key;

        if (
          anchorKey !== focusKey ||
          !isTextNode(anchorNode) ||
          anchorNode.getFormat() !== selection.textFormat ||
          shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode, true) ||
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
  }, 'onBeforeInputForRichText');
}

function updateSelectedTextFromDOM(editor: OutlineEditor, view: View) {
  // Update the text content with the latest composition text
  const domSelection = window.getSelection();
  const anchorDOM = domSelection === null ? null : domSelection.anchorNode;
  if (anchorDOM !== null && anchorDOM.nodeType === 3) {
    updateTextNodeFromDOMContent(anchorDOM, view, editor);
  }
}

export function onInput(event: InputEvent, editor: OutlineEditor) {
  editor.update((view: View) => {
    if (!CAN_USE_BEFORE_INPUT) {
      const selection = view.getSelection();
      const data = event.data;
      if (selection !== null && data != null) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        if (anchor.type === 'block' || focus.type === 'block') {
          insertText(selection, data);
          return;
        }
      }
    }
    updateSelectedTextFromDOM(editor, view);
  }, 'onInput');
}

function isManagedLineBreak(dom: Node, target: Node): boolean {
  return (
    // $FlowFixMe: internal field
    target.__outlineLineBreak === dom || dom.__outlineInternalRef !== undefined
  );
}

export function onMutation(
  editor: OutlineEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {
  editor.update((view: View) => {
    let shouldRevertSelection = true;

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
          shouldRevertSelection = false;
        }
      } else if (type === 'childList') {
        // We attempt to "undo" any changes that have occured outside
        // of Outline. We want Outline's view model to be source of truth.
        // To the user, these will look like no-ops.
        const addedDOMs = mutation.addedNodes;
        const removedDOMs = mutation.removedNodes;
        const siblingDOM = mutation.nextSibling;

        for (let s = 0; s < removedDOMs.length; s++) {
          const removedDOM = removedDOMs[s];
          const node = getNodeFromDOMNode(view, removedDOM);
          let placementDOM = siblingDOM;

          if (node !== null && node.isAttached()) {
            const nextSibling = node.getNextSibling();
            if (nextSibling !== null) {
              const key = nextSibling.getKey();
              const nextSiblingDOM = editor.getElementByKey(key);
              if (
                nextSiblingDOM !== null &&
                nextSiblingDOM.parentNode !== null
              ) {
                placementDOM = nextSiblingDOM;
              }
            }
          }
          if (placementDOM != null) {
            while (placementDOM != null) {
              const parentDOM = placementDOM.parentNode;
              if (parentDOM === target) {
                target.insertBefore(removedDOM, placementDOM);
                break;
              }
              placementDOM = parentDOM;
            }
          } else {
            target.appendChild(removedDOM);
          }
        }
        for (let s = 0; s < addedDOMs.length; s++) {
          const addedDOM = addedDOMs[s];
          const node = getNodeFromDOMNode(view, addedDOM);
          const parentDOM = addedDOM.parentNode;
          if (parentDOM != null && node === null) {
            parentDOM.removeChild(addedDOM);
          }
        }
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
        const target = record.target;

        for (let s = 0; s < addedNodes.length; s++) {
          const addedDOM = addedNodes[s];
          const parentDOM = addedDOM.parentNode;
          if (
            parentDOM != null &&
            addedDOM.nodeName === 'BR' &&
            !isManagedLineBreak(addedDOM, target)
          ) {
            parentDOM.removeChild(addedDOM);
          }
        }
      }
      // Clear any of those removal mutations
      observer.takeRecords();
    }

    if (shouldRevertSelection) {
      const lastSelection = getLastSelection(editor);
      if (lastSelection !== null) {
        const selection = lastSelection.clone();
        selection.isDirty = true;
        view.setSelection(selection);
      }
    }
  }, 'onMutation');
}
