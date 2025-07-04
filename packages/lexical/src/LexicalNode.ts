/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-constant-condition */
import type {
  EditorConfig,
  Klass,
  KlassConstructor,
  LexicalEditor,
} from './LexicalEditor'
import type { BaseSelection, RangeSelection } from './LexicalSelection'

import invariant from 'shared/invariant'

import { NODE_STATE_KEY, PROTOTYPE_CONFIG_METHOD } from './LexicalConstants'
import {
  $updateStateFromJSON,
  type NodeState,
  type NodeStateJSON,
  type Prettify,
  type RequiredNodeStateConfig,
} from './LexicalNodeState'
import {
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $moveSelectionPointToEnd,
  $updateElementSelectionOnCreateDeleteNode,
  moveSelectionPointToSibling,
} from './LexicalSelection'
import {
  errorOnReadOnly,
  getActiveEditor,
} from './LexicalUpdates'
import {
  $cloneWithProperties,
  $getCompositionKey,
  $isRootOrShadowRoot,
  $maybeMoveChildrenSelectionToParent,
  $setCompositionKey,
  $setNodeKey,
  $setSelection,
  errorOnInsertTextNodeOnRoot,
  getRegisteredNode,
  internalMarkNodeAsDirty,
  removeFromParent,
} from './LexicalUtils'
import { $isRootNode, RootNode } from './nodes/LexicalRootNode'
import { $isTextNode, TextNode } from './nodes/LexicalTextNode'
import { $isDecoratorNode, DecoratorNode } from './nodes/LexicalDecoratorNode'
import { $isElementNode, ElementNode } from './nodes/LexicalElementNode'
import { $getCommonAncestor, $getCommonAncestorResultBranchOrder } from './caret/LexicalCaret'
import { $createParagraphNode } from './nodes/LexicalParagraphNode'

export type NodeMap = Map<NodeKey, LexicalNode>

export type SerializedLexicalNode = {
  type: string
  version: number;
  [NODE_STATE_KEY]?: Record<string, unknown>
}

export interface StaticNodeConfigValue<
  T extends LexicalNode,
  Type extends string,
> {
  readonly type?: Type
  readonly $transform?: (node: T) => void
  readonly $importJSON?: (serializedNode: SerializedLexicalNode) => T
  readonly importDOM?: DOMConversionMap
  readonly stateConfigs?: readonly RequiredNodeStateConfig[]
  readonly extends?: Klass<LexicalNode>
}

export type BaseStaticNodeConfig = {
  readonly [K in string]?: StaticNodeConfigValue<LexicalNode, string>
}

export type StaticNodeConfig<
  T extends LexicalNode,
  Type extends string,
> = BaseStaticNodeConfig & {
  readonly [K in Type]?: StaticNodeConfigValue<T, Type>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStaticNodeConfigValue = StaticNodeConfigValue<any, any>

export type StaticNodeConfigRecord<
  Type extends string,
  Config extends AnyStaticNodeConfigValue,
> = BaseStaticNodeConfig & {
  readonly [K in Type]?: Config
}

export type GetStaticNodeType<T extends LexicalNode> = ReturnType<
  T[typeof PROTOTYPE_CONFIG_METHOD]
> extends StaticNodeConfig<T, infer Type>
  ? Type
  : string

export type LexicalExportJSON<T extends LexicalNode> = Prettify<
  Omit<ReturnType<T['exportJSON']>, 'type'> & {
    type: GetStaticNodeType<T>
  } & NodeStateJSON<T>
>

export type LexicalUpdateJSON<T extends SerializedLexicalNode> = Omit<
  T,
  'children' | 'type' | 'version'
>

export interface LexicalPrivateDOM {
  __lexicalTextContent?: string | undefined | null
  __lexicalLineBreak?: HTMLBRElement | HTMLImageElement | undefined | null
  __lexicalDirTextContent?: string | undefined | null
  __lexicalDir?: 'ltr' | 'rtl' | null | undefined
  __lexicalUnmanaged?: boolean | undefined
}

export function $removeNode(
  nodeToRemove: LexicalNode,
  restoreSelection: boolean,
  preserveEmptyParent?: boolean,
): void {
  errorOnReadOnly()
  const key = nodeToRemove.__key
  const parent = nodeToRemove.getParent()
  if (parent === null) {
    return
  }
  const selection = $maybeMoveChildrenSelectionToParent(nodeToRemove)
  let selectionMoved = false
  if ($isRangeSelection(selection) && restoreSelection) {
    const anchor = selection.anchor
    const focus = selection.focus
    if (anchor.key === key) {
      moveSelectionPointToSibling(
        anchor,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      )
      selectionMoved = true
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(
        focus,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      )
      selectionMoved = true
    }
  } else if (
    $isNodeSelection(selection) &&
    restoreSelection &&
    nodeToRemove.isSelected()
  ) {
    nodeToRemove.selectPrevious()
  }

  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    const index = nodeToRemove.getIndexWithinParent()
    removeFromParent(nodeToRemove)
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1)
  } else {
    removeFromParent(nodeToRemove)
  }

  if (
    !preserveEmptyParent &&
    !$isRootOrShadowRoot(parent) &&
    !parent.canBeEmpty() &&
    parent.isEmpty()
  ) {
    $removeNode(parent, restoreSelection)
  }
  if (
    restoreSelection &&
    selection &&
    $isRootNode(parent) &&
    parent.isEmpty()
  ) {
    parent.selectEnd()
  }
}

