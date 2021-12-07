/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, OutlineEditor} from './OutlineEditor';
import type {Selection} from './OutlineSelection';

import {
  isElementNode,
  isTextNode,
  isRootNode,
  ElementNode,
  isDecoratorNode,
} from '.';
import {
  getActiveEditorState,
  errorOnReadOnly,
  getActiveEditor,
} from './OutlineUpdates';
import {
  generateKey,
  $getCompositionKey,
  $getNodeByKey,
  internallyMarkNodeAsDirty,
  markParentElementsAsDirty,
  $setCompositionKey,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {
  $getSelection,
  moveSelectionPointToEnd,
  updateElementSelectionOnCreateDeleteNode,
  moveSelectionPointToSibling,
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
  const selection = $getSelection();
  let selectionMoved = false;
  if (selection !== null && restoreSelection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.key === key) {
      moveSelectionPointToSibling(anchor, nodeToRemove, parent);
      selectionMoved = true;
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(focus, nodeToRemove, parent);
      selectionMoved = true;
    }
  }

  const writableParent = parent.getWritable();
  const parentChildren = writableParent.__children;
  const index = parentChildren.indexOf(key);
  if (index === -1) {
    invariant(false, 'Node is not a child of its parent');
  }
  parentChildren.splice(index, 1);
  const writableNodeToRemove = nodeToRemove.getWritable();
  writableNodeToRemove.__parent = null;

  if (selection !== null && restoreSelection && !selectionMoved) {
    updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1);
  }
  if (
    parent !== null &&
    !isRootNode(parent) &&
    !parent.canBeEmpty() &&
    parent.getChildrenSize() === 0
  ) {
    removeNode(parent, restoreSelection);
  }
}

export type NodeKey = string;

export class OutlineNode {
  __type: string;
  __key: NodeKey;
  __parent: null | NodeKey;

  // Flow doesn't support abstract classes unfortunately, so we can't _force_
  // subclasses of Node to implement statics. All subclasses of Node should have
  // a static getType and clone method though. We define getType and clone here so we can call it
  // on any  Node, and we throw this error by default since the subclass should provide
  // their own implementation.
  static getType(): string {
    invariant(
      false,
      'OutlineNode: Node %s does not implement .getType().',
      this.name,
    );
  }
  static clone(data: $FlowFixMe): OutlineNode {
    invariant(
      false,
      'OutlineNode: Node %s does not implement .clone().',
      this.name,
    );
  }

