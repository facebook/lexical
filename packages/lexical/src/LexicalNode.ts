/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-constant-condition */
import type {EditorConfig, LexicalEditor} from './LexicalEditor';
import type {BaseSelection, RangeSelection} from './LexicalSelection';
import type {Klass, KlassConstructor} from 'lexical';

import invariant from 'shared/invariant';

import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isRootNode,
  $isTextNode,
  ElementNode,
} from '.';
import {
  $getSelection,
  $isNodeSelection,
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
  $isRootOrShadowRoot,
  $maybeMoveChildrenSelectionToParent,
  $setCompositionKey,
  $setNodeKey,
  $setSelection,
  errorOnInsertTextNodeOnRoot,
  internalMarkNodeAsDirty,
  removeFromParent,
} from './LexicalUtils';

export type NodeMap = Map<NodeKey, LexicalNode>;

export type SerializedLexicalNode = {
  type: string;
  version: number;
};

export function $removeNode(
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
  const selection = $maybeMoveChildrenSelectionToParent(nodeToRemove);
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
  } else if (
    $isNodeSelection(selection) &&
    restoreSelection &&
    nodeToRemove.isSelected()
  ) {
    nodeToRemove.selectPrevious();
  }

  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    // Doing this is O(n) so lets avoid it unless we need to do it
    const index = nodeToRemove.getIndexWithinParent();
    removeFromParent(nodeToRemove);
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1);
  } else {
    removeFromParent(nodeToRemove);
  }

  if (
    !preserveEmptyParent &&
    !$isRootOrShadowRoot(parent) &&
    !parent.canBeEmpty() &&
    parent.isEmpty()
  ) {
    $removeNode(parent, restoreSelection);
  }
  if (restoreSelection && $isRootNode(parent) && parent.isEmpty()) {
    parent.selectEnd();
  }
}

export type DOMConversion<T extends HTMLElement = HTMLElement> = {
  conversion: DOMConversionFn<T>;
  priority?: 0 | 1 | 2 | 3 | 4;
};

export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (
  element: T,
) => DOMConversionOutput | null;

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined;

export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<
  NodeName,
  (node: T) => DOMConversion<T> | null
>;
type NodeName = string;

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | Text | null | undefined,
  ) => HTMLElement | Text | null | undefined;
  element: HTMLElement | Text | null;
};

export type NodeKey = string;

export class LexicalNode {
  // Allow us to look up the type including static props
  ['constructor']!: KlassConstructor<typeof LexicalNode>;
  /** @internal */
  __type: string;
  /** @internal */
  //@ts-ignore We set the key in the constructor.
  __key: string;
  /** @internal */
  __parent: null | NodeKey;
  /** @internal */
  __prev: null | NodeKey;
  /** @internal */
  __next: null | NodeKey;

