/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig} from './OutlineEditor';
import type {Selection, PointType} from './OutlineSelection';

import {isBlockNode, isTextNode, isRootNode, BlockNode} from '.';
import {
  getActiveEditorState,
  errorOnReadOnly,
  getActiveEditor,
} from './OutlineUpdates';
import {
  generateKey,
  getCompositionKey,
  getNodeByKey,
  getTextDirection,
  internallyMarkNodeAsDirty,
  markParentsAsDirty,
  setCompositionKey,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {
  IS_DIRECTIONLESS,
  IS_IMMUTABLE,
  IS_INERT,
  IS_SEGMENTED,
} from './OutlineConstants';
import {
  getSelection,
  moveSelectionPointToEnd,
  updateBlockSelectionOnCreateDeleteNode,
} from './OutlineSelection';

export type NodeMap = Map<NodeKey, OutlineNode>;

export function removeNode(
  nodeToRemove: OutlineNode,
  restoreSelection: boolean,
): void {
  errorOnReadOnly();
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const selection = getSelection();
  let selectionMoved = false;
  if (selection !== null && restoreSelection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor !== null && anchor.key === key) {
      moveSelectionPointToSibling(anchor, nodeToRemove, parent);
      selectionMoved = true;
    }
    if (focus !== null && focus.key === key) {
      moveSelectionPointToSibling(focus, nodeToRemove, parent);
      selectionMoved = true;
    }
  }

  const writableParent = parent.getWritable();
  const parentChildren = writableParent.__children;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  const writableNodeToRemove = nodeToRemove.getWritable();
  writableNodeToRemove.__parent = null;

  if (selection !== null && restoreSelection && !selectionMoved) {
    updateBlockSelectionOnCreateDeleteNode(selection, parent, index, -1);
  }
}

function moveSelectionPointToSibling(
  point: PointType,
  node: OutlineNode,
  parent: BlockNode,
): void {
  let siblingKey = null;
  let offset = 0;
  const prevSibling = node.getPreviousSibling();
  if (isTextNode(prevSibling)) {
    siblingKey = prevSibling.__key;
    offset = prevSibling.getTextContentSize();
  } else {
    const nextSibling = node.getNextSibling();
    if (isTextNode(nextSibling)) {
      siblingKey = nextSibling.__key;
    }
  }
  if (siblingKey !== null) {
    point.set(siblingKey, offset, 'text');
  } else {
    offset = node.getIndexWithinParent();
    point.set(parent.__key, offset, 'block');
  }
}

export function updateDirectionIfNeeded(node: OutlineNode): void {
  const topBlock = node.getTopParentBlockOrThrow();
  const prevDirection = topBlock.getDirection();
  if (prevDirection !== null) {
    const textContent = topBlock.getTextContent(false, false);
    const direction = getTextDirection(textContent);
    if (direction === null) {
      topBlock.setDirection(null);
    }
  }
}

export type NodeKey = string;

export class OutlineNode {
  __type: string;
  __flags: number;
  __key: NodeKey;
  __parent: null | NodeKey;

  static clone(data: $FlowFixMe): OutlineNode {
    // Flow doesn't support abstract classes unfortunately, so we can't _force_
    // subclasses of Node to implement clone. All subclasses of Node should have
    // a static clone method though. We define clone here so we can call it on any
    // Node, and we throw this error by default since the subclass should provide
    // their own implementation.
    invariant(
      false,
      'OutlineNode: Node type %s does not implement .clone().',
      this.constructor.name,
    );
  }

