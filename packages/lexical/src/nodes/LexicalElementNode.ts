/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  LexicalPrivateDOM,
  NodeKey,
  SerializedLexicalNode,
} from '../LexicalNode';
import type {
  BaseSelection,
  PointType,
  RangeSelection,
} from '../LexicalSelection';
import type {
  KlassConstructor,
  LexicalEditor,
  LexicalUpdateJSON,
  Spread,
  TextFormatType,
} from 'lexical';

import {IS_IOS, IS_SAFARI} from 'shared/environment';
import invariant from 'shared/invariant';

import {$isTextNode, TextNode} from '../index';
import {
  DOUBLE_LINE_BREAK,
  ELEMENT_FORMAT_TO_TYPE,
  ELEMENT_TYPE_TO_FORMAT,
  TEXT_TYPE_TO_FORMAT,
} from '../LexicalConstants';
import {LexicalNode} from '../LexicalNode';
import {
  $getSelection,
  $internalMakeRangeSelection,
  $isRangeSelection,
  moveSelectionPointToSibling,
} from '../LexicalSelection';
import {errorOnReadOnly, getActiveEditor} from '../LexicalUpdates';
import {
  $getNodeByKey,
  $isRootOrShadowRoot,
  isHTMLElement,
  removeFromParent,
  toggleTextFormatType,
} from '../LexicalUtils';

export type SerializedElementNode<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> = Spread<
  {
    children: Array<T>;
    direction: 'ltr' | 'rtl' | null;
    format: ElementFormatType;
    indent: number;
    textFormat?: number;
    textStyle?: string;
  },
  SerializedLexicalNode
>;

export type ElementFormatType =
  | 'left'
  | 'start'
  | 'center'
  | 'right'
  | 'end'
  | 'justify'
  | '';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ElementNode {
  getTopLevelElement(): ElementNode | null;
  getTopLevelElementOrThrow(): ElementNode;
}

/**
 * A utility class for managing the DOM children of an ElementNode
 */
export class ElementDOMSlot {
  element: HTMLElement;
  before: Node | null;
  after: Node | null;
  constructor(
    /** The element returned by createDOM */
    element: HTMLElement,
    /** All managed children will be inserted before this node, if defined */
    before?: Node | undefined | null,
    /** All managed children will be inserted after this node, if defined */
    after?: Node | undefined | null,
  ) {
    this.element = element;
    this.before = before || null;
    this.after = after || null;
  }
  /**
   * Return a new ElementDOMSlot where all managed children will be inserted before this node
   */
  withBefore(before: Node | undefined | null): ElementDOMSlot {
    return new ElementDOMSlot(this.element, before, this.after);
  }
  /**
   * Return a new ElementDOMSlot where all managed children will be inserted after this node
   */
  withAfter(after: Node | undefined | null): ElementDOMSlot {
    return new ElementDOMSlot(this.element, this.before, after);
  }
  /**
   * Return a new ElementDOMSlot with an updated root element
   */
  withElement(element: HTMLElement): ElementDOMSlot {
    return new ElementDOMSlot(element, this.before, this.after);
  }
  /**
   * Insert the given child before this.before and any reconciler managed line break node,
   * or append it if this.before is not defined
   */
  insertChild(dom: Node): this {
    const before = this.before || this.getManagedLineBreak();
    invariant(
      before === null || before.parentElement === this.element,
      'ElementDOMSlot.insertChild: before is not in element',
    );
    this.element.insertBefore(dom, before);
    return this;
  }
  /**
   * Remove the managed child from this container, will throw if it was not already there
   */
  removeChild(dom: Node): this {
    invariant(
      dom.parentElement === this.element,
      'ElementDOMSlot.removeChild: dom is not in element',
    );
    this.element.removeChild(dom);
    return this;
  }
  /**
   * Replace managed child prevDom with dom. Will throw if prevDom is not a child
   *
   * @param dom The new node to replace prevDom
   * @param prevDom the node that will be replaced
   */
  replaceChild(dom: Node, prevDom: Node): this {
    invariant(
      prevDom.parentElement === this.element,
      'ElementDOMSlot.replaceChild: prevDom is not in element',
    );
    this.element.replaceChild(dom, prevDom);
    return this;
  }
  /**
   * Returns the first managed child of this node,
   * which will either be this.after.nextSibling or this.element.firstChild,
   * and will never be this.before if it is defined.
   */
  getFirstChild(): ChildNode | null {
    const firstChild = this.after
      ? this.after.nextSibling
      : this.element.firstChild;
    return firstChild === this.before ||
      firstChild === this.getManagedLineBreak()
      ? null
      : firstChild;
  }
  /**
   * @internal
   */
  getManagedLineBreak(): Exclude<
    LexicalPrivateDOM['__lexicalLineBreak'],
    undefined
  > {
    const element: HTMLElement & LexicalPrivateDOM = this.element;
    return element.__lexicalLineBreak || null;
  }
  /** @internal */
  setManagedLineBreak(
    lineBreakType: null | 'empty' | 'line-break' | 'decorator',
  ): void {
    if (lineBreakType === null) {
      this.removeManagedLineBreak();
    } else {
      const webkitHack = lineBreakType === 'decorator' && (IS_IOS || IS_SAFARI);
      this.insertManagedLineBreak(webkitHack);
    }
  }

