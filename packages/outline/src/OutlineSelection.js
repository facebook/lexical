/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey} from './OutlineNode';
import type {ViewModel} from './OutlineView';

import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {createTextNode, BlockNode, TextNode, RootNode} from '.';
import {invariant} from './OutlineUtils';
import {OutlineEditor} from './OutlineEditor';

const WHITESPACE_REGEX = /\s/g;

let _graphemeIterator = null;
// $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
function getGraphemeIterator(): Intl.Segmenter {
  if (_graphemeIterator === null) {
    _graphemeIterator =
      // $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
      new Intl.Segmenter(undefined /* locale */, {granularity: 'grapheme'});
  }
  return _graphemeIterator;
}

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
  try {
    const segments = getGraphemeIterator().segment(textContent.slice(offset));
    const firstSegment = segments.containing(0);
    return offset + firstSegment.segment.length;
  } catch {
    // TODO: Implement ponyfill for `Intl.Segmenter`.
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
  try {
    const segments = getGraphemeIterator().segment(
      textContent.slice(0, offset),
    );
    const allSegments = Array.from(segments);
    const lastSegment = allSegments[allSegments.length - 1];
    return offset - lastSegment.segment.length;
  } catch {
    // TODO: Implement ponyfill for `Intl.Segmenter`.
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

export class Selection {
  anchorKey: string;
  anchorOffset: number;
  focusKey: string;
  focusOffset: number;
  isDirty: boolean;
  needsSync: boolean;

  constructor(
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  ) {
    this.anchorKey = anchorKey;
    this.anchorOffset = anchorOffset;
    this.focusKey = focusKey;
    this.focusOffset = focusOffset;
    this.isDirty = false;
    this.needsSync = false;
  }

  isEqual(diffSelection: Selection): boolean {
    return (
      this.anchorKey === diffSelection.anchorKey &&
      this.focusKey === diffSelection.focusKey &&
      this.anchorOffset === diffSelection.anchorOffset &&
      this.focusOffset === diffSelection.focusOffset
    );
  }
  isCaret(): boolean {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  }
  getAnchorNode(): TextNode {
    const anchorKey = this.anchorKey;
    const anchorNode = getNodeByKey(anchorKey);
    invariant(
      anchorNode instanceof TextNode,
      'getAnchorNode: anchorNode not a text node',
    );
    return anchorNode;
  }
  getFocusNode(): TextNode {
    const focusKey = this.focusKey;
    const focusNode = getNodeByKey(focusKey);
    invariant(
      focusNode instanceof TextNode,
      'getFocusNode: focusNode not a text node',
    );
    return focusNode;
  }
  getNodes(): Array<OutlineNode> {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  }
  getNodesInRange(): {range: Array<NodeKey>, nodeMap: {[NodeKey]: Node}} {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    let startOffset;
    let endOffset;

    if (anchorNode === focusNode) {
      const firstNode = anchorNode.getLatest().clone();
      invariant(firstNode instanceof TextNode, 'Should never happen');
      const isBefore = focusOffset > anchorOffset;
      startOffset = isBefore ? anchorOffset : focusOffset;
      endOffset = isBefore ? focusOffset : anchorOffset;
      firstNode.text = firstNode.text.slice(startOffset, endOffset);
      const key = firstNode.key;
      return {range: [key], nodeMap: {[key]: firstNode}};
    }
    const nodes = this.getNodes();
    const firstNode = nodes[0];
    const isBefore = firstNode === this.getAnchorNode();
    const nodeKeys = [];
    const nodeMap = {};
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    const nodesLength = nodes.length;
    const sourceParent = firstNode.getParentOrThrow();
    const sourceParentKey = sourceParent.key;
    const topLevelNodeKeys = new Set();

    for (let i = 0; i < nodesLength; i++) {
      let node = nodes[i];
      const parent = node.getParent();
      const nodeKey = node.key;

      if (node instanceof TextNode) {
        const text = node.getTextContent();

        if (i === 0) {
          node = node.getLatest().clone();
          node.text = text.slice(startOffset, text.length);
        } else if (i === nodesLength - 1) {
          node = node.getLatest().clone();
          node.text = text.slice(0, endOffset);
        }
      }

      if (nodeMap[nodeKey] === undefined) {
        nodeMap[nodeKey] = node;
      }

      if (parent === sourceParent && parent !== null) {
        nodeKeys.push(nodeKey);

        const topLevelBlock = node.getTopParentBlockOrThrow();
        topLevelNodeKeys.add(topLevelBlock.key);
      } else {
        let includeTopLevelBlock = false;

        if (!(parent instanceof RootNode)) {
          let removeChildren = false;

          while (node !== null) {
            const currKey = node.key;
            if (currKey === sourceParentKey) {
              removeChildren = true;
            } else if (removeChildren) {
              // We need to remove any children before out last source
              // parent key.
              node = node.getLatest().clone();
              invariant(node instanceof BlockNode, 'Should not happen');
              const childrenKeys = node.children;
              const index = childrenKeys.indexOf(sourceParentKey);
              invariant(index !== -1, 'Should not happen');
              childrenKeys.splice(0, index + 1);
              includeTopLevelBlock = true;
            }
            if (nodeMap[currKey] === undefined) {
              nodeMap[currKey] = node;
            }

            const nextParent = node.getParent();
            if (nextParent instanceof RootNode) {
              break;
            }
            node = nextParent;
          }
        }
        if (node !== null) {
          const key = node.key;
          if (!topLevelNodeKeys.has(key) || includeTopLevelBlock) {
            topLevelNodeKeys.add(key);
            nodeKeys.push(key);
          }
        }
      }
    }
    return {range: nodeKeys, nodeMap};
  }
  formatText(formatType: 0 | 1 | 2 | 3 | 4 | 5, forceFormat?: boolean): void {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];

    invariant(
      firstNode instanceof TextNode && lastNode instanceof TextNode,
      'formatText: firstNode/lastNode not a text node',
    );
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const currentBlock = firstNode.getParentBlockOrThrow();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNextFlags = firstNode.getTextNodeFormatFlags(
      formatType,
      null,
      forceFormat,
    );
    let startOffset;
    let endOffset;

    if (this.isCaret()) {
      if (firstNodeTextLength === 0) {
        firstNode.setFlags(firstNextFlags);
        this.isDirty = true;
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
        invariant(
          currentBlock !== null,
          'formatText: currentBlock not be found',
        );
        currentBlock.normalizeTextNodes(true);
      }
      return;
    }

    if (selectedNodesLength === 1) {
      if (firstNode instanceof TextNode) {
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
      const isBefore = firstNode === this.getAnchorNode();
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
        if (selectedNode instanceof TextNode && !selectedNode.isImmutable()) {
          const selectedNextFlags = selectedNode.getTextNodeFormatFlags(
            formatType,
            firstNextFlags,
            forceFormat,
          );
          selectedNode.setFlags(selectedNextFlags);
        }
      }
      this.setRange(
        firstNode.getKey(),
        startOffset,
        lastNode.getKey(),
        endOffset,
      );
      currentBlock.normalizeTextNodes(true);
    }
  }
  insertParagraph(): void {
    if (!this.isCaret()) {
      this.removeText();
    }
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    const nodesToMove = anchorNode.getNextSiblings().reverse();
    const currentBlock = anchorNode.getParentBlockOrThrow();
    let anchorOffset = this.anchorOffset;

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
    const newBlock = currentBlock.insertNewAfter();
    invariant(newBlock instanceof BlockNode, 'Should never happen');

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
    if (nodeToSelect instanceof TextNode) {
      nodeToSelect.select(anchorOffset, anchorOffset);
    }
    const blockFirstChild = currentBlock.getFirstChild();
    const blockLastChild = currentBlock.getLastChild();
    if (
      blockFirstChild === null ||
      blockLastChild === null ||
      blockLastChild.isImmutable() ||
      blockLastChild.isSegmented() ||
      !(blockLastChild instanceof TextNode)
    ) {
      const textNode = createTextNode('');
      currentBlock.append(textNode);
    }
    currentBlock.normalizeTextNodes();
  }
  deleteLineBackward(): void {
    // When using Safari or Chrome, we will usually always have a range.
    // This is because beforeinput gives us getTargetRanges, which tells
    // us where to start the delete and end the delete. Which means we
    // only need the rest of the logic for browsers that don't support
    // native beforeinput (Firefox and IE).
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    // Handle removing block
    if (
      anchorNode.getPreviousSibling() === null &&
      anchorNode.getTextContent() === ''
    ) {
      this.deleteBackward();
      return;
    }

    const anchorOffset = this.anchorOffset;
    const nodesToSearch = anchorNode.getPreviousSiblings();

    nodesToSearch.push(anchorNode);

    for (let i = nodesToSearch.length - 1; i >= 0; i--) {
      const node = nodesToSearch[i];
      if (node instanceof TextNode) {
        const isAnchor = node === anchorNode;
        const textContent = node.getTextContent();
        const indexOfNewLine = textContent.lastIndexOf('\n');

        if (indexOfNewLine > -1) {
          let delCount;

          if (isAnchor && indexOfNewLine < anchorOffset) {
            delCount = anchorOffset - indexOfNewLine;
          } else {
            delCount = textContent.length - indexOfNewLine;
          }
          node.spliceText(indexOfNewLine, delCount, '', true);
          break;
        } else if (isAnchor) {
          node.spliceText(0, anchorOffset, '', true);
        } else {
          node.remove();
        }
      } else {
        node.remove();
      }
    }
  }
  deleteLineForward(): void {
    // When using Safari or Chrome, we will usually always have a range.
    // This is because beforeinput gives us getTargetRanges, which tells
    // us where to start the delete and end the delete. Which means we
    // only need the rest of the logic for browsers that don't support
    // native beforeinput (Firefox and IE).
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    const anchorNode = this.getAnchorNode();
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
        this.deleteBackward();
      } else {
        this.deleteForward();
      }
      return;
    }

    const anchorOffset = this.anchorOffset;
    const nodesToSearch = anchorNode.getNextSiblings();

    nodesToSearch.push(anchorNode);

    for (let i = 0; i < nodesToSearch.length; i++) {
      const node = nodesToSearch[i];
      if (node instanceof TextNode) {
        const isAnchor = node === anchorNode;
        const textContent = node.getTextContent();
        const indexOfNewLine = textContent.indexOf('\n', anchorOffset);

        if (indexOfNewLine > -1) {
          const delCount = indexOfNewLine - anchorOffset + 1;
          node.spliceText(anchorOffset, delCount, '', true);
          break;
        } else if (isAnchor) {
          node.spliceText(
            anchorOffset,
            textContent.length - anchorOffset,
            '',
            true,
          );
        } else {
          node.remove();
        }
      } else {
        node.remove();
      }
    }
  }
  deleteWordBackward(): void {
    // When using Safari or Chrome, we will usually always have a range.
    // This is because beforeinput gives us getTargetRanges, which tells
    // us where to start the delete and end the delete. Which means we
    // only need the rest of the logic for browsers that don't support
    // native beforeinput (Firefox and IE).
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    // Handle removing block
    if (
      anchorNode.getPreviousSibling() === null &&
      anchorNode.getTextContent() === ''
    ) {
      this.deleteBackward();
      return;
    }

    const currentBlock = anchorNode.getParentBlockOrThrow();
    let node = anchorNode;

    while (true) {
      const prevSibling = node.getPreviousSibling();
      if (node.isImmutable() || node.isSegmented()) {
        node.remove();
        invariant(prevSibling !== null, 'Should never happen');
        prevSibling.select();
        currentBlock.normalizeTextNodes(true);
        return;
      } else if (node instanceof TextNode) {
        const textContent = node.getTextContent();
        const endIndex =
          node === anchorNode ? anchorOffset : textContent.length;
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
          currentBlock.normalizeTextNodes(true);
        }
      }
      if (prevSibling === null) {
        return;
      }
      node = prevSibling;
    }
  }
  deleteWordForward(): void {
    // When using Safari or Chrome, we will usually always have a range.
    // This is because beforeinput gives us getTargetRanges, which tells
    // us where to start the delete and end the delete. Which means we
    // only need the rest of the logic for browsers that don't support
    // native beforeinput (Firefox and IE).
    if (!this.isCaret()) {
      this.removeText();
      this.deleteForward();
      return;
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    // Handle removing block
    if (
      anchorNode.getNextSibling() === null &&
      anchorNode.getTextContent() === ''
    ) {
      this.deleteForward();
      return;
    }

    const currentBlock = anchorNode.getParentBlockOrThrow();
    let node = anchorNode;

    while (true) {
      const nextSibling = node.getNextSibling();

      if (node.isImmutable() || node.isSegmented()) {
        node.remove();
        invariant(nextSibling !== null, 'Should never happen');
        if (nextSibling instanceof TextNode) {
          nextSibling.select(0, 0);
        } else {
          nextSibling.select();
        }
        currentBlock.normalizeTextNodes(true);
        return;
      } else if (
        node instanceof TextNode &&
        anchorNode.getTextContent() !== ''
      ) {
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

        if (nextSibling !== null) {
          currentBlock.normalizeTextNodes(true);
        }
      }
      if (nextSibling === null) {
        return;
      }
      node = nextSibling;
    }
  }
  deleteBackward(): void {
    // When using Safari or Chrome, we will usually always have a range
    // when working with glyps that are multi-character. That's because
    // we leverage beforeinput's getTargetRanges. Meaning we will need
    // to polyfill this for browsers that don't support beforeinput, such
    // as FF.
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    let anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const currentBlock = anchorNode.getParentBlockOrThrow();
    let prevSibling = anchorNode.getPreviousSibling();

    if (anchorNode.isImmutable() || anchorNode.isSegmented()) {
      prevSibling = anchorNode;
      anchorOffset = 0;
    }

    if (anchorOffset === 0) {
      if (prevSibling === null) {
        currentBlock.mergeWithPreviousSibling();
      } else if (prevSibling instanceof TextNode) {
        if (prevSibling.isImmutable()) {
          if (prevSibling === anchorNode) {
            const nextPrevSibling = prevSibling.getPreviousSibling();
            invariant(nextPrevSibling !== null, 'Should never happen');
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
        throw new Error('TODO');
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
  deleteForward(): void {
    // When using Safari or Chrome, we will usually always have a range
    // when working with glyps that are multi-character. That's because
    // we leverage beforeinput's getTargetRanges. Meaning we will need
    // to polyfill this for browsers that don't support beforeinput, such
    // as FF.
    if (!this.isCaret()) {
      this.removeText();
      return;
    }
    let anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
    if (anchorNode === null) {
      return;
    }
    const currentBlock = anchorNode.getParentBlockOrThrow();
    const textContent = anchorNode.getTextContent();
    const textContentLength = textContent.length;
    let nextSibling = anchorNode.getNextSibling();

    if (anchorNode.isImmutable() || anchorNode.isSegmented()) {
      nextSibling = anchorNode;
      anchorOffset = textContentLength;
    }

    if (anchorOffset === textContentLength) {
      if (nextSibling === null) {
        currentBlock.mergeWithNextSibling();
      } else if (nextSibling instanceof TextNode) {
        if (nextSibling.isImmutable()) {
          nextSibling.remove();
        } else if (nextSibling.isSegmented()) {
          removeFirstSegment(nextSibling);
        } else {
          nextSibling.spliceText(0, 1, '', true);
        }
      } else {
        throw new Error('TODO');
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
  removeText(): void {
    this.insertText('');
  }
  insertNodes(nodes: Array<OutlineNode>): void {
    if (!this.isCaret()) {
      this.removeText();
    }
    const anchorOffset = this.anchorOffset;
    const anchorNode = this.getAnchorNode();
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

      if (node instanceof TextNode) {
        target.insertAfter(node);
        target = node;
      } else {
        if (target instanceof TextNode) {
          target = topLevelBlock;
        }
        target.insertAfter(node);
        target = node;
      }
    }
    if (target instanceof BlockNode) {
      const lastChild = target.getLastTextNode();
      invariant(lastChild instanceof TextNode, 'Should never happen');
      lastChild.select();
      if (siblings.length !== 0) {
        let prevSibling = lastChild;
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          prevSibling.insertAfter(sibling);
          prevSibling = sibling;
        }
      }
    } else if (target instanceof TextNode) {
      target.select();
      const parent = target.getParentBlockOrThrow();
      parent.normalizeTextNodes(true);
    }
  }
  insertText(text: string): void {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
    const firstNode = selectedNodes[0];
    invariant(
      firstNode instanceof TextNode,
      'insertText: firstNode not a a text node',
    );
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
        this.isCaret() &&
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
      // An alternate path for where we want to delete
      // a segemented node that is selected as part
      // of a range. We need to do this as a backspace
      // on browsers that support getTargetRanges picks
      // up the range as this.
      if (
        text === '' &&
        selectedNodes.length === 3 &&
        firstNode instanceof TextNode &&
        firstNode.getTextContent() === '' &&
        lastNode instanceof TextNode &&
        lastNode.getTextContent() === ''
      ) {
        const middleNode = selectedNodes[1];
        if (middleNode.isSegmented() && middleNode instanceof TextNode) {
          removeLastSegment(middleNode);
          currentBlock.normalizeTextNodes(true);
          lastNode.select();
          return;
        }
      }
      const isBefore = firstNode === this.getAnchorNode();
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
        } else if (lastNode instanceof TextNode) {
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
  setRange(
    anchorKey: NodeKey,
    anchorOffset: number,
    focusKey: NodeKey,
    focusOffset: number,
  ): void {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
    this.isDirty = true;
  }
  getTextContent(): string {
    const nodes = this.getNodes();
    let textContent = '';
    nodes.forEach((node) => {
      if (node instanceof TextNode) {
        textContent += node.getTextContent();
      }
    });
    return textContent;
  }
  applyDOMRange(domRange: {
    collapsed: boolean,
    startContainer: Node,
    endContainer: Node,
    startOffset: number,
    endOffset: number,
  }): void {
    const anchorKey = getNodeKeyFromDOM(domRange.startContainer);
    const focusKey = getNodeKeyFromDOM(domRange.endContainer);
    if (anchorKey === null || focusKey === null) {
      throw new Error('Should never happen');
    }
    const [anchorNode, focusNode] = resolveSelectionNodes(anchorKey, focusKey);
    invariant(
      anchorNode instanceof TextNode && focusNode instanceof TextNode,
      'Should never happen',
    );
    this.anchorKey = anchorNode.key;
    this.focusKey = focusNode.key;
    this.anchorOffset =
      anchorNode.getTextContent() === '' ? 0 : domRange.startOffset;
    this.focusOffset =
      focusNode.getTextContent() === '' ? 0 : domRange.endOffset;
  }
}

function resolveSelectionNodes(
  anchorKey: NodeKey,
  focusKey: NodeKey,
): [TextNode | null, TextNode | null] {
  const viewModel = getActiveViewModel();
  const nodeMap = viewModel.nodeMap;
  let anchorNode = nodeMap[anchorKey];
  let focusNode = nodeMap[focusKey];
  if (anchorNode === undefined || focusNode === undefined) {
    return [null, null];
  }
  if (anchorNode instanceof BlockNode) {
    anchorNode = anchorNode.getFirstTextNode();
  }
  if (focusNode instanceof BlockNode) {
    focusNode = focusNode.getLastTextNode();
  }
  // $FlowFixMe: not sure why this doesn't work
  return [anchorNode, focusNode];
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.
export function makeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): Selection {
  const viewModel = getActiveViewModel();
  const selection = new Selection(
    anchorKey,
    anchorOffset,
    focusKey,
    focusOffset,
  );
  selection.isDirty = true;
  viewModel.selection = selection;
  return selection;
}

export function createSelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): null | Selection {
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occured. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the view model for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconcialtion unless there are dirty nodes that need
  // reconciling.

  const event = window.event;
  const currentViewModel = editor.getViewModel();
  const lastSelection = currentViewModel.selection;
  const eventType = event && event.type;
  const isComposing = eventType === 'compositionstart';
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection = isSelectionChange || eventType === 'beforeinput';
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (
    event == null ||
    lastSelection === null ||
    useDOMSelection ||
    (isComposing && editor.isKeyDown())
  ) {
    const domSelection: WindowSelection = window.getSelection();
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  } else {
    const selection = new Selection(
      lastSelection.anchorKey,
      lastSelection.anchorOffset,
      lastSelection.focusKey,
      lastSelection.focusOffset,
    );
    if (isComposing) {
      selection.isDirty = true;
    }
    return selection;
  }
  let anchorNode: OutlineNode | null = null;
  let focusNode: OutlineNode | null = null;
  let anchorKey: NodeKey | null = null;
  let focusKey: NodeKey | null = null;

  if (editor === null || anchorDOM === null || focusDOM === null) {
    return null;
  }
  const editorElement = editor.getEditorElement();
  if (
    editorElement === null ||
    !editorElement.contains(anchorDOM) ||
    !editorElement.contains(focusDOM)
  ) {
    return null;
  }
  const root = viewModel.nodeMap.root;
  // If we're given the element nodes, lets try and work out what
  // text nodes we can use instead. Otherwise, return null.
  if (anchorDOM === editorElement) {
    anchorNode = root.getFirstTextNode();
    if (anchorNode === null) {
      return null;
    }
    anchorOffset = 0;
    anchorKey = anchorNode.key;
  }
  if (focusDOM === editorElement) {
    focusNode = root.getFirstTextNode();
    if (focusNode === null) {
      return null;
    }
    focusKey = focusNode.key;
    focusOffset = focusNode.getTextContent().length;
  }
  // We try and find the relevant text nodes from the selection.
  // If we can't do this, we return null.
  anchorKey = anchorKey === null ? getNodeKeyFromDOM(anchorDOM) : anchorKey;
  focusKey = focusKey === null ? getNodeKeyFromDOM(focusDOM) : focusKey;
  if (anchorKey === null || focusKey === null) {
    return null;
  }
  // Let's resolve the nodes, in the case we're selecting block nodes.
  // We always to make sure the anchor and focus nodes are text nodes.
  [anchorNode, focusNode] = resolveSelectionNodes(anchorKey, focusKey);
  if (anchorNode === null || focusNode === null) {
    return null;
  }
  anchorKey = anchorNode.key;
  focusKey = focusNode.key;

  const selection = new Selection(
    anchorKey,
    anchorOffset,
    focusKey,
    focusOffset,
  );

  // Because we use a special character for whitespace,
  // we need to adjust offsets to 0 when the text is
  // really empty.
  if (
    !editor.isComposing() &&
    anchorNode === focusNode &&
    anchorNode.text === ''
  ) {
    anchorOffset = 0;
    focusOffset = 0;
    selection.isDirty = true;
  }

  // If the selection changes, we need to update our view model
  // regardless to keep the view in sync.
  if (
    lastSelection !== null &&
    isSelectionChange &&
    !selection.isEqual(lastSelection)
  ) {
    selection.needsSync = true;
  }
  return selection;
}

export function getSelection(): null | Selection {
  const viewModel = getActiveViewModel();
  return viewModel.selection;
}
