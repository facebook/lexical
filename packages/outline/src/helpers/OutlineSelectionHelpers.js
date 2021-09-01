/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  NodeKey,
  OutlineNode,
  Selection,
  TextFormatType,
  TextNode,
} from 'outline';

import {
  createLineBreakNode,
  isTextNode,
  isBlockNode,
  isRootNode,
  createTextNode,
} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {isHashtagNode} from 'outline/HashtagNode';

import isImmutableOrInert from 'shared/isImmutableOrInert';
import invariant from 'shared/invariant';
import {doesContainGrapheme} from 'outline/TextHelpers';

function cloneWithProperties<T: OutlineNode>(node: T): T {
  const latest = node.getLatest();
  const clone = latest.clone();
  clone.__flags = latest.__flags;
  clone.__parent = latest.__parent;
  if (isBlockNode(latest)) {
    clone.__children = Array.from(latest.__children);
  } else if (isTextNode(latest)) {
    clone.__format = latest.__format;
    clone.__style = latest.__style;
  }
  return clone;
}

export function getNodesInRange(selection: Selection): {
  range: Array<NodeKey>,
  nodeMap: Array<[NodeKey, OutlineNode]>,
} {
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (anchor.type !== 'text' || focus.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  let startOffset;
  let endOffset;

  if (anchorNode === focusNode) {
    if (isTextNode(anchorNode)) {
      const firstNode = cloneWithProperties<TextNode>(anchorNode);
      const isBefore = focusOffset > anchorOffset;
      startOffset = isBefore ? anchorOffset : focusOffset;
      endOffset = isBefore ? focusOffset : anchorOffset;
      firstNode.__text = firstNode.__text.slice(startOffset, endOffset);
      const key = firstNode.getKey();
      return {range: [key], nodeMap: [[key, firstNode]]};
    }
    invariant(false, 'Selection block node not yet implemented.');
  }
  const nodes = selection.getNodes();
  const firstNode = nodes[0];
  const isBefore = firstNode === selection.anchor.getNode();
  const nodeKeys = [];
  const nodeMap = new Map();
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  const nodesLength = nodes.length;
  const sourceParent = firstNode.getParentOrThrow();
  const sourceParentKey = sourceParent.getKey();
  const topLevelNodeKeys = new Set();

  for (let i = 0; i < nodesLength; i++) {
    let node = nodes[i];
    if (node.isInert()) {
      continue;
    }
    const parent = node.getParent();
    const nodeKey = node.getKey();

    if (isTextNode(node) && !node.isSegmented() && !node.isImmutable()) {
      const text = node.getTextContent();

      if (i === 0) {
        node = cloneWithProperties<TextNode>(node);
        node.__text = text.slice(startOffset, text.length);
      } else if (i === nodesLength - 1) {
        node = cloneWithProperties<TextNode>(node);
        node.__text = text.slice(0, endOffset);
      }
    }

    if (!nodeMap.has(nodeKey)) {
      nodeMap.set(nodeKey, node);
    }

    if (parent === sourceParent && parent !== null) {
      nodeKeys.push(nodeKey);

      const topLevelBlock = node.getTopParentBlockOrThrow();
      topLevelNodeKeys.add(topLevelBlock.getKey());
    } else {
      let includeTopLevelBlock = false;

      if (!isRootNode(parent)) {
        let removeChildren = false;

        while (node !== null) {
          const currKey = node.getKey();
          if (currKey === sourceParentKey) {
            removeChildren = true;
          } else if (removeChildren) {
            // We need to remove any children before out last source
            // parent key.
            const prevNode = node.getLatest();
            node = prevNode.clone();
            node.__flags = prevNode.__flags;
            node.__parent = prevNode.__parent;
            if (isBlockNode(prevNode)) {
              node.__children = Array.from(prevNode.__children);
            } else if (isTextNode(prevNode)) {
              node.__format = prevNode.__format;
              node.__style = prevNode.__style;
            }
            if (!isBlockNode(node)) {
              invariant(false, 'getNodesInRange: node is not a block node');
            }
            const childrenKeys = node.__children;
            const index = childrenKeys.indexOf(sourceParentKey);
            if (index === -1) {
              invariant(false, 'getNodesInRange: child is not inside parent');
            }
            childrenKeys.splice(0, index + 1);
            includeTopLevelBlock = true;
          }
          if (!nodeMap.has(currKey)) {
            nodeMap.set(currKey, node);
          }

          const nextParent = node.getParent();
          if (isRootNode(nextParent)) {
            break;
          }
          node = nextParent;
        }
      }
      if (node !== null) {
        const key = node.getKey();
        if (!topLevelNodeKeys.has(key) || includeTopLevelBlock) {
          topLevelNodeKeys.add(key);
          nodeKeys.push(key);
        }
      }
    }
  }
  return {range: nodeKeys, nodeMap: Array.from(nodeMap.entries())};
}

export function extractSelection(selection: Selection): Array<OutlineNode> {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const lastIndex = selectedNodesLength - 1;
  const anchor = selection.anchor;
  const focus = selection.focus;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];

  if (!isTextNode(firstNode) || !isTextNode(lastNode)) {
    invariant(false, 'formatText: firstNode/lastNode not a text node');
  }
  if (anchor.type !== 'text' || focus.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  let startOffset;
  let endOffset;

  if (selectedNodesLength === 1) {
    startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
    endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
    const splitNodes = firstNode.splitText(startOffset, endOffset);
    const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
    return [node];
  }
  const isBefore = firstNode === selection.anchor.getNode();
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  if (startOffset !== 0) {
    [, firstNode] = firstNode.splitText(startOffset);
  }
  selectedNodes[0] = firstNode;
  const lastNodeText = lastNode.getTextContent();
  const lastNodeTextLength = lastNodeText.length;
  if (endOffset !== lastNodeTextLength) {
    [lastNode] = lastNode.splitText(endOffset);
  }
  selectedNodes[lastIndex] = lastNode;
  return selectedNodes;
}

export function formatText(
  selection: Selection,
  formatType: TextFormatType,
): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const lastIndex = selectedNodesLength - 1;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];

  if (!isTextNode(firstNode) || !isTextNode(lastNode)) {
    invariant(false, 'formatText: firstNode/lastNode not a text node');
  }
  if (selection.isCollapsed()) {
    selection.toggleTextFormatType(formatType);
    return;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (anchor.type !== 'text' || focus.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const focusOffset = focus.offset;
  let firstNextFormat = firstNode.getTextNodeFormat(formatType, null);
  let anchorOffset = anchor.offset;
  let startOffset;
  let endOffset;

  const isBefore = firstNode === selection.anchor.getNode();
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  if (startOffset === firstNode.getTextContentSize()) {
    const nextSibling = firstNode.getNextSibling();

    if (isTextNode(nextSibling)) {
      anchorOffset = 0;
      startOffset = 0;
      firstNode = nextSibling;
      firstNextFormat = firstNode.getTextNodeFormat(formatType, null);
    }
  }

  if (firstNode === lastNode) {
    if (isTextNode(firstNode)) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

      if (startOffset === endOffset) {
        return;
      }
      if (startOffset === 0 && endOffset === firstNodeTextLength) {
        firstNode.setFormat(firstNextFormat);
        firstNode.select(startOffset, endOffset);
      } else {
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFormat(firstNextFormat);
        replacement.select(0, endOffset - startOffset);
      }
    }
  } else {
    if (startOffset !== 0) {
      [, firstNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFormat(firstNextFormat);

    const lastNextFormat = lastNode.getTextNodeFormat(
      formatType,
      firstNextFormat,
    );
    const lastNodeText = lastNode.getTextContent();
    const lastNodeTextLength = lastNodeText.length;
    if (endOffset !== lastNodeTextLength) {
      [lastNode] = lastNode.splitText(endOffset);
    }
    lastNode.setFormat(lastNextFormat);

    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      const selectedNodeKey = selectedNode.getKey();
      if (
        isTextNode(selectedNode) &&
        selectedNodeKey !== firstNode.getKey() &&
        selectedNodeKey !== lastNode.getKey() &&
        !selectedNode.isImmutable()
      ) {
        const selectedNextFormat = selectedNode.getTextNodeFormat(
          formatType,
          lastNextFormat,
        );
        selectedNode.setFormat(selectedNextFormat);
      }
    }
    selection.setTextNodeRange(firstNode, startOffset, lastNode, endOffset);
  }
}

export function insertParagraph(selection: Selection): void {
  if (!selection.isCollapsed()) {
    removeText(selection);
  }
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }
  const anchorNode = anchor.getNode();
  if (anchorNode.isSegmented()) {
    return;
  }
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const nodesToMove = anchorNode.getNextSiblings().reverse();
  const currentBlock = anchorNode.getParentBlockOrThrow();
  let anchorOffset = anchor.offset;

  if (anchorOffset === 0) {
    nodesToMove.push(anchorNode);
  } else if (anchorOffset === textContentLength) {
    const clonedNode = createTextNode('');
    clonedNode.setFlags(anchorNode.getFlags());
    nodesToMove.push(clonedNode);
    anchorOffset = 0;
  } else {
    const [, splitNode] = anchorNode.splitText(anchorOffset);
    nodesToMove.push(splitNode);
    anchorOffset = 0;
  }
  const newBlock = currentBlock.insertNewAfter(selection);
  if (newBlock === null) {
    // Handle as a line break insertion
    insertLineBreak(selection);
  } else if (isBlockNode(newBlock)) {
    const nodesToMoveLength = nodesToMove.length;
    let firstChild = null;

    for (let i = 0; i < nodesToMoveLength; i++) {
      const nodeToMove = nodesToMove[i];
      if (firstChild === null) {
        newBlock.append(nodeToMove);
      } else {
        firstChild.insertBefore(nodeToMove);
      }
      firstChild = nodeToMove;
    }
    const nodeToSelect = nodesToMove[nodesToMoveLength - 1];
    if (isTextNode(nodeToSelect)) {
      nodeToSelect.select(anchorOffset, anchorOffset);
    }
    const blockFirstChild = currentBlock.getFirstChild();
    const blockLastChild = currentBlock.getLastChild();
    if (
      blockFirstChild === null ||
      blockLastChild === null ||
      blockLastChild.isImmutable() ||
      blockLastChild.isSegmented() ||
      !isTextNode(blockLastChild)
    ) {
      const textNode = createTextNode('');
      currentBlock.append(textNode);
    }
  }
}

