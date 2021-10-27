/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
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
  TextMutation,
} from 'outline';

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
  isMoveBackward,
  isMoveForward,
} from 'outline/keys';
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
  cloneContents,
  insertNodes,
  insertLineBreak,
  insertRichText,
  moveCharacter,
} from 'outline/selection';
import {
  createTextNode,
  isTextNode,
  isDecoratorNode,
  getEditorFromElement,
} from 'outline';
import {IS_FIREFOX} from 'shared/environment';
import getPossibleDecoratorNode from 'shared/getPossibleDecoratorNode';

const NO_BREAK_SPACE_CHAR = '\u00A0';

let lastKeyWasMaybeAndroidSoftKey = false;
let pendingOnInputTextMutations = null;

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

function shouldOverrideDefaultCharacterSelection(
  selection: Selection,
  isBackward: boolean,
): boolean {
  const possibleDecoratorNode = getPossibleDecoratorNode(
    selection.focus,
    isBackward,
  );
  return isDecoratorNode(possibleDecoratorNode);
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
    view.log('onKeyDownForPlainText');
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const isHoldingShift = event.shiftKey;

    if (isMoveBackward(event)) {
      if (shouldOverrideDefaultCharacterSelection(selection, true)) {
        event.preventDefault();
        moveCharacter(selection, isHoldingShift, true);
      }
    } else if (isMoveForward(event)) {
      if (shouldOverrideDefaultCharacterSelection(selection, false)) {
        event.preventDefault();
        moveCharacter(selection, isHoldingShift, false);
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
    }
  });
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
    view.log('onKeyDownForRichText');
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const isHoldingShift = event.shiftKey;

    if (isMoveBackward(event)) {
      if (shouldOverrideDefaultCharacterSelection(selection, true)) {
        event.preventDefault();
        moveCharacter(selection, isHoldingShift, true);
      }
    } else if (isMoveForward(event)) {
      if (shouldOverrideDefaultCharacterSelection(selection, false)) {
        event.preventDefault();
        moveCharacter(selection, isHoldingShift, false);
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
    }
  });
}

