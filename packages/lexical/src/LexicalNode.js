/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalEditor} from './LexicalEditor';
import type {RangeSelection} from './LexicalSelection';

import invariant from 'shared/invariant';

import {
  $isDecoratorNode,
  $isElementNode,
  $isRootNode,
  $isTextNode,
  ElementNode,
} from '.';
import {
  $getSelection,
  $isRangeSelection,
  $moveSelectionPointToEnd,
  $updateElementSelectionOnCreateDeleteNode,
  moveSelectionPointToSibling,
} from './LexicalSelection';
import {
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
} from './LexicalUpdates';
import {
  $getCompositionKey,
  $getNodeByKey,
  $setCompositionKey,
  $setNodeKey,
  internalMarkNodeAsDirty,
  internalMarkSiblingsAsDirty,
  removeFromParent,
} from './LexicalUtils';

export type NodeMap = Map<NodeKey, LexicalNode>;

export function removeNode(
  nodeToRemove: LexicalNode,
  restoreSelection: boolean,
  preserveEmptyParent?: boolean,
): void {
  errorOnReadOnly();
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const selection = $getSelection();
  let selectionMoved = false;
  if ($isRangeSelection(selection) && restoreSelection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.key === key) {
      moveSelectionPointToSibling(
        anchor,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      );
      selectionMoved = true;
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(
        focus,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      );
      selectionMoved = true;
    }
  }

  const writableParent = parent.getWritable();
  const parentChildren = writableParent.__children;
  const index = parentChildren.indexOf(key);
  if (index === -1) {
    invariant(false, 'Node is not a child of its parent');
  }
  internalMarkSiblingsAsDirty(nodeToRemove);
  parentChildren.splice(index, 1);
  const writableNodeToRemove = nodeToRemove.getWritable();
  writableNodeToRemove.__parent = null;

  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1);
  }
  if (
    !preserveEmptyParent &&
    parent !== null &&
    !$isRootNode(parent) &&
    !parent.canBeEmpty() &&
    parent.isEmpty()
  ) {
    removeNode(parent, restoreSelection);
  }
  if (parent !== null && $isRootNode(parent) && parent.isEmpty()) {
    parent.selectEnd();
  }
}

export function $getNodeByKeyOrThrow<N: LexicalNode>(key: NodeKey): N {
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

export type DOMConversion = {
  conversion: DOMConversionFn,
  priority: 0 | 1 | 2 | 3 | 4,
};
export type DOMConversionFn = (
  element: Node,
  parent?: Node,
) => DOMConversionOutput;
export type DOMChildConversion = (
  lexicalNode: LexicalNode,
) => LexicalNode | null | void;
export type DOMConversionMap = {
  [NodeName]: (node: Node) => DOMConversion | null,
};
type NodeName = string;
export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>,
  forChild?: DOMChildConversion,
  node: LexicalNode | null,
};
export type DOMExportOutput = {
  after?: (generatedElement: ?HTMLElement) => ?HTMLElement,
  element?: HTMLElement | null,
};
export type NodeKey = string;