function moveCaretSelection(
  selection: Selection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  updateCaretSelectionForRange(
    selection,
    isBackward,
    granularity,
    !isHoldingShift,
  );
}

export function moveBackward(
  selection: Selection,
  isHoldingShift: boolean,
  isRTL: boolean,
): void {
  moveCaretSelection(selection, isHoldingShift, !isRTL, 'character');
}

export function moveForward(
  selection: Selection,
  isHoldingShift: boolean,
  isRTL: boolean,
): void {
  moveCaretSelection(selection, isHoldingShift, isRTL, 'character');
}

export function moveWordBackward(
  selection: Selection,
  isHoldingShift: boolean,
  isRTL: boolean,
): void {
  moveCaretSelection(selection, isHoldingShift, !isRTL, 'word');
}

export function moveWordForward(
  selection: Selection,
  isHoldingShift: boolean,
  isRTL: boolean,
): void {
  moveCaretSelection(selection, isHoldingShift, isRTL, 'word');
}

export function deleteLineBackward(selection: Selection): void {
  if (selection.isCollapsed()) {
    updateCaretSelectionForRange(selection, true, 'lineboundary', false);
  }
  removeText(selection);
}

export function deleteLineForward(selection: Selection): void {
  if (selection.isCollapsed()) {
    updateCaretSelectionForRange(selection, false, 'lineboundary', false);
  }
  removeText(selection);
}

