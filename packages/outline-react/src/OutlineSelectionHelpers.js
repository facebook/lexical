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
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

import {invariant} from './OutlineReactUtils';

function isImmutableOrInert(node: OutlineNode): boolean {
  return node.isImmutable() || node.isInert();
}

export function getNodesInRange(selection: Selection): {
  range: Array<NodeKey>,
  nodeMap: {[NodeKey]: Node},
} {
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  let startOffset;
  let endOffset;

  if (anchorNode === focusNode) {
    const firstNode = anchorNode.getLatest().clone();
    if (!isTextNode(firstNode)) {
      invariant(false, 'getNodesInRange: firstNode is not a text node');
    }
    const isBefore = focusOffset > anchorOffset;
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;
    firstNode.__text = firstNode.__text.slice(startOffset, endOffset);
    const key = firstNode.getKey();
    return {range: [key], nodeMap: {[key]: firstNode}};
  }
  const nodes = selection.getNodes();
  const firstNode = nodes[0];
  const isBefore = firstNode === selection.getAnchorNode();
  const nodeKeys = [];
  const nodeMap = {};
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  const nodesLength = nodes.length;
  const sourceParent = firstNode.getParentOrThrow();
  const sourceParentKey = sourceParent.getKey();
  const topLevelNodeKeys = new Set();

  for (let i = 0; i < nodesLength; i++) {
    let node = nodes[i];
    const parent = node.getParent();
    const nodeKey = node.getKey();

    if (isTextNode(node)) {
      const text = node.getTextContent();

      if (i === 0) {
        node = node.getLatest().clone();
        node.__text = text.slice(startOffset, text.length);
      } else if (i === nodesLength - 1) {
        node = node.getLatest().clone();
        node.__text = text.slice(0, endOffset);
      }
    }

    if (nodeMap[nodeKey] === undefined) {
      nodeMap[nodeKey] = node;
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
            node = node.getLatest().clone();
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
          if (nodeMap[currKey] === undefined) {
            nodeMap[currKey] = node;
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
  return {range: nodeKeys, nodeMap};
}

export function formatText(
  selection: Selection,
  formatType: TextFormatType,
  forceFormat?: boolean,
): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const lastIndex = selectedNodesLength - 1;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];

  if (!isTextNode(firstNode) || !isTextNode(lastNode)) {
    invariant(false, 'formatText: firstNode/lastNode not a text node');
  }
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const currentBlock = firstNode.getParentBlockOrThrow();
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const firstNextFlags = firstNode.getTextNodeFormatFlags(
    formatType,
    null,
    forceFormat,
  );
  let startOffset;
  let endOffset;

  if (selection.isCaret()) {
    if (firstNodeTextLength === 0) {
      firstNode.setFlags(firstNextFlags);
      selection.isDirty = true;
    } else {
      const textNode = createTextNode('');
      textNode.setFlags(firstNextFlags);
      if (anchorOffset === 0) {
        firstNode.insertBefore(textNode);
      } else if (anchorOffset === firstNodeTextLength) {
        firstNode.insertAfter(textNode);
      } else {
        const [, beforeNode] = firstNode.splitText(anchorOffset);
        beforeNode.insertBefore(textNode);
      }
      textNode.select();
      if (currentBlock === null) {
        invariant(false, 'formatText: currentBlock not be found');
      }
      currentBlock.normalizeTextNodes(true);
    }
    return;
  }

  if (selectedNodesLength === 1) {
    if (isTextNode(firstNode)) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

      if (startOffset === endOffset) {
        return;
      }
      if (startOffset === 0 && endOffset === firstNodeTextLength) {
        firstNode.setFlags(firstNextFlags);
        firstNode.select(startOffset, endOffset);
      } else {
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFlags(firstNextFlags);
        replacement.select(0, endOffset - startOffset);
      }
      currentBlock.normalizeTextNodes(true);
    }
  } else {
    const isBefore = firstNode === selection.getAnchorNode();
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    if (startOffset !== 0) {
      [, firstNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFlags(firstNextFlags);

    const lastNextFlags = lastNode.getTextNodeFormatFlags(
      formatType,
      firstNextFlags,
      forceFormat,
    );
    const lastNodeText = lastNode.getTextContent();
    const lastNodeTextLength = lastNodeText.length;
    if (endOffset !== lastNodeTextLength) {
      [lastNode] = lastNode.splitText(endOffset);
    }
    lastNode.setFlags(lastNextFlags);

    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      if (isTextNode(selectedNode) && !selectedNode.isImmutable()) {
        const selectedNextFlags = selectedNode.getTextNodeFormatFlags(
          formatType,
          firstNextFlags,
          forceFormat,
        );
        selectedNode.setFlags(selectedNextFlags);
      }
    }
    selection.setRange(
      firstNode.getKey(),
      startOffset,
      lastNode.getKey(),
      endOffset,
    );
    currentBlock.normalizeTextNodes(true);
  }
}

export function insertParagraph(selection: Selection): void {
  if (!selection.isCaret()) {
    removeText(selection);
  }
  const anchorNode = selection.getAnchorNode();
  if (anchorNode.isSegmented()) {
    return;
  }
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const nodesToMove = anchorNode.getNextSiblings().reverse();
  const currentBlock = anchorNode.getParentBlockOrThrow();
  let anchorOffset = selection.anchorOffset;

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
    newBlock.normalizeTextNodes(true);
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
    currentBlock.normalizeTextNodes();
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
  const focusNode = selection.getFocusNode();
  // We have to adjust selection if we move selection into a segmented node
  if (focusNode.isSegmented()) {
    if (isBackward) {
      const prevSibling = focusNode.getPreviousSibling();
      if (isTextNode(prevSibling)) {
        selection.focusKey = prevSibling.getKey();
        selection.focusOffset = prevSibling.getTextContentSize();
      }
    } else {
      const nextSibling = focusNode.getNextSibling();
      if (isTextNode(nextSibling)) {
        selection.focusKey = nextSibling.getKey();
        selection.focusOffset = 0;
      }
    }
    if (!isHoldingShift) {
      selection.anchorKey = selection.focusKey;
      selection.anchorOffset = selection.focusOffset;
    }
  }
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

function normalizeAnchorParent(selection: Selection): void {
  const focusNode = selection.getFocusNode();
  const parent = focusNode.getParentOrThrow();
  parent.normalizeTextNodes(true);
}

export function deleteLineBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'lineboundary', false);
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

export function deleteLineForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'lineboundary', false);
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

