/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorThemeClasses} from './OutlineEditor';
import type {Selection} from './OutlineSelection';
import type {Node as ReactNode} from 'react';

import {
  createTextNode,
  isBlockNode,
  isTextNode,
  isRootNode,
  RootNode,
  BlockNode,
} from '.';
import {getActiveViewModel, errorOnReadOnly} from './OutlineView';
import {generateRandomKey, invariant} from './OutlineUtils';
import {
  IS_IMMUTABLE,
  IS_INERT,
  IS_OVERFLOWED,
  IS_SEGMENTED,
} from './OutlineConstants';

type NodeParserState = {
  originalSelection: null | ParsedSelection,
  remappedSelection?: ParsedSelection,
};
export type ParsedNode = {
  __key: string,
  __type: string,
  __flags: number,
  __children: Array<NodeKey>,
  ...
};
export type ParsedNodeMap = {
  root: ParsedNode,
  [key: NodeKey]: ParsedNode,
};
type ParsedSelection = {
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
};
export type NodeMapType = {root: RootNode, [key: NodeKey]: OutlineNode};

function generateKey(node: OutlineNode): NodeKey {
  errorOnReadOnly();
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  const key = generateRandomKey();
  viewModel._nodeMap[key] = node;
  dirtyNodes.add(key);
  return key;
}

function makeNodeAsDirty(node: OutlineNode): void {
  const latest = node.getLatest();
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  dirtyNodes.add(latest.__key);
}

function removeNode(nodeToRemove: OutlineNode): void {
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const writableParent = getWritableNode(parent);
  const parentChildren = writableParent.__children;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  const writableNodeToRemove = getWritableNode(nodeToRemove);
  writableNodeToRemove.__parent = null;
  makeNodeAsDirty(writableNodeToRemove);
}

function replaceNode<N: OutlineNode>(
  toReplace: OutlineNode,
  replaceWith: N,
): N {
  const writableReplaceWith = getWritableNode(replaceWith);
  const oldParent = writableReplaceWith.getParent();
  if (oldParent !== null) {
    const writableParent = getWritableNode(oldParent);
    const children = writableParent.__children;
    const index = children.indexOf(writableReplaceWith.__key);
    if (index > -1) {
      children.splice(index, 1);
    }
  }
  const newParent = toReplace.getParentOrThrow();
  const writableParent = getWritableNode(newParent);
  const children = writableParent.__children;
  const index = children.indexOf(toReplace.__key);
  const newKey = writableReplaceWith.__key;
  if (index > -1) {
    children.splice(index, 0, newKey);
  }
  writableReplaceWith.__parent = newParent.__key;
  toReplace.remove();
  // Handle immutable/segmented
  const flags = writableReplaceWith.__flags;
  if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || flags & IS_INERT) {
    wrapInTextNodes(writableReplaceWith);
  }
  return writableReplaceWith;
}

export function wrapInTextNodes<N: OutlineNode>(node: N): N {
  const prevSibling = node.getPreviousSibling();
  if (
    prevSibling === null ||
    !isTextNode(prevSibling) ||
    prevSibling.isImmutable() ||
    prevSibling.isSegmented()
  ) {
    const text = createTextNode('');
    node.insertBefore(text);
  }
  const nextSibling = node.getNextSibling();
  if (
    nextSibling === null ||
    !isTextNode(nextSibling) ||
    nextSibling.isImmutable() ||
    nextSibling.isSegmented()
  ) {
    const text = createTextNode('');
    node.insertAfter(text);
  }
  node.getParentOrThrow().normalizeTextNodes(true);
  return node;
}

export type NodeKey = string;

export class OutlineNode {
  __type: string;
  __flags: number;
  __key: NodeKey;
  __parent: null | NodeKey;