export function deleteWordBackward(selection: Selection): void {
  if (selection.isCollapsed()) {
    updateCaretSelectionForRange(selection, true, 'word', false);
  }
  removeText(selection);
}

export function deleteWordForward(selection: Selection): void {
  if (selection.isCollapsed()) {
    updateCaretSelectionForRange(selection, false, 'word', false);
  }
  removeText(selection);
}

export function updateCaretSelectionForUnicodeCharacter(
  selection: Selection,
  isBackward: boolean,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  if (
    anchorNode === focusNode &&
    anchor.type === 'text' &&
    focus.type === 'text'
  ) {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;

    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (!doesContainGrapheme(text)) {
        if (isBackward) {
          focus.offset = characterOffset;
        } else {
          anchor.offset = characterOffset;
        }
      }
    }
  } else {
    // TODO Handling of multibyte characters
  }
}

export function updateCaretSelectionForAdjacentHashtags(
  selection: Selection,
): void {
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return;
  }
  const anchorNode = anchor.getNode();
  const textContent = anchorNode.getTextContent();
  const anchorOffset = selection.anchor.offset;

  if (anchorOffset === 0 && anchorNode.isSimpleText()) {
    const sibling = anchorNode.getPreviousSibling();
    if (isTextNode(sibling) && isHashtagNode(sibling)) {
      sibling.select();
      const siblingTextContent = sibling.getTextContent();
      sibling.setTextContent(siblingTextContent + textContent);
      anchorNode.remove();
    }
  } else if (
    isHashtagNode(anchorNode) &&
    anchorOffset === anchorNode.getTextContentSize()
  ) {
    const sibling = anchorNode.getNextSibling();
    if (isTextNode(sibling) && sibling.isSimpleText()) {
      const siblingTextContent = sibling.getTextContent();
      anchorNode.setTextContent(textContent + siblingTextContent);
      sibling.remove();
    }
  }
}