  /** @internal */
  removeManagedLineBreak(): void {
    const br = this.getManagedLineBreak();
    if (br) {
      const element: HTMLElement & LexicalPrivateDOM = this.element;
      const sibling = br.nodeName === 'IMG' ? br.nextSibling : null;
      if (sibling) {
        element.removeChild(sibling);
      }
      element.removeChild(br);
      element.__lexicalLineBreak = undefined;
    }
  }
  /** @internal */
  insertManagedLineBreak(webkitHack: boolean): void {
    const prevBreak = this.getManagedLineBreak();
    if (prevBreak) {
      if (webkitHack === (prevBreak.nodeName === 'IMG')) {
        return;
      }
      this.removeManagedLineBreak();
    }
    const element: HTMLElement & LexicalPrivateDOM = this.element;
    const before = this.before;
    const br = document.createElement('br');
    element.insertBefore(br, before);
    if (webkitHack) {
      const img = document.createElement('img');
      img.setAttribute('data-lexical-linebreak', 'true');
      img.style.cssText =
        'display: inline !important; border: 0px !important; margin: 0px !important;';
      img.alt = '';
      element.insertBefore(img, br);
      element.__lexicalLineBreak = img;
    } else {
      element.__lexicalLineBreak = br;
    }
  }

  /**
   * @internal
   *
   * Returns the offset of the first child
   */
  getFirstChildOffset(): number {
    let i = 0;
    for (let node = this.after; node !== null; node = node.previousSibling) {
      i++;
    }
    return i;
  }

  /**
   * @internal
   */
  resolveChildIndex(
    element: ElementNode,
    elementDOM: HTMLElement,
    initialDOM: Node,
    initialOffset: number,
  ): [node: ElementNode, idx: number] {
    if (initialDOM === this.element) {
      const firstChildOffset = this.getFirstChildOffset();
      return [
        element,
        Math.min(
          firstChildOffset + element.getChildrenSize(),
          Math.max(firstChildOffset, initialOffset),
        ),
      ];
    }
    // The resolved offset must be before or after the children
    const initialPath = indexPath(elementDOM, initialDOM);
    initialPath.push(initialOffset);
    const elementPath = indexPath(elementDOM, this.element);
    let offset = element.getIndexWithinParent();
    for (let i = 0; i < elementPath.length; i++) {
      const target = initialPath[i];
      const source = elementPath[i];
      if (target === undefined || target < source) {
        break;
      } else if (target > source) {
        offset += 1;
        break;
      }
    }
    return [element.getParentOrThrow(), offset];
  }
}