  // Flow doesn't support abstract classes unfortunately, so we can't _force_
  // subclasses of Node to implement statics. All subclasses of Node should have
  // a static getType and clone method though. We define getType and clone here so we can call it
  // on any  Node, and we throw this error by default since the subclass should provide
  // their own implementation.
  /**
   * Returns the string type of this node. Every node must
   * implement this and it MUST BE UNIQUE amongst nodes registered
   * on the editor.
   *
   */
  static getType(): string {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .getType().',
      this.name,
    );
  }

  /**
   * Clones this node, creating a new node with a different key
   * and adding it to the EditorState (but not attaching it anywhere!). All nodes must
   * implement this method.
   *
   */
  static clone(_data: unknown): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .clone().',
      this.name,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static importDOM?: () => DOMConversionMap<any> | null;

  constructor(key?: NodeKey) {
    this.__type = this.constructor.getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
    $setNodeKey(this, key);

    if (__DEV__) {
      if (this.__type !== 'root') {
        errorOnReadOnly();
        errorOnTypeKlassMismatch(this.__type, this.constructor);
      }
    }
  }
  // Getters and Traversers

  /**
   * Returns the string type of this node.
   */
  getType(): string {
    return this.__type;
  }

  isInline(): boolean {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .isInline().',
      this.constructor.name,
    );
  }

  /**
   * Returns true if there is a path between this node and the RootNode, false otherwise.
   * This is a way of determining if the node is "attached" EditorState. Unattached nodes
   * won't be reconciled and will ultimatelt be cleaned up by the Lexical GC.
   */
  isAttached(): boolean {
    let nodeKey: string | null = this.__key;
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true;
      }

      const node: LexicalNode | null = $getNodeByKey(nodeKey);

      if (node === null) {
        break;
      }
      nodeKey = node.__parent;
    }
    return false;
  }

  /**
   * Returns true if this node is contained within the provided Selection., false otherwise.
   * Relies on the algorithms implemented in {@link BaseSelection.getNodes} to determine
   * what's included.
   *
   * @param selection - The selection that we want to determine if the node is in.
   */
  isSelected(selection?: null | BaseSelection): boolean {
    const targetSelection = selection || $getSelection();
    if (targetSelection == null) {
      return false;
    }

    const isSelected = targetSelection
      .getNodes()
      .some((n) => n.__key === this.__key);

    if ($isTextNode(this)) {
      return isSelected;
    }
    // For inline images inside of element nodes.
    // Without this change the image will be selected if the cursor is before or after it.
    if (
      $isRangeSelection(targetSelection) &&
      targetSelection.anchor.type === 'element' &&
      targetSelection.focus.type === 'element' &&
      targetSelection.anchor.key === targetSelection.focus.key &&
      targetSelection.anchor.offset === targetSelection.focus.offset
    ) {
      return false;
    }
    return isSelected;
  }

  /**
   * Returns this nodes key.
   */
  getKey(): NodeKey {
    // Key is stable between copies
    return this.__key;
  }

  /**
   * Returns the zero-based index of this node within the parent.
   */
  getIndexWithinParent(): number {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = parent.getFirstChild();
    let index = 0;
    while (node !== null) {
      if (this.is(node)) {
        return index;
      }
      index++;
      node = node.getNextSibling();
    }
    return -1;
  }

  /**
   * Returns the parent of this node, or null if none is found.
   */
  getParent<T extends ElementNode>(): T | null {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    return $getNodeByKey<T>(parent);
  }

  /**
   * Returns the parent of this node, or throws if none is found.
   */
  getParentOrThrow<T extends ElementNode>(): T {
    const parent = this.getParent<T>();
    if (parent === null) {
      invariant(false, 'Expected node %s to have a parent.', this.__key);
    }
    return parent;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or null if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
  getTopLevelElement(): ElementNode | null {
    let node: ElementNode | this | null = this;
    while (node !== null) {
      const parent: ElementNode | null = node.getParent();
      if ($isRootOrShadowRoot(parent)) {
        invariant(
          $isElementNode(node),
          'Children of root nodes must be elements',
        );
        return node;
      }
      node = parent;
    }
    return null;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or throws if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
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

  /**
   * Returns a list of the every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParents(): Array<ElementNode> {
    const parents: Array<ElementNode> = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns a list of the keys of every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParentKeys(): Array<NodeKey> {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node.__key);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns the "previous" siblings - that is, the node that comes
   * before this one in the same parent.
   *
   */
  getPreviousSibling<T extends LexicalNode>(): T | null {
    const self = this.getLatest();
    const prevKey = self.__prev;
    return prevKey === null ? null : $getNodeByKey<T>(prevKey);
  }

  /**
   * Returns the "previous" siblings - that is, the nodes that come between
   * this one and the first child of it's parent, inclusive.
   *
   */
  getPreviousSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = [];
    const parent = this.getParent();
    if (parent === null) {
      return siblings;
    }
    let node: null | T = parent.getFirstChild();
    while (node !== null) {
      if (node.is(this)) {
        break;
      }
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * Returns the "next" siblings - that is, the node that comes
   * after this one in the same parent
   *
   */
  getNextSibling<T extends LexicalNode>(): T | null {
    const self = this.getLatest();
    const nextKey = self.__next;
    return nextKey === null ? null : $getNodeByKey<T>(nextKey);
  }

  /**
   * Returns all "next" siblings - that is, the nodes that come between this
   * one and the last child of it's parent, inclusive.
   *
   */
  getNextSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = [];
    let node: null | T = this.getNextSibling();
    while (node !== null) {
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * Returns the closest common ancestor of this node and the provided one or null
   * if one cannot be found.
   *
   * @param node - the other node to find the common ancestor of.
   */
  getCommonAncestor<T extends ElementNode = ElementNode>(
    node: LexicalNode,
  ): T | null {
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
      const ancestor = a[i] as T;
      if (bSet.has(ancestor)) {
        return ancestor;
      }
    }
    return null;
  }

  /**
   * Returns true if the provided node is the exact same one as this node, from Lexical's perspective.
   * Always use this instead of referential equality.
   *
   * @param object - the node to perform the equality comparison on.
   */
  is(object: LexicalNode | null | undefined): boolean {
    if (object == null) {
      return false;
    }
    return this.__key === object.__key;
  }

  /**
   * Returns true if this node logical precedes the target node in the editor state.
   *
   * @param targetNode - the node we're testing to see if it's after this one.
   */
  isBefore(targetNode: LexicalNode): boolean {
    if (this === targetNode) {
      return false;
    }
    if (targetNode.isParentOf(this)) {
      return true;
    }
    if (this.isParentOf(targetNode)) {
      return false;
    }
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node: this | ElementNode | LexicalNode = this;
    while (true) {
      const parent: ElementNode = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexA = node.getIndexWithinParent();
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent: ElementNode = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexB = node.getIndexWithinParent();
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  }

  /**
   * Returns true if this node is the parent of the target node, false otherwise.
   *
   * @param targetNode - the would-be child node.
   */
  isParentOf(targetNode: LexicalNode): boolean {
    const key = this.__key;
    if (key === targetNode.__key) {
      return false;
    }
    let node: ElementNode | LexicalNode | null = targetNode;
    while (node !== null) {
      if (node.__key === key) {
        return true;
      }
      node = node.getParent();
    }
    return false;
  }

  // TO-DO: this function can be simplified a lot
  /**
   * Returns a list of nodes that are between this node and
   * the target node in the EditorState.
   *
   * @param targetNode - the node that marks the other end of the range of nodes to be returned.
   */
  getNodesBetween(targetNode: LexicalNode): Array<LexicalNode> {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];
    const visited = new Set();
    let node: LexicalNode | this | null = this;
    while (true) {
      if (node === null) {
        break;
      }
      const key = node.__key;
      if (!visited.has(key)) {
        visited.add(key);
        nodes.push(node);
      }
      if (node === targetNode) {
        break;
      }
      const child: LexicalNode | null = $isElementNode(node)
        ? isBefore
          ? node.getFirstChild()
          : node.getLastChild()
        : null;
      if (child !== null) {
        node = child;
        continue;
      }
      const nextSibling: LexicalNode | null = isBefore
        ? node.getNextSibling()
        : node.getPreviousSibling();
      if (nextSibling !== null) {
        node = nextSibling;
        continue;
      }
      const parent: LexicalNode | null = node.getParentOrThrow();
      if (!visited.has(parent.__key)) {
        nodes.push(parent);
      }
      if (parent === targetNode) {
        break;
      }
      let parentSibling = null;
      let ancestor: LexicalNode | null = parent;
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
        } else {
          break;
        }
      } while (parentSibling === null);
      node = parentSibling;
    }
    if (!isBefore) {
      nodes.reverse();
    }
    return nodes;
  }

  /**
   * Returns true if this node has been marked dirty during this update cycle.
   *
   */
  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyLeaves = editor._dirtyLeaves;
    return dirtyLeaves !== null && dirtyLeaves.has(this.__key);
  }

  /**
   * Returns the latest version of the node from the active EditorState.
   * This is used to avoid getting values from stale node references.
   *
   */
  getLatest(): this {
    const latest = $getNodeByKey<this>(this.__key);
    if (latest === null) {
      invariant(
        false,
        'Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.',
      );
    }
    return latest;
  }

  /**
   * Returns a mutable version of the node. Will throw an error if
   * called outside of a Lexical Editor {@link LexicalEditor.update} callback.
   *
   */
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
      selection.setCachedNodes(null);
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const constructor = latestNode.constructor;
    const mutableNode = constructor.clone(latestNode);
    mutableNode.__parent = parent;
    mutableNode.__next = latestNode.__next;
    mutableNode.__prev = latestNode.__prev;
    if ($isElementNode(latestNode) && $isElementNode(mutableNode)) {
      if ($isParagraphNode(latestNode) && $isParagraphNode(mutableNode)) {
        mutableNode.__textFormat = latestNode.__textFormat;
      }
      mutableNode.__first = latestNode.__first;
      mutableNode.__last = latestNode.__last;
      mutableNode.__size = latestNode.__size;
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

    // @ts-expect-error
    return mutableNode;
  }

  /**
   * Returns the text content of the node. Override this for
   * custom nodes that should have a representation in plain text
   * format (for copy + paste, for example)
   *
   */
  getTextContent(): string {
    return '';
  }

  /**
   * Returns the length of the string produced by calling getTextContent on this node.
   *
   */
  getTextContentSize(): number {
    return this.getTextContent().length;
  }

  // View

  /**
   * Called during the reconciliation process to determine which nodes
   * to insert into the DOM for this Lexical Node.
   *
   * This method must return exactly one HTMLElement. Nested elements are not supported.
   *
   * Do not attempt to update the Lexical EditorState during this phase of the update lifecyle.
   *
   * @param _config - allows access to things like the EditorTheme (to apply classes) during reconciliation.
   * @param _editor - allows access to the editor for context during reconciliation.
   *
   * */
  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    invariant(false, 'createDOM: base method not extended');
  }

  /**
   * Called when a node changes and should update the DOM
   * in whatever way is necessary to make it align with any changes that might
   * have happened during the update.
   *
   * Returning "true" here will cause lexical to unmount and recreate the DOM node
   * (by calling createDOM). You would need to do this if the element tag changes,
   * for instance.
   *
   * */
  updateDOM(
    _prevNode: unknown,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    invariant(false, 'updateDOM: base method not extended');
  }

  /**
   * Controls how the this node is serialized to HTML. This is important for
   * copy and paste between Lexical and non-Lexical editors, or Lexical editors with different namespaces,
   * in which case the primary transfer format is HTML. It's also important if you're serializing
   * to HTML for any other reason via {@link @lexical/html!$generateHtmlFromNodes}. You could
   * also use this method to build your own HTML renderer.
   *
   * */
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config, editor);
    return {element};
  }

  /**
   * Controls how the this node is serialized to JSON. This is important for
   * copy and paste between Lexical editors sharing the same namespace. It's also important
   * if you're serializing to JSON for persistent storage somewhere.
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  exportJSON(): SerializedLexicalNode {
    invariant(false, 'exportJSON: base method not extended');
  }

  /**
   * Controls how the this node is deserialized from JSON. This is usually boilerplate,
   * but provides an abstraction between the node implementation and serialized interface that can
   * be important if you ever make breaking changes to a node schema (by adding or removing properties).
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .importJSON().',
      this.name,
    );
  }
  /**
   * @experimental
   *
   * Registers the returned function as a transform on the node during
   * Editor initialization. Most such use cases should be addressed via
   * the {@link LexicalEditor.registerNodeTransform} API.
   *
   * Experimental - use at your own risk.
   */
  static transform(): ((node: LexicalNode) => void) | null {
    return null;
  }

  // Setters and mutators

  /**
   * Removes this LexicalNode from the EditorState. If the node isn't re-inserted
   * somewhere, the Lexical garbage collector will eventually clean it up.
   *
   * @param preserveEmptyParent - If falsy, the node's parent will be removed if
   * it's empty after the removal operation. This is the default behavior, subject to
   * other node heuristics such as {@link ElementNode#canBeEmpty}
   * */
  remove(preserveEmptyParent?: boolean): void {
    $removeNode(this, true, preserveEmptyParent);
  }

  /**
   * Replaces this LexicalNode with the provided node, optionally transferring the children
   * of the replaced node to the replacing node.
   *
   * @param replaceWith - The node to replace this one with.
   * @param includeChildren - Whether or not to transfer the children of this node to the replacing node.
   * */
  replace<N extends LexicalNode>(replaceWith: N, includeChildren?: boolean): N {
    errorOnReadOnly();
    let selection = $getSelection();
    if (selection !== null) {
      selection = selection.clone();
    }
    errorOnInsertTextNodeOnRoot(this, replaceWith);
    const self = this.getLatest();
    const toReplaceKey = this.__key;
    const key = replaceWith.__key;
    const writableReplaceWith = replaceWith.getWritable();
    const writableParent = this.getParentOrThrow().getWritable();
    const size = writableParent.__size;
    removeFromParent(writableReplaceWith);
    const prevSibling = self.getPreviousSibling();
    const nextSibling = self.getNextSibling();
    const prevKey = self.__prev;
    const nextKey = self.__next;
    const parentKey = self.__parent;
    $removeNode(self, false, true);

    if (prevSibling === null) {
      writableParent.__first = key;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = key;
    }
    writableReplaceWith.__prev = prevKey;
    if (nextSibling === null) {
      writableParent.__last = key;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = key;
    }
    writableReplaceWith.__next = nextKey;
    writableReplaceWith.__parent = parentKey;
    writableParent.__size = size;
    if (includeChildren) {
      invariant(
        $isElementNode(this) && $isElementNode(writableReplaceWith),
        'includeChildren should only be true for ElementNodes',
      );
      this.getChildren().forEach((child: LexicalNode) => {
        writableReplaceWith.append(child);
      });
    }
    if ($isRangeSelection(selection)) {
      $setSelection(selection);
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
      $setCompositionKey(key);
    }
    return writableReplaceWith;
  }

  /**
   * Inserts a node after this LexicalNode (as the next sibling).
   *
   * @param nodeToInsert - The node to insert after this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertAfter(nodeToInsert: LexicalNode, restoreSelection = true): LexicalNode {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const oldParent = writableNodeToInsert.getParent();
    const selection = $getSelection();
    let elementAnchorSelectionOnNode = false;
    let elementFocusSelectionOnNode = false;
    if (oldParent !== null) {
      // TODO: this is O(n), can we improve?
      const oldIndex = nodeToInsert.getIndexWithinParent();
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
    const nextSibling = this.getNextSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    const nextKey = writableSelf.__next;
    if (nextSibling === null) {
      writableParent.__last = insertKey;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = insertKey;
    }
    writableParent.__size++;
    writableSelf.__next = insertKey;
    writableNodeToInsert.__next = nextKey;
    writableNodeToInsert.__prev = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    if (restoreSelection && $isRangeSelection(selection)) {
      const index = this.getIndexWithinParent();
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

  /**
   * Inserts a node before this LexicalNode (as the previous sibling).
   *
   * @param nodeToInsert - The node to insert before this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertBefore(
    nodeToInsert: LexicalNode,
    restoreSelection = true,
  ): LexicalNode {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const insertKey = writableNodeToInsert.__key;
    removeFromParent(writableNodeToInsert);
    const prevSibling = this.getPreviousSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const prevKey = writableSelf.__prev;
    // TODO: this is O(n), can we improve?
    const index = this.getIndexWithinParent();
    if (prevSibling === null) {
      writableParent.__first = insertKey;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = insertKey;
    }
    writableParent.__size++;
    writableSelf.__prev = insertKey;
    writableNodeToInsert.__prev = prevKey;
    writableNodeToInsert.__next = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const selection = $getSelection();
    if (restoreSelection && $isRangeSelection(selection)) {
      const parent = this.getParentOrThrow();
      $updateElementSelectionOnCreateDeleteNode(selection, parent, index);
    }
    return nodeToInsert;
  }

  /**
   * Whether or not this node has a required parent. Used during copy + paste operations
   * to normalize nodes that would otherwise be orphaned. For example, ListItemNodes without
   * a ListNode parent or TextNodes with a ParagraphNode parent.
   *
   * */
  isParentRequired(): boolean {
    return false;
  }

  /**
   * The creation logic for any required parent. Should be implemented if {@link isParentRequired} returns true.
   *
   * */
  createParentElementNode(): ElementNode {
    return $createParagraphNode();
  }

  selectStart(): RangeSelection {
    return this.selectPrevious();
  }

  selectEnd(): RangeSelection {
    return this.selectNext(0, 0);
  }

  /**
   * Moves selection to the previous sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
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

  /**
   * Moves selection to the next sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
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

  /**
   * Marks a node dirty, triggering transforms and
   * forcing it to be reconciled during the update cycle.
   *
   * */
  markDirty(): void {
    this.getWritable();
  }
}

