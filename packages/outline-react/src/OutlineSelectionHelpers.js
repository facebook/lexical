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
  isLineBreakNode,
  createTextNode,
} from 'outline';
import {CAN_USE_INTL_SEGMENTER, IS_APPLE} from './OutlineEnv';
import {invariant} from './OutlineReactUtils';
import {getGraphemeIterator, announceNode} from './OutlineTextHelpers';

const WHITESPACE_REGEX = /\s/g;

/**
 * What you think of as a single 'character' onscreen might actually be composed
 * of multiple Unicode codepoints. This function uses the `Intl.Segmenter` to
 * obtain the offset after the grapheme to the right of `offset`. You can use
 * this, for instance, to advance the cursor one position rightward.
 */
function getOffsetAfterNextGrapheme(offset, textContent): number {
  if (textContent === '' || offset === textContent.length) {
    return offset;
  }
  if (CAN_USE_INTL_SEGMENTER) {
    const segments = getGraphemeIterator().segment(textContent.slice(offset));
    const firstSegment = segments.containing(0);
    return offset + firstSegment.segment.length;
  } else {
    // TODO: Implement polyfill for `Intl.Segmenter`.
    return offset + 1;
  }
}

/**
 * What you think of as a single 'character' onscreen might actually be composed
 * of multiple Unicode codepoints. This function uses the `Intl.Segmenter` to
 * obtain the offset before the grapheme to the left of `offset`. You can use
 * this, for instance, to advance the cursor one position leftward.
 */
function getOffsetBeforePreviousGrapheme(offset, textContent): number {
  if (textContent === '' || offset === 0) {
    return offset;
  }
  if (CAN_USE_INTL_SEGMENTER) {
    const segments = getGraphemeIterator().segment(
      textContent.slice(0, offset),
    );
    const allSegments = Array.from(segments);
    const lastSegment = allSegments[allSegments.length - 1];
    return offset - lastSegment.segment.length;
  } else {
    // TODO: Implement polyfill for `Intl.Segmenter`.
    return offset - 1;
  }
}