function deleteCharacter(selection: Selection, isBackward: boolean): void {
  if (selection.isCollapsed()) {
    updateCaretSelectionForRange(selection, isBackward, 'character', false);
    const anchor = selection.anchor;
    const focus = selection.focus;

    if (!selection.isCollapsed()) {
      const focusNode = focus.type === 'text' ? focus.getNode() : null;
      const anchorNode = anchor.type === 'text' ? anchor.getNode() : null;

      if (focusNode !== null && focusNode.isSegmented()) {
        removeSegment(focusNode, isBackward);
        return;
      } else if (anchorNode !== null && anchorNode.isSegmented()) {
        removeSegment(anchorNode, isBackward);
        return;
      }
      updateCaretSelectionForUnicodeCharacter(selection, isBackward);
    } else if (isBackward) {
      // Special handling around rich text nodes
      const anchorNode = anchor.getNode();
      const parent = anchorNode.getParentOrThrow();
      const parentType = parent.getType();
      if (anchor.offset === 0 && parentType !== 'paragraph') {
        const paragraph = createParagraphNode();
        const children = parent.getChildren();
        children.forEach((child) => paragraph.append(child));

        if (parentType === 'listitem') {
          const listNode = parent.getParentOrThrow();
          if (listNode.getChildrenSize() === 1) {
            listNode.replace(paragraph);
          } else {
            listNode.insertBefore(paragraph);
            parent.remove();
          }
        } else {
          parent.replace(paragraph);
        }
        return;
      }
    }
  }
  removeText(selection);
  updateCaretSelectionForAdjacentHashtags(selection);
}

export function deleteBackward(selection: Selection): void {
  deleteCharacter(selection, true);
}

export function deleteForward(selection: Selection): void {
  deleteCharacter(selection, false);
}

function removeSegment(node: TextNode, isBackward: boolean): void {
  const textContent = node.getTextContent();
  const split = textContent.split(/\s/g);

  if (isBackward) {
    split.pop();
  } else {
    split.shift();
  }
  const nextTextContent = split.join(' ');
  const sibling = isBackward
    ? node.getNextSibling()
    : node.getPreviousSibling();
  if (isTextNode(sibling)) {
    if (nextTextContent === '') {
      node.remove();
    } else {
      node.setTextContent(nextTextContent);
    }
    if (isBackward) {
      sibling.select(0, 0);
    } else {
      sibling.select();
    }
  }
}

function moveSelection(
  domSelection,
  collapse: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  domSelection.modify(
    collapse ? 'move' : 'extend',
    isBackward ? 'backward' : 'forward',
    granularity,
  );
}

export function updateCaretSelectionForRange(
  selection: Selection,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
  collapse: boolean,
): void {
  const domSelection = window.getSelection();
  const focusNode = selection.focus.getNode();
  const focusOffset = selection.focus.offset;
  const sibling = isBackward
    ? focusNode.getPreviousSibling()
    : focusNode.getNextSibling();

  // Ensure we don't move selection to the zero width offset
  if (isBackward && focusOffset === 0 && sibling === null) {
    const parent = focusNode.getParentOrThrow();
    if (parent.getPreviousSibling() === null) {
      return;
    }
  }

  const textSize = focusNode.getTextContentSize();
  const needsExtraMove = isBackward
    ? focusOffset === 0 &&
      focusNode.getTextContent() === '' &&
      !isImmutableOrInert(focusNode)
    : focusOffset === textSize &&
      isTextNode(sibling) &&
      !isImmutableOrInert(sibling) &&
      sibling.getTextContent() === '';

  // We use the DOM selection.modify API here to "tell" us what the selection
  // will be. We then use it to update the Outline selection accordingly. This
  // is much more reliable than waiting for a beforeinput and using the ranges
  // from getTargetRanges(), and is also better than trying to do it ourselves
  // using Intl.Segmenter or other workarounds that struggle with word segments
  // and line segments (especially with word wrapping and non-Roman languages).
  moveSelection(domSelection, collapse, isBackward, granularity);
  // If we are at a boundary, move once again.
  if (needsExtraMove && granularity === 'character') {
    moveSelection(domSelection, collapse, isBackward, granularity);
  }
  // Guard against no ranges
  if (domSelection.rangeCount > 0) {
    const range = domSelection.getRangeAt(0);
    // Apply the DOM selection to our Outline selection.
    selection.applyDOMRange(range);
    // Because a range works on start and end, we might need to flip
    // the anchor and focus points to match what the DOM has, not what
    // the range has specifically.
    if (
      !collapse &&
      (domSelection.anchorNode !== range.startContainer ||
        domSelection.anchorOffset !== range.startOffset)
    ) {
      selection.swapPoints();
    }
  }
}