  constructor(key?: NodeKey) {
    this.__type = this.constructor.getType();
    this.__key = key || generateKey(this);
    this.__parent = null;

    // Ensure custom nodes implement required methods.
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      if (!proto.constructor.hasOwnProperty('getType')) {
        console.warn(
          `${this.constructor.name} must implement static "getType" method`,
        );
      }
      if (!proto.constructor.hasOwnProperty('clone')) {
        console.warn(
          `${this.constructor.name} must implement static "clone" method`,
        );
      }
      if (this.__type !== 'root') {
        errorOnReadOnly();
        errorOnTypeKlassMismatch(this.__type, this.constructor);
      }
    }
  }
  // Getters and Traversers

  getType(): string {
    return this.__type;
  }
  isAttached(): boolean {
    let nodeKey = this.__key;
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true;
      }
      const node = $getNodeByKey(nodeKey);

      if (node === null) {
        break;
      }
      nodeKey = node.__parent;
    }
    return false;
  }
  isSelected(): boolean {
    const selection = $getSelection();
    if (selection == null) {
      return false;
    }
    const selectedNodeKeys = new Set(selection.getNodes().map((n) => n.__key));
    const isSelected = selectedNodeKeys.has(this.__key);

    if (isTextNode(this)) {
      return isSelected;
    }
    // For inline images inside of element nodes.
    // Without this change the image will be selected if the cursor is before or after it.
    if (
      selection.anchor.type === 'element' &&
      selection.focus.type === 'element' &&
      selection.anchor.key === selection.focus.key &&
      selection.anchor.offset === selection.focus.offset
    ) {
      return false;
    }
    return isSelected;
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
  getParent(): ElementNode | null {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    return $getNodeByKey<ElementNode>(parent);
  }
  getParentOrThrow(): ElementNode {
    const parent = this.getParent();
    if (parent === null) {
      invariant(false, 'Expected node %s to have a parent.', this.__key);
    }
    return parent;
  }
  getTopLevelElement(): null | ElementNode {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (isRootNode(parent) && isElementNode(node)) {
        return node;
      }
      node = parent;
    }
    return null;
  }
  getTopLevelElementOrThrow(): ElementNode {
    const parent = this.getTopLevelElement();
    if (parent === null) {
      invariant(
        false,
        'Expected node %s to have a top parent element.',
        this.__key,
      );
    }
    return parent;
  }
  getParents(): Array<ElementNode> {
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
    return $getNodeByKey<OutlineNode>(children[index - 1]);
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
      .map((childKey) => $getNodeByKeyOrThrow<OutlineNode>(childKey));
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
    return $getNodeByKey<OutlineNode>(children[index + 1]);
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
      .map((childKey) => $getNodeByKeyOrThrow<OutlineNode>(childKey));
  }
  getCommonAncestor(node: OutlineNode): ElementNode | null {
    const a = this.getParents();
    const b = node.getParents();
    if (isElementNode(this)) {
      a.unshift(this);
    }
    if (isElementNode(node)) {
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
      const child = isElementNode(node)
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
  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyLeaves = editor._dirtyLeaves;
    return dirtyLeaves !== null && dirtyLeaves.has(this.__key);
  }
  // TODO remove this and move to TextNode
  isComposing(): boolean {
    return this.__key === $getCompositionKey();
  }
  getLatest<N: OutlineNode>(): N {
    const latest = $getNodeByKey<N>(this.__key);
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
    const dirtyElements = editor._dirtyElements;
    if (parent !== null) {
      markParentElementsAsDirty(parent, nodeMap, dirtyElements);
    }
    const cloneNotNeeded = editor._cloneNotNeeded;
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internallyMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const constructor = latestNode.constructor;
    const mutableNode = constructor.clone(latestNode);
    mutableNode.__parent = parent;
    if (isElementNode(mutableNode)) {
      mutableNode.__children = Array.from(latestNode.__children);
      mutableNode.__indent = latestNode.__indent;
      mutableNode.__format = latestNode.__format;
      mutableNode.__dir = latestNode.__dir;
    } else if (isTextNode(mutableNode)) {
      mutableNode.__format = latestNode.__format;
      mutableNode.__style = latestNode.__style;
      mutableNode.__mode = latestNode.__mode;
      mutableNode.__detail = latestNode.__detail;
    } else if (isDecoratorNode(mutableNode)) {
      mutableNode.__ref = latestNode.__ref;
    }
    cloneNotNeeded.add(key);
    mutableNode.__key = key;
    internallyMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);
    return mutableNode;
  }
  // TODO remove this completely
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    return '';
  }
  // TODO remove this completely
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
    editor: OutlineEditor,
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
      if (index === -1) {
        invariant(false, 'Node is not a child of its parent');
      }
      children.splice(index, 1);
    }
    const newParent = this.getParentOrThrow();
    const writableParent = newParent.getWritable();
    const children = writableParent.__children;
    const index = children.indexOf(this.__key);
    const newKey = writableReplaceWith.__key;
    if (index === -1) {
      invariant(false, 'Node is not a child of its parent');
    }
    children.splice(index, 0, newKey);
    writableReplaceWith.__parent = newParent.__key;
    removeNode(this, false);
    const selection = $getSelection();
    if (selection !== null) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor.key === toReplaceKey) {
        moveSelectionPointToEnd(anchor, writableReplaceWith);
      }
      if (focus.key === toReplaceKey) {
        moveSelectionPointToEnd(focus, writableReplaceWith);
      }
    }
    if ($getCompositionKey() === toReplaceKey) {
      $setCompositionKey(newKey);
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
      if (index === -1) {
        invariant(false, 'Node is not a child of its parent');
      }
      children.splice(index, 1);
    }
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index === -1) {
      invariant(false, 'Node is not a child of its parent');
    }
    children.splice(index + 1, 0, insertKey);
    const selection = $getSelection();
    if (selection !== null) {
      updateElementSelectionOnCreateDeleteNode(
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
      if (index === -1) {
        invariant(false, 'Node is not a child of its parent');
      }
      children.splice(index, 1);
    }
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index === -1) {
      invariant(false, 'Node is not a child of its parent');
    }
    children.splice(index, 0, insertKey);
    const selection = $getSelection();
    if (selection !== null) {
      updateElementSelectionOnCreateDeleteNode(
        selection,
        writableParent,
        index,
      );
    }
    return nodeToInsert;
  }
  selectPrevious(anchorOffset?: number, focusOffset?: number): Selection {
    errorOnReadOnly();
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if (isElementNode(prevSibling)) {
      return prevSibling.select();
    } else if (!isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return prevSibling.select(anchorOffset, focusOffset);
  }
  selectNext(anchorOffset?: number, focusOffset?: number): Selection {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    const parent = this.getParentOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if (isElementNode(nextSibling)) {
      return nextSibling.select(0, 0);
    } else if (!isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent();
      return parent.select(index, index);
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }
  // Proxy to mark something as dirty
  markDirty(): void {
    this.getWritable();
  }
}

function $getNodeByKeyOrThrow<N: OutlineNode>(key: NodeKey): N {
  const node = $getNodeByKey<N>(key);
  if (node === null) {
    invariant(
      false,
      "Expected node with key %s to exist but it's not in the nodeMap.",
      key,
    );
  }
  return node;
}

function errorOnTypeKlassMismatch(
  type: string,
  klass: Class<OutlineNode>,
): void {
  const registeredNode = getActiveEditor()._registeredNodes.get(type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    invariant(
      false,
      'Create node: Attempted to create node %s that was not previously registered on the editor. You can use editor.registerNode to register your custom nodes.',
      klass.name,
    );
  }
  const editorKlass = registeredNode.klass;
  if (editorKlass !== klass) {
    invariant(
      false,
      'Create node: Type %s in node %s does not match registered node %s with the same type',
      type,
      klass.name,
      editorKlass.name,
    );
  }
}
