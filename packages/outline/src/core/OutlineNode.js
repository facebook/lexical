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

import {
  createTextNode,
  isBlockNode,
  isLineBreakNode,
  isTextNode,
  isRootNode,
  BlockNode,
} from '.';
import {
  getActiveViewModel,
  errorOnReadOnly,
  getActiveEditor,
} from './OutlineView';
import {
  generateRandomKey,
  getTextDirection,
  isImmutableOrInertOrSegmented,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {
  IS_DIRECTIONLESS,
  IS_IMMUTABLE,
  IS_INERT,
  IS_OVERFLOWED,
  IS_SEGMENTED,
} from './OutlineConstants';
import {getSelection} from './OutlineSelection';

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
export type ParsedNodeMap = Map<NodeKey, ParsedNode>;
type ParsedSelection = {
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
};
// export type NodeMapType = {root: RootNode, [key: NodeKey]: OutlineNode};

export type NodeMapType = Map<NodeKey, OutlineNode>;

function generateKey(node: OutlineNode): NodeKey {
  errorOnReadOnly();
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  const key = generateRandomKey();
  viewModel._nodeMap.set(key, node);
  dirtyNodes.add(key);
  return key;
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
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    nextParentKey = node.__parent;
  }
}

export function markNodeAsDirty(node: OutlineNode): void {
  const latest = node.getLatest();
  const parent = latest.__parent;
  const viewModel = getActiveViewModel();
  const nodeMap = viewModel._nodeMap;
  if (parent !== null) {
    const dirtySubTrees = viewModel._dirtySubTrees;
    markParentsAsDirty(parent, nodeMap, dirtySubTrees);
  }
  const dirtyNodes = viewModel._dirtyNodes;
  dirtyNodes.add(latest.__key);
}

function removeNode(nodeToRemove: OutlineNode): void {
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const writableParent = parent.getWritable();
  const parentChildren = writableParent.__children;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  const writableNodeToRemove = nodeToRemove.getWritable();
  writableNodeToRemove.__parent = null;
}

