/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, ParsedNode} from './OutlineNode';
import type {Selection} from './OutlineSelection';

import {isTextNode, TextNode} from '.';
import {
  OutlineNode,
  getNodeByKey,
  updateDirectionIfNeeded,
} from './OutlineNode';
import {makeSelection, getSelection, setPointValues} from './OutlineSelection';
import {errorOnReadOnly} from './OutlineView';
import {IS_DIRECTIONLESS, IS_LTR, IS_RTL} from './OutlineConstants';

export type ParsedBlockNode = {
  ...ParsedNode,
  __children: Array<NodeKey>,
};

export class BlockNode extends OutlineNode {
  __children: Array<NodeKey>;

  constructor(key?: NodeKey) {
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
  getChildrenSize(): number {
    const self = this.getLatest();
    return self.__children.length;
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
  getFirstDescendant(): null | OutlineNode {
    let node = this.getFirstChild();
    while (node !== null) {
      if (isBlockNode(node)) {
        const child = node.getFirstChild();
        if (child !== null) {
          node = child;
          continue;
        }
      }
      break;
    }
    return node;
  }
  getLastDescendant(): null | OutlineNode {
    let node = this.getLastChild();
    while (node !== null) {
      if (isBlockNode(node)) {
        const child = node.getLastChild();
        if (child !== null) {
          node = child;
          continue;
        }
      }
      break;
    }
    return node;
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
  getChildAtIndex(index: number): null | OutlineNode {
    const self = this.getLatest();
    const children = self.__children;
    const key = children[index];
    if (key === undefined) {
      return null;
    }
    return getNodeByKey(key);
  }
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    if (
      (!includeInert && this.isInert()) ||
      (includeDirectionless === false && this.isDirectionless())
    ) {
      return '';
    }
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent(includeInert, includeDirectionless);
      if (isBlockNode(child) && i !== childrenLength - 1) {
        textContent += '\n\n';
      }
    }
    return textContent;
  }
  getDirection(): 'ltr' | 'rtl' | null {
    const flags = this.__flags;
    return flags & IS_LTR ? 'ltr' : flags & IS_RTL ? 'rtl' : null;
  }

  // Mutators

  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    errorOnReadOnly();
    const selection = getSelection();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const childrenCount = this.getChildrenSize();
    if (anchorOffset === undefined) {
      anchorOffset = childrenCount;
    }
    if (focusOffset === undefined) {
      focusOffset = childrenCount;
    }
    const key = this.__key;
    if (selection === null) {
      return makeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'block',
        'block',
      );
    } else {
      setPointValues(selection.anchor, key, anchorOffset, 'block');
      setPointValues(selection.focus, key, focusOffset, 'block');
      selection.isDirty = true;
    }
    return selection;
  }
  selectStart(): Selection {
    const firstNode = this.getFirstDescendant();
    if (isBlockNode(firstNode) || isTextNode(firstNode)) {
      return firstNode.select(0, 0);
    }
    // Decorator or LineBreak
    if (firstNode !== null) {
      return firstNode.selectPrevious();
    }
    return this.select(0, 0);
  }
  selectEnd(): Selection {
    const lastNode = this.getLastDescendant();
    if (isBlockNode(lastNode) || isTextNode(lastNode)) {
      return lastNode.select();
    }
    // Decorator or LineBreak
    if (lastNode !== null) {
      return lastNode.selectNext();
    }
    return this.select();
  }
  clear(): BlockNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const children = this.getChildren();
    children.forEach((child) => child.remove());
    return writableSelf;
  }
  // TODO add support for appending multiple nodes?
  append(nodeToAppend: OutlineNode): BlockNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableNodeToAppend = nodeToAppend.getWritable();

    // Remove node from previous parent
    const oldParent = writableNodeToAppend.getParent();
    if (oldParent !== null) {
      const writableParent = oldParent.getWritable();
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToAppend.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    // Set child parent to self
    writableNodeToAppend.__parent = writableSelf.__key;
    const children = writableSelf.__children;
    // Append children.
    const newKey = writableNodeToAppend.__key;
    children.push(newKey);
    const flags = writableNodeToAppend.__flags;
    // Handle direction if node is directionless
    if (flags & IS_DIRECTIONLESS) {
      updateDirectionIfNeeded(writableNodeToAppend);
    }
    return writableSelf;
  }
  insertNewAfter(selection: Selection): null | BlockNode {
    return null;
  }
  canInsertTab(): boolean {
    return false;
  }
  setDirection(direction: 'ltr' | 'rtl' | null): this {
    errorOnReadOnly();
    const self = this.getWritable();
    const flags = self.__flags;
    if (flags & IS_LTR) {
      self.__flags ^= IS_LTR;
    }
    if (flags & IS_RTL) {
      self.__flags ^= IS_RTL;
    }
    if (direction === 'ltr') {
      self.__flags |= IS_LTR;
    } else if (direction === 'rtl') {
      self.__flags |= IS_RTL;
    }
    return self;
  }
  collapseAtStart(): boolean {
    return false;
  }
}

export function isBlockNode(node: ?OutlineNode): boolean %checks {
  return node instanceof BlockNode;
}