function indexPath(root: HTMLElement, child: Node): number[] {
  const path: number[] = [];
  let node: Node | null = child;
  for (; node !== root && node !== null; node = child.parentNode) {
    let i = 0;
    for (
      let sibling = node.previousSibling;
      sibling !== null;
      sibling = node.previousSibling
    ) {
      i++;
    }
    path.push(i);
  }
  invariant(node === root, 'indexPath: root is not a parent of child');
  return path.reverse();
}

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ElementNode extends LexicalNode {
  ['constructor']!: KlassConstructor<typeof ElementNode>;
  /** @internal */
  __first: null | NodeKey;
  /** @internal */
  __last: null | NodeKey;
  /** @internal */
  __size: number;
  /** @internal */
  __format: number;
  /** @internal */
  __style: string;
  /** @internal */
  __indent: number;
  /** @internal */
  __dir: 'ltr' | 'rtl' | null;
  /** @internal */
  __textFormat: number;
  /** @internal */
  __textStyle: string;

  constructor(key?: NodeKey) {
    super(key);
    this.__first = null;
    this.__last = null;
    this.__size = 0;
    this.__format = 0;
    this.__style = '';
    this.__indent = 0;
    this.__dir = null;
    this.__textFormat = 0;
    this.__textStyle = '';
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__first = prevNode.__first;
    this.__last = prevNode.__last;
    this.__size = prevNode.__size;
    this.__indent = prevNode.__indent;
    this.__format = prevNode.__format;
    this.__style = prevNode.__style;
    this.__dir = prevNode.__dir;
    this.__textFormat = prevNode.__textFormat;
    this.__textStyle = prevNode.__textStyle;
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }
  getFormatType(): ElementFormatType {
    const format = this.getFormat();
    return ELEMENT_FORMAT_TO_TYPE[format] || '';
  }
  getStyle(): string {
    const self = this.getLatest();
    return self.__style;
  }
  getIndent(): number {
    const self = this.getLatest();
    return self.__indent;
  }
  getChildren<T extends LexicalNode>(): Array<T> {
    const children: Array<T> = [];
    let child: T | null = this.getFirstChild();
    while (child !== null) {
      children.push(child);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenKeys(): Array<NodeKey> {
    const children: Array<NodeKey> = [];
    let child: LexicalNode | null = this.getFirstChild();
    while (child !== null) {
      children.push(child.__key);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenSize(): number {
    const self = this.getLatest();
    return self.__size;
  }
  isEmpty(): boolean {
    return this.getChildrenSize() === 0;
  }
  isDirty(): boolean {
    const editor = getActiveEditor();
    const dirtyElements = editor._dirtyElements;
    return dirtyElements !== null && dirtyElements.has(this.__key);
  }
  isLastChild(): boolean {
    const self = this.getLatest();
    const parentLastChild = this.getParentOrThrow().getLastChild();
    return parentLastChild !== null && parentLastChild.is(self);
  }
  getAllTextNodes(): Array<TextNode> {
    const textNodes = [];
    let child: LexicalNode | null = this.getFirstChild();
    while (child !== null) {
      if ($isTextNode(child)) {
        textNodes.push(child);
      }
      if ($isElementNode(child)) {
        const subChildrenNodes = child.getAllTextNodes();
        textNodes.push(...subChildrenNodes);
      }
      child = child.getNextSibling();
    }
    return textNodes;
  }
  getFirstDescendant<T extends LexicalNode>(): null | T {
    let node = this.getFirstChild<T>();
    while ($isElementNode(node)) {
      const child = node.getFirstChild<T>();
      if (child === null) {
        break;
      }
      node = child;
    }
    return node;
  }
  getLastDescendant<T extends LexicalNode>(): null | T {
    let node = this.getLastChild<T>();
    while ($isElementNode(node)) {
      const child = node.getLastChild<T>();
      if (child === null) {
        break;
      }
      node = child;
    }
    return node;
  }
  getDescendantByIndex<T extends LexicalNode>(index: number): null | T {
    const children = this.getChildren<T>();
    const childrenLength = children.length;
    // For non-empty element nodes, we resolve its descendant
    // (either a leaf node or the bottom-most element)
    if (index >= childrenLength) {
      const resolvedNode = children[childrenLength - 1];
      return (
        ($isElementNode(resolvedNode) && resolvedNode.getLastDescendant()) ||
        resolvedNode ||
        null
      );
    }
    const resolvedNode = children[index];
    return (
      ($isElementNode(resolvedNode) && resolvedNode.getFirstDescendant()) ||
      resolvedNode ||
      null
    );
  }
  getFirstChild<T extends LexicalNode>(): null | T {
    const self = this.getLatest();
    const firstKey = self.__first;
    return firstKey === null ? null : $getNodeByKey<T>(firstKey);
  }
  getFirstChildOrThrow<T extends LexicalNode>(): T {
    const firstChild = this.getFirstChild<T>();
    if (firstChild === null) {
      invariant(false, 'Expected node %s to have a first child.', this.__key);
    }
    return firstChild;
  }
  getLastChild<T extends LexicalNode>(): null | T {
    const self = this.getLatest();
    const lastKey = self.__last;
    return lastKey === null ? null : $getNodeByKey<T>(lastKey);
  }
  getLastChildOrThrow<T extends LexicalNode>(): T {
    const lastChild = this.getLastChild<T>();
    if (lastChild === null) {
      invariant(false, 'Expected node %s to have a last child.', this.__key);
    }
    return lastChild;
  }
  getChildAtIndex<T extends LexicalNode>(index: number): null | T {
    const size = this.getChildrenSize();
    let node: null | T;
    let i;
    if (index < size / 2) {
      node = this.getFirstChild<T>();
      i = 0;
      while (node !== null && i <= index) {
        if (i === index) {
          return node;
        }
        node = node.getNextSibling();
        i++;
      }
      return null;
    }
    node = this.getLastChild<T>();
    i = size - 1;
    while (node !== null && i >= index) {
      if (i === index) {
        return node;
      }
      node = node.getPreviousSibling();
      i--;
    }
    return null;
  }
  getTextContent(): string {
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if (
        $isElementNode(child) &&
        i !== childrenLength - 1 &&
        !child.isInline()
      ) {
        textContent += DOUBLE_LINE_BREAK;
      }
    }
    return textContent;
  }
  getTextContentSize(): number {
    let textContentSize = 0;
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContentSize += child.getTextContentSize();
      if (
        $isElementNode(child) &&
        i !== childrenLength - 1 &&
        !child.isInline()
      ) {
        textContentSize += DOUBLE_LINE_BREAK.length;
      }
    }
    return textContentSize;
  }
  getDirection(): 'ltr' | 'rtl' | null {
    const self = this.getLatest();
    return self.__dir;
  }
  getTextFormat(): number {
    const self = this.getLatest();
    return self.__textFormat;
  }
  hasFormat(type: ElementFormatType): boolean {
    if (type !== '') {
      const formatFlag = ELEMENT_TYPE_TO_FORMAT[type];
      return (this.getFormat() & formatFlag) !== 0;
    }
    return false;
  }
  hasTextFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getTextFormat() & formatFlag) !== 0;
  }
  /**
   * Returns the format flags applied to the node as a 32-bit integer.
   *
   * @returns a number representing the TextFormatTypes applied to the node.
   */
  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest();
    const format = self.__textFormat;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  getTextStyle(): string {
    const self = this.getLatest();
    return self.__textStyle;
  }

  // Mutators

  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    const selection = $getSelection();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const childrenCount = this.getChildrenSize();
    if (!this.canBeEmpty()) {
      if (_anchorOffset === 0 && _focusOffset === 0) {
        const firstChild = this.getFirstChild();
        if ($isTextNode(firstChild) || $isElementNode(firstChild)) {
          return firstChild.select(0, 0);
        }
      } else if (
        (_anchorOffset === undefined || _anchorOffset === childrenCount) &&
        (_focusOffset === undefined || _focusOffset === childrenCount)
      ) {
        const lastChild = this.getLastChild();
        if ($isTextNode(lastChild) || $isElementNode(lastChild)) {
          return lastChild.select();
        }
      }
    }
    if (anchorOffset === undefined) {
      anchorOffset = childrenCount;
    }
    if (focusOffset === undefined) {
      focusOffset = childrenCount;
    }
    const key = this.__key;
    if (!$isRangeSelection(selection)) {
      return $internalMakeRangeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'element',
        'element',
      );
    } else {
      selection.anchor.set(key, anchorOffset, 'element');
      selection.focus.set(key, focusOffset, 'element');
      selection.dirty = true;
    }
    return selection;
  }
  selectStart(): RangeSelection {
    const firstNode = this.getFirstDescendant();
    return firstNode ? firstNode.selectStart() : this.select();
  }
  selectEnd(): RangeSelection {
    const lastNode = this.getLastDescendant();
    return lastNode ? lastNode.selectEnd() : this.select();
  }
  clear(): this {
    const writableSelf = this.getWritable();
    const children = this.getChildren();
    children.forEach((child) => child.remove());
    return writableSelf;
  }
  append(...nodesToAppend: LexicalNode[]): this {
    return this.splice(this.getChildrenSize(), 0, nodesToAppend);
  }
  setDirection(direction: 'ltr' | 'rtl' | null): this {
    const self = this.getWritable();
    self.__dir = direction;
    return self;
  }
  setFormat(type: ElementFormatType): this {
    const self = this.getWritable();
    self.__format = type !== '' ? ELEMENT_TYPE_TO_FORMAT[type] : 0;
    return this;
  }
  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style || '';
    return this;
  }
  setTextFormat(type: number): this {
    const self = this.getWritable();
    self.__textFormat = type;
    return self;
  }
  setTextStyle(style: string): this {
    const self = this.getWritable();
    self.__textStyle = style;
    return self;
  }
  setIndent(indentLevel: number): this {
    const self = this.getWritable();
    self.__indent = indentLevel;
    return this;
  }
  splice(
    start: number,
    deleteCount: number,
    nodesToInsert: Array<LexicalNode>,
  ): this {
    const nodesToInsertLength = nodesToInsert.length;
    const oldSize = this.getChildrenSize();
    const writableSelf = this.getWritable();
    invariant(
      start + deleteCount <= oldSize,
      'ElementNode.splice: start + deleteCount > oldSize (%s + %s > %s)',
      String(start),
      String(deleteCount),
      String(oldSize),
    );
    const writableSelfKey = writableSelf.__key;
    const nodesToInsertKeys = [];
    const nodesToRemoveKeys = [];
    const nodeAfterRange = this.getChildAtIndex(start + deleteCount);
    let nodeBeforeRange = null;
    let newSize = oldSize - deleteCount + nodesToInsertLength;

    if (start !== 0) {
      if (start === oldSize) {
        nodeBeforeRange = this.getLastChild();
      } else {
        const node = this.getChildAtIndex(start);
        if (node !== null) {
          nodeBeforeRange = node.getPreviousSibling();
        }
      }
    }

    if (deleteCount > 0) {
      let nodeToDelete =
        nodeBeforeRange === null
          ? this.getFirstChild()
          : nodeBeforeRange.getNextSibling();
      for (let i = 0; i < deleteCount; i++) {
        if (nodeToDelete === null) {
          invariant(false, 'splice: sibling not found');
        }
        const nextSibling = nodeToDelete.getNextSibling();
        const nodeKeyToDelete = nodeToDelete.__key;
        const writableNodeToDelete = nodeToDelete.getWritable();
        removeFromParent(writableNodeToDelete);
        nodesToRemoveKeys.push(nodeKeyToDelete);
        nodeToDelete = nextSibling;
      }
    }

    let prevNode = nodeBeforeRange;
    for (let i = 0; i < nodesToInsertLength; i++) {
      const nodeToInsert = nodesToInsert[i];
      if (prevNode !== null && nodeToInsert.is(prevNode)) {
        nodeBeforeRange = prevNode = prevNode.getPreviousSibling();
      }
      const writableNodeToInsert = nodeToInsert.getWritable();
      if (writableNodeToInsert.__parent === writableSelfKey) {
        newSize--;
      }
      removeFromParent(writableNodeToInsert);
      const nodeKeyToInsert = nodeToInsert.__key;
      if (prevNode === null) {
        writableSelf.__first = nodeKeyToInsert;
        writableNodeToInsert.__prev = null;
      } else {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = nodeKeyToInsert;
        writableNodeToInsert.__prev = writablePrevNode.__key;
      }
      if (nodeToInsert.__key === writableSelfKey) {
        invariant(false, 'append: attempting to append self');
      }
      // Set child parent to self
      writableNodeToInsert.__parent = writableSelfKey;
      nodesToInsertKeys.push(nodeKeyToInsert);
      prevNode = nodeToInsert;
    }

    if (start + deleteCount === oldSize) {
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = null;
        writableSelf.__last = prevNode.__key;
      }
    } else if (nodeAfterRange !== null) {
      const writableNodeAfterRange = nodeAfterRange.getWritable();
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writableNodeAfterRange.__prev = prevNode.__key;
        writablePrevNode.__next = nodeAfterRange.__key;
      } else {
        writableNodeAfterRange.__prev = null;
      }
    }

    writableSelf.__size = newSize;

    // In case of deletion we need to adjust selection, unlink removed nodes
    // and clean up node itself if it becomes empty. None of these needed
    // for insertion-only cases
    if (nodesToRemoveKeys.length) {
      // Adjusting selection, in case node that was anchor/focus will be deleted
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodesToRemoveKeySet = new Set(nodesToRemoveKeys);
        const nodesToInsertKeySet = new Set(nodesToInsertKeys);

        const {anchor, focus} = selection;
        if (isPointRemoved(anchor, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(
            anchor,
            anchor.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          );
        }
        if (isPointRemoved(focus, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(
            focus,
            focus.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          );
        }
        // Cleanup if node can't be empty
        if (newSize === 0 && !this.canBeEmpty() && !$isRootOrShadowRoot(this)) {
          this.remove();
        }
      }
    }

    return writableSelf;
  }
  /**
   * @internal
   *
   * An experimental API that an ElementNode can override to control where its
   * children are inserted into the DOM, this is useful to add a wrapping node
   * or accessory nodes before or after the children. The root of the node returned
   * by createDOM must still be exactly one HTMLElement.
   */
  getDOMSlot(element: HTMLElement): ElementDOMSlot {
    return new ElementDOMSlot(element);
  }
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);
    if (isHTMLElement(element)) {
      const indent = this.getIndent();
      if (indent > 0) {
        // padding-inline-start is not widely supported in email HTML
        // (see https://www.caniemail.com/features/css-padding-inline-start-end/),
        // If you want to use HTML output for email, consider overriding the serialization
        // to use `padding-right` in RTL languages, `padding-left` in `LTR` languages, or
        // `text-indent` if you are ok with first-line indents.
        // We recommend keeping multiples of 40px to maintain consistency with list-items
        // (see https://github.com/facebook/lexical/pull/4025)
        element.style.paddingInlineStart = `${indent * 40}px`;
      }
    }

    return {element};
  }
  // JSON serialization
  exportJSON(): SerializedElementNode {
    const json: SerializedElementNode = {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      // As an exception here we invoke super at the end for historical reasons.
      // Namely, to preserve the order of the properties and not to break the tests
      // that use the serialized string representation.
      ...super.exportJSON(),
    };
    const textFormat = this.getTextFormat();
    const textStyle = this.getTextStyle();
    if (textFormat !== 0) {
      json.textFormat = textFormat;
    }
    if (textStyle !== '') {
      json.textStyle = textStyle;
    }
    return json;
  }
  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedElementNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setFormat(serializedNode.format)
      .setIndent(serializedNode.indent)
      .setDirection(serializedNode.direction)
      .setTextFormat(serializedNode.textFormat || 0)
      .setTextStyle(serializedNode.textStyle || '');
  }
  // These are intended to be extends for specific element heuristics.
  insertNewAfter(
    selection: RangeSelection,
    restoreSelection?: boolean,
  ): null | LexicalNode {
    return null;
  }
  canIndent(): boolean {
    return true;
  }
  /*
   * This method controls the behavior of a the node during backwards
   * deletion (i.e., backspace) when selection is at the beginning of
   * the node (offset 0)
   */
  collapseAtStart(selection: RangeSelection): boolean {
    return false;
  }
  excludeFromCopy(destination?: 'clone' | 'html'): boolean {
    return false;
  }
  /** @deprecated @internal */
  canReplaceWith(replacement: LexicalNode): boolean {
    return true;
  }
  /** @deprecated @internal */
  canInsertAfter(node: LexicalNode): boolean {
    return true;
  }
  canBeEmpty(): boolean {
    return true;
  }
  canInsertTextBefore(): boolean {
    return true;
  }
  canInsertTextAfter(): boolean {
    return true;
  }
  isInline(): boolean {
    return false;
  }
  // A shadow root is a Node that behaves like RootNode. The shadow root (and RootNode) mark the
  // end of the hiercharchy, most implementations should treat it as there's nothing (upwards)
  // beyond this point. For example, node.getTopLevelElement(), when performed inside a TableCellNode
  // will return the immediate first child underneath TableCellNode instead of RootNode.
  isShadowRoot(): boolean {
    return false;
  }
  /** @deprecated @internal */
  canMergeWith(node: ElementNode): boolean {
    return false;
  }
  extractWithChild(
    child: LexicalNode,
    selection: BaseSelection | null,
    destination: 'clone' | 'html',
  ): boolean {
    return false;
  }

  /**
   * Determines whether this node, when empty, can merge with a first block
   * of nodes being inserted.
   *
   * This method is specifically called in {@link RangeSelection.insertNodes}
   * to determine merging behavior during nodes insertion.
   *
   * @example
   * // In a ListItemNode or QuoteNode implementation:
   * canMergeWhenEmpty(): true {
   *  return true;
   * }
   */
  canMergeWhenEmpty(): boolean {
    return false;
  }

  /** @internal */
  reconcileObservedMutation(dom: HTMLElement, editor: LexicalEditor): void {
    const slot = this.getDOMSlot(dom);
    let currentDOM = slot.getFirstChild();
    for (
      let currentNode = this.getFirstChild();
      currentNode;
      currentNode = currentNode.getNextSibling()
    ) {
      const correctDOM = editor.getElementByKey(currentNode.getKey());

      if (correctDOM === null) {
        continue;
      }

      if (currentDOM == null) {
        slot.insertChild(correctDOM);
        currentDOM = correctDOM;
      } else if (currentDOM !== correctDOM) {
        slot.replaceChild(correctDOM, currentDOM);
      }

      currentDOM = currentDOM.nextSibling;
    }
  }
}

export function $isElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return node instanceof ElementNode;
}

function isPointRemoved(
  point: PointType,
  nodesToRemoveKeySet: Set<NodeKey>,
  nodesToInsertKeySet: Set<NodeKey>,
): boolean {
  let node: ElementNode | TextNode | null = point.getNode();
  while (node) {
    const nodeKey = node.__key;
    if (nodesToRemoveKeySet.has(nodeKey) && !nodesToInsertKeySet.has(nodeKey)) {
      return true;
    }
    node = node.getParent();
  }
  return false;
}
