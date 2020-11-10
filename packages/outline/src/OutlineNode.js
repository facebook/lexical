import { createText } from '.';
import {getActiveViewModel} from './OutlineView';

let nodeKeyCounter = 0;

export const IS_IMMUTABLE = 1;
export const IS_SEGMENTED = 1 << 1;

function removeNode(nodeToRemove) {
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const writableParent = getWritableNode(parent, true);
  const parentChildren = writableParent._children;
  const key = nodeToRemove._key;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  // Detach parent
  const writableNodeToRemove = getWritableNode(nodeToRemove);
  writableNodeToRemove._parent = null;
  writableNodeToRemove._key = null;
  // Remove children
  if (!nodeToRemove.isText()) {
    const children = nodeToRemove.getChildren();
    for (let i = 0; i < children.length; i++) {
      children[i].remove();
    }
  }
  // Remove key from node map
  const viewModel = getActiveViewModel();
  delete viewModel.nodeMap[key];
}

function replaceNode(toReplace, replaceWith) {
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
  const newParent = toReplace.getParent();
  const writableParent = getWritableNode(newParent);
  const children = writableParent._children;
  const index = children.indexOf(toReplace._key);
  if (index > -1) {
    children.splice(index, 0, replaceWith._key);
  }
  writableReplaceWith._parent = newParent._key;
  toReplace.remove();
  return writableReplaceWith;
}

function wrapInTextNodes(node) {
  const prevSibling = node.getPreviousSibling();
  if (
    prevSibling === null ||
    !prevSibling.isText() ||
    prevSibling.isImmutable() ||
    prevSibling.isSegmented()
  ) {
    const text = createText('')
    node.insertBefore(text);
  }
  const nextSibling = node.getNextSibling();
  if (
    nextSibling === null ||
    !nextSibling.isText() ||
    nextSibling.isImmutable() ||
    nextSibling.isSegmented()
  ) {
    const text = createText('')
    node.insertAfter(text);
  }
  node.getParent().normalizeTextNodes(true);
  return node;
}

export class Node {
  constructor() {
    this._flags = 0;
    this._key = null;
    this._parent = null;
    this._type = 'node';
  }

  // Getters and Traversors

  getFlags() {
    const self = this.getLatest();
    return self._flags;
  }
  getKey() {
    // Key is stable between copies
    return this._key;
  }
  getType() {
    // Type is stable between copies
    return this._type;
  }
  getParent() {
    const parent = this.getLatest()._parent;
    if (parent === null) {
      return null;
    }
    return getNodeByKey(parent);
  }
  getParentBefore(target) {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (parent._key === target._key) {
        return node;
      }
      node = parent;
    }
    return null;
  }
  getParentBlock() {
    let node = this;
    while (node !== null) {
      if (node.isBlock()) {
        return node;
      }
      node = node.getParent();
    }
    return null;
  }
  getParents() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }
  getPreviousSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const index = children.indexOf(this._key);
    if (index <= 0) {
      return null;
    }
    return getNodeByKey(children[index - 1]);
  }
  getPreviousSiblings() {
    const parent = this.getParent();
    const children = parent._children;
    const index = children.indexOf(this._key);
    return children.slice(0, index).map((childKey) => getNodeByKey(childKey));
  }
  getNextSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const childrenLength = children.length;
    const index = children.indexOf(this._key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getNodeByKey(children[index + 1]);
  }
  getNextSiblings() {
    const parent = this.getParent();
    const children = parent._children;
    const index = children.indexOf(this._key);
    return children.slice(index + 1).map((childKey) => getNodeByKey(childKey));
  }
  getCommonAncestor(node) {
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
  isBefore(targetNode) {
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node = this;
    while (true) {
      const parent = node.getParent();
      if (parent === commonAncestor) {
        indexA = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent = node.getParent();
      if (parent === commonAncestor) {
        indexB = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  }
  isParentOf(targetNode) {
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
  getNodesBetween(targetNode) {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];

    if (isBefore) {
      let node = this;
      while (true) {
        nodes.push(node);
        if (node === targetNode) {
          break;
        }
        const child = node.isBlock() ? node.getFirstChild() : null;
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
          return null;
        }
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            return null;
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
        const child = node.isBlock() ? node.getLastChild() : null;
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
          return null;
        }
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            return null;
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
  isBody() {
    return false;
  }
  isHeader() {
    return false;
  }
  isBlock() {
    return false;
  }
  isText() {
    return false;
  }
  isImmutable() {
    return (this.getLatest()._flags & IS_IMMUTABLE) !== 0;
  }
  isSegmented() {
    return (this.getLatest()._flags & IS_SEGMENTED) !== 0;
  }
  getLatest() {
    if (this._key === null) {
      return this;
    }
    const latest = getNodeByKey(this._key);
    if (latest === null) {
      return this;
    }
    return latest;
  }
  getTextContent() {
    if (this.isText()) {
      return this.getTextContent();
    }
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if (child.isBlock() && i !== childrenLength - 1) {
        textContent += '\n\n';
      }
    }
    return textContent;
  }

  // Setters and mutators

  setFlags(flags) {
    if (this.isImmutable()) {
      throw new Error('setFlags: can only be used on non-immutable nodes');
    }
    const self = getWritableNode(this);
    self._flags = flags;
    return self;
  }
  makeImmutable() {
    const self = getWritableNode(this);
    self._flags |= IS_IMMUTABLE;
    return self;
  }
  makeSegmented() {
    const self = getWritableNode(this);
    self._flags |= IS_SEGMENTED;
    return self;
  }
  remove() {
    return removeNode(this);
  }
  wrapInTextNodes() {
    return wrapInTextNodes(this);
  }
  // TODO add support for replacing with multiple nodes?
  replace(targetNode) {
    return replaceNode(this, targetNode);
  }
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert) {
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
    const writableParent = getWritableNode(this.getParent());
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
  insertBefore(nodeToInsert) {
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
    const writableParent = getWritableNode(this.getParent());
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

export function getWritableNode(node) {
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  const nodeMap = viewModel.nodeMap;
  const key = node._key;
  if (key === null) {
    const newKey = (node._key = nodeKeyCounter++);
    dirtyNodes.add(newKey);
    nodeMap[newKey] = node;
    return node;
  }
  // Ensure we get the latest node from pending state
  node = node.getLatest();
  const parent = node._parent;
  if (parent !== null) {
    const dirtySubTrees = viewModel._dirtySubTrees;
    markParentsAsDirty(parent, nodeMap, dirtySubTrees);
  }
  if (dirtyNodes.has(key)) {
    return node;
  }
  const mutableNode = node.clone();
  if (mutableNode._type !== node._type) {
    throw new Error(
      node.constructor.name +
        ': "clone" method was either missing or incorrectly implemented.',
    );
  }
  mutableNode._key = key;
  // If we're mutating the body node, make sure to update
  // the pointer in state too.
  if (mutableNode.isBody()) {
    viewModel.body = mutableNode;
  }
  dirtyNodes.add(key);
  nodeMap[key] = mutableNode;
  return mutableNode;
}

function markParentsAsDirty(parentKey, nodeMap, dirtySubTrees) {
  while (parentKey !== null) {
    if (dirtySubTrees.has(parentKey)) {
      return;
    }
    dirtySubTrees.add(parentKey);
    parentKey = nodeMap[parentKey]._parent;
  }
}

export function getNodeByKey(key) {
  const viewModel = getActiveViewModel();
  const node = viewModel.nodeMap[key];
  if (node === undefined) {
    return null;
  }
  return node;
}