function errorOnTypeKlassMismatch(
  type: string,
  klass: Klass<LexicalNode>,
): void {
  const registeredNode = getActiveEditor()._nodes.get(type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    invariant(
      false,
      'Create node: Attempted to create node %s that was not configured to be used on the editor.',
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

/**
 * Insert a series of nodes after this LexicalNode (as next siblings)
 *
 * @param firstToInsert - The first node to insert after this one.
 * @param lastToInsert - The last node to insert after this one. Must be a
 * later sibling of FirstNode. If not provided, it will be its last sibling.
 */
export function insertRangeAfter(
  node: LexicalNode,
  firstToInsert: LexicalNode,
  lastToInsert?: LexicalNode,
) {
  const lastToInsert2 =
    lastToInsert || firstToInsert.getParentOrThrow().getLastChild()!;
  let current = firstToInsert;
  const nodesToInsert = [firstToInsert];
  while (current !== lastToInsert2) {
    if (!current.getNextSibling()) {
      invariant(
        false,
        'insertRangeAfter: lastToInsert must be a later sibling of firstToInsert',
      );
    }
    current = current.getNextSibling()!;
    nodesToInsert.push(current);
  }

  let currentNode: LexicalNode = node;
  for (const nodeToInsert of nodesToInsert) {
    currentNode = currentNode.insertAfter(nodeToInsert);
  }
}
