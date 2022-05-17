/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {NodeKey} from '../LexicalNode';
import type {
  GridSelection,
  NodeSelection,
  PointType,
  RangeSelection,
} from '../LexicalSelection';

import invariant from 'shared/invariant';

import {$isRootNode, $isTextNode, TextNode} from '../';
import {DOUBLE_LINE_BREAK, ELEMENT_TYPE_TO_FORMAT} from '../LexicalConstants';
import {LexicalNode} from '../LexicalNode';
import {
  $getSelection,
  $isRangeSelection,
  internalMakeRangeSelection,
  moveSelectionPointToSibling,
} from '../LexicalSelection';
import {errorOnReadOnly, getActiveEditor} from '../LexicalUpdates';
import {
  $getNodeByKey,
  internalMarkNodeAsDirty,
  removeFromParent,
} from '../LexicalUtils';

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
  getChildren<T: Array<LexicalNode>>(): T {
    const self = this.getLatest();
    const children = self.__children;
    const childrenNodes = [];
    for (let i = 0; i < children.length; i++) {
      const childNode = $getNodeByKey<LexicalNode>(children[i]);
      if (childNode !== null) {
        childrenNodes.push(childNode);
      }
    }
    // $FlowFixMe
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
  isLastChild(): boolean {
    const self = this.getLatest();
    const parent = self.getParentOrThrow();
    return parent.getLastChild() === self;
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
  getFirstDescendant<T: LexicalNode>(): null | T {
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
  getLastDescendant<T: LexicalNode>(): null | T {
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
  getDescendantByIndex<T: LexicalNode>(index: number): null | T {
    const children = this.getChildren();
    const childrenLength = children.length;
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
  getLastChild<T: LexicalNode>(): null | T {
    const self = this.getLatest();
    const children = self.__children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return $getNodeByKey<T>(children[childrenLength - 1]);
  }
  getChildAtIndex<T: LexicalNode>(index: number): null | T {
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
      if (
        $isElementNode(child) &&
        i !== childrenLength - 1 &&
        !child.isInline()
      ) {
        textContent += DOUBLE_LINE_BREAK;
      }
    }
    return textContent;
  }
  getDirection(): 'ltr' | 'rtl' | null {
    const self = this.getLatest();
    return self.__dir;
  }
  hasFormat(type: ElementFormatType): boolean {
    const formatFlag = ELEMENT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  // Mutators

  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
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
    if (!$isRangeSelection(selection)) {
      return internalMakeRangeSelection(
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
  selectStart(): RangeSelection {
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
  selectEnd(): RangeSelection {
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
    return this.splice(this.getChildrenSize(), 0, nodesToAppend);
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
  splice(
    start: number,
    deleteCount: number,
    nodesToInsert: Array<LexicalNode>,
  ): ElementNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableSelfKey = writableSelf.__key;
    const writableSelfChildren = writableSelf.__children;
    const nodesToInsertLength = nodesToInsert.length;
    const nodesToInsertKeys = [];

    // Remove nodes to insert from their previous parent
    for (let i = 0; i < nodesToInsertLength; i++) {
      const nodeToInsert = nodesToInsert[i];
      const writableNodeToInsert = nodeToInsert.getWritable();
      if (nodeToInsert.__key === writableSelfKey) {
        invariant(false, 'append: attemtping to append self');
      }
      removeFromParent(writableNodeToInsert);
      // Set child parent to self
      writableNodeToInsert.__parent = writableSelfKey;
      const newKey = writableNodeToInsert.__key;
      nodesToInsertKeys.push(newKey);
    }

    // Mark range edges siblings as dirty
    const nodeBeforeRange = this.getChildAtIndex(start - 1);
    if (nodeBeforeRange) {
      internalMarkNodeAsDirty(nodeBeforeRange);
    }
    const nodeAfterRange = this.getChildAtIndex(start + deleteCount);
    if (nodeAfterRange) {
      internalMarkNodeAsDirty(nodeAfterRange);
    }

    // Remove defined range of children
    let nodesToRemoveKeys;

    // Using faster push when only appending nodes
    if (start === writableSelfChildren.length) {
      writableSelfChildren.push(...nodesToInsertKeys);
      nodesToRemoveKeys = [];
    } else {
      nodesToRemoveKeys = writableSelfChildren.splice(
        start,
        deleteCount,
        ...nodesToInsertKeys,
      );
    }

    // In case of deletion we need to adjust selection, unlink removed nodes
    // and clean up node itself if it becomes empty. None of these needed
    // for insertion-only cases
    if (nodesToRemoveKeys.length) {
      // Adjusting selection, in case node that was anchor/focus will be deleted
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodesToRemoveKeySet = new Set(nodesToRemoveKeys);
        const nodesToInsertKeySet = new Set(nodesToInsertKeys);
        const isPointRemoved = (point: PointType): boolean => {
          let node = point.getNode();
          while (node) {
            const nodeKey = node.__key;
            if (
              nodesToRemoveKeySet.has(nodeKey) &&
              !nodesToInsertKeySet.has(nodeKey)
            ) {
              return true;
            }
            node = node.getParent();
          }
          return false;
        };

        const {anchor, focus} = selection;
        if (isPointRemoved(anchor)) {
          moveSelectionPointToSibling(
            anchor,
            anchor.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          );
        }
        if (isPointRemoved(focus)) {
          moveSelectionPointToSibling(
            focus,
            focus.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          );
        }

        // Unlink removed nodes from current parent
        const nodesToRemoveKeysLength = nodesToRemoveKeys.length;
        for (let i = 0; i < nodesToRemoveKeysLength; i++) {
          const nodeToRemove = $getNodeByKey<LexicalNode>(nodesToRemoveKeys[i]);
          if (nodeToRemove != null) {
            const writableNodeToRemove = nodeToRemove.getWritable();
            writableNodeToRemove.__parent = null;
          }
        }

        // Cleanup if node can't be empty
        if (
          writableSelfChildren.length === 0 &&
          !this.canBeEmpty() &&
          !$isRootNode(this)
        ) {
          this.remove();
        }
      }
    }

    return writableSelf;
  }
  // These are intended to be extends for specific element heuristics.
  insertNewAfter(selection: RangeSelection): null | LexicalNode {
    return null;
  }
  canInsertTab(): boolean {
    return false;
  }
  canIndent(): boolean {
    return true;
  }
  collapseAtStart(selection: RangeSelection): boolean {
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
  canMergeWith(node: ElementNode): boolean {
    return false;
  }
  extractWithChild(
    child: LexicalNode,
    selection: RangeSelection | NodeSelection | GridSelection,
    destination: 'clone' | 'html',
  ): boolean {
    return false;
  }
}

export function $isElementNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ElementNode;
}