  clone(): OutlineNode {
    // Flow doesn't support abstract classes unfortunately, so we can't _force_
    // subclasses of Node to implement clone. All subclasses of Node should have
    // a clone method though. We define clone here so we can call it on any Node,
    // and we throw this error by default since the subclass should provide
    // their own implementation.
    if (__DEV__) {
      invariant(
        false,
        `Node type ${this.constructor.name} does not implement .clone().`,
      );
    } else {
      invariant();
    }
  }

  constructor(key?: string) {
    this.__type = 'node';
    this.__flags = 0;
    this.__key = key || generateKey(this);
    this.__parent = null;
  }

  // Getters and Traversers

  getType(): string {
    return this.__type;
  }
  isAttached(): boolean {
    const parentKey = this.__parent;
    if (parentKey === null) {
      return false;
    }
    const parent = getNodeByKey<BlockNode>(parentKey);
    return parent !== null && parent.isAttached();
  }
  isSelected(): boolean {
    const viewModel = getActiveViewModel();
    const selection = viewModel._selection;
    const key = this.__key;
    return (
      selection !== null &&
      selection.anchorKey === key &&
      selection.focusKey === key
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
  getParent(): BlockNode | null {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    return getNodeByKey<BlockNode>(parent);
  }
  getParentOrThrow(): BlockNode {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      if (__DEV__) {
        invariant(false, `Expected node ${this.__key} to have a parent.`);
      } else {
        invariant();
      }
    }
    return getNodeByKeyOrThrow<BlockNode>(parent);
  }
  getParentBlockOrThrow(): BlockNode {
    let node = this;
    while (node !== null) {
      if (isBlockNode(node)) {
        return node;
      }
      node = node.getParent();
    }
    if (__DEV__) {
      invariant(false, `Expected node ${this.__key} to have a parent.`);
    } else {
      invariant();
    }
  }
  getTopParentBlockOrThrow(): BlockNode {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (isRootNode(parent) && isBlockNode(node)) {
        return node;
      }
      node = parent;
    }
    if (__DEV__) {
      invariant(false, `Expected node ${this.__key} to have a top parent.`);
    } else {
      invariant();
    }
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
  getPreviousSibling(): OutlineNode | null {
    const parent = this.getParentOrThrow();
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    if (index <= 0) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[index - 1]);
  }
  getPreviousSiblings(): Array<OutlineNode> {
    const parent = this.getParentOrThrow();
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(0, index)
      .map((childKey) => getNodeByKeyOrThrow<OutlineNode>(childKey));
  }
  getNextSibling(): OutlineNode | null {
    const parent = this.getParentOrThrow();
    const children = parent.__children;
    const childrenLength = children.length;
    const index = children.indexOf(this.__key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getNodeByKey<OutlineNode>(children[index + 1]);
  }
  getNextSiblings(): Array<OutlineNode> {
    const parent = this.getParentOrThrow();
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(index + 1)
      .map((childKey) => getNodeByKeyOrThrow<OutlineNode>(childKey));
  }
  getCommonAncestor(node: OutlineNode): BlockNode | null {
    const a = this.getParents();
    const b = node.getParents();
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
  isBefore(targetNode: OutlineNode): boolean {
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

    if (isBefore) {
      let node = this;
      while (true) {
        nodes.push(node);
        if (node === targetNode) {
          break;
        }
        const child = isBlockNode(node) ? node.getFirstChild() : null;
        if (child !== null) {
          node = child;
          continue;
        }
        const nextSibling = node.getNextSibling();
        if (nextSibling !== null) {
          node = nextSibling;
          continue;
        }
        const parent = node.getParentOrThrow();
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            if (__DEV__) {
              invariant(false, 'This should never happen');
            } else {
              invariant();
            }
          }
          parentSibling = ancestor.getNextSibling();
          ancestor = ancestor.getParent();
        } while (parentSibling === null);
        node = parentSibling;
      }
    } else {
      let node = this;
      while (true) {
        nodes.push(node);
        if (node === targetNode) {
          break;
        }
        const child = isBlockNode(node) ? node.getLastChild() : null;
        if (child !== null) {
          node = child;
          continue;
        }
        const prevSibling = node.getPreviousSibling();
        if (prevSibling !== null) {
          node = prevSibling;
          continue;
        }
        const parent = node.getParentOrThrow();
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            if (__DEV__) {
              invariant(false, `Should never happen`);
            } else {
              invariant();
            }
          }
          parentSibling = ancestor.getPreviousSibling();
          ancestor = ancestor.getParent();
        } while (parentSibling === null);
        node = parentSibling;
      }
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
  getLatest<N: OutlineNode>(): N {
    const latest = getNodeByKey<N>(this.__key);
    if (latest === null) {
      if (__DEV__) {
        invariant(false, 'getLatest: node not found');
      } else {
        invariant();
      }
    }
    return latest;
  }
  getTextContent(includeInert?: boolean): string {
    return '';
  }
  getTextContentSize(includeInert?: boolean): number {
    return this.getTextContent(includeInert).length;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    if (__DEV__) {
      invariant(false, 'This should never happen');
    } else {
      invariant();
    }
  }
  updateDOM(
    // $FlowFixMe: TODO
    prevNode: any,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
  ): boolean {
    if (__DEV__) {
      invariant(false, 'This should never happen');
    } else {
      invariant();
    }
  }
  decorate(): null | ReactNode {
    return null;
  }

