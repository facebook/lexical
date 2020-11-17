// @flow strict

import type {NodeMapType} from './OutlineView';

import {createText, RootNode, BlockNode, TextNode} from '.';
import {getActiveViewModel} from './OutlineView';
import {invariant} from './OutlineUtils';

export const IS_IMMUTABLE = 1;
export const IS_SEGMENTED = 1 << 1;
export const HAS_DIRECTION = 1 << 2;

let nodeKeyCounter = 0;

function generateKey(node: Node): NodeKey {
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel.dirtyNodes;
  const key = nodeKeyCounter++ + '';
  viewModel.nodeMap[key] = node;
  dirtyNodes.add(key);
  return key;
}

function removeNode(nodeToRemove: Node): void {
  const key = nodeToRemove._key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const writableParent = getWritableNode(parent);
  const parentChildren = writableParent._children;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  const writableNodeToRemove = getWritableNode(nodeToRemove);
  writableNodeToRemove._parent = null;
}

function replaceNode<N: Node>(toReplace: Node, replaceWith: N): N {
  const writableReplaceWith = getWritableNode(replaceWith);
  const oldParent = writableReplaceWith.getParent();
  if (oldParent !== null) {
    const writableParent = getWritableNode(oldParent);
    const children = writableParent._children;
    const index = children.indexOf(writableReplaceWith._key);
    if (index > -1) {
      children.splice(index, 1);
    }
  }
  const newParent = toReplace.getParentOrThrow();
  const writableParent = getWritableNode(newParent);
  const children = writableParent._children;
  const index = children.indexOf(toReplace._key);
  const newKey = replaceWith._key;
  if (index > -1) {
    children.splice(index, 0, newKey);
  }
  writableReplaceWith._parent = newParent._key;
  toReplace.remove();
  return writableReplaceWith;
}

function wrapInTextNodes<N: Node>(node: N): N {
  const prevSibling = node.getPreviousSibling();
  if (
    prevSibling === null ||
    !(prevSibling instanceof TextNode) ||
    prevSibling.isImmutable() ||
    prevSibling.isSegmented()
  ) {
    const text = createText('');
    node.insertBefore(text);
  }
  const nextSibling = node.getNextSibling();
  if (
    nextSibling === null ||
    !(nextSibling instanceof TextNode) ||
    nextSibling.isImmutable() ||
    nextSibling.isSegmented()
  ) {
    const text = createText('');
    node.insertAfter(text);
  }
  // TODO: This should be getParentBlock probably
  (node.getParent(): $FlowFixMe).normalizeTextNodes(true);
  return node;
}

export type NodeKey = string;

export class Node {
  _flags: number;
  _key: NodeKey;
  _parent: null | NodeKey;

  clone(): Node {
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
    this._flags = 0;
    this._key = key || generateKey(this);
    this._parent = null;
  }

  // Getters and Traversors