export function removeText(selection: Selection): void {
  insertText(selection, '');
}

export function insertLineBreak(
  selection: Selection,
  selectStart?: boolean,
): void {
  const lineBreakNode = createLineBreakNode();
  if (selectStart) {
    insertNodes(selection, [lineBreakNode], true);
  } else {
    if (insertNodes(selection, [lineBreakNode])) {
      lineBreakNode.selectNext(0, 0);
    }
  }
}

export function insertNodes(
  selection: Selection,
  nodes: Array<OutlineNode>,
  selectStart?: boolean,
): boolean {
  // If there is a range selected remove the text in it
  if (!selection.isCollapsed()) {
    removeText(selection);
  }
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }

  const anchorOffset = anchor.offset;
  const anchorNode = anchor.getNode();
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const siblings = [];
  let target;

  // Get all remaining text node siblings in this block so we can
  // append them after the last node we're inserting.
  const nextSiblings = anchorNode.getNextSiblings();
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();

  if (anchorOffset === 0) {
    // Insert an empty text node to wrap whatever is being inserted
    // in case it's immutable
    target = createTextNode('');
    anchorNode.insertBefore(target);
    siblings.push(anchorNode);
  } else if (anchorOffset === textContentLength) {
    target = anchorNode;
  } else if (isImmutableOrInert(anchorNode)) {
    // Do nothing if we're inside an immutable/segmented node
    return false;
  } else {
    // If we started with a range selected grab the danglingText after the
    // end of the selection and put it on our siblings array so we can
    // append it after the last node we're inserting
    let danglingText;
    [target, danglingText] = anchorNode.splitText(anchorOffset);
    siblings.push(danglingText);
  }
  const startingNode = target;

  siblings.push(...nextSiblings);

  // Time to insert the nodes!
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isBlockNode(node)) {
      // If it's a block node make sure target refers to a block
      // and then insert after our target block
      if (isTextNode(target)) {
        target = topLevelBlock;
      }
      target.insertAfter(node);
      target = node;
    } else {
      target.insertAfter(node);
      target = node;
    }
  }

  if (isBlockNode(target)) {
    const lastChild = target.getLastTextNode();
    if (!isTextNode(lastChild)) {
      invariant(false, 'insertNodes: lastChild not a text node');
    }
    if (selectStart) {
      startingNode.select();
    } else {
      lastChild.select();
    }
    if (siblings.length !== 0) {
      let prevSibling = lastChild;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        prevSibling.insertAfter(sibling);
        prevSibling = sibling;
      }
    }
  } else if (isTextNode(target)) {
    if (selectStart) {
      startingNode.select();
    } else {
      target.select();
    }
  } else {
    const prevSibling = target.getPreviousSibling();
    if (isTextNode(prevSibling)) {
      prevSibling.select();
    }
  }
  return true;
}

