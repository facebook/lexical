/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, OutlineNode, Selection, TextFormatType} from 'outline';

import {
  createLineBreakNode,
  isTextNode,
  isBlockNode,
  isRootNode,
  isLineBreakNode,
  createTextNode,
} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

import {CAN_USE_INTL_SEGMENTER, IS_APPLE} from './OutlineEnv';
import {invariant} from './OutlineReactUtils';
import {
  announceNode,
  getFirstWordIndex,
  getFirstWordSegment,
  getLastWordIndex,
  getLastWordSegment,
  getSegmentsFromString,
} from './OutlineTextHelpers';

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

export function moveWordBackward(selection: Selection, isCaret: boolean): void {
  let resetAnchorKey;
  let resetAnchorOffset = 0;
  // If we have a range, we need to make the anchor the focus, then set back
  // the range at the end. This allows us to re-use updateCaretSelectionForRange.
  if (!selection.isCaret()) {
    resetAnchorKey = selection.anchorKey;
    resetAnchorOffset = selection.anchorOffset;
    selection.anchorKey = selection.focusKey;
    selection.anchorOffset = selection.focusOffset;
  }
  updateCaretSelectionForRange(selection, true, 'word');
  const focusNode = selection.getFocusNode();
  // We have to adjust selection if we move selection into a segmented node
  if (focusNode.isSegmented()) {
    const prevSibling = focusNode.getPreviousSibling();
    if (isTextNode(prevSibling)) {
      selection.focusKey = prevSibling.getKey();
      selection.focusOffset = prevSibling.getTextContent().length;
    }
  }
  if (isCaret) {
    selection.anchorKey = selection.focusKey;
    selection.anchorOffset = selection.focusOffset;
  } else if (resetAnchorKey) {
    selection.anchorKey = resetAnchorKey;
    selection.anchorOffset = resetAnchorOffset;
  }
}

export function deleteLineBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'line');
  }
  removeText(selection);
}

export function deleteLineForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'line');
  }
  removeText(selection);
}

export function deleteWordBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'word');
  }
  removeText(selection);
}

export function deleteWordForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'word');
  }
  removeText(selection);
}

export function deleteBackward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, true, 'character');
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
    }
  }
  removeText(selection);
}