  isAttached(): boolean {
    const parentKey = this._parent;
    if (parentKey === null) {
      return false;
    }
    const parent = getNodeByKey(parentKey);
    return parent !== null && parent.isAttached();
  }
  isLeaf(): boolean {
    return !(this instanceof BlockNode);
  }
  getFlags(): number {
    const self = this.getLatest();
    return self._flags;
  }
  getKey(): NodeKey {
    // Key is stable between copies
    return this._key;
  }
  getParent(): BlockNode | null {
    const parent = this.getLatest()._parent;
    if (parent === null) {
      return null;
    }
    return getNodeByKey(parent);
  }
  getParentOrThrow(): BlockNode {
    const parent = this.getLatest()._parent;
    if (parent === null) {
      throw new Error(`Expected node ${this._key} to have a parent.`);
    }
    return getNodeByKeyOrThrow<BlockNode>(parent);
  }
  getParentBlock(): BlockNode | null {
    let node = this;
    while (node !== null) {
      if (node instanceof BlockNode) {
        return node;
      }
      node = node.getParent();
    }
    return null;
  }
  getParents(): Array<BlockNode | null> {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }
  getPreviousSibling(): Node | null {
    const parent = this.getParentOrThrow();
    const children = parent._children;
    const index = children.indexOf(this._key);
    if (index <= 0) {
      return null;
    }
    return getNodeByKey(children[index - 1]);
  }
  getPreviousSiblings(): Array<Node> {
    const parent = this.getParentOrThrow();
    const children = parent._children;
    const index = children.indexOf(this._key);
    return children
      .slice(0, index)
      .map((childKey) => getNodeByKeyOrThrow<Node>(childKey));
  }
  getNextSibling(): Node | null {
    const parent = this.getParentOrThrow();
    const children = parent._children;
    const childrenLength = children.length;
    const index = children.indexOf(this._key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getNodeByKey(children[index + 1]);
  }
  getNextSiblings(): Array<Node> {
    const parent = this.getParentOrThrow();
    const children = parent._children;
    const index = children.indexOf(this._key);
    return children
      .slice(index + 1)
      .map((childKey) => getNodeByKeyOrThrow<Node>(childKey));
  }

  getCommonAncestor(node: Node): BlockNode | null {
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

  isBefore(targetNode: Node): boolean {
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node = this;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexA = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexB = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  }

  isParentOf(targetNode: Node): boolean {
    const key = this._key;
    let node = targetNode;
    while (node !== null) {
      if (node._key === key) {
        return true;
      }
      node = node.getParent();
    }
    return false;
  }

  getNodesBetween(targetNode: Node): Array<Node> {
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
        const parent = node.getParent();
        if (parent === null) {
          throw new Error('This should never happen');
        }
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
        const parent = node.getParent();
        if (parent === null) {
          throw new Error('This should never happen');
        }
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

  hasDirection(): boolean {
    return (this.getLatest()._flags & HAS_DIRECTION) !== 0;
  }
  isImmutable(): boolean {
    return (this.getLatest()._flags & IS_IMMUTABLE) !== 0;
  }
  isSegmented(): boolean {
    return (this.getLatest()._flags & IS_SEGMENTED) !== 0;
  }

  getLatest(): this {
    const latest = getNodeByKey(this._key);
    invariant(latest !== null, 'getLatest: node not found');
    return latest;
  }

  getTextContent(): string {
    if (this instanceof TextNode) {
      return this.getTextContent();
    }
    // If this isn't a TextNode, it must be a subclass of BlockNode.
    invariant(this instanceof BlockNode, 'Found non-BlockNode non-TextNode');
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if (child instanceof BlockNode && i !== childrenLength - 1) {
        textContent += '\n\n';
      }
    }
    return textContent;
  }

  // View

  _create(): HTMLElement {
    throw new Error('Should never occur');
  }
  _update(prevNode: Node, dom: HTMLElement): boolean {
    throw new Error('Should never occur');
  }

  // Setters and mutators

  setFlags(flags: number): this {
    if (this.isImmutable()) {
      throw new Error('setFlags: can only be used on non-immutable nodes');
    }
    const self = getWritableNode(this);
    self._flags = flags;
    return self;
  }
  makeDirectioned(): this {
    const self = getWritableNode(this);
    self._flags |= HAS_DIRECTION;
    return self;
  }
  makeImmutable(): this {
    const self = getWritableNode(this);
    self._flags |= IS_IMMUTABLE;
    return self;
  }
  makeSegmented(): this {
    const self = getWritableNode(this);
    self._flags |= IS_SEGMENTED;
    return self;
  }
  remove(): void {
    return removeNode(this);
  }
  wrapInTextNodes(): Node {
    return wrapInTextNodes(this);
  }
  // TODO add support for replacing with multiple nodes?
  replace<N: Node>(targetNode: N): N {
    return replaceNode(this, targetNode);
  }
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert: Node): Node {
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent._children;
      const index = children.indexOf(writableNodeToInsert._key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = getWritableNode(this.getParentOrThrow());
    const insertKey = nodeToInsert._key;
    writableNodeToInsert._parent = writableSelf._parent;
    const children = writableParent._children;
    const index = children.indexOf(writableSelf._key);
    if (index > -1) {
      children.splice(index + 1, 0, insertKey);
    }
    return writableSelf;
  }
  // TODO add support for inserting multiple nodes?
  insertBefore(nodeToInsert: Node): Node {
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const oldParent = writableNodeToInsert.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent._children;
      const index = children.indexOf(writableNodeToInsert._key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    const writableParent = getWritableNode(this.getParentOrThrow());
    const insertKey = nodeToInsert._key;
    writableNodeToInsert._parent = writableSelf._parent;
    const children = writableParent._children;
    const index = children.indexOf(writableSelf._key);
    if (index > -1) {
      children.splice(index, 0, insertKey);
    }
    return writableSelf;
  }
}

// NOTE: we could make a mutable node type

export function getWritableNode<N: Node>(node: N): N {
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel.dirtyNodes;
  const nodeMap = viewModel.nodeMap;
  const key = node._key;
  // Ensure we get the latest node from pending state
  const latestNode = node.getLatest();
  const parent = node._parent;
  if (parent !== null) {
    const dirtySubTrees = viewModel.dirtySubTrees;
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
  mutableNode._key = key;
  // If we're mutating the root node, make sure to update
  // the pointer in state too.
  if (mutableNode instanceof RootNode) {
    viewModel.root = mutableNode;
  }
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
    nextParentKey = nodeMap[nextParentKey]._parent;
  }
}

export function getNodeByKey<N: Node>(key: NodeKey): N | null {
  const viewModel = getActiveViewModel();
  const node = viewModel.nodeMap[key];
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

function getNodeByKeyOrThrow<N: Node>(key: NodeKey): N {
  const viewModel = getActiveViewModel();
  const node = viewModel.nodeMap[key];
  if (node === undefined) {
    throw new Error(
      `Expected node with key ${key} to exist but it's not in the nodeMap.`,
    );
  }
  return (node: $FlowFixMe);
}