export function deleteWordBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'word', false);
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

export function deleteWordForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'word', false);
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

export function deleteBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'character', false);
    // Special handling around rich text nodes
    if (selection.isCaret()) {
      const anchorNode = selection.getAnchorNode();
      const parent = anchorNode.getParentOrThrow();
      const parentType = parent.getType();
      if (selection.anchorOffset === 0 && parentType !== 'paragraph') {
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
    } else {
      const focusNode = selection.getFocusNode();

      if (focusNode.isSegmented()) {
        removeSegment(focusNode, true);
        return;
      }
    }
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

export function deleteForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'character', false);
    if (!selection.isCaret()) {
      const focusNode = selection.getFocusNode();

      if (focusNode.isSegmented()) {
        removeSegment(focusNode, false);
        return;
      }
    }
  }
  removeText(selection);
  normalizeAnchorParent(selection);
}

function setSelectionFocus(
  selection: Selection,
  key: string,
  offset: number,
): void {
  selection.focusKey = key;
  selection.focusOffset = offset;
  selection.isDirty = true;
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
    sibling.getParentBlockOrThrow().normalizeTextNodes(true);
  }
}

export function updateCaretSelectionForRange(
  selection: Selection,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
  collapse: boolean,
): void {
  const domSelection = window.getSelection();
  const anchorNode = selection.getAnchorNode();

  if (selection.isCaret()) {
    if (granularity === 'character') {
      if (isBackward && selection.anchorOffset === 0) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (isTextNode(prevSibling) && prevSibling.isSegmented()) {
          setSelectionFocus(selection, prevSibling.getKey(), 0);
          return;
        }
      } else if (
        !isBackward &&
        selection.anchorOffset === anchorNode.getTextContentSize()
      ) {
        const nextSibling = anchorNode.getNextSibling();
        if (isTextNode(nextSibling) && nextSibling.isSegmented()) {
          setSelectionFocus(
            selection,
            nextSibling.getKey(),
            nextSibling.getTextContentSize(),
          );
          return;
        }
      }
    }
  }
  const prevAnchorKey = selection.anchorKey;
  const prevAnchorOffset = selection.anchorOffset;

  if (anchorNode.getTextContent() === '') {
    domSelection.extend(domSelection.anchorNode, isBackward ? 0 : 1);
    if (collapse) {
      if (isBackward) {
        domSelection.collapseToStart();
      } else {
        domSelection.collapseToEnd();
      }
    }
  }
  // We use the DOM selection.modify API here to "tell" us what the selection
  // will be. We then use it to update the Outline selection accordingly. This
  // is much more reliable than waiting for a beforeinput and using the ranges
  // from getTargetRanges(), and is also better than trying to do it ourselves
  // using Intl.Segmenter or other work-arounds that struggle with word segments
  // and line segments (especially with word wrapping and non-Roman languages).
  domSelection.modify(
    collapse ? 'move' : 'extend',
    isBackward ? 'backward' : 'forward',
    granularity,
  );
  const range = domSelection.getRangeAt(0);
  // Apply the DOM selection to our Outline selection.
  selection.applyDOMRange(range);

  // Check if the selection moved just past an immutable/segmented node.
  // In which case, we want to ensure that selection hits the boundary
  // of these types of node, primarily for accessibility reasons. We
  // only do this for selection going forward, as this is the most prone
  // to be skewed by the fact that these nodes use contenteditable="false"
  if (
    !isBackward &&
    granularity === 'word' &&
    selection.isCaret() &&
    selection.anchorOffset === 0
  ) {
    const target = selection.getAnchorNode().getPreviousSibling();
    if (isTextNode(target) && (target.isImmutable() || target.isSegmented())) {
      const targetPrevSibling = target.getPreviousSibling();
      // Ensure that we don't move selection if we were previously in the
      // same place!
      if (
        isTextNode(targetPrevSibling) &&
        (prevAnchorKey !== targetPrevSibling.getKey() ||
          prevAnchorOffset !== targetPrevSibling.getTextContentSize())
      ) {
        targetPrevSibling.select();
      }
    }
  }
}