export function deleteForward(selection: Selection): void {
  if (selection.isCaret()) {
    updateCaretSelectionForRange(selection, false, 'character');
  }
  removeText(selection);
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

function updateSelectionForNextSiblingRange(
  selection: Selection,
  isBackward: boolean,
  sibling: OutlineNode,
): void {
  const nextSibling = isBackward
    ? sibling.getPreviousSibling()
    : sibling.getNextSibling();
  if (isTextNode(nextSibling)) {
    const key = nextSibling.getKey();
    const offset = isBackward ? nextSibling.getTextContent().length : 0;
    setSelectionFocus(selection, key, offset);
  }
}

function updateSelectionForNextSegmentedRange(
  selection: Selection,
  isBackward: boolean,
  sibling: OutlineNode,
) {
  const siblingTextContent = sibling.getTextContent();
  let spaceIndex = isBackward
    ? siblingTextContent.lastIndexOf(' ')
    : siblingTextContent.indexOf(' ');
  if (spaceIndex === -1) {
    spaceIndex = isBackward ? 0 : siblingTextContent.length;
  } else if (!isBackward) {
    spaceIndex++;
  }
  const key = sibling.getKey();
  setSelectionFocus(selection, key, spaceIndex);
}

export function updateCaretSelectionForRange(
  selection: Selection,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'line',
): void {
  const anchorOffset = selection.anchorOffset;
  const anchorNode = selection.getAnchorNode();
  if (anchorNode === null) {
    return;
  }
  const currentBlock = anchorNode.getParentBlockOrThrow();
  const textContent = anchorNode.getTextContent();
  const textContentLength = textContent.length;
  const sibling = isBackward
    ? anchorNode.getPreviousSibling()
    : anchorNode.getNextSibling();
  const isOffsetAtBoundary = isBackward
    ? anchorOffset === 0
    : anchorOffset === textContentLength;

  if (sibling === null && isOffsetAtBoundary) {
    // If we are at the start or the end, and try to move to the prev
    // or next block via deletions, then set the range to be of that
    // inserecting block.
    const block = isBackward
      ? currentBlock.getPreviousSibling()
      : currentBlock.getNextSibling();
    if (isBlockNode(block)) {
      const textNode = isBackward
        ? block.getLastTextNode()
        : block.getFirstTextNode();
      if (textNode !== null) {
        const key = textNode.getKey();
        const offset = isBackward ? textNode.getTextContent().length : 0;
        setSelectionFocus(selection, key, offset);
      }
    }
  } else if (isLineBreakNode(sibling) && isOffsetAtBoundary) {
    updateSelectionForNextSiblingRange(selection, isBackward, sibling);
  } else {
    if (granularity === 'character') {
      let characterNode = anchorNode;
      let characterOffset = anchorOffset;
      if (isOffsetAtBoundary) {
        if (sibling === null) {
          return;
        }
        if (sibling.isImmutable() || sibling.isInert()) {
          updateSelectionForNextSiblingRange(selection, isBackward, sibling);
          return;
        } else if (sibling.isSegmented()) {
          updateSelectionForNextSegmentedRange(selection, isBackward, sibling);
          return;
        }
        characterNode = sibling;
        characterOffset = isBackward ? sibling.getTextContent().length : 0;
      }
      let offset = 1;
      if (CAN_USE_INTL_SEGMENTER) {
        const textSlice = isBackward
          ? textContent.slice(0, anchorOffset)
          : textContent.slice(anchorOffset);
        const segments = getSegmentsFromString(textSlice, 'grapheme');
        const segment = isBackward
          ? segments[segments.length - 1]
          : segments[0];
        offset = segment.segment.length;
      }
      const key = characterNode.getKey();
      setSelectionFocus(
        selection,
        key,
        isBackward ? characterOffset - offset : characterOffset + offset,
      );
    } else if (granularity === 'word') {
      let node = anchorNode;
      let index = null;

      let targetTextContent = isBackward
        ? textContent.slice(0, anchorOffset)
        : textContent.slice(anchorOffset);
      let segments;
      while (true) {
        if (CAN_USE_INTL_SEGMENTER) {
          segments = getSegmentsFromString(targetTextContent, 'word');
          const segment = isBackward
            ? getLastWordSegment(segments)
            : getFirstWordSegment(segments);
          index = segment
            ? isBackward
              ? segment.index
              : segment.index + segment.segment.length
            : null;
        } else {
          index = isBackward
            ? getLastWordIndex(targetTextContent)
            : getFirstWordIndex(targetTextContent);
        }
        const siblingAfter = isBackward
          ? node.getPreviousSibling()
          : node.getNextSibling();
        if (
          siblingAfter === null ||
          (segments && segments.length > 1) ||
          isLineBreakNode(siblingAfter)
        ) {
          break;
        }
        targetTextContent = siblingAfter.getTextContent();
        node = siblingAfter;
      }

      if (node.isImmutable() || node.isInert()) {
        updateSelectionForNextSiblingRange(selection, isBackward, node);
      } else if (node.isSegmented()) {
        updateSelectionForNextSegmentedRange(selection, isBackward, node);
      } else if (index !== null) {
        const key = node.getKey();
        // If we are partially through an anchor string, we need to include
        // the offset for moving forward
        if (!isBackward && node === anchorNode) {
          index += anchorOffset;
        }
        setSelectionFocus(selection, key, index);
      }
    } else {
      // granularity === 'line'
      let node = anchorNode;
      while (true) {
        const siblingAfter = isBackward
          ? node.getPreviousSibling()
          : node.getNextSibling();
        if (siblingAfter === null || isLineBreakNode(siblingAfter)) {
          const target = siblingAfter || node;
          const key = target.getKey();
          const offset = isBackward ? 0 : target.getTextContent().length;
          setSelectionFocus(selection, key, offset);
          break;
        }
        node = siblingAfter;
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

export function insertText(selection: Selection, text: string): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  let firstNode = selectedNodes[0];
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
    const firstNodeParents = new Set(firstNode.getParents());
    const lastNodeParents = new Set(lastNode.getParents());
    let firstNodeRemove = false;
    let lastNodeRemove = false;
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    if (firstNode.isImmutable() || firstNode.isInert()) {
      firstNodeRemove = true;
      const textNode = createTextNode(text);
      firstNode.replace(textNode);
      firstNode = textNode;
      textNode.select();
    } else {
      firstNode.spliceText(
        startOffset,
        firstNodeTextLength - startOffset,
        text,
        true,
      );
      if (firstNode.isSegmented()) {
        firstNode.selectNext(0, 0);
        if (firstNode.getTextContent() === '') {
          firstNode.remove();
        }
      } else {
        firstNode.select(startOffset, startOffset);
      }
    }
    const lastNodeTextLength = lastNode.getTextContent().length;

    if (!firstNodeParents.has(lastNode)) {
      if (
        endOffset === lastNodeTextLength &&
        lastNode.getKey() !== selection.anchorKey
      ) {
        lastNodeRemove = true;
        lastNode.remove();
      } else if (isTextNode(lastNode)) {
        lastNode.spliceText(0, endOffset, '', false);
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

      if (prevSibling !== null && !event.shiftKey) {
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

      if (nextSibling === null) {
        // On empty text nodes, we sometimes move native DOM selection
        // to offset 0. Given it's at 0, it means the browser won't natively
        // move it to the next node (instead opting for position 1). So
        // need to work out this logic ourselves.
        if (textContent === '') {
          const parent = anchorNode.getParentOrThrow();
          const parentSibling = parent.getNextSibling();

          if (isBlockNode(parentSibling)) {
            const firstChild = parentSibling.getFirstChild();
            if (isTextNode(firstChild)) {
              firstChild.select();
              event.preventDefault();
            }
          }
        }
      } else {
        if (
          isRightArrow &&
          (nextSibling.isImmutable() || nextSibling.isSegmented())
        ) {
          if (
            ((IS_APPLE && selectionAtEnd) ||
              (!IS_APPLE && selectionJustBeforeEnd)) &&
            !isLineBreakNode(nextSibling)
          ) {
            announceNode(nextSibling);
          }
          if (selectionAtEnd) {
            event.preventDefault();
            nextSibling.selectNext(0, 0);
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