function removeFirstSegment(node: TextNode): void {
  const currentBlock = node.getParentBlockOrThrow();
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.indexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(0, lastSpaceIndex + 1, '');
  } else {
    const textNode = createTextNode('');
    node.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

function removeLastSegment(node: TextNode): void {
  const currentBlock = node.getParentBlockOrThrow();
  const textContent = node.getTextContent();
  const lastSpaceIndex = textContent.lastIndexOf(' ');
  if (lastSpaceIndex > -1) {
    node.spliceText(lastSpaceIndex, textContent.length - lastSpaceIndex, '');
  } else {
    const textNode = createTextNode('');
    node.insertAfter(textNode);
    node.remove();
    textNode.select();
    currentBlock.normalizeTextNodes(true);
  }
}

export function getNodesInRange(
  selection: Selection,
): {range: Array<NodeKey>, nodeMap: {[NodeKey]: Node}} {
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  let startOffset;
  let endOffset;

  if (anchorNode === focusNode) {
    const firstNode = anchorNode.getLatest().clone();
    if (!isTextNode(firstNode)) {
      if (__DEV__) {
        invariant(false, 'Should never happen');
      } else {
        invariant();
      }
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
              if (__DEV__) {
                invariant(false, 'Should never happen');
              } else {
                invariant();
              }
            }
            const childrenKeys = node.__children;
            const index = childrenKeys.indexOf(sourceParentKey);
            if (index === -1) {
              if (__DEV__) {
                invariant(false, 'Should never happen');
              } else {
                invariant();
              }
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
    if (__DEV__) {
      invariant(false, 'formatText: firstNode/lastNode not a text node');
    } else {
      invariant();
    }
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
        if (__DEV__) {
          invariant(false, 'formatText: currentBlock not be found');
        } else {
          invariant();
        }
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
  if (anchorNode === null) {
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

export function deleteLineBackward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range.
  // This is because beforeinput gives us getTargetRanges, which tells
  // us where to start the delete and end the delete. Which means we
  // only need the rest of the logic for browsers that don't support
  // native beforeinput (Firefox and IE).
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  // Handle removing block
  if (
    anchorNode.getPreviousSibling() === null &&
    anchorNode.getTextContent() === ''
  ) {
    deleteBackward(selection);
    return;
  }
  const anchorOffset = selection.anchorOffset;
  const nodesToTraverse = anchorNode.getPreviousSiblings();
  anchorNode.spliceText(0, anchorOffset, '', true);

  for (let i = nodesToTraverse.length - 1; i >= 0; i--) {
    const node = nodesToTraverse[i];

    if (isLineBreakNode(node)) {
      return;
    } else {
      node.remove();
    }
  }
}

export function deleteLineForward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range.
  // This is because beforeinput gives us getTargetRanges, which tells
  // us where to start the delete and end the delete. Which means we
  // only need the rest of the logic for browsers that don't support
  // native beforeinput (Firefox and IE).
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }

  // Handle removing block
  if (
    anchorNode.getNextSibling() === null &&
    anchorNode.getTextContent() === ''
  ) {
    const currentBlock = anchorNode.getParentBlockOrThrow();
    if (currentBlock.getNextSibling() == null) {
      deleteBackward(selection);
    } else {
      deleteForward(selection);
    }
    return;
  }

  const anchorOffset = selection.anchorOffset;
  const nodesToTraverse = anchorNode.getNextSiblings();
  const textContentLength = anchorNode.getTextContent().length;
  anchorNode.spliceText(
    anchorOffset,
    textContentLength - anchorOffset,
    '',
    true,
  );

  for (let i = 0; i < nodesToTraverse.length; i++) {
    const node = nodesToTraverse[i];

    if (isLineBreakNode(node)) {
      return;
    } else {
      node.remove();
    }
  }
}

export function deleteWordBackward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range.
  // This is because beforeinput gives us getTargetRanges, which tells
  // us where to start the delete and end the delete. Which means we
  // only need the rest of the logic for browsers that don't support
  // native beforeinput (Firefox and IE).
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  // Handle removing block
  if (
    anchorNode.getPreviousSibling() === null &&
    anchorNode.getTextContent() === ''
  ) {
    deleteBackward(selection);
    return;
  }

  const currentBlock = anchorNode.getParentBlockOrThrow();
  let node = anchorNode;

  try {
    while (true) {
      const prevSibling = node.getPreviousSibling();
      if (node.isImmutable() || node.isSegmented() || node.isInert()) {
        node.remove();
        if (!isTextNode(prevSibling)) {
          if (__DEV__) {
            invariant(false, 'Should never happen');
          } else {
            invariant();
          }
        }
        prevSibling.select();
        return;
      } else if (isTextNode(node)) {
        const textContent = node.getTextContent();
        const endIndex =
          node === anchorNode ? anchorOffset : textContent.length;
        if (endIndex === 0 && node === anchorNode) {
          return;
        }
        let foundNonWhitespace = false;

        for (let s = endIndex - 1; s >= 0; s--) {
          const char = textContent[s];
          if (s === 0) {
            node.spliceText(s, endIndex - s, '', true);
            return;
          } else if (WHITESPACE_REGEX.test(char)) {
            if (foundNonWhitespace) {
              node.spliceText(s + 1, endIndex - s, '', true);
              return;
            }
          } else if (char === '\n') {
            node.spliceText(s + 1, endIndex - s + 1, '', true);
            return;
          } else {
            foundNonWhitespace = true;
          }
        }
        if (prevSibling === null) {
          node.setTextContent('');
          node.select();
        } else {
          node.remove();
        }
      }
      if (prevSibling === null) {
        return;
      }
      node = prevSibling;
    }
  } finally {
    currentBlock.normalizeTextNodes(true);
  }
}

export function deleteWordForward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range.
  // This is because beforeinput gives us getTargetRanges, which tells
  // us where to start the delete and end the delete. Which means we
  // only need the rest of the logic for browsers that don't support
  // native beforeinput (Firefox and IE).
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  // Handle removing block
  if (
    anchorNode.getNextSibling() === null &&
    anchorNode.getTextContent() === ''
  ) {
    deleteForward(selection);
    return;
  }

  const currentBlock = anchorNode.getParentBlockOrThrow();
  let node = anchorNode;

  try {
    while (true) {
      const nextSibling = node.getNextSibling();

      if (node.isImmutable() || node.isSegmented() || node.isInert()) {
        node.remove();
        if (!isTextNode(nextSibling)) {
          if (__DEV__) {
            invariant(false, 'Should never happen');
          } else {
            invariant();
          }
        }
        nextSibling.select(0, 0);
        return;
      } else if (isTextNode(node) && anchorNode.getTextContent() !== '') {
        const textContent = node.getTextContent();
        const startIndex = node === anchorNode ? anchorOffset : 0;
        let foundNonWhitespace = false;
        for (let s = startIndex; s < textContent.length; s++) {
          const char = textContent[s];
          if (WHITESPACE_REGEX.test(char)) {
            if (foundNonWhitespace) {
              node.spliceText(startIndex, s - startIndex, '', true);
              return;
            }
          } else if (char === '\n') {
            node.spliceText(startIndex, s - startIndex, '', true);
            return;
          } else {
            foundNonWhitespace = true;
          }
        }
        node.spliceText(startIndex, textContent.length - startIndex, '', true);
      }
      if (nextSibling === null) {
        return;
      }
      node = nextSibling;
    }
  } finally {
    currentBlock.normalizeTextNodes(true);
  }
}

