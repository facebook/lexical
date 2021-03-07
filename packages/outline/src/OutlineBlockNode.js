/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from './OutlineNode';

import {isTextNode, TextNode} from '.';
import {
  getWritableNode,
  OutlineNode,
  getNodeByKey,
  wrapInTextNodes,
} from './OutlineNode';
import {getSelection, Selection} from './OutlineSelection';
import {invariant} from './OutlineUtils';
import {getActiveViewModel, shouldErrorOnReadOnly} from './OutlineView';
import {IS_IMMUTABLE, IS_INERT, IS_SEGMENTED} from './OutlineConstants';

function combineAdjacentTextNodes(
  textNodes: Array<TextNode>,
  restoreSelection,
) {
  const selection = getSelection();
  if (selection === null) {
    if (__DEV__) {
      invariant(false, 'combineAdjacentTextNodes: selection not found');
    } else {
      invariant();
    }
  }
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const anchorKey = selection.anchorKey;
  const focusKey = selection.focusKey;
  // Merge all text nodes into the first node
  const writableMergeToNode = getWritableNode(textNodes[0]);
  const key = writableMergeToNode.__key;
  let textLength = writableMergeToNode.getTextContent().length;
  for (let i = 1; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const siblingText = textNode.getTextContent();
    if (restoreSelection && textNode.__key === anchorKey) {
      selection.anchorOffset = textLength + anchorOffset;
      selection.anchorKey = key;
    }
    if (restoreSelection && textNode.__key === focusKey) {
      selection.focusOffset = textLength + focusOffset;
      selection.focusKey = key;
    }
    writableMergeToNode.spliceText(textLength, 0, siblingText);
    textLength += siblingText.length;
    textNode.remove();
  }
  if (restoreSelection) {
    selection.isDirty = true;
  }
}

export class BlockNode extends OutlineNode {
  __children: Array<NodeKey>;