export function onPasteForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  editor.update((view) => {
    view.log('onPasteForPlainText');
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
): void {
  event.preventDefault();
  editor.update((view) => {
    view.log('onPasteForRichText');
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
    view.log('onCutForPlainText');
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

export function onCutForRichText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  onCopyForRichText(event, editor);
  editor.update((view) => {
    view.log('onCutForRichText');
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

export function onCopyForPlainText(
  event: ClipboardEvent,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  editor.update((view) => {
    view.log('onCopyForPlainText');
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
): void {
  event.preventDefault();
  editor.update((view) => {
    view.log('onCopyForRichText');
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
          JSON.stringify(cloneContents(selection)),
        );
      }
    }
  });
}

export function onCompositionStart(
  event: CompositionEvent,
  editor: OutlineEditor,
): void {
  editor.update((view) => {
    view.log('onCompositionStart');
    const selection = view.getSelection();
    if (selection !== null && !editor.isComposing()) {
      const anchor = selection.anchor;
      view.setCompositionKey(anchor.key);
      const data = event.data;
      if (
        data != null &&
        (!lastKeyWasMaybeAndroidSoftKey ||
          anchor.type === 'block' ||
          !selection.isCollapsed())
      ) {
        // We insert an empty space, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        insertText(selection, ' ');
      }
    }
  });
}

function onCompositionEndInternal(
  event: CompositionEvent,
  editor: OutlineEditor,
) {
  editor.update((view) => {
    view.log('onCompositionEnd');
    view.setCompositionKey(null);
    updateSelectedTextFromDOM(editor, view, true);
  });
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
): void {
  if (IS_FIREFOX) {
    // The order of onInput and onCompositionEnd is different
    // in FF. Given that onInput will fire after onCompositionEnd
    // in FF, we need to defer the logic for onCompositionEnd to
    // ensure that any possible onInput events fire before.
    setTimeout(() => {
      onCompositionEndInternal(event, editor);
    }, 0);
  } else {
    onCompositionEndInternal(event, editor);
  }
}

function getLastSelection(editor: OutlineEditor): null | Selection {
  return editor.getEditorState().read((lastView) => lastView.getSelection());
}

// This is a work-around is mainly Chrome specific bug where if you select
// the contents of an empty block, you cannot easily unselect anything.
// This results in a tiny selection box that looks buggy/broken. This can
// also help other browsers when selection might "appear" lost, when it
// really isn't.
export function onClick(event: MouseEvent, editor: OutlineEditor): void {
  editor.update((view) => {
    view.log('onClick');
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const anchor = selection.anchor;
    if (
      anchor.type === 'block' &&
      anchor.offset === 0 &&
      selection.isCollapsed() &&
      view.getRoot().getChildrenSize() === 1 &&
      anchor.getNode().getTopParentBlockOrThrow().isEmpty()
    ) {
      const lastSelection = getLastSelection(editor);
      if (lastSelection !== null && selection.is(lastSelection)) {
        window.getSelection().removeAllRanges();
        selection.dirty = true;
      }
    }
  });
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
    view.log('onSelectionChange');
    const selection = view.getSelection();
    // Update the selection format
    if (selection !== null && selection.isCollapsed()) {
      const anchor = selection.anchor;
      if (anchor.type === 'text') {
        const anchorNode = anchor.getNode();
        selection.format = anchorNode.getFormat();
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

function updateTextNodeFromDOMContent(
  textNode: TextNode,
  textContent: string,
  anchorOffset: null | number,
  focusOffset: null | number,
  view: View,
  editor: OutlineEditor,
  compositionEnd: boolean,
): void {
  let node = textNode;
  if (node.isAttached() && (compositionEnd || !node.isDirty())) {
    const isComposing = node.isComposing();
    let normalizedTextContent = textContent;

    if (
      (isComposing || compositionEnd) &&
      textContent[textContent.length - 1] === NO_BREAK_SPACE_CHAR
    ) {
      normalizedTextContent = textContent.slice(0, -1);
    }

    if (compositionEnd || normalizedTextContent !== node.getTextContent()) {
      if (isImmutableOrInert(node) || (editor.isComposing() && !isComposing)) {
        view.markNodeAsDirty(node);
        return;
      }
      const selection = view.getSelection();

      if (selection === null || anchorOffset === null || focusOffset === null) {
        node.setTextContent(normalizedTextContent);
        return;
      }
      selection.setTextNodeRange(node, anchorOffset, node, focusOffset);

      if (node.isSegmented()) {
        const originalTextContent = node.getTextContent();
        const replacement = createTextNode(originalTextContent);
        node.replace(replacement);
        node = replacement;
      }
      node = node.setTextContent(normalizedTextContent);
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

function shouldPreventDefaultAndInsertText(
  selection: Selection,
  text: string,
  isBeforeInput: boolean,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();

  return (
    anchor.key !== focus.key ||
    // If we're working with a range that is not during composition.
    (anchor.offset !== focus.offset && !anchorNode.isComposing()) ||
    // If the text length is more than a single character and we're either
    // dealing with this in "beforeinput" or where the node has already recently
    // been changed (thus is dirty).
    ((isBeforeInput || anchorNode.isDirty()) && text.length > 1) ||
    // If we're working with a non-text node.
    !isTextNode(anchorNode) ||
    // Check if we're changing from bold to italics, or some other format.
    anchorNode.getFormat() !== selection.format ||
    // One last set of heuristics to check against.
    shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode, true)
  );
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
    view.log('onBeforeInputForPlainText');
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

    if (!selection.dirty && selection.isCollapsed()) {
      applyTargetRange(selection, event);
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
      } else if (
        data != null &&
        shouldPreventDefaultAndInsertText(selection, data, true)
      ) {
        event.preventDefault();
        insertText(selection, data);
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
    view.log('onBeforeInputForRichText');
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

    if (!selection.dirty && selection.isCollapsed()) {
      applyTargetRange(selection, event);
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
      } else if (
        data != null &&
        shouldPreventDefaultAndInsertText(selection, data, true)
      ) {
        event.preventDefault();
        insertText(selection, data);
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

function updateSelectedTextFromDOM(
  editor: OutlineEditor,
  view: View,
  compositionEnd: boolean,
) {
  // Update the text content with the latest composition text
  const domSelection = window.getSelection();
  if (domSelection === null) {
    return;
  }
  const {anchorNode, anchorOffset, focusOffset} = domSelection;
  if (anchorNode !== null && anchorNode.nodeType === 3) {
    const node = view.getNearestNodeFromDOMNode(anchorNode);
    if (isTextNode(node)) {
      updateTextNodeFromDOMContent(
        node,
        anchorNode.nodeValue,
        anchorOffset,
        focusOffset,
        view,
        editor,
        compositionEnd,
      );
    }
  }
}

function takeMutationRecords(editor: OutlineEditor): Array<MutationRecord> {
  const observer = editor.getObserver();
  if (observer === null) {
    return [];
  }
  return observer.takeRecords();
}

export function onInput(event: InputEvent, editor: OutlineEditor): void {
  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation();
  editor.update((view: View) => {
    view.log('onInput');
    const selection = view.getSelection();
    const data = event.data;
    if (
      data != null &&
      selection !== null &&
      shouldPreventDefaultAndInsertText(selection, data, false)
    ) {
      insertText(selection, data);
    } else {
      updateSelectedTextFromDOM(editor, view, false);
    }
    if (pendingOnInputTextMutations !== null) {
      view.flushMutations(pendingOnInputTextMutations);
      pendingOnInputTextMutations = null;
    }
    // Also flush any other mutations that might have occured
    // since the change.
    const mutations = takeMutationRecords(editor);
    if (mutations.length > 0) {
      view.flushMutations(mutations);
    }
  });
}

export function applyMutationInputWebkitWorkaround(): void {
  // In Chrome and Safari, having an input capture listener
  // on an element other than the contenteditable causes a
  // bug where MutationObserver listeners are triggered before
  // onInput is triggered. In order to avoid this bug, we
  // add our own capture input listener to the window and
  // capture any mutations at this point. This stops the
  // MutationObserver listener from firing before.
  //
  // If we have any records, we flush all non-text mutations
  // now (early) and then pass along any text mutations to
  // be processed later,.

  window.addEventListener(
    'input',
    (event: InputEvent) => {
      pendingOnInputTextMutations = null;
      // $FlowFixMe: event.target is always an element for input events
      const editor = getEditorFromElement(event.target);
      if (editor === null) {
        return;
      }
      const mutations = takeMutationRecords(editor);
      if (mutations.length > 0) {
        const textMutations = [];
        const otherMutations = [];
        // Filter out text mutations from the other mutations
        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          if (mutation.type === 'characterData') {
            textMutations.push(mutation);
          } else {
            otherMutations.push(mutation);
          }
        }
        if (otherMutations.length > 0) {
          editor.update((view) => {
            view.log('applyMutationWorkaround');
            view.flushMutations(otherMutations);
          });
        }
        if (textMutations.length > 0) {
          pendingOnInputTextMutations = textMutations;
        }
      }
    },
    true,
  );
}

export function onTextMutation(
  editor: OutlineEditor,
  view: View,
  mutation: TextMutation,
): void {
  // We attempt to merge any text mutations that have occured outside of Outline
  // back into Outline's editor state.
  const node = mutation.node;
  const anchorOffset = mutation.anchorOffset;
  const focusOffset = mutation.focusOffset;
  const text = mutation.text;
  updateTextNodeFromDOMContent(
    node,
    text,
    anchorOffset,
    focusOffset,
    view,
    editor,
    false,
  );
}
