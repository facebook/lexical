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
  BlockPoint,
  Point,
} from 'outline';

import {
  createLineBreakNode,
  isDecoratorNode,
  isTextNode,
  isBlockNode,
  isRootNode,
  createTextNode,
} from 'outline';
import {isHashtagNode} from 'outline/HashtagNode';

import isImmutableOrInert from 'shared/isImmutableOrInert';
import invariant from 'shared/invariant';
import {doesContainGrapheme} from 'outline/TextHelpers';
import getPossibleDecoratorNode from 'shared/getPossibleDecoratorNode';

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
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const anchorOffset = anchor.getCharacterOffset();
  const focusOffset = focus.getCharacterOffset();
  let startOffset;
  let endOffset;

  if (anchorNode === focusNode && isTextNode(anchorNode)) {
    const firstNode = cloneWithProperties<TextNode>(anchorNode);
    const isBefore = focusOffset > anchorOffset;
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;
    firstNode.__text = firstNode.__text.slice(startOffset, endOffset);
    const key = firstNode.getKey();
    return {range: [key], nodeMap: [[key, firstNode]]};
  }
  const nodes = selection.getNodes();
  if (nodes.length === 0) {
    return {range: [], nodeMap: []};
  }

  const firstNode = nodes[0];
  const isBefore = anchor.isBefore(focus);
  const nodeKeys = [];
  const nodeMap = new Map();
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  const nodesLength = nodes.length;
  const sourceParent = isBlockNode(firstNode)
    ? firstNode
    : firstNode.getParentOrThrow();
  const sourceParentKey = sourceParent.getKey();
  const topLevelNodeKeys = new Set();

  for (let i = 0; i < nodesLength; i++) {
    let node = nodes[i];
    if (node.isInert() || node.getKey() === sourceParentKey) {
      continue;
    }
    const parent = node.getParent();
    const nodeKey = node.getKey();

    if (isTextNode(node) && !node.isSegmented() && !node.isImmutable()) {
      const text = node.getTextContent();

      if (i === 0) {
        node = cloneWithProperties<TextNode>(node);
        node.__text = text.slice(
          startOffset,
          nodesLength === 1 ? endOffset : text.length,
        );
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

  const anchorOffset = anchor.getCharacterOffset();
  const focusOffset = focus.getCharacterOffset();
  let startOffset;
  let endOffset;

  if (selectedNodesLength === 0) {
    return [];
  } else if (selectedNodesLength === 1) {
    if (isTextNode(firstNode)) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      const splitNodes = firstNode.splitText(startOffset, endOffset);
      const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
      return [node];
    }
    return [firstNode];
  }
  const isBefore = anchor.isBefore(focus);

  if (isTextNode(firstNode)) {
    startOffset = isBefore ? anchorOffset : focusOffset;
    if (startOffset !== 0) {
      [, firstNode] = firstNode.splitText(startOffset);
    }
    selectedNodes[0] = firstNode;
  }
  if (isTextNode(lastNode)) {
    const lastNodeText = lastNode.getTextContent();
    const lastNodeTextLength = lastNodeText.length;
    endOffset = isBefore ? focusOffset : anchorOffset;
    if (endOffset !== lastNodeTextLength) {
      [lastNode] = lastNode.splitText(endOffset);
    }
    selectedNodes[lastIndex] = lastNode;
  }
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

  if (selection.isCollapsed()) {
    selection.toggleTextFormatType(formatType);
    return;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const focusOffset = focus.offset;
  let firstNextFormat = 0;
  for (let i = 0; i < selectedNodes.length; i++) {
    const selectedNode = selectedNodes[i];
    if (isTextNode(selectedNode)) {
      firstNextFormat = selectedNode.getTextNodeFormat(formatType, null);
      break;
    }
  }
  let anchorOffset = anchor.offset;
  let startOffset;
  let endOffset;

  const isBefore = anchor.isBefore(focus);
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
    if (isTextNode(firstNode)) {
      if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        startOffset = 0;
      }
      firstNode.setFormat(firstNextFormat);
    }
    let lastNextFormat = firstNextFormat;

    if (isTextNode(lastNode)) {
      lastNextFormat = lastNode.getTextNodeFormat(formatType, firstNextFormat);
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFormat(lastNextFormat);
    }

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
  }
}