function replaceNode<N: OutlineNode>(
  toReplace: OutlineNode,
  replaceWith: N,
  restoreSelection?: boolean,
): N {
  let anchorOffset;
  if (restoreSelection && isTextNode(toReplace)) {
    const selection = getSelection();
    if (selection) {
      const anchorNode = selection.getAnchorNode();
      if (selection.isCaret() && anchorNode.__key === toReplace.__key) {
        anchorOffset = selection.anchorOffset;
      }
    }
  }
  const writableReplaceWith = replaceWith.getWritable();
  const oldParent = writableReplaceWith.getParent();
  if (oldParent !== null) {
    const writableParent = oldParent.getWritable();
    const children = writableParent.__children;
    const index = children.indexOf(writableReplaceWith.__key);
    if (index > -1) {
      children.splice(index, 1);
    }
  }
  const newParent = toReplace.getParentOrThrow();
  const writableParent = newParent.getWritable();
  const children = writableParent.__children;
  const index = children.indexOf(toReplace.__key);
  const newKey = writableReplaceWith.__key;
  if (index > -1) {
    children.splice(index, 0, newKey);
  }
  writableReplaceWith.__parent = newParent.__key;
  toReplace.remove();
  const flags = writableReplaceWith.__flags;
  // Handle direction if node is directionless
  if (flags & IS_DIRECTIONLESS) {
    updateDirectionIfNeeded(writableReplaceWith);
  }
  // Handle immutable/segmented
  if (
    flags & IS_IMMUTABLE ||
    flags & IS_SEGMENTED ||
    flags & IS_INERT ||
    isLineBreakNode(writableReplaceWith)
  ) {
    wrapInTextNodes(writableReplaceWith);
  }
  if (isTextNode(writableReplaceWith) && anchorOffset !== undefined) {
    writableReplaceWith.select(anchorOffset, anchorOffset);
  }
  return writableReplaceWith;
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

export function wrapInTextNodes<N: OutlineNode>(node: N): N {
  const prevSibling = node.getPreviousSibling();
  if (
    prevSibling === null ||
    !isTextNode(prevSibling) ||
    isImmutableOrInertOrSegmented(prevSibling)
  ) {
    const text = createTextNode('');
    node.insertBefore(text);
  }
  const nextSibling = node.getNextSibling();
  if (
    nextSibling === null ||
    !isTextNode(nextSibling) ||
    isImmutableOrInertOrSegmented(nextSibling)
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
    invariant(
      false,
      'OutlineNode: Node type %s does not implement .clone().',
      this.constructor.name,
    );
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
            invariant(false, 'getNodesBetween: ancestor is null');
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
            invariant(false, 'getNodesBetween: ancestor is null');
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
  isDirectionless(): boolean {
    return (this.getLatest().__flags & IS_DIRECTIONLESS) !== 0;
  }
  isDirty(): boolean {
    const viewModel = getActiveViewModel();
    return viewModel._dirtyNodes.has(this.__key);
  }
  isComposing(): boolean {
    const editor = getActiveEditor();
    return this.__key === editor._compositionKey;
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
    const viewModel = getActiveViewModel();
    const dirtyNodes = viewModel._dirtyNodes;
    const nodeMap = viewModel._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const parent = latestNode.__parent;
    if (parent !== null) {
      const dirtySubTrees = viewModel._dirtySubTrees;
      markParentsAsDirty(parent, nodeMap, dirtySubTrees);
    }
    if (dirtyNodes.has(key)) {
      return latestNode;
    }
    const mutableNode = latestNode.clone();
    mutableNode.__parent = parent;
    mutableNode.__flags = latestNode.__flags;
    if (isBlockNode(mutableNode)) {
      mutableNode.__children = Array.from(latestNode.__children);
    }
    if (__DEV__) {
      if (!mutableNode.constructor.prototype.hasOwnProperty('clone')) {
        throw new Error(
          latestNode.constructor.name +
            ': "clone" method was either missing or incorrectly implemented.',
        );
      }
    }
    mutableNode.__key = key;
    markNodeAsDirty(mutableNode);
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

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    invariant(false, 'createDOM: base method not extended');
  }
  updateDOM(
    // $FlowFixMe: TODO
    prevNode: any,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
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
    return removeNode(this);
  }
  // TODO add support for replacing with multiple nodes?
  replace<N: OutlineNode>(targetNode: N, restoreSelection?: boolean): N {
    errorOnReadOnly();
    return replaceNode(this, targetNode, restoreSelection);
  }
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert: OutlineNode): this {
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
    // Handle immutable/segmented
    if (
      flags & IS_IMMUTABLE ||
      flags & IS_SEGMENTED ||
      flags & IS_INERT ||
      isLineBreakNode(writableNodeToInsert)
    ) {
      wrapInTextNodes(writableNodeToInsert);
    }
    return writableSelf;
  }
  // TODO add support for inserting multiple nodes?
  insertBefore(nodeToInsert: OutlineNode): this {
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
    // Handle immutable/segmented
    if (
      flags & IS_IMMUTABLE ||
      flags & IS_SEGMENTED ||
      flags & IS_INERT ||
      isLineBreakNode(writableNodeToInsert)
    ) {
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
      isImmutableOrInertOrSegmented(nextSibling)
    ) {
      invariant(false, 'selectNext: found invalid sibling');
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }
  forceComposition(): void {
    errorOnReadOnly();
    // We will need to ensure this node gets rendered during composition
    const viewModel = getActiveViewModel();
    const editor = getActiveEditor();
    const key = this.__key;
    viewModel._flushSync = true;
    editor._compositionKey = null;
    editor._deferred.push(() => {
      editor._compositionKey = key;
    });
  }
}

export function getNodeByKey<N: OutlineNode>(key: NodeKey): N | null {
  const viewModel = getActiveViewModel();
  const node = viewModel._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
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
    invariant(false, 'createNodeFromParse: type "%s" + not found', nodeType);
  }
  const node = new NodeType();
  const key = node.__key;
  if (isRootNode(node)) {
    const viewModel = getActiveViewModel();
    viewModel._nodeMap.set('root', node);
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
      const parsedChild = parsedNodeMap.get(childKey);
      if (parsedChild !== undefined) {
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