export class LexicalNode {
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
      'LexicalNode: Node %s does not implement .getType().',
      this.name,
    );
  }
  static clone(data: $FlowFixMe): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .clone().',
      this.name,
    );
  }

  constructor(key?: NodeKey): void {
    this.__type = this.constructor.getType();
    this.__parent = null;
    $setNodeKey(this, key);

    // Ensure custom nodes implement required methods.
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      ['getType', 'clone'].forEach((method) => {
        if (!proto.constructor.hasOwnProperty(method)) {
          console.warn(
            `${this.constructor.name} must implement static "${method}" method`,
          );
        }
      });
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

    const isSelected = selection.getNodes().some((n) => n.__key === this.__key);

    if ($isTextNode(this)) {
      return isSelected;
    }
    // For inline images inside of element nodes.
    // Without this change the image will be selected if the cursor is before or after it.
    if (
      $isRangeSelection(selection) &&
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
      if ($isRootNode(parent) && $isElementNode(node)) {
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

  getPreviousSibling(): LexicalNode | null {
    const parent = this.getParent();
    if (parent === null) {
      return null;
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    if (index <= 0) {
      return null;
    }
    return $getNodeByKey<LexicalNode>(children[index - 1]);
  }

  getPreviousSiblings(): Array<LexicalNode> {
    const parent = this.getParent();
    if (parent === null) {
      return [];
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(0, index)
      .map((childKey) => $getNodeByKeyOrThrow<LexicalNode>(childKey));
  }

  getNextSibling(): LexicalNode | null {
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
    return $getNodeByKey<LexicalNode>(children[index + 1]);
  }

  getNextSiblings(): Array<LexicalNode> {
    const parent = this.getParent();
    if (parent === null) {
      return [];
    }
    const children = parent.__children;
    const index = children.indexOf(this.__key);
    return children
      .slice(index + 1)
      .map((childKey) => $getNodeByKeyOrThrow<LexicalNode>(childKey));
  }

  getCommonAncestor(node: LexicalNode): ElementNode | null {
    const a = this.getParents();
    const b = node.getParents();
    if ($isElementNode(this)) {
      a.unshift(this);
    }
    if ($isElementNode(node)) {
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

  is(object: ?LexicalNode): boolean {
    if (object == null) {
      return false;
    }
    return this.__key === object.__key;
  }

  isBefore(targetNode: LexicalNode): boolean {
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

  isParentOf(targetNode: LexicalNode): boolean {
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

  getNodesBetween(targetNode: LexicalNode): Array<LexicalNode> {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];
    const visited = new Set();
    let node = this;
    while (true) {
      const key = node.__key;
      if (!visited.has(key)) {
        visited.add(key);
        nodes.push(node);
      }
      if (node === targetNode) {
        break;
      }
      const child = $isElementNode(node)
        ? isBefore
          ? node.getFirstChild()
          : node.getLastChild()
        : null;
      if (child !== null) {
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
      do {
        if (ancestor === null) {
          invariant(false, 'getNodesBetween: ancestor is null');
        }
        parentSibling = isBefore
          ? ancestor.getNextSibling()
          : ancestor.getPreviousSibling();
        ancestor = ancestor.getParent();
        if (ancestor !== null) {
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

  getLatest(): this {
    const latest = $getNodeByKey(this.__key);
    if (latest === null) {
      invariant(false, 'getLatest: node not found');
    }
    return latest;
  }
  // $FlowFixMe this is LexicalNode
  getWritable(): this {
    errorOnReadOnly();
    const editorState = getActiveEditorState();
    const editor = getActiveEditor();
    const nodeMap = editorState._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const parent = latestNode.__parent;
    const cloneNotNeeded = editor._cloneNotNeeded;
    const selection = $getSelection();
    if (selection !== null) {
      selection._cachedNodes = null;
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const constructor = latestNode.constructor;
    const mutableNode = constructor.clone(latestNode);
    mutableNode.__parent = parent;
    if ($isElementNode(latestNode) && $isElementNode(mutableNode)) {
      mutableNode.__children = Array.from(latestNode.__children);
      mutableNode.__indent = latestNode.__indent;
      mutableNode.__format = latestNode.__format;
      mutableNode.__dir = latestNode.__dir;
    } else if ($isTextNode(latestNode) && $isTextNode(mutableNode)) {
      mutableNode.__format = latestNode.__format;
      mutableNode.__style = latestNode.__style;
      mutableNode.__mode = latestNode.__mode;
      mutableNode.__detail = latestNode.__detail;
    }
    cloneNotNeeded.add(key);
    mutableNode.__key = key;
    internalMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);
    // $FlowFixMe this is LexicalNode
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

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    invariant(false, 'createDOM: base method not extended');
  }

  updateDOM(
    // $FlowFixMe: TODO
    prevNode: any,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    invariant(false, 'updateDOM: base method not extended');
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    if ($isDecoratorNode(this)) {
      const element = editor.getElementByKey(this.getKey());
      return {element: element ? element.cloneNode() : null};
    }

    const element = this.createDOM(editor._config, editor);

    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  // Setters and mutators

  remove(preserveEmptyParent?: boolean): void {
    errorOnReadOnly();
    removeNode(this, true, preserveEmptyParent);
  }

  replace(replaceWith: LexicalNode): LexicalNode {
    errorOnReadOnly();
    const toReplaceKey = this.__key;
    const writableReplaceWith = replaceWith.getWritable();
    removeFromParent(writableReplaceWith);
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
    internalMarkSiblingsAsDirty(writableReplaceWith);
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor.key === toReplaceKey) {
        $moveSelectionPointToEnd(anchor, writableReplaceWith);
      }
      if (focus.key === toReplaceKey) {
        $moveSelectionPointToEnd(focus, writableReplaceWith);
      }
    }
    if ($getCompositionKey() === toReplaceKey) {
      $setCompositionKey(newKey);
    }
    return writableReplaceWith;
  }

  insertAfter(nodeToInsert: LexicalNode): LexicalNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const oldParent = writableNodeToInsert.getParent();
    const selection = $getSelection();
    const oldIndex = nodeToInsert.getIndexWithinParent();
    let elementAnchorSelectionOnNode = false;
    let elementFocusSelectionOnNode = false;
    if (oldParent !== null) {
      removeFromParent(writableNodeToInsert);
      if ($isRangeSelection(selection)) {
        const oldParentKey = oldParent.__key;
        const anchor = selection.anchor;
        const focus = selection.focus;
        elementAnchorSelectionOnNode =
          anchor.type === 'element' &&
          anchor.key === oldParentKey &&
          anchor.offset === oldIndex + 1;
        elementFocusSelectionOnNode =
          focus.type === 'element' &&
          focus.key === oldParentKey &&
          focus.offset === oldIndex + 1;
      }
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
    internalMarkSiblingsAsDirty(writableNodeToInsert);
    if ($isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(
        selection,
        writableParent,
        index + 1,
      );
      const writableParentKey = writableParent.__key;
      if (elementAnchorSelectionOnNode) {
        selection.anchor.set(writableParentKey, index + 2, 'element');
      }
      if (elementFocusSelectionOnNode) {
        selection.focus.set(writableParentKey, index + 2, 'element');
      }
    }
    return nodeToInsert;
  }

  insertBefore(nodeToInsert: LexicalNode): LexicalNode {
    errorOnReadOnly();
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    removeFromParent(writableNodeToInsert);
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const children = writableParent.__children;
    const index = children.indexOf(writableSelf.__key);
    if (index === -1) {
      invariant(false, 'Node is not a child of its parent');
    }
    children.splice(index, 0, insertKey);
    internalMarkSiblingsAsDirty(writableNodeToInsert);
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(
        selection,
        writableParent,
        index,
      );
    }
    return nodeToInsert;
  }

  selectPrevious(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if ($isElementNode(prevSibling)) {
      return prevSibling.select();
    } else if (!$isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return prevSibling.select(anchorOffset, focusOffset);
  }

  selectNext(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    const parent = this.getParentOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if ($isElementNode(nextSibling)) {
      return nextSibling.select(0, 0);
    } else if (!$isTextNode(nextSibling)) {
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

function errorOnTypeKlassMismatch(
  type: string,
  klass: Class<LexicalNode>,
): void {
  const registeredNode = getActiveEditor()._nodes.get(type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    invariant(
      false,
      'Create node: Attempted to create node %s that was not previously registered on the editor. You can use register your custom nodes.',
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