export function insertRichText(selection: Selection, text: string): void {
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

export function insertText(selection: Selection, text: string): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const anchor = selection.anchor;
  const focus = selection.focus;
  const textFormat = selection.textFormat;

  let firstNode = selectedNodes[0];
  if (!isTextNode(firstNode)) {
    invariant(false, 'insertText: firstNode not a a text node');
  }
  if (anchor.type !== 'text' || focus.type !== 'text') {
    invariant(false, 'Selection block node not yet implemented.');
  }
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const isBefore = firstNode === anchor.getNode();

  if (
    firstNode.isSegmented() ||
    firstNode.isImmutable() ||
    !firstNode.canInsertTextAtEnd()
  ) {
    if (selection.isCollapsed() && focusOffset === firstNodeTextLength) {
      let nextSibling = firstNode.getNextSibling();
      if (!isTextNode(nextSibling)) {
        nextSibling = createTextNode();
        firstNode.insertAfter(nextSibling);
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        insertText(selection, text);
        return;
      }
    } else if (firstNode.isSegmented()) {
      const textNode = createTextNode(firstNode.getTextContent());
      firstNode.replace(textNode, true);
      firstNode = textNode;
    }
  }
  let startOffset;
  let endOffset;

  if (selectedNodesLength === 1) {
    if (isImmutableOrInert(firstNode)) {
      const textNode = createTextNode(text);
      firstNode.replace(textNode);
      textNode.select();
      return;
    }
    const firstNodeFormat = firstNode.getFormat();
    startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
    endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

    if (startOffset === endOffset && firstNodeFormat !== textFormat) {
      if (firstNode.getTextContent() === '') {
        firstNode.setFormat(textFormat);
      } else {
        const [targetNode] = firstNode.splitText(startOffset);
        const textNode = createTextNode(text);
        textNode.setFormat(textFormat);
        targetNode.insertAfter(textNode);
        textNode.select();
        return;
      }
    }
    const delCount = endOffset - startOffset;

    firstNode.spliceText(startOffset, delCount, text, true);
    if (firstNode.isComposing() && selection.anchor.type === 'text') {
      selection.anchor.offset -= text.length;
    }
  } else {
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];
    const firstNodeParents = new Set(firstNode.getParents());
    const lastNodeParents = new Set(lastNode.getParents());
    const firstNodeParent = firstNode.getParent();
    const lastNodeParent = lastNode.getParent();
    let firstNodeRemove = false;
    let lastNodeRemove = false;
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    // Handle mutations to the last node.
    if (isTextNode(lastNode) && endOffset !== lastNode.getTextContentSize()) {
      if (lastNode.isSegmented()) {
        const textNode = createTextNode(lastNode.getTextContent());
        lastNode.replace(textNode, true);
        lastNode = textNode;
      }
      lastNode.spliceText(0, endOffset, '', false);
    } else {
      lastNode.remove();
      lastNodeRemove = true;
    }

    // Either move the remaining nodes of the last parent to after
    // the first child, or remove them entirely. If the last parent
    // is the same as the first parent, this logic also works.
    if (isBlockNode(firstNodeParent) && isBlockNode(lastNodeParent)) {
      const lastNodeChildren = lastNodeParent.getChildren();
      const selectedNodesSet = new Set(selectedNodes);
      const firstAndLastParentsAreEqual = firstNodeParent.is(lastNodeParent);

      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i];

        if (lastNodeChild.is(firstNode)) {
          break;
        }

        if (lastNodeChild.isAttached()) {
          if (
            !selectedNodesSet.has(lastNodeChild) ||
            lastNodeChild.is(lastNode)
          ) {
            if (!firstAndLastParentsAreEqual) {
              firstNode.insertAfter(lastNodeChild);
            }
          } else {
            lastNodeChild.remove();
          }
        }
      }

      if (!firstAndLastParentsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent = lastNodeParent;
        while (parent !== null) {
          if (parent.getChildrenSize() === 0) {
            lastNodeParents.delete(parent);
          }
          parent = parent.getParent();
        }
      }
    }

    // Ensure we do splicing after moving of nodes, as splicing
    // can have side-effects (in the case of hashtags).
    if (isTextNode(firstNode) && !isImmutableOrInert(firstNode)) {
      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
      );
      if (firstNode.isComposing() && selection.anchor.type === 'text') {
        selection.anchor.offset -= text.length;
      }
    } else {
      firstNodeRemove = true;
      const textNode = createTextNode(text);
      firstNode.replace(textNode);
      textNode.select();
    }

    // Remove all selected nodes that haven't already been removed.
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      if (
        (firstNodeRemove || !firstNodeParents.has(selectedNode)) &&
        (lastNodeRemove || !lastNodeParents.has(selectedNode))
      ) {
        selectedNode.remove();
      }
    }
  }
}

export function moveEnd(selection: Selection): void {
  const anchorNode = selection.anchor.getNode();
  if (isTextNode(anchorNode)) {
    anchorNode.select();
  }
}

export function selectAll(selection: Selection): void {
  const anchorNode = selection.anchor.getNode();
  const topParent = anchorNode.getTopParentBlockOrThrow();
  const root = topParent.getParentOrThrow();
  const firstTextNode = root.getFirstTextNode();
  const lastTextNode = root.getLastTextNode();
  if (firstTextNode !== null && lastTextNode !== null) {
    selection.setTextNodeRange(
      firstTextNode,
      0,
      lastTextNode,
      lastTextNode.getTextContentSize(),
    );
  }
}