export function removeText(selection: Selection): void {
  insertText(selection, '');
}

export function insertLineBreak(selection: Selection): void {
  const lineBreakNode = createLineBreakNode();
  insertNodes(selection, [lineBreakNode]);
  lineBreakNode.selectNext(0, 0);
}

export function insertNodes(
  selection: Selection,
  nodes: Array<OutlineNode>,
): void {
  // If there is a range selected remove the text in it
  if (!selection.isCaret()) {
    removeText(selection);
  }
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const siblings = [];
  let target;

  if (anchorOffset === 0) {
    // Insert an empty text node to wrap whatever is being inserted
    // in case it's immutable
    target = createTextNode('');
    anchorNode.insertBefore(target);
    siblings.push(anchorNode);
  } else if (
    anchorOffset === textContentLength ||
    anchorNode.isImmutable() ||
    anchorNode.isSegmented()
  ) {
    target = anchorNode;
  } else {
    // If we started with a range selected grab the danglingText after the
    // end of the selection and put it on our siblings array so we can
    // append it after the last node we're inserting
    let danglingText;
    [target, danglingText] = anchorNode.splitText(anchorOffset);
    siblings.push(danglingText);
  }

  // Finally, get all remaining text node siblings in this block so we can
  // append them after the last node we're inserting.
  const nextSiblings = anchorNode.getNextSiblings();
  siblings.push(...nextSiblings);
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();

  // Time to insert the nodes!
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isTextNode(node)) {
      // If it's a text node append it to the previous text node.
      target.insertAfter(node);
      target = node;
    } else {
      // If it's a block node make sure target refers to a block
      // and then insert after our target block
      if (isTextNode(target)) {
        target = topLevelBlock;
      }
      target.insertAfter(node);
      target = node;
    }
  }

  if (isBlockNode(target)) {
    const lastChild = target.getLastTextNode();
    if (!isTextNode(lastChild)) {
      invariant(false, 'insertNodes: lastChild not a text node');
    }
    lastChild.select();
    if (siblings.length !== 0) {
      let prevSibling = lastChild;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        prevSibling.insertAfter(sibling);
        prevSibling = sibling;
      }
    }
    // Normalize the block where we started the insertion
    topLevelBlock.normalizeTextNodes(true);
    // Normalize the block where we ended the insertion
    if (isBlockNode(target)) {
      target.normalizeTextNodes(true);
    }
  } else if (isTextNode(target)) {
    // We've only inserted text nodes, so we only need to normalize this block.
    target.select();
    const parent = target.getParentBlockOrThrow();
    parent.normalizeTextNodes(true);
  }
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
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  let firstNode = selectedNodes[0];
  if (!isTextNode(firstNode)) {
    invariant(false, 'insertText: firstNode not a a text node');
  }
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const currentBlock = firstNode.getParentBlockOrThrow();
  let startOffset;
  let endOffset;

  if (selectedNodesLength === 1) {
    startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
    endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
    if (
      firstNode.isLink() &&
      selection.isCaret() &&
      (startOffset === 0 || endOffset === firstNodeTextLength)
    ) {
      const textNode = createTextNode(text);
      if (startOffset === 0) {
        firstNode.insertBefore(textNode);
      } else {
        firstNode.insertAfter(textNode);
      }
      textNode.select();
      currentBlock.normalizeTextNodes(true);
      return;
    } else if (isImmutableOrInert(firstNode)) {
      const textNode = createTextNode(text);
      firstNode.replace(textNode);
      firstNode = textNode;
      textNode.select();
      return;
    } else if (firstNode.isSegmented()) {
      return;
    }
    const delCount = endOffset - startOffset;

    firstNode.spliceText(startOffset, delCount, text, true);
  } else {
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];
    const isBefore = firstNode === selection.getAnchorNode();
    const firstNodeParents = new Set(firstNode.getParents());
    const lastNodeParents = new Set(lastNode.getParents());
    let firstNodeRemove = false;
    let lastNodeRemove = false;
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    if (isImmutableOrInert(firstNode)) {
      firstNodeRemove = true;
      const textNode = createTextNode(text);
      firstNode.replace(textNode);
      firstNode = textNode;
      textNode.select();
    } else if (!firstNode.isSegmented()) {
      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
      );
      firstNode.select(startOffset, startOffset);
    }

    if (!firstNodeParents.has(lastNode)) {
      if (isTextNode(lastNode) && !lastNode.isSegmented()) {
        if (
          endOffset === lastNode.getTextContentSize() &&
          lastNode.getKey() !== selection.anchorKey
        ) {
          lastNodeRemove = true;
          lastNode.remove();
        } else {
          if (isImmutableOrInert(lastNode)) {
            lastNodeRemove = true;
            const textNode = createTextNode('');
            lastNode.replace(textNode);
            lastNode = textNode;
          } else {
            lastNode.spliceText(0, endOffset, '', false);
          }
          if (
            firstNode.getTextContent() === '' &&
            firstNode.getKey() !== selection.anchorKey
          ) {
            firstNodeRemove = true;
            firstNode.remove();
          } else {
            let parent = lastNode.getParent();
            while (parent !== null) {
              if (parent.getChildrenSize() < 2) {
                lastNodeParents.delete(parent);
              }
              parent = parent.getParent();
            }
            firstNode.insertAfter(lastNode);
          }
        }
      }
    }
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      if (
        (firstNodeRemove || !firstNodeParents.has(selectedNode)) &&
        (lastNodeRemove || !lastNodeParents.has(selectedNode))
      ) {
        selectedNode.remove();
      }
    }
    currentBlock.normalizeTextNodes(true);
  }
}

export function moveEnd(selection: Selection): void {
  const anchorNode = selection.getAnchorNode();
  anchorNode.select();
}

export function selectAll(selection: Selection): void {
  const anchorNode = selection.getAnchorNode();
  const topParent = anchorNode.getTopParentBlockOrThrow();
  const root = topParent.getParentOrThrow();
  const firstTextNode = root.getFirstTextNode();
  const lastTextNode = root.getLastTextNode();
  if (firstTextNode !== null && lastTextNode !== null) {
    selection.setRange(
      firstTextNode.getKey(),
      0,
      lastTextNode.getKey(),
      lastTextNode.getTextContentSize(),
    );
  }
}
