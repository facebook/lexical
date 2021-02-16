/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';

import {createTextNode, RootNode, BlockNode, TextNode} from '.';
import {getActiveViewModel, shouldErrorOnReadOnly} from './OutlineView';
import {generateRandomKey, invariant} from './OutlineUtils';
import {IS_IMMUTABLE, IS_OVERFLOWED, IS_SEGMENTED} from './OutlineConstants';

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
export type NodeMapType = {root: RootNode, [key: NodeKey]: OutlineNode};

function generateKey(node: OutlineNode): NodeKey {
  shouldErrorOnReadOnly();
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
  if (latest instanceof BlockNode) {
    const children = latest.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      dirtyNodes.add(child.__key);
      makeNodeAsDirty(child);
    }
  }
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
  const newKey = replaceWith.__key;
  if (index > -1) {
    children.splice(index, 0, newKey);
  }
  writableReplaceWith.__parent = newParent.__key;
  toReplace.remove();
  // Handle immutable/segmented
  const flags = replaceWith.__flags;
  if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED) {
    wrapInTextNodes(replaceWith);
  }
  return writableReplaceWith;
}

export function wrapInTextNodes<N: OutlineNode>(node: N): N {
  const prevSibling = node.getPreviousSibling();
  if (
    prevSibling === null ||
    !(prevSibling instanceof TextNode) ||
    prevSibling.isImmutable() ||
    prevSibling.isSegmented()
  ) {
    const text = createTextNode('');
    node.insertBefore(text);
  }
  const nextSibling = node.getNextSibling();
  if (
    nextSibling === null ||
    !(nextSibling instanceof TextNode) ||
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
    // Flow doesn't support abstract classes unfortunatley, so we can't _force_
    // subclasses of Node to implement clone. All subclasses of Node should have
    // a clone method though. We define clone here so we can call it on any Node,
    // and we throw this error by default since the subclass should provide
    // their own implementation.
    throw new Error(
      `Node type ${this.constructor.name} does not implement .clone().`,
    );
  }

  constructor(key?: string) {
    this.__type = 'node';
    this.__flags = 0;
    this.__key = key || generateKey(this);
    this.__parent = null;
  }

  // Getters and Traversors

  getType(): string {
    return this.__type;
  }
  isAttached(): boolean {
    const parentKey = this.__parent;
    if (parentKey === null) {
      return false;
    }
    const parent = getNodeByKey(parentKey);
    return parent !== null && parent.isAttached();
  }
  isLeaf(): boolean {
    return !(this instanceof BlockNode);
  }
  isText(): boolean {
    return this instanceof TextNode;
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
    return getNodeByKey(parent);
  }
  getParentOrThrow(): BlockNode {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      throw new Error(`Expected node ${this.__key} to have a parent.`);
    }
    return getNodeByKeyOrThrow<BlockNode>(parent);
  }
  getParentBlockOrThrow(): BlockNode {
    let node = this;
    while (node !== null) {
      if (node instanceof BlockNode) {
        return node;
      }
      node = node.getParent();
    }
    throw new Error(`Expected node ${this.__key} to have a parent.`);
  }
  getTopParentBlockOrThrow(): BlockNode {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (parent instanceof RootNode && node instanceof BlockNode) {
        return node;
      }
      node = parent;
    }
    throw new Error(`Expected node ${this.__key} to have a top parent.`);
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
    return getNodeByKey(children[index - 1]);
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
    return getNodeByKey(children[index + 1]);
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
        const child = node instanceof BlockNode ? node.getFirstChild() : null;
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
            throw new Error('This should never happen');
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
        const child = node instanceof BlockNode ? node.getLastChild() : null;
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
            throw new Error('This should never happen');
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
  getLatest<N>(): N {
    const latest = getNodeByKey(this.__key);
    invariant(latest !== null, 'getLatest: node not found');
    return latest;
  }
  getTextContent(): string {
    return '';
  }

  // View

  createDOM(): HTMLElement {
    throw new Error('Should never occur');
  }
  // $FlowFixMe: TODO
  updateDOM(prevNode: any, dom: HTMLElement): boolean {
    throw new Error('Should never occur');
  }

  // Setters and mutators

  setFlags(flags: number): this {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error('setFlags: can only be used on non-immutable nodes');
    }
    const self = getWritableNode(this);
    self.__flags = flags;
    return self;
  }
  makeImmutable(): this {
    shouldErrorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_IMMUTABLE;
    return self;
  }
  makeSegmented(): this {
    shouldErrorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_SEGMENTED;
    return self;
  }
  remove(): void {
    shouldErrorOnReadOnly();
    return removeNode(this);
  }
  // TODO add support for replacing with multiple nodes?
  replace<N: OutlineNode>(targetNode: N): N {
    shouldErrorOnReadOnly();
    return replaceNode(this, targetNode);
  }
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert: OutlineNode): this {
    shouldErrorOnReadOnly();
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
    const insertKey = nodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index + 1, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    // Handle immutable/segmented
    const flags = nodeToInsert.__flags;
    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED) {
      wrapInTextNodes(nodeToInsert);
    }
    return writableSelf;
  }
  // TODO add support for inserting multiple nodes?
  insertBefore(nodeToInsert: OutlineNode): this {
    shouldErrorOnReadOnly();
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
    const insertKey = nodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index > -1) {
      children.splice(index, 0, insertKey);
    } else {
      children.push(insertKey);
    }
    // Handle immutable/segmented
    const flags = nodeToInsert.__flags;
    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED) {
      wrapInTextNodes(nodeToInsert);
    }
    return writableSelf;
  }
}

// NOTE: we could make a mutable node type

export function getWritableNode<N: OutlineNode>(node: N): N {
  // TODO we don't need this line, it's more for sanity checking
  shouldErrorOnReadOnly();
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
  // TODO this should be a DEV only check
  if (!mutableNode.constructor.prototype.hasOwnProperty('clone')) {
    throw new Error(
      latestNode.constructor.name +
        ': "clone" method was either missing or incorrectly implemented.',
    );
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
    throw new Error(
      `Expected node with key ${key} to exist but it's not in the nodeMap.`,
    );
  }
  return (node: $FlowFixMe);
}

export function populateNodeMapFromParse(
  nodeMap: NodeMapType,
  parsedNodeMap: ParsedNodeMap,
  editor: OutlineEditor,
): void {
  for (const key in parsedNodeMap) {
    const parsedNode = parsedNodeMap[key];
    const node = createNodeFromParse(parsedNode, parsedNodeMap, editor, null);
    nodeMap[key] = node;
  }
}

export function createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
  editor: OutlineEditor,
  parentKey: null | NodeKey,
): OutlineNode {
  const type = parsedNode.__type;
  const NodeType = editor._registeredNodeTypes.get(type);
  invariant(
    NodeType !== undefined,
    'createNodeFromParse: type "' + type + '" + not found',
  );
  const node = new NodeType();
  const key = node.__key;
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
  if (node instanceof BlockNode) {
    const children = parsedNode.__children;
    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const parsedChild = parsedNodeMap[childKey];
      const child = createNodeFromParse(
        parsedChild,
        parsedNodeMap,
        editor,
        key,
      );
      const newChildKey = child.getKey();
      node.__children.push(newChildKey);
    }
  }
  return node;
}