  // Setters and mutators

  setFlags(flags: number): this {
    errorOnReadOnly();
    if (this.isImmutable()) {
      if (__DEV__) {
        invariant(false, 'setFlags: can only be used on non-immutable nodes');
      } else {
        invariant();
      }
    }
    const self = getWritableNode(this);
    self.__flags = flags;
    return self;
  }
  makeImmutable(): this {
    errorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_IMMUTABLE;
    return self;
  }
  makeSegmented(): this {
    errorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_SEGMENTED;
    return self;
  }
  makeInert(): this {
    errorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_INERT;
    return self;
  }
  remove(): void {
    errorOnReadOnly();
    return removeNode(this);
  }
  // TODO add support for replacing with multiple nodes?
  replace<N: OutlineNode>(targetNode: N): N {
    errorOnReadOnly();
    return replaceNode(this, targetNode);
  }
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert: OutlineNode): this {
    errorOnReadOnly();
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToInsert.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = getWritableNode(this.getParentOrThrow());
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index + 1, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    // Handle immutable/segmented
    const flags = writableNodeToInsert.__flags;
    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || flags & IS_INERT) {
      wrapInTextNodes(writableNodeToInsert);
    }
    return writableSelf;
  }
  // TODO add support for inserting multiple nodes?
  insertBefore(nodeToInsert: OutlineNode): this {
    errorOnReadOnly();
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent.__children;
      const index = children.indexOf(writableNodeToInsert.__key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = getWritableNode(this.getParentOrThrow());
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    // Handle immutable/segmented
    const flags = writableNodeToInsert.__flags;
    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || flags & IS_INERT) {
      wrapInTextNodes(writableNodeToInsert);
    }
    return writableSelf;
  }
  selectNext(anchorOffset?: number, focusOffset?: number): Selection {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    if (
      nextSibling === null ||
      !isTextNode(nextSibling) ||
      nextSibling.isImmutable() ||
      nextSibling.isSegmented()
    ) {
      if (__DEV__) {
        invariant(false, 'TODO: This needs to be fixed');
      } else {
        invariant();
      }
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }
}

// NOTE: we could make a mutable node type