export function insertParagraph(selection: Selection): void {
  if (!selection.isCollapsed()) {
    removeText(selection);
  }
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  let currentBlock;
  let nodesToMove = [];

  if (anchor.type === 'text') {
    const anchorNode = anchor.getNode();
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    nodesToMove = anchorNode.getNextSiblings().reverse();
    currentBlock = anchorNode.getParentBlockOrThrow();

    if (anchorOffset === 0) {
      nodesToMove.push(anchorNode);
    } else if (anchorOffset !== textContentLength) {
      const [, splitNode] = anchorNode.splitText(anchorOffset);
      nodesToMove.push(splitNode);
    }
  } else {
    currentBlock = anchor.getNode();
    nodesToMove = currentBlock.getChildren().slice(anchorOffset).reverse();
  }
  const newBlock = currentBlock.insertNewAfter(selection);
  if (newBlock === null) {
    // Handle as a line break insertion
    insertLineBreak(selection);
  } else if (isBlockNode(newBlock)) {
    const nodesToMoveLength = nodesToMove.length;
    let firstChild = null;

    if (nodesToMoveLength === 0) {
      newBlock.select(0, 0);
    } else {
      for (let i = 0; i < nodesToMoveLength; i++) {
        const nodeToMove = nodesToMove[i];
        if (firstChild === null) {
          newBlock.append(nodeToMove);
        } else {
          firstChild.insertBefore(nodeToMove);
        }
        firstChild = nodeToMove;
      }
    }
    newBlock.selectStart();
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

function isTopLevelBlockRTL(selection: Selection): boolean {
  const anchorNode = selection.anchor.getNode();
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();
  const direction = topLevelBlock.getDirection();
  return direction === 'rtl';
}

export function moveCharacter(
  selection: Selection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void {
  const isRTL = isTopLevelBlockRTL(selection);
  moveCaretSelection(
    selection,
    isHoldingShift,
    isBackward ? !isRTL : isRTL,
    'character',
  );
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
  let anchorNode = anchor.getNode();
  const textContent = anchorNode.getTextContent();
  const anchorOffset = selection.anchor.offset;

  if (anchorOffset === 0 && anchorNode.isSimpleText()) {
    let sibling = anchorNode.getPreviousSibling();
    if (isTextNode(sibling) && isHashtagNode(sibling)) {
      sibling.select();
      const siblingTextContent = sibling.getTextContent();
      sibling = sibling.setTextContent(siblingTextContent + textContent);
      anchorNode.remove();
    }
  } else if (
    isHashtagNode(anchorNode) &&
    anchorOffset === anchorNode.getTextContentSize()
  ) {
    const sibling = anchorNode.getNextSibling();
    if (isTextNode(sibling) && sibling.isSimpleText()) {
      const siblingTextContent = sibling.getTextContent();
      anchorNode = anchorNode.setTextContent(textContent + siblingTextContent);
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
        const offset = focus.offset;
        const textContentSize = focusNode.getTextContentSize();
        if (
          focusNode.is(anchorNode) ||
          (isBackward && offset !== textContentSize) ||
          (!isBackward && offset !== 0)
        ) {
          removeSegment(focusNode, isBackward);
          return;
        }
      } else if (anchorNode !== null && anchorNode.isSegmented()) {
        const offset = anchor.offset;
        const textContentSize = anchorNode.getTextContentSize();
        if (
          anchorNode.is(focusNode) ||
          (isBackward && offset !== 0) ||
          (!isBackward && offset !== textContentSize)
        ) {
          removeSegment(anchorNode, isBackward);
          return;
        }
      }
      updateCaretSelectionForUnicodeCharacter(selection, isBackward);
    } else if (isBackward) {
      // Special handling around rich text nodes
      const anchorNode = anchor.getNode();
      const parent = anchorNode.getParentOrThrow();

      if (anchor.offset === 0) {
        if (parent.collapseAtStart()) {
          return;
        }
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
  let textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/\s/g);

  if (isBackward) {
    split.pop();
  } else {
    split.shift();
  }
  const nextTextContent = split.join(' ');

  if (nextTextContent === '') {
    textNode.selectPrevious();
    textNode.remove();
  } else {
    textNode = textNode.setTextContent(nextTextContent);
    if (isBackward) {
      textNode.select();
    } else {
      textNode.select(0, 0);
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
  const focus = selection.focus;
  const anchor = selection.anchor;

  // Handle the selection movement around decorators.
  const possibleDecoratorNode = getPossibleDecoratorNode(focus, isBackward);

  if (isDecoratorNode(possibleDecoratorNode)) {
    const sibling = isBackward
      ? possibleDecoratorNode.getPreviousSibling()
      : possibleDecoratorNode.getNextSibling();
    if (!isTextNode(sibling)) {
      const blockKey = possibleDecoratorNode.getParentOrThrow().getKey();
      const offset = possibleDecoratorNode.getIndexWithinParent();
      focus.set(blockKey, offset, 'block');
      if (collapse) {
        anchor.set(blockKey, offset, 'block');
      }
      return;
    }
  }
  // We use the DOM selection.modify API here to "tell" us what the selection
  // will be. We then use it to update the Outline selection accordingly. This
  // is much more reliable than waiting for a beforeinput and using the ranges
  // from getTargetRanges(), and is also better than trying to do it ourselves
  // using Intl.Segmenter or other workarounds that struggle with word segments
  // and line segments (especially with word wrapping and non-Roman languages).
  moveSelection(domSelection, collapse, isBackward, granularity);
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
  const anchorOffset = anchor.offset;
  const anchorNode = anchor.getNode();
  let target = anchorNode;

  if (anchor.type === 'block') {
    const block = anchor.getNode();
    const placementNode = block.getChildAtIndex(anchorOffset - 1);
    if (placementNode === null) {
      target = block;
    } else {
      target = placementNode;
    }
  }
  const siblings = [];

  // Get all remaining text node siblings in this block so we can
  // append them after the last node we're inserting.
  const nextSiblings = anchorNode.getNextSiblings();
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();

  if (isTextNode(anchorNode)) {
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    if (anchorOffset === 0 && textContentLength !== 0) {
      const prevSibling = anchorNode.getPreviousSibling();
      if (prevSibling !== null) {
        target = prevSibling;
      } else {
        target = anchorNode.getParentOrThrow();
      }
      siblings.push(anchorNode);
    } else if (anchorOffset === textContentLength) {
      target = anchorNode;
    } else if (isImmutableOrInert(anchorNode)) {
      // Do nothing if we're inside an immutable/inert node
      return false;
    } else {
      // If we started with a range selected grab the danglingText after the
      // end of the selection and put it on our siblings array so we can
      // append it after the last node we're inserting
      let danglingText;
      [target, danglingText] = anchorNode.splitText(anchorOffset);
      siblings.push(danglingText);
    }
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
    }
    if (isBlockNode(target) && !isBlockNode(node)) {
      const firstChild = target.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(node);
      } else {
        target.append(node);
      }
      target = node;
    } else {
      target.insertAfter(node);
      target = node;
    }
  }

  if (selectStart) {
    if (isTextNode(startingNode)) {
      startingNode.select();
    } else {
      const prevSibling = target.getPreviousSibling();
      if (isTextNode(prevSibling)) {
        prevSibling.select();
      } else {
        const index = target.getIndexWithinParent();
        target.getParentOrThrow().select(index, index);
      }
    }
  }

  if (isBlockNode(target)) {
    const lastChild = target.getLastDescendant();
    if (!selectStart) {
      if (lastChild === null) {
        target.select();
      } else {
        lastChild.selectNext();
      }
    }
    if (siblings.length !== 0) {
      let prevSibling = lastChild;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (prevSibling === null) {
          target.append(sibling);
        } else {
          prevSibling.insertAfter(sibling);
        }
        prevSibling = sibling;
      }
    }
  } else if (isTextNode(target)) {
    if (!selectStart) {
      target.select();
    }
  } else {
    if (!selectStart) {
      const block = target.getParentOrThrow();
      const index = target.getIndexWithinParent() + 1;
      block.select(index, index);
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
      if (part !== '') {
        nodes.push(createTextNode(part));
      }
      if (i !== length - 1) {
        nodes.push(createLineBreakNode());
      }
    }
    insertNodes(selection, nodes);
  }
}

function transferStartingBlockPointToTextPoint(start: BlockPoint, end: Point) {
  const block = start.getNode();
  const placementNode = block.getChildAtIndex(start.offset);
  const textNode = createTextNode();
  if (placementNode === null) {
    block.append(textNode);
  } else {
    placementNode.insertBefore(textNode);
  }
  // If we are inserting a node to the start point, then we'll need to
  // adjust the offset of the end point accordingly. Either by making it
  // the same text node, or by increasing the offset to account for the
  //
  if (end.type === 'block' && block.is(end.getNode())) {
    if (end.offset === start.offset) {
      end.set(textNode.getKey(), 0, 'text');
    } else {
      end.offset++;
    }
  }
  // Transfer the block point to a text point.
  start.set(textNode.getKey(), 0, 'text');
}

export function insertText(selection: Selection, text: string): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBefore = selection.isCollapsed() || anchor.isBefore(focus);

  if (isBefore && anchor.type === 'block') {
    transferStartingBlockPointToTextPoint(anchor, focus);
  } else if (!isBefore && focus.type === 'block') {
    transferStartingBlockPointToTextPoint(focus, anchor);
  }
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const textFormat = selection.textFormat;
  const firstPoint = isBefore ? anchor : focus;
  const endPoint = isBefore ? focus : anchor;
  const startOffset = firstPoint.offset;
  const endOffset = endPoint.offset;
  let firstNode = selectedNodes[0];

  if (!isTextNode(firstNode)) {
    invariant(false, 'insertText: first node is not a text node');
  }
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  if (
    firstNode.isSegmented() ||
    firstNode.isImmutable() ||
    !firstNode.canInsertTextAtEnd()
  ) {
    const offset = firstPoint.offset;
    if (selection.isCollapsed() && offset === firstNodeTextLength) {
      let nextSibling = firstNode.getNextSibling();
      if (
        !isTextNode(nextSibling) ||
        isImmutableOrInert(nextSibling) ||
        nextSibling.isSegmented()
      ) {
        nextSibling = createTextNode();
        firstNode.insertAfter(nextSibling);
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        insertText(selection, text);
        return;
      }
    } else if (selection.isCollapsed() && offset === 0) {
      let prevSibling = firstNode.getPreviousSibling();
      if (
        !isTextNode(prevSibling) ||
        isImmutableOrInert(prevSibling) ||
        prevSibling.isSegmented()
      ) {
        prevSibling = createTextNode();
        firstNode.insertBefore(prevSibling);
      }
      prevSibling.select();
      firstNode = prevSibling;
      if (text !== '') {
        insertText(selection, text);
        return;
      }
    } else if (firstNode.isSegmented() && offset !== firstNodeTextLength) {
      const textNode = createTextNode(firstNode.getTextContent());
      firstNode.replace(textNode);
      firstNode = textNode;
    }
  }

  if (selectedNodesLength === 1) {
    if (isImmutableOrInert(firstNode)) {
      firstNode.selectPrevious();
      firstNode.remove();
      return;
    }
    const firstNodeFormat = firstNode.getFormat();

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

    firstNode = firstNode.spliceText(startOffset, delCount, text, true);
    if (firstNode.getTextContent() === '') {
      firstNode.selectPrevious();
      firstNode.remove();
    } else if (firstNode.isComposing() && selection.anchor.type === 'text') {
      selection.anchor.offset -= text.length;
    }
  } else {
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];
    const markedNodeKeysForKeep = new Set([
      ...firstNode.getParentKeys(),
      ...lastNode.getParentKeys(),
    ]);
    const firstBlock = isBlockNode(firstNode)
      ? firstNode
      : firstNode.getParentOrThrow();
    const lastBlock = isBlockNode(lastNode)
      ? lastNode
      : lastNode.getParentOrThrow();

    // Handle mutations to the last node.
    if (
      (endPoint.type === 'text' &&
        (endOffset !== 0 || lastNode.getTextContent() === '')) ||
      (endPoint.type === 'block' && lastNode.getIndexWithinParent() < endOffset)
    ) {
      if (
        isTextNode(lastNode) &&
        !isImmutableOrInert(lastNode) &&
        endOffset !== lastNode.getTextContentSize()
      ) {
        if (lastNode.isSegmented()) {
          const textNode = createTextNode(lastNode.getTextContent());
          lastNode.replace(textNode);
          lastNode = textNode;
        }
        lastNode = lastNode.spliceText(0, endOffset, '');
      } else {
        lastNode.remove();
      }
    } else {
      markedNodeKeysForKeep.add(lastNode.getKey());
    }

    // Either move the remaining nodes of the last parent to after
    // the first child, or remove them entirely. If the last parent
    // is the same as the first parent, this logic also works.
    const lastNodeChildren = lastBlock.getChildren();
    const selectedNodesSet = new Set(selectedNodes);
    const firstAndLastBlocksAreEqual = firstBlock.is(lastBlock);

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
          if (!firstAndLastBlocksAreEqual) {
            firstNode.insertAfter(lastNodeChild);
          }
        } else {
          lastNodeChild.remove();
        }
      }
    }

    if (!firstAndLastBlocksAreEqual) {
      // Check if we have already moved out all the nodes of the
      // last parent, and if so, traverse the parent tree and mark
      // them all as being able to deleted too.
      let parent = lastBlock;
      let lastRemovedParent = null;
      while (parent !== null) {
        const children = parent.getChildren();
        const childrenLength = children.length;
        if (
          childrenLength === 0 ||
          (childrenLength === 1 && children[0].is(lastRemovedParent))
        ) {
          markedNodeKeysForKeep.delete(parent.getKey());
          lastRemovedParent = parent;
        }
        parent = parent.getParent();
      }
    }

    // Ensure we do splicing after moving of nodes, as splicing
    // can have side-effects (in the case of hashtags).
    if (!isImmutableOrInert(firstNode)) {
      firstNode = firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
      );
      if (firstNode.getTextContent() === '') {
        firstNode.selectPrevious();
        firstNode.remove();
      } else if (firstNode.isComposing() && selection.anchor.type === 'text') {
        selection.anchor.offset -= text.length;
      }
    } else if (startOffset === firstNodeTextLength) {
      firstNode.select();
    } else {
      firstNode.selectPrevious();
      firstNode.remove();
    }

    // Remove all selected nodes that haven't already been removed.
    for (let i = 1; i < selectedNodesLength; i++) {
      const selectedNode = selectedNodes[i];
      if (!markedNodeKeysForKeep.has(selectedNode.getKey())) {
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
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const topParent = anchorNode.getTopParentBlockOrThrow();
  const root = topParent.getParentOrThrow();
  let firstNode = root.getFirstDescendant();
  let lastNode = root.getLastDescendant();
  let firstType = 'block';
  let lastType = 'block';
  let lastOffset = 0;

  if (isTextNode(firstNode)) {
    firstType = 'text';
  } else if (!isBlockNode(firstNode) && firstNode !== null) {
    firstNode = firstNode.getParentOrThrow();
  }
  if (isTextNode(lastNode)) {
    lastType = 'text';
    lastOffset = lastNode.getTextContentSize();
  } else if (!isBlockNode(lastNode) && lastNode !== null) {
    lastNode = lastNode.getParentOrThrow();
    lastOffset = lastNode.getChildrenSize();
  }
  if (firstNode && lastNode) {
    anchor.set(firstNode.getKey(), 0, firstType);
    focus.set(lastNode.getKey(), lastOffset, lastType);
  }
}