export type DOMConversionProp<T extends HTMLElement> = (
  node: T,
) => DOMConversion<T> | null

export type DOMConversionPropByTagName<K extends string> = DOMConversionProp<
  K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : HTMLElement
>

export type DOMConversionTagNameMap<K extends string> = {
  [NodeName in K]?: DOMConversionPropByTagName<NodeName>
}

export function buildImportMap<K extends string>(importMap: {
  [NodeName in K]: DOMConversionPropByTagName<NodeName>
}): DOMConversionMap {
  return importMap as unknown as DOMConversionMap
}

export type DOMConversion<T extends HTMLElement = HTMLElement> = {
  conversion: DOMConversionFn<T>
  priority?: 0 | 1 | 2 | 3 | 4
}

export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (
  element: T,
) => DOMConversionOutput | null

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined

export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<
  NodeName,
  DOMConversionProp<T>
>
type NodeName = string

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>
  forChild?: DOMChildConversion
  node: null | LexicalNode | Array<LexicalNode>
}

export type DOMExportOutputMap = Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | DocumentFragment | Text | null | undefined,
  ) => HTMLElement | DocumentFragment | Text | null | undefined
  element: HTMLElement | DocumentFragment | Text | null
}

export type NodeKey = string

export class LexicalNode {
  ['constructor']!: KlassConstructor<typeof LexicalNode>
  __type: string
  __key!: string
  __parent: null | NodeKey
  __prev: null | NodeKey
  __next: null | NodeKey
  __state?: NodeState<this>

  static getType(): string {
    invariant(false, `LexicalNode: Node ${this.name} does not implement .getType().`);
    return '';
  }

  static clone(_data: unknown): LexicalNode {
    invariant(false, `LexicalNode: Node ${this.name} does not implement .clone().`);
    // @ts-ignore
    return new this();
  }

  $config(): BaseStaticNodeConfig {
    return {}
  }

  config<Type extends string, Config extends StaticNodeConfigValue<this, Type>>(
    type: Type,
    config: Config,
  ): StaticNodeConfigRecord<Type, Config> {
    const parentKlass =
      config.extends || Object.getPrototypeOf(this.constructor)
    Object.assign(config, { extends: parentKlass, type })
    return { [type]: config } as StaticNodeConfigRecord<Type, Config>
  }

  afterCloneFrom(prevNode: this): void {
    if (this.__key === prevNode.__key) {
      this.__parent = prevNode.__parent
      this.__next = prevNode.__next
      this.__prev = prevNode.__prev
      this.__state = prevNode.__state
    } else if (prevNode.__state) {
      this.__state = prevNode.__state.getWritable(this)
    }
  }

  static importDOM?: () => DOMConversionMap<any> | null

  constructor(key?: NodeKey) {
    this.__type = (this.constructor as typeof LexicalNode).getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
    Object.defineProperty(this, '__state', {
      configurable: true,
      enumerable: false,
      value: undefined,
      writable: true,
    });
    $setNodeKey(this, key);

    if (__DEV__) {
      if (this.__type !== 'root') {
        errorOnReadOnly();
        const editor = getActiveEditor();
        errorOnTypeKlassMismatch(this.__type, this.constructor as typeof LexicalNode, editor);
      }
    }
  }

  getType(): string {
    return this.__type;
  }

  isInline(): boolean {
    invariant(false, `LexicalNode: Node ${this.constructor.name} does not implement .isInline().`);
    return false;
  }