  constructor(key?: NodeKey) {
    this.__type = 'node';
    this.__flags = 0;
    this.__key = key || generateKey(this);
    this.__parent = null;

    // Ensure custom nodes implement required methods.
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      if (!proto.constructor.hasOwnProperty('clone')) {
        console.warn(
          `${this.constructor.name} must implement static "clone" method`,
        );
      }
    }
  }
  // Getters and Traversers

  getType(): string {
    return this.__type;
  }
  isAttached(): boolean {
    const parentKey = this.__parent;
    if (parentKey === null || getNodeByKey(this.__key) === null) {
      return false;
    }
    const parent = getNodeByKey<BlockNode>(parentKey);
    return parent !== null && parent.isAttached();
  }
  isSelected(): boolean {
    const editorState = getActiveEditorState();
    const selection = editorState._selection;
    const key = this.__key;
    return (
      selection !== null &&
      selection.anchor.key === key &&
      selection.focus.key === key
    );
  }
  getFlags(): number {
    const self = this.getLatest();
    return self.__flags;
  }
  getKey(): NodeKey {
    // Key is stable between copies
    return this.__key;
  }
  getIndexWithinParent(): number {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    const children = parent.__children;
    return children.indexOf(this.__key);
  }
  getParent(): BlockNode | null {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    return getNodeByKey<BlockNode>(parent);
  }
  getParentOrThrow(): BlockNode {
    const parent = this.getParent();
    if (parent === null) {
      invariant(false, 'Expected node %s to have a parent.', this.__key);
    }
    return parent;
  }
  getParentBlockOrThrow(): BlockNode {
    let node = this;
    while (node !== null) {
      node = node.getParent();
      if (isBlockNode(node)) {
        return node;
      }
    }
    invariant(false, 'Expected node %s to have a parent block.', this.__key);
  }
  getTopParentBlock(): null | BlockNode {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (isRootNode(parent) && isBlockNode(node)) {
        return node;
      }
      node = parent;
    }
    return null;
  }
  getTopParentBlockOrThrow(): BlockNode {
    const parent = this.getTopParentBlock();
    if (parent === null) {
      invariant(
        false,
        'Expected node %s to have a top parent block.',
        this.__key,
      );
    }
    return parent;
  }
  getParents(): Array<BlockNode> {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }
  getParentKeys(): Array<NodeKey> {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node.__key);
      node = node.getParent();
    }
    return parents;
  }
  getPreviousSibling(): OutlineNode | null {
    const parent = this.getParent();
    if (parent === null) {
      return null;
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    if (index <= 0) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[index - 1]);
  }
  getPreviousSiblings(): Array<OutlineNode> {
    const parent = this.getParent();
    if (parent === null) {
      return [];
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(0, index)
      .map((childKey) => getNodeByKeyOrThrow<OutlineNode>(childKey));
  }
  getNextSibling(): OutlineNode | null {
    const parent = this.getParent();
    if (parent === null) {
      return null;
    }
    const children = parent.__children;
    const childrenLength = children.length;
    const index = children.indexOf(this.__key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[index + 1]);
  }
  getNextSiblings(): Array<OutlineNode> {
    const parent = this.getParent();
    if (parent === null) {
      return [];
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(index + 1)
      .map((childKey) => getNodeByKeyOrThrow<OutlineNode>(childKey));
  }
  getCommonAncestor(node: OutlineNode): BlockNode | null {
    const a = this.getParents();
    const b = node.getParents();
    if (isBlockNode(this)) {
      a.unshift(this);
    }
    if (isBlockNode(node)) {
      b.unshift(node);
    }
    const aLength = a.length;
    const bLength = b.length;
    if (aLength === 0 || bLength === 0 || a[aLength - 1] !== b[bLength - 1]) {
      return null;
    }
    const bSet = new Set(b);
    for (let i = 0; i < aLength; i++) {
      const ancestor = a[i];
      if (bSet.has(ancestor)) {
        return ancestor;
      }
    }
    return null;
  }
  is(object: ?OutlineNode): boolean {
    if (object == null) {
      return false;
    }
    return this.getKey() === object.getKey();
  }
  isBefore(targetNode: OutlineNode): boolean {
    if (targetNode.isParentOf(this)) {
      return true;
    }
    if (this.isParentOf(targetNode)) {
      return false;
    }
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node = this;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexA = parent.__children.indexOf(node.__key);
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexB = parent.__children.indexOf(node.__key);
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  }
  isParentOf(targetNode: OutlineNode): boolean {
    const key = this.__key;
    if (key === targetNode.__key) {
      return false;
    }
    let node = targetNode;
    while (node !== null) {
      if (node.__key === key) {
        return true;
      }
      node = node.getParent();
    }
    return false;
  }
  getNodesBetween(targetNode: OutlineNode): Array<OutlineNode> {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];
    const visited = new Set();
    let node = this;
    let dfsAncestor = null;
    while (true) {
      const key = node.__key;
      if (!visited.has(key)) {
        visited.add(key);
        nodes.push(node);
      }
      if (node === targetNode) {
        break;
      }
      const child = isBlockNode(node)
        ? isBefore
          ? node.getFirstChild()
          : node.getLastChild()
        : null;
      if (child !== null) {
        if (dfsAncestor === null) {
          dfsAncestor = node;
        }
        node = child;
        continue;
      }
      const nextSibling = isBefore
        ? node.getNextSibling()
        : node.getPreviousSibling();
      if (nextSibling !== null) {
        node = nextSibling;
        continue;
      }
      const parent = node.getParentOrThrow();
      if (!visited.has(parent.__key)) {
        nodes.push(parent);
      }
      if (parent === targetNode) {
        break;
      }
      let parentSibling = null;
      let ancestor = parent;
      if (parent.is(dfsAncestor)) {
        dfsAncestor = null;
      }
      do {
        if (ancestor === null) {
          invariant(false, 'getNodesBetween: ancestor is null');
        }
        parentSibling = isBefore
          ? ancestor.getNextSibling()
          : ancestor.getPreviousSibling();
        ancestor = ancestor.getParent();
        if (ancestor !== null) {
          if (ancestor.is(dfsAncestor)) {
            dfsAncestor = null;
          }
          if (parentSibling === null && !visited.has(ancestor.__key)) {
            nodes.push(ancestor);
          }
        }
      } while (parentSibling === null);
      node = parentSibling;
    }
    if (!isBefore) {
      nodes.reverse();
    }
    return nodes;
  }
  isImmutable(): boolean {
    return (this.getLatest().__flags & IS_IMMUTABLE) !== 0;
  }
  isSegmented(): boolean {
    return (this.getLatest().__flags & IS_SEGMENTED) !== 0;
  }
  isInert(): boolean {
    return (this.getLatest().__flags & IS_INERT) !== 0;
  }
  isDirectionless(): boolean {
    return (this.getLatest().__flags & IS_DIRECTIONLESS) !== 0;
  }
  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyNodes = editor._dirtyNodes;
    return dirtyNodes !== null && dirtyNodes.has(this.__key);
  }
  isComposing(): boolean {
    return this.__key === getCompositionKey();
  }
  getLatest<N: OutlineNode>(): N {
    const latest = getNodeByKey<N>(this.__key);
    if (latest === null) {
      invariant(false, 'getLatest: node not found');
    }
    return latest;
  }
  getWritable<N>(): N {
    errorOnReadOnly();
    const editorState = getActiveEditorState();
    const editor = getActiveEditor();
    const nodeMap = editorState._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const parent = latestNode.__parent;
    if (parent !== null) {
      const dirtySubTrees = editor._dirtySubTrees;
      markParentsAsDirty(parent, nodeMap, dirtySubTrees);
    }
    const dirtyNodes = editor._dirtyNodes;
    if (dirtyNodes.has(key)) {
      return latestNode;
    }
    const constructor = latestNode.constructor;
    const mutableNode = constructor.clone(latestNode);
    mutableNode.__parent = parent;
    mutableNode.__flags = latestNode.__flags;
    if (isBlockNode(mutableNode)) {
      mutableNode.__children = Array.from(latestNode.__children);
    } else if (isTextNode(mutableNode)) {
      mutableNode.__format = latestNode.__format;
      mutableNode.__style = latestNode.__style;
    }
    mutableNode.__key = key;
    internallyMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);
    return mutableNode;
  }
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    return '';
  }
  getTextContentSize(
    includeInert?: boolean,
    includeDirectionless?: false,
  ): number {
    return this.getTextContent(includeInert, includeDirectionless).length;
  }

  // View

  // $FlowFixMe: Revise typings for EditorContext
  createDOM<EditorContext: Object>(
    config: EditorConfig<EditorContext>,
  ): HTMLElement {
    invariant(false, 'createDOM: base method not extended');
  }
  // $FlowFixMe: Revise typings for EditorContext
  updateDOM<EditorContext: Object>(
    // $FlowFixMe: TODO
    prevNode: any,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    invariant(false, 'updateDOM: base method not extended');
  }

  // Setters and mutators

  setFlags(flags: number): this {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(false, 'setFlags: can only be used on non-immutable nodes');
    }
    const self = this.getWritable();
    this.getWritable().__flags = flags;
    return self;
  }
  makeImmutable(): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__flags |= IS_IMMUTABLE;
    return self;
  }
  makeSegmented(): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__flags |= IS_SEGMENTED;
    return self;
  }
  makeInert(): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__flags |= IS_INERT;
    return self;
  }
  makeDirectionless(): this {
    errorOnReadOnly();
    const self = this.getWritable();
    self.__flags |= IS_DIRECTIONLESS;
    return self;
  }
  remove(): void {
    errorOnReadOnly();
    removeNode(this, true);
  }
  replace<N: OutlineNode>(replaceWith: N): N {
    errorOnReadOnly();
    const toReplaceKey = this.__key;
    const writableReplaceWith = replaceWith.getWritable<N>();
    const oldParent = writableReplaceWith.getParent();
    if (oldParent !== null) {
      const writableParent = oldParent.getWritable();
      const children = writableParent.__children;
      const index = children.indexOf(writableReplaceWith.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const newParent = this.getParentOrThrow();
    const writableParent = newParent.getWritable();
    const children = writableParent.__children;
    const index = children.indexOf(this.__key);
    const newKey = writableReplaceWith.__key;
    if (index > -1) {
      children.splice(index, 0, newKey);
    }
    writableReplaceWith.__parent = newParent.__key;
    removeNode(this, false);
    const flags = writableReplaceWith.__flags;
    // Handle direction if node is directionless
    if (flags & IS_DIRECTIONLESS) {
      updateDirectionIfNeeded(writableReplaceWith);
    }
    const selection = getSelection();
    const anchor = selection && selection.anchor;
    const focus = selection && selection.focus;
    if (anchor !== null && anchor.key === toReplaceKey) {
      moveSelectionPointToEnd(anchor, writableReplaceWith);
    }
    if (focus !== null && focus.key === toReplaceKey) {
      moveSelectionPointToEnd(focus, writableReplaceWith);
    }
    if (getCompositionKey() === toReplaceKey) {
      setCompositionKey(newKey);
    }
    // Handle direction if node is directionless
    if (flags & IS_DIRECTIONLESS) {
      updateDirectionIfNeeded(writableReplaceWith);
    }
    return writableReplaceWith;
  }
  insertAfter(nodeToInsert: OutlineNode): OutlineNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = oldParent.getWritable();
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToInsert.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index + 1, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    const flags = writableNodeToInsert.__flags;
    // Handle direction if node is directionless
    if (flags & IS_DIRECTIONLESS) {
      updateDirectionIfNeeded(writableNodeToInsert);
    }
    const selection = getSelection();
    if (selection !== null) {
      updateBlockSelectionOnCreateDeleteNode(
        selection,
        writableParent,
        index + 1,
      );
    }
    return nodeToInsert;
  }
  insertBefore(nodeToInsert: OutlineNode): OutlineNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = oldParent.getWritable();
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToInsert.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    const flags = writableNodeToInsert.__flags;
    // Handle direction if node is directionless
    if (flags & IS_DIRECTIONLESS) {
      updateDirectionIfNeeded(writableNodeToInsert);
    }
    const selection = getSelection();
    if (selection !== null) {
      updateBlockSelectionOnCreateDeleteNode(selection, writableParent, index);
    }
    return nodeToInsert;
  }
  selectPrevious(anchorOffset?: number, focusOffset?: number): Selection {
    errorOnReadOnly();
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentBlockOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if (!isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return prevSibling.select(anchorOffset, focusOffset);
  }
  selectNext(anchorOffset?: number, focusOffset?: number): Selection {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    const parent = this.getParentBlockOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if (!isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent();
      return parent.select(index, index);
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }
}

function getNodeByKeyOrThrow<N: OutlineNode>(key: NodeKey): N {
  const node = getNodeByKey<N>(key);
  if (node === null) {
    invariant(
      false,
      "Expected node with key %s to exist but it's not in the nodeMap.",
      key,
    );
  }
  return node;
}
