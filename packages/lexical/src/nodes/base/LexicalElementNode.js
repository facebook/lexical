/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from '../../LexicalNode';
import type {Selection} from '../../LexicalSelection';

import {$isTextNode, TextNode} from '../../';
import {LexicalNode} from '../../LexicalNode';
import {$makeSelection, $getSelection} from '../../LexicalSelection';
import {errorOnReadOnly, getActiveEditor} from '../../LexicalUpdates';
import {ELEMENT_TYPE_TO_FORMAT} from '../../LexicalConstants';
import {$getNodeByKey, $internallyMarkNodeAsDirty} from '../../LexicalUtils';
import invariant from 'shared/invariant';

export type ElementFormatType = 'left' | 'center' | 'right' | 'justify';

export class ElementNode extends LexicalNode {
  __children: Array<NodeKey>;
  __format: number;
  __indent: number;
  __dir: 'ltr' | 'rtl' | null;

  constructor(key?: NodeKey): void {
    super(key);
    this.__children = [];
    this.__format = 0;
    this.__indent = 0;
    this.__dir = null;
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }
  getIndent(): number {
    const self = this.getLatest();
    return self.__indent;
  }
  getChildren(): Array<LexicalNode> {
    const self = this.getLatest();
    const children = self.__children;
    const childrenNodes = [];
    for (let i = 0; i < children.length; i++) {
      const childNode = $getNodeByKey<LexicalNode>(children[i]);
      if (childNode !== null) {
        childrenNodes.push(childNode);
      }
    }
    return childrenNodes;
  }
  getChildrenKeys(): Array<NodeKey> {
    return this.getLatest().__children;
  }
  getChildrenSize(): number {
    const self = this.getLatest();
    return self.__children.length;
  }
  isEmpty(): boolean {
    return this.getChildrenSize() === 0;
  }
  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyElements = editor._dirtyElements;
    return dirtyElements !== null && dirtyElements.has(this.__key);
  }
  getAllTextNodes(includeInert?: boolean): Array<TextNode> {
    const textNodes = [];
    const self = this.getLatest();
    const children = self.__children;
    for (let i = 0; i < children.length; i++) {
      const childNode = $getNodeByKey<LexicalNode>(children[i]);
      if ($isTextNode(childNode) && (includeInert || !childNode.isInert())) {
        textNodes.push(childNode);
      } else if ($isElementNode(childNode)) {
        const subChildrenNodes = childNode.getAllTextNodes(includeInert);
        textNodes.push(...subChildrenNodes);
      }
    }
    return textNodes;
  }
  getFirstDescendant(): null | LexicalNode {
    let node = this.getFirstChild();
    while (node !== null) {
      if ($isElementNode(node)) {
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
  getLastDescendant(): null | LexicalNode {
    let node = this.getLastChild();
    while (node !== null) {
      if ($isElementNode(node)) {
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
  getDescendantByIndex(index: number): LexicalNode {
    const children = this.getChildren();
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return this;
    }
    // For non-empty element nodes, we resolve its descendant
    // (either a leaf node or the bottom-most element)
    if (index >= childrenLength) {
      const resolvedNode = children[childrenLength - 1];
      return (
        ($isElementNode(resolvedNode) && resolvedNode.getLastDescendant()) ||
        resolvedNode
      );
    }
    const resolvedNode = children[index];
    return (
      ($isElementNode(resolvedNode) && resolvedNode.getFirstDescendant()) ||
      resolvedNode
    );
  }
  getFirstChild<T: LexicalNode>(): null | T {
    const self = this.getLatest();
    const children = self.__children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return $getNodeByKey<T>(children[0]);
  }
  getFirstChildOrThrow<T: LexicalNode>(): T {
    const firstChild = this.getFirstChild<T>();
    if (firstChild === null) {
      invariant(false, 'Expected node %s to have a first child.', this.__key);
    }
    return firstChild;
  }
  getLastChild(): null | LexicalNode {
    const self = this.getLatest();
    const children = self.__children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return $getNodeByKey<LexicalNode>(children[childrenLength - 1]);
  }
  getChildAtIndex(index: number): null | LexicalNode {
    const self = this.getLatest();
    const children = self.__children;
    const key = children[index];
    if (key === undefined) {
      return null;
    }
    return $getNodeByKey(key);
  }
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent(includeInert, includeDirectionless);
      if ($isElementNode(child) && i !== childrenLength - 1) {
        textContent += '\n\n';
      }
    }
    return textContent;
  }
  getDirection(): 'ltr' | 'rtl' | null {
    return this.__dir;
  }
  hasFormat(type: ElementFormatType): boolean {
    const formatFlag = ELEMENT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  // Mutators

  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    errorOnReadOnly();
    const selection = $getSelection();
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
      return $makeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'element',
        'element',
      );
    } else {
      selection.anchor.set(key, anchorOffset, 'element');
      selection.focus.set(key, focusOffset, 'element');
      selection.dirty = true;
    }
    return selection;
  }
  selectStart(): Selection {
    const firstNode = this.getFirstDescendant();
    if ($isElementNode(firstNode) || $isTextNode(firstNode)) {
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
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      return lastNode.select();
    }
    // Decorator or LineBreak
    if (lastNode !== null) {
      return lastNode.selectNext();
    }
    return this.select();
  }
  clear(): ElementNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const children = this.getChildren();
    children.forEach((child) => child.remove());
    return writableSelf;
  }
  append(...nodesToAppend: LexicalNode[]): ElementNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableSelfKey = writableSelf.__key;
    const writableSelfChildren = writableSelf.__children;
    const nodesToAppendLength = nodesToAppend.length;
    const lastChild = this.getLastChild();
    if (lastChild !== null) {
      $internallyMarkNodeAsDirty(lastChild);
    }
    for (let i = 0; i < nodesToAppendLength; i++) {
      const nodeToAppend = nodesToAppend[i];
      if (nodeToAppend.__key === writableSelfKey) {
        invariant(false, 'append: attemtping to append self');
      }
      const writableNodeToAppend = nodeToAppend.getWritable();

      // Remove node from previous parent
      const oldParent = writableNodeToAppend.getParent();
      if (oldParent !== null) {
        const writableParent = oldParent.getWritable();
        const children = writableParent.__children;
        const index = children.indexOf(writableNodeToAppend.__key);
        if (index === -1) {
          invariant(false, 'Node is not a child of its parent');
        }
        children.splice(index, 1);
      }
      // Set child parent to self
      writableNodeToAppend.__parent = writableSelfKey;
      // Append children.
      const newKey = writableNodeToAppend.__key;
      writableSelfChildren.push(newKey);
    }
    return writableSelf;
  }

  setDirection(direction: 'ltr' | 'rtl' | null): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__dir = direction;
    return self;
  }
  setFormat(type: ElementFormatType): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__format = ELEMENT_TYPE_TO_FORMAT[type];
    return this;
  }
  setIndent(indentLevel: number): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__indent = indentLevel;
    return this;
  }

  // These are intended to be extends for specific element heuristics.
  insertNewAfter(selection: Selection): null | LexicalNode {
    return null;
  }
  canInsertTab(): boolean {
    return false;
  }
  collapseAtStart(selection: Selection): boolean {
    return false;
  }
  excludeFromCopy(): boolean {
    return false;
  }
  canExtractContents(): boolean {
    return true;
  }
  canReplaceWith(replacement: LexicalNode): boolean {
    return true;
  }
  canInsertAfter(node: LexicalNode): boolean {
    return true;
  }
  canBeEmpty(): boolean {
    return true;
  }
  canInsertTextBefore(): boolean {
    return true;
  }
  canInsertTextAfter(): boolean {
    return true;
  }
  isInline(): boolean {
    return false;
  }
  canSelectionRemove(): boolean {
    return true;
  }
  canMergeWith(node: ElementNode): boolean {
    return false;
  }
}

export function $isElementNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ElementNode;
}