  isAttached(): boolean {
    let curr: LexicalNode | null = this;
    while (curr !== null) {
      if (curr.getKey() === 'root') {
        return true;
      }
      curr = curr.getParent();
    }
    return false;
  }

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
    const isElementRangeSelection =
      $isRangeSelection(targetSelection) &&
      targetSelection.anchor.type === 'element' &&
      targetSelection.focus.type === 'element';

    if (isElementRangeSelection) {
      if (targetSelection.isCollapsed()) {
        return false;
      }
      const parentNode = this.getParent();
      if ($isDecoratorNode(this) && this.isInline() && parentNode) {
        const firstPoint = targetSelection.isBackward()
          ? targetSelection.focus
          : targetSelection.anchor;
        if (
          parentNode.is(firstPoint.getNode()) &&
          firstPoint.offset === (parentNode as ElementNode).getChildrenSize() && // Cast for getChildrenSize
          this.is((parentNode as ElementNode).getLastChild())
        ) {
          return false;
        }
      }
    }
    return isSelected;
  }

  getKey(): NodeKey {
    return this.__key;
  }

  getIndexWithinParent(): number {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = (parent as ElementNode).getFirstChild();
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

  getLatest(): this {
    invariant(false, 'LexicalNode.getLatest() stub called. Implementation should be provided by augmentation.');
    // @ts-ignore
    return this;
  }

  getParent<T extends ElementNode>(): T | null {
    invariant(false, 'LexicalNode.getParent() stub called. Implementation should be provided by augmentation.');
    return null;
  }

  getPreviousSibling<T extends LexicalNode>(): T | null {
    invariant(false, 'LexicalNode.getPreviousSibling() stub called. Implementation should be provided by augmentation.');
    return null;
  }

  getNextSibling<T extends LexicalNode>(): T | null {
    invariant(false, 'LexicalNode.getNextSibling() stub called. Implementation should be provided by augmentation.');
    return null;
  }

  getParentOrThrow<T extends ElementNode>(): T {
    const parent = this.getParent<T>();
    if (parent === null) {
      invariant(false, `Expected node ${this.__key} to have a parent.`);
    }
    return parent;
  }

  getTopLevelElement(): ElementNode | DecoratorNode<unknown> | null {
    let node: ElementNode | LexicalNode | null = this;
    while (node !== null) {
      const parent: ElementNode | null = node.getParent();
      if ($isRootOrShadowRoot(parent)) {
        invariant(
          $isElementNode(node) || (node === this && $isDecoratorNode(node)),
          'Children of root nodes must be elements or decorators',
        );
        return node as ElementNode | DecoratorNode<unknown>;
      }
      node = parent;
    }
    return null;
  }

  getTopLevelElementOrThrow(): ElementNode | DecoratorNode<unknown> {
    const parent = this.getTopLevelElement();
    if (parent === null) {
      invariant(false, `Expected node ${this.__key} to have a top parent element.`);
    }
    return parent;
  }

  getParents(): Array<ElementNode> {
    const parents: Array<ElementNode> = [];
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

  getPreviousSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = [];
    const parent = this.getParent();
    if (parent === null) {
      return siblings;
    }
    let node: null | T = (parent as ElementNode).getFirstChild() as T | null;
    while (node !== null) {
      if (node.is(this)) {
        break;
      }
      siblings.push(node);
      node = node.getNextSibling() as T | null;
    }
    return siblings;
  }

  getNextSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = [];
    let node: null | T = this.getNextSibling() as T | null;
    while (node !== null) {
      siblings.push(node);
      node = node.getNextSibling() as T | null;
    }
    return siblings;
  }

  getCommonAncestor<T extends ElementNode = ElementNode>(node: LexicalNode): T | null {
    const a = $isElementNode(this) ? this : this.getParent();
    const b = $isElementNode(node) ? node : node.getParent();
    const result = a && b ? $getCommonAncestor(a, b) : null;
    return result
      ? (result.commonAncestor as T)
      : null;
  }

  is(object: LexicalNode | null | undefined): boolean {
    if (object == null) {
      return false;
    }
    return this.__key === object.__key;
  }

  isBefore(targetNode: LexicalNode): boolean {
    const compare = $getCommonAncestor(this, targetNode);
    if (compare === null) {
      return false;
    }
    if (compare.type === 'descendant') {
      return true;
    }
    if (compare.type === 'branch') {
      return $getCommonAncestorResultBranchOrder(compare) === -1;
    }
    invariant(
      compare.type === 'same' || compare.type === 'ancestor',
      'LexicalNode.isBefore: exhaustiveness check',
    );
    return false;
  }

  isParentOf(targetNode: LexicalNode): boolean {
    const result = $getCommonAncestor(this, targetNode);
    return result !== null && result.type === 'ancestor';
  }

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
          ? (node as ElementNode).getFirstChild()
          : (node as ElementNode).getLastChild()
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

  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyLeaves = editor._dirtyLeaves;
    // Added null check for dirtyLeaves as per original, it might be initially null.
    return (dirtyLeaves !== null && dirtyLeaves.has(this.__key)) || editor._dirtyElements.has(this.__key);
  }

  getWritable(): this {
    invariant(false, 'LexicalNode.getWritable() stub called. Implementation should be provided by augmentation.');
    // @ts-ignore
    return this;
  }

  getTextContent(): string {
    return '';
  }

  getTextContentSize(): number {
    return this.getTextContent().length;
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    invariant(false, 'createDOM: base method not extended');
    // @ts-ignore
    return null;
  }

  updateDOM(
    _prevNode: unknown,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    invariant(false, 'updateDOM: base method not extended');
    return false;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config, editor);
    return { element };
  }

  exportJSON(): SerializedLexicalNode {
    const state = this.__state ? this.__state.toJSON() : undefined;
    return {
      type: this.__type,
      version: 1,
      ...state,
    };
  }

  static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode {
    invariant(false, `LexicalNode: Node ${this.name} does not implement .importJSON().`);
    // @ts-ignore
    return new this();
  }

  updateFromJSON( serializedNode: LexicalUpdateJSON<SerializedLexicalNode>): this {
    return $updateStateFromJSON(this, serializedNode[NODE_STATE_KEY]);
  }

  static transform(): ((node: LexicalNode) => void) | null {
    return null;
  }

  remove(preserveEmptyParent?: boolean): void {
    $removeNode(this, true, preserveEmptyParent);
  }

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
      (this as unknown as ElementNode).getChildren().forEach((child: LexicalNode) => {
        (writableReplaceWith as unknown as ElementNode).append(child);
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

  insertBefore(nodeToInsert: LexicalNode, restoreSelection = true): LexicalNode {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const insertKey = writableNodeToInsert.__key;
    removeFromParent(writableNodeToInsert);
    const prevSibling = this.getPreviousSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const prevKey = writableSelf.__prev;
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

  isParentRequired(): boolean {
    return false;
  }

  createParentElementNode(): ElementNode {
    return $createParagraphNode();
  }

  selectStart(): RangeSelection {
    return this.selectPrevious();
  }

  selectEnd(): RangeSelection {
    return this.selectNext(0, 0);
  }

  selectPrevious(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if ($isElementNode(prevSibling)) {
      return (prevSibling as ElementNode).select();
    } else if (!$isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return (prevSibling as TextNode).select(anchorOffset, focusOffset);
  }

  selectNext(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    const parent = this.getParentOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if ($isElementNode(nextSibling)) {
      return (nextSibling as ElementNode).select(0, 0);
    } else if (!$isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent();
      return parent.select(index, index);
    }
    return (nextSibling as TextNode).select(anchorOffset, focusOffset);
  }

  markDirty(): void {
    this.getWritable();
  }

  reconcileObservedMutation(dom: HTMLElement, editor: LexicalEditor): void {
    this.markDirty();
  }
}

function errorOnTypeKlassMismatch(
  type: string,
  klass: Klass<LexicalNode>,
  editor: LexicalEditor,
): void {
  const registeredNode = getRegisteredNode(editor, type);
  if (registeredNode === undefined) {
    invariant(false, `Create node: Attempted to create node ${klass.name} that was not configured to be used on the editor.`);
  }
  const editorKlass = registeredNode.klass;
  if (editorKlass !== klass) {
    invariant(false, `Create node: Type ${type} in node ${klass.name} does not match registered node ${editorKlass.name} with the same type`);
  }
}

export function insertRangeAfter(
  node: LexicalNode,
  firstToInsert: LexicalNode,
  lastToInsert?: LexicalNode,
) {
  const lastToInsert2 =
    lastToInsert || (firstToInsert.getParentOrThrow() as ElementNode).getLastChild()!;
  let current = firstToInsert;
  const nodesToInsert = [firstToInsert];
  while (current !== lastToInsert2) {
    if (!current.getNextSibling()) {
      invariant(false, 'insertRangeAfter: lastToInsert must be a later sibling of firstToInsert');
    }
    current = current.getNextSibling()!;
    nodesToInsert.push(current);
  }

  let currentNode: LexicalNode = node;
  for (const nodeToInsert of nodesToInsert) {
    currentNode = currentNode.insertAfter(nodeToInsert);
  }
}