export function deleteBackward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range
  // when working with glyphs that are multi-character. That's because
  // we leverage beforeinput's getTargetRanges. Meaning we will need
  // to polyfill this for browsers that don't support beforeinput, such
  // as FF.
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  const currentBlock = anchorNode.getParentBlockOrThrow();
  const prevSibling = anchorNode.getPreviousSibling();

  if (anchorOffset === 0) {
    if (prevSibling === null) {
      currentBlock.mergeWithPreviousSibling();
    } else if (isTextNode(prevSibling)) {
      if (prevSibling.isImmutable()) {
        if (prevSibling === anchorNode) {
          const nextPrevSibling = prevSibling.getPreviousSibling();
          if (!isTextNode(nextPrevSibling)) {
            if (__DEV__) {
              invariant(false, 'Should never happen');
            } else {
              invariant();
            }
          }
          nextPrevSibling.select();
        }
        prevSibling.remove();
        currentBlock.normalizeTextNodes(true);
      } else if (prevSibling.isSegmented()) {
        removeLastSegment(prevSibling);
        currentBlock.normalizeTextNodes(true);
      } else {
        const textContent = prevSibling.getTextContent();
        const textContentLength = textContent.length;
        if (textContentLength !== 0) {
          prevSibling.spliceText(textContentLength - 1, 1, '', true);
        }
      }
    } else {
      if (__DEV__) {
        invariant(false, `TODO`);
      } else {
        invariant();
      }
    }
  } else {
    const textContent = anchorNode.getTextContent();
    const deletionStartOffset = getOffsetBeforePreviousGrapheme(
      anchorOffset,
      textContent,
    );
    anchorNode.spliceText(
      deletionStartOffset,
      anchorOffset - deletionStartOffset,
      '',
      true,
    );
  }
}