export function getWritableNode<N: OutlineNode>(node: N): N {
  // TODO we don't need this line, it's more for sanity checking
  errorOnReadOnly();
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  const nodeMap = viewModel._nodeMap;
  const key = node.__key;
  // Ensure we get the latest node from pending state
  const latestNode = node.getLatest();
  const parent = node.__parent;
  if (parent !== null) {
    const dirtySubTrees = viewModel._dirtySubTrees;
    markParentsAsDirty(parent, nodeMap, dirtySubTrees);
  }
  if (dirtyNodes.has(key)) {
    return latestNode;
  }
  const mutableNode = latestNode.clone();
  if (__DEV__) {
    if (!mutableNode.constructor.prototype.hasOwnProperty('clone')) {
      throw new Error(
        latestNode.constructor.name +
          ': "clone" method was either missing or incorrectly implemented.',
      );
    }
  }
  mutableNode.__key = key;
  dirtyNodes.add(key);
  // Update reference in node map
  if (nodeMap[key] !== undefined) {
    nodeMap[key] = mutableNode;
  }
  return mutableNode;
}

function markParentsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMapType,
  dirtySubTrees: Set<NodeKey>,
): void {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtySubTrees.has(nextParentKey)) {
      return;
    }
    dirtySubTrees.add(nextParentKey);
    nextParentKey = nodeMap[nextParentKey].__parent;
  }
}

export function getNodeByKey<N: OutlineNode>(key: NodeKey): N | null {
  const viewModel = getActiveViewModel();
  const node = viewModel._nodeMap[key];
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

function getNodeByKeyOrThrow<N: OutlineNode>(key: NodeKey): N {
  const viewModel = getActiveViewModel();
  const node = viewModel._nodeMap[key];
  if (node === undefined) {
    if (__DEV__) {
      invariant(
        false,
        `Expected node with key ${key} to exist but it's not in the nodeMap.`,
      );
    } else {
      invariant();
    }
  }
  return (node: $FlowFixMe);
}

export function createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
  editor: OutlineEditor,
  parentKey: null | NodeKey,
  state: NodeParserState = {},
): OutlineNode {
  const nodeType = parsedNode.__type;
  const NodeType = editor._nodeTypes.get(nodeType);
  if (NodeType === undefined) {
    if (__DEV__) {
      invariant(
        false,
        'createNodeFromParse: type "' + nodeType + '" + not found',
      );
    } else {
      invariant();
    }
  }
  const node = new NodeType();
  const key = node.__key;
  if (isRootNode(node)) {
    const viewModel = getActiveViewModel();
    viewModel._nodeMap.root = node;
  }
  // Copy over all properties, except the key and children.
  // We've already generated a unique key for this node, we
  // don't want to use an old one that might already be in use.
  // We also don't want to copy over the children as want a
  // clean array to push the parsed children nodes into (below).
  for (const property in parsedNode) {
    if (property !== '__key' && property !== '__children') {
      // $FlowFixMe: not sure how we can type this
      node[property] = parsedNode[property];
    }
  }
  if (node.__flags & IS_OVERFLOWED) {
    node.__flags ^= IS_OVERFLOWED;
  }
  node.__parent = parentKey;
  // We will need to recursively handle the children in the case
  // of a BlockNode.
  if (isBlockNode(node)) {
    const children = parsedNode.__children;
    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const parsedChild = parsedNodeMap[childKey];
      const child = createNodeFromParse(
        parsedChild,
        parsedNodeMap,
        editor,
        key,
        state,
      );
      const newChildKey = child.getKey();
      node.__children.push(newChildKey);
    }
  }
  // The selection might refer to an old node whose key has changed. Produce a
  // new selection record with the old keys mapped to the new ones.
  const originalSelection = state != null ? state.originalSelection : undefined;
  if (originalSelection != null) {
    if (parsedNode.__key === originalSelection.anchorKey) {
      state.remappedSelection = state.remappedSelection || {
        ...originalSelection,
      };
      state.remappedSelection.anchorKey = node.__key;
    }
    if (parsedNode.__key === originalSelection.focusKey) {
      state.remappedSelection = state.remappedSelection || {
        ...originalSelection,
      };
      state.remappedSelection.focusKey = node.__key;
    }
  }
  return node;
}