  constructor(key?: string) {
    super(key);
    this.__children = [];
  }
  getChildren(): Array<OutlineNode> {
    const self = this.getLatest();
    const children = self.__children;
    const childrenNodes = [];
    for (let i = 0; i < children.length; i++) {
      const childNode = getNodeByKey<OutlineNode>(children[i]);
      if (childNode !== null) {
        childrenNodes.push(childNode);
      }
    }
    return childrenNodes;
  }
  getAllTextNodes(includeInert?: boolean): Array<TextNode> {
    const textNodes = [];
    const self = this.getLatest();
    const children = self.__children;
    for (let i = 0; i < children.length; i++) {
      const childNode = getNodeByKey<OutlineNode>(children[i]);
      if (isTextNode(childNode) && (includeInert || !childNode.isInert())) {
        textNodes.push(childNode);
      } else if (isBlockNode(childNode)) {
        const subChildrenNodes = childNode.getAllTextNodes(includeInert);
        textNodes.push(...subChildrenNodes);
      }
    }
    return textNodes;
  }
  getFirstTextNode(includeInert?: boolean): null | TextNode {
    const children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isTextNode(child) && (includeInert || !child.isInert())) {
        return child;
      } else if (isBlockNode(child)) {
        return child.getFirstTextNode();
      }
    }
    return null;
  }
  getLastTextNode(includeInert?: boolean): null | TextNode {
    const children = this.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (isTextNode(child) && (includeInert || !child.isInert())) {
        return child;
      } else if (isBlockNode(child)) {
        return child.getLastTextNode();
      }
    }
    return null;
  }
  getFirstChild(): null | OutlineNode {
    const self = this.getLatest();
    const children = self.__children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[0]);
  }
  getLastChild(): null | OutlineNode {
    const self = this.getLatest();
    const children = self.__children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[childrenLength - 1]);
  }
  getTextContent(includeInert?: boolean): string {
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent(includeInert);
      if (isBlockNode(child) && i !== childrenLength - 1) {
        textContent += '\n\n';
      }
    }
    return textContent;
  }
  childrenNeedDirection(): boolean {
    return true;
  }

  // Mutators

  clear(): BlockNode {
    shouldErrorOnReadOnly();
    const writableSelf = getWritableNode(this);
    const children = this.getChildren();
    children.forEach((child) => child.remove());
    return writableSelf;
  }
  // TODO add support for appending multiple nodes?
  append(nodeToAppend: OutlineNode): BlockNode {
    shouldErrorOnReadOnly();
    const writableSelf = getWritableNode(this);
    const writableNodeToAppend = getWritableNode(nodeToAppend);
    const viewModel = getActiveViewModel();

    // Remove node from previous parent
    const oldParent = writableNodeToAppend.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToAppend.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    // Set child parent to self
    writableNodeToAppend.__parent = writableSelf.__key;
    const children = writableSelf.__children;
    // Because we are appending a node, we need to check if the last
    // child is an empty text node so we can make it as dirty.
    const dirtySubTrees = viewModel._dirtySubTrees;
    const childrenLength = children.length;
    if (childrenLength > 0) {
      const lastChildKey = children[childrenLength - 1];
      const lastChild = getNodeByKey(lastChildKey);
      if (isTextNode(lastChild) && lastChild.__text === '') {
        dirtySubTrees.add(lastChildKey);
      }
    }
    // Append children.
    const newKey = writableNodeToAppend.__key;
    children.push(newKey);
    // Handle immutable/segmented
    const flags = nodeToAppend.__flags;
    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || flags & IS_INERT) {
      wrapInTextNodes(nodeToAppend);
    }
    return writableSelf;
  }
  normalizeTextNodes(restoreSelection?: boolean): void {
    shouldErrorOnReadOnly();
    const children = this.getChildren();
    let toNormalize = [];
    let lastTextNodeFlags: number | null = null;
    let lastTextNodeURL = null;
    for (let i = 0; i < children.length; i++) {
      const child: OutlineNode = children[i].getLatest();

      if (isTextNode(child) && !child.isImmutable() && !child.isSegmented()) {
        const url = child.__url;
        const flags = child.__flags;
        if (
          (lastTextNodeFlags === null || flags === lastTextNodeFlags) &&
          (lastTextNodeURL === null || lastTextNodeURL === url)
        ) {
          toNormalize.push(child);
          lastTextNodeFlags = flags;
          lastTextNodeURL = url;
        } else {
          if (toNormalize.length > 1) {
            combineAdjacentTextNodes(toNormalize, restoreSelection);
          }
          toNormalize = [child];
          lastTextNodeFlags = flags;
          lastTextNodeURL = url;
        }
      } else {
        if (toNormalize.length > 1) {
          combineAdjacentTextNodes(toNormalize, restoreSelection);
        }
        toNormalize = [];
        lastTextNodeFlags = null;
        lastTextNodeURL = null;
      }
    }
    if (toNormalize.length > 1) {
      combineAdjacentTextNodes(toNormalize, restoreSelection);
    }
  }
  mergeWithPreviousSibling(): void {
    shouldErrorOnReadOnly();
    let prevBlock = this.getPreviousSibling();
    if (isBlockNode(prevBlock)) {
      let lastChild = prevBlock.getLastChild();
      if (isBlockNode(lastChild)) {
        prevBlock = lastChild;
      }
      const nodesToMove = this.getChildren();
      lastChild = prevBlock.getLastChild();
      if (lastChild === null) {
        if (__DEV__) {
          invariant(false, 'mergeWithPreviousSibling: lastChild not found');
        } else {
          invariant();
        }
      }
      for (let i = 0; i < nodesToMove.length; i++) {
        const nodeToMove = nodesToMove[i];
        lastChild.insertAfter(nodeToMove);
        lastChild = nodeToMove;
      }
      const nodeToSelect = nodesToMove[0];
      if (isTextNode(nodeToSelect)) {
        nodeToSelect.select(0, 0);
      }
      this.remove();
      prevBlock.normalizeTextNodes(true);
    }
  }
  mergeWithNextSibling(): void {
    shouldErrorOnReadOnly();
    const nextBlock = this.getNextSibling();
    if (isBlockNode(nextBlock)) {
      let firstChild = nextBlock.getFirstChild();
      if (isBlockNode(firstChild)) {
        firstChild = firstChild.getFirstChild();
      }
      if (firstChild === null) {
        if (__DEV__) {
          invariant(false, 'mergeWithNextSibling: firstChild not found');
        } else {
          invariant();
        }
      }
      const nodesToMove = [firstChild, ...firstChild.getNextSiblings()];
      let target = this.getLastChild();
      if (target === null) {
        if (__DEV__) {
          invariant(false, 'mergeWithNextSibling: no last child');
        } else {
          invariant();
        }
      }
      for (let i = 0; i < nodesToMove.length; i++) {
        const nodeToMove = nodesToMove[i];
        target.insertAfter(nodeToMove);
        target = nodeToMove;
      }
      if (isBlockNode(firstChild)) {
        firstChild.remove();
        if (nextBlock.getChildren().length === 0) {
          nextBlock.remove();
        }
      } else {
        nextBlock.remove();
      }
      this.normalizeTextNodes(true);
    }
  }
  insertNewAfter(selection: Selection): null | BlockNode {
    return null;
  }
  canInsertTab(): boolean {
    return false;
  }
}

export function isBlockNode(node: ?OutlineNode): boolean %checks {
  return node instanceof BlockNode;
}