export function deleteForward(selection: Selection): void {
  // When using Safari or Chrome, we will usually always have a range
  // when working with glyps that are multi-character. That's because
  // we leverage beforeinput's getTargetRanges. Meaning we will need
  // to polyfill this for browsers that don't support beforeinput, such
  // as FF.
  if (!selection.isCaret()) {
    removeText(selection);
    return;
  }
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  const currentBlock = anchorNode.getParentBlockOrThrow();
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const nextSibling = anchorNode.getNextSibling();

  if (anchorOffset === textContentLength) {
    if (nextSibling === null) {
      currentBlock.mergeWithNextSibling();
    } else if (isTextNode(nextSibling)) {
      if (nextSibling.isImmutable()) {
        nextSibling.remove();
        currentBlock.normalizeTextNodes(true);
      } else if (nextSibling.isSegmented()) {
        removeFirstSegment(nextSibling);
        currentBlock.normalizeTextNodes(true);
      } else {
        nextSibling.spliceText(0, 1, '', true);
      }
    } else {
      if (__DEV__) {
        invariant(false, 'TODO');
      } else {
        invariant();
      }
    }
  } else {
    const deletionEndOffset = getOffsetAfterNextGrapheme(
      anchorOffset,
      textContent,
    );
    anchorNode.spliceText(
      anchorOffset,
      deletionEndOffset - anchorOffset,
      '',
      true,
    );
  }
}

export function removeText(selection: Selection): void {
  insertText(selection, '');
}

export function insertLineBreak(selection: Selection): void {
  const lineBreakNode = createLineBreakNode();
  insertNodes(selection, [lineBreakNode]);
  lineBreakNode.selectNext();
}

export function insertNodes(
  selection: Selection,
  nodes: Array<OutlineNode>,
): void {
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
    let danglingText;
    [target, danglingText] = anchorNode.splitText(anchorOffset);
    siblings.push(danglingText);
  }
  const nextSiblings = anchorNode.getNextSiblings();
  siblings.push(...nextSiblings);
  const topLevelBlock = anchorNode.getTopParentBlockOrThrow();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isTextNode(node)) {
      target.insertAfter(node);
      target = node;
    } else {
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
      if (__DEV__) {
        invariant(false, 'Should never happen');
      } else {
        invariant();
      }
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
  } else if (isTextNode(target)) {
    target.select();
    const parent = target.getParentBlockOrThrow();
    parent.normalizeTextNodes(true);
  }
}

export function insertText(selection: Selection, text: string): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const firstNode = selectedNodes[0];
  if (!isTextNode(firstNode)) {
    if (__DEV__) {
      invariant(false, 'insertText: firstNode not a a text node');
    } else {
      invariant();
    }
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
    }
    const delCount = endOffset - startOffset;

    firstNode.spliceText(startOffset, delCount, text, true);
  } else {
    const lastIndex = selectedNodesLength - 1;
    const lastNode = selectedNodes[lastIndex];
    const isBefore = firstNode === selection.getAnchorNode();
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    firstNode.spliceText(
      startOffset,
      firstNodeTextLength - startOffset,
      text,
      true,
    );
    const lastNodeTextLength = lastNode.getTextContent().length;
    let lastNodeRemove = false;
    let firstNodeRemove = false;

    if (!lastNode.isParentOf(firstNode)) {
      if (endOffset === lastNodeTextLength) {
        lastNodeRemove = true;
        lastNode.remove();
      } else if (isTextNode(lastNode)) {
        lastNode.spliceText(0, endOffset, '', false);
        if (firstNode.getTextContent() === '') {
          firstNodeRemove = true;
          firstNode.remove();
          lastNode.select(0, 0);
        } else {
          firstNode.insertAfter(lastNode);
        }
      }
    }
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      if (
        (firstNodeRemove || !selectedNode.isParentOf(firstNode)) &&
        (lastNodeRemove || !selectedNode.isParentOf(lastNode))
      ) {
        selectedNode.remove();
      }
    }
    currentBlock.normalizeTextNodes(true);
  }
}

export function moveEnd(selection: Selection): void {
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }

  anchorNode.selectEnd();
}

export function handleKeyDownSelection(
  event: KeyboardEvent,
  selection: Selection,
): void {
  if (event.metaKey || !selection.isCaret()) {
    return;
  }
  // Handle moving/deleting selection with left/right around immutable or segmented nodes, which should be handled as a single character.
  // This is important for screen readers + text to speech accessibility tooling. About screen readers and caret moves:
  // In Windows, JAWS and NVDA always announce the character at the right of the caret.
  // In MacOS, VO always announces the character over which the caret jumped.
  const key = event.key;
  const isLeftArrow = key === 'ArrowLeft';
  const isRightArrow = key === 'ArrowRight';
  const isBackspace = key === 'Backspace';
  const anchorNode = selection.getAnchorNode();
  const offset = selection.anchorOffset;
  const textContent = anchorNode.getTextContent();

  if (isLeftArrow || isBackspace) {
    const selectionAtStart = offset === 0;

    if (selectionAtStart) {
      const prevSibling = anchorNode.getPreviousSibling();

      if (prevSibling === null) {
        // On empty text nodes, we always move native DOM selection
        // to offset 1. Although it's at 1, we really mean that it
        // is at 0 in our model. So when we encounter a left arrow
        // we need to move selection to the previous block if
        // we have no previous sibling.
        if (isLeftArrow && textContent === '') {
          const parent = anchorNode.getParentOrThrow();
          const parentSibling = parent.getPreviousSibling();

          if (isBlockNode(parentSibling)) {
            const lastChild = parentSibling.getLastChild();
            if (isTextNode(lastChild)) {
              lastChild.select();
              event.preventDefault();
            }
          }
        }
      } else if (!event.shiftKey) {
        let targetPrevSibling = prevSibling;
        if (prevSibling.isImmutable() || prevSibling.isSegmented()) {
          if (isLeftArrow) {
            if (!isLineBreakNode(prevSibling)) {
              announceNode(prevSibling);
            }
            targetPrevSibling = prevSibling.getPreviousSibling();
          } else {
            deleteBackward(selection);
            event.preventDefault();
          }
        } else if (prevSibling.isInert()) {
          targetPrevSibling = prevSibling.getPreviousSibling();
          if (
            !isLeftArrow &&
            selection.isCaret() &&
            isTextNode(targetPrevSibling)
          ) {
            const prevKey = targetPrevSibling.getKey();
            const prevOffset = targetPrevSibling.getTextContent().length;
            selection.setRange(prevKey, prevOffset, prevKey, prevOffset);
            deleteBackward(selection);
            event.preventDefault();
          }
        }
        // Due to empty text nodes having an offset of 1, we need to
        // account for this and move selection accordingly when right
        // arrow is pressed.
        if (isLeftArrow && isTextNode(targetPrevSibling)) {
          event.preventDefault();
          if (targetPrevSibling === prevSibling) {
            const prevSiblingTextContent = targetPrevSibling.getTextContent();
            // We adjust the offset by 1, as we will have have moved between
            // two adjacent nodes.
            const endOffset = prevSiblingTextContent.length - 1;
            targetPrevSibling.select(endOffset, endOffset);
          } else {
            // We don't adjust offset as the nodes are not adjacent (the target
            // isn't the same as the prevSibling).
            targetPrevSibling.select();
          }
        }
      }
    }
  } else if (isRightArrow) {
    const textContentLength = textContent.length;
    const selectionAtEnd = textContentLength === offset;
    const selectionJustBeforeEnd = textContentLength === offset + 1;

    if (selectionAtEnd || selectionJustBeforeEnd) {
      const nextSibling = anchorNode.getNextSibling();

      if (nextSibling !== null) {
        if (nextSibling.isImmutable() || nextSibling.isSegmented()) {
          if (isRightArrow) {
            if (
              (IS_APPLE && selectionAtEnd) ||
              (!IS_APPLE && selectionJustBeforeEnd)
            ) {
              if (isLineBreakNode(nextSibling)) {
                nextSibling.selectNext(0, 0);
                event.preventDefault();
              } else {
                announceNode(nextSibling);
              }
            }
          }
        }
      }
    }
  }
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
      lastTextNode.getTextContent().length,
    );
  }
}
