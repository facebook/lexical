/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ListNode, ListType} from './';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  EditorThemeClasses,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  SerializedParagraphNode,
  Spread,
  TEXT_TYPE_TO_FORMAT,
  TextFormatType,
} from 'lexical';
import invariant from 'shared/invariant';
import normalizeClassNames from 'shared/normalizeClassNames';

import {$createListNode, $isListNode} from './';
import {$handleIndent, $handleOutdent, mergeLists} from './formatList';
import {isNestedListNode, toggleTextFormatType} from './utils';

export type SerializedListItemNode = Spread<
  {
    checked: boolean | undefined;
    value: number;
    textFormat: number;
  },
  SerializedParagraphNode
>;

/** @noInheritDoc */
export class ListItemNode extends ParagraphNode {
  /** @internal */
  __value: number;
  /** @internal */
  __checked?: boolean;
  __textFormat: number;

  static getType(): string {
    return 'listitem';
  }

  static clone(node: ListItemNode): ListItemNode {
    return new ListItemNode(node.__value, node.__checked, node.__key);
  }

  constructor(value?: number, checked?: boolean, key?: NodeKey) {
    super(key);
    this.__value = value === undefined ? 1 : value;
    this.__checked = checked;
    this.__textFormat = 0;
  }
  getTextFormat(): number {
    const self = this.getLatest();
    return self.__textFormat;
  }

  setTextFormat(type: number): this {
    const self = this.getWritable();
    self.__textFormat = type;
    return self;
  }

  hasTextFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getTextFormat() & formatFlag) !== 0;
  }

  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest();
    const format = self.__textFormat;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('li');
    const parent = this.getParent();
    if ($isListNode(parent) && parent.getListType() === 'check') {
      updateListItemChecked(element, this, null, parent);
    }
    element.value = this.__value;
    $setListItemThemeClassNames(element, config.theme, this);
    return element;
  }
  updateDOM(
    prevNode: ParagraphNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const parent = this.getParent();
    if ($isListNode(parent) && parent.getListType() === 'check') {
      const listItemNode = $isListItemNode(prevNode) ? prevNode : null;
      updateListItemChecked(dom, this, listItemNode, parent);
    }
    // @ts-expect-error - this is always HTMLListItemElement
    dom.value = this.__value;
    $setListItemThemeClassNames(dom, config.theme, this);
    return super.updateDOM(prevNode, dom, config);
  }

  static transform(): (node: LexicalNode) => void {
    return (node: LexicalNode) => {
      invariant($isListItemNode(node), 'node is not a ListItemNode');
      if (node.__checked == null) {
        return;
      }
      const parent = node.getParent();
      if ($isListNode(parent)) {
        if (parent.getListType() !== 'check' && node.getChecked() != null) {
          node.setChecked(undefined);
        }
      }
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      li: () => ({
        conversion: $convertListItemElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedListItemNode): ListItemNode {
    const node = $createListItemNode();
    node.setChecked(serializedNode.checked);
    node.setValue(serializedNode.value);
    node.setFormat(serializedNode.format);
    node.setDirection(serializedNode.direction);
    node.setTextFormat(serializedNode.textFormat);
    return node;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config);
    element.style.textAlign = this.getFormatType();
    return {
      element,
    };
  }

  exportJSON(): SerializedListItemNode {
    return {
      ...super.exportJSON(),
      checked: this.getChecked(),
      textFormat: this.getTextFormat(),
      type: 'listitem',
      value: this.getValue(),
      version: 1,
    };
  }

  append(...nodes: LexicalNode[]): this {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if ($isElementNode(node) && this.canMergeWith(node)) {
        const children = node.getChildren();
        this.append(...children);
        node.remove();
      } else {
        super.append(node);
      }
    }

    return this;
  }

  replace<N extends LexicalNode>(
    replaceWithNode: N,
    includeChildren?: boolean,
  ): N {
    if ($isListItemNode(replaceWithNode)) {
      return super.replace(replaceWithNode);
    }
    this.setIndent(0);
    const list = this.getParentOrThrow();
    if (!$isListNode(list)) {
      return replaceWithNode;
    }
    if (list.__first === this.getKey()) {
      list.insertBefore(replaceWithNode);
    } else if (list.__last === this.getKey()) {
      list.insertAfter(replaceWithNode);
    } else {
      // Split the list
      const newList = $createListNode(list.getListType());
      let nextSibling = this.getNextSibling();
      while (nextSibling) {
        const nodeToAppend = nextSibling;
        nextSibling = nextSibling.getNextSibling();
        newList.append(nodeToAppend);
      }
      list.insertAfter(replaceWithNode);
      replaceWithNode.insertAfter(newList);
    }
    if (includeChildren) {
      invariant(
        $isElementNode(replaceWithNode),
        'includeChildren should only be true for ElementNodes',
      );
      this.getChildren().forEach((child: LexicalNode) => {
        replaceWithNode.append(child);
      });
    }
    this.remove();
    if (list.getChildrenSize() === 0) {
      list.remove();
    }
    return replaceWithNode;
  }

  insertAfter(node: LexicalNode, restoreSelection = true): LexicalNode {
    const listNode = this.getParentOrThrow();

    if (!$isListNode(listNode)) {
      invariant(
        false,
        'insertAfter: list node is not parent of list item node',
      );
    }

    if ($isListItemNode(node)) {
      return super.insertAfter(node, restoreSelection);
    }

    const siblings = this.getNextSiblings();
    listNode.insertAfter(node, restoreSelection);

    if (siblings.length !== 0) {
      const newListNode = $createListNode(listNode.getListType());
      siblings.forEach((sibling) => newListNode.append(sibling));
      node.insertAfter(newListNode, restoreSelection);
    }

    return node;
  }

  remove(preserveEmptyParent?: boolean): void {
    const prevSibling = this.getPreviousSibling();
    const nextSibling = this.getNextSibling();
    super.remove(preserveEmptyParent);

    if (
      prevSibling &&
      nextSibling &&
      isNestedListNode(prevSibling) &&
      isNestedListNode(nextSibling)
    ) {
      mergeLists(prevSibling.getFirstChild(), nextSibling.getFirstChild());
      nextSibling.remove();
    }
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): ListItemNode | ParagraphNode {
    const newElement = $createListItemNode(
      this.__checked == null ? undefined : false,
    );

    const format = selection.format;
    newElement.setTextFormat(format);

    newElement.setFormat(this.getFormatType());
    this.insertAfter(newElement, restoreSelection);

    return newElement;
  }

  collapseAtStart(): boolean {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return false;
    }

    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));

    const listNode = this.getParentOrThrow();
    const listNodeParent = listNode.getParent();

    if (!$isListNode(listNode)) {
      return false;
    }

    if (listNode.getChildrenSize() === 1) {
      if ($isListItemNode(listNodeParent)) {
        listNode.remove();
        listNodeParent.select();
      } else {
        listNode.insertBefore(paragraph);
        listNode.remove();
        paragraph.select();
      }
    }

    return true;
  }

  getValue(): number {
    const self = this.getLatest();

    return self.__value;
  }

  setValue(value: number): void {
    const self = this.getWritable();
    self.__value = value;
  }

  getChecked(): boolean | undefined {
    const self = this.getLatest();

    let listType: ListType | undefined;

    const parent = this.getParent();
    if ($isListNode(parent)) {
      listType = parent.getListType();
    }

    return listType === 'check' ? Boolean(self.__checked) : undefined;
  }

  setChecked(checked?: boolean): void {
    const self = this.getWritable();
    self.__checked = checked;
  }

  toggleChecked(): void {
    this.setChecked(!this.__checked);
  }

  getIndent(): number {
    // If we don't have a parent, we are likely serializing
    const parent = this.getParent();
    if (parent === null) {
      return this.getLatest().__indent;
    }
    // ListItemNode should always have a ListNode for a parent.
    let listNodeParent = parent.getParentOrThrow();
    let indentLevel = 0;
    while ($isListItemNode(listNodeParent)) {
      listNodeParent = listNodeParent.getParentOrThrow().getParentOrThrow();
      indentLevel++;
    }

    return indentLevel;
  }

  setIndent(indent: number): this {
    invariant(typeof indent === 'number', 'Invalid indent value.');
    indent = Math.floor(indent);
    invariant(indent >= 0, 'Indent value must be non-negative.');
    let currentIndent = this.getIndent();
    while (currentIndent !== indent) {
      if (currentIndent < indent) {
        $handleIndent(this);
        currentIndent++;
      } else {
        $handleOutdent(this);
        currentIndent--;
      }
    }

    return this;
  }

  /** @deprecated @internal */
  canInsertAfter(node: LexicalNode): boolean {
    return $isListItemNode(node);
  }

  /** @deprecated @internal */
  canReplaceWith(replacement: LexicalNode): boolean {
    return $isListItemNode(replacement);
  }

  canMergeWith(node: LexicalNode): boolean {
    return $isParagraphNode(node) || $isListItemNode(node);
  }

  extractWithChild(child: LexicalNode, selection: BaseSelection): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }

    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();

    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      this.getTextContent().length === selection.getTextContent().length
    );
  }

  isParentRequired(): true {
    return true;
  }

  createParentElementNode(): ElementNode {
    return $createListNode('bullet');
  }

  canMergeWhenEmpty(): true {
    return true;
  }
}

function $setListItemThemeClassNames(
  dom: HTMLElement,
  editorThemeClasses: EditorThemeClasses,
  node: ListItemNode,
): void {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;
  const listItemClassName = listTheme ? listTheme.listitem : undefined;
  let nestedListItemClassName;

  if (listTheme && listTheme.nested) {
    nestedListItemClassName = listTheme.nested.listitem;
  }

  if (listItemClassName !== undefined) {
    classesToAdd.push(...normalizeClassNames(listItemClassName));
  }

  if (listTheme) {
    const parentNode = node.getParent();
    const isCheckList =
      $isListNode(parentNode) && parentNode.getListType() === 'check';
    const checked = node.getChecked();

    if (!isCheckList || checked) {
      classesToRemove.push(listTheme.listitemUnchecked);
    }

    if (!isCheckList || !checked) {
      classesToRemove.push(listTheme.listitemChecked);
    }

    if (isCheckList) {
      classesToAdd.push(
        checked ? listTheme.listitemChecked : listTheme.listitemUnchecked,
      );
    }
  }

  if (nestedListItemClassName !== undefined) {
    const nestedListItemClasses = normalizeClassNames(nestedListItemClassName);

    if (node.getChildren().some((child) => $isListNode(child))) {
      classesToAdd.push(...nestedListItemClasses);
    } else {
      classesToRemove.push(...nestedListItemClasses);
    }
  }

  if (classesToRemove.length > 0) {
    removeClassNamesFromElement(dom, ...classesToRemove);
  }

  if (classesToAdd.length > 0) {
    addClassNamesToElement(dom, ...classesToAdd);
  }
}

function updateListItemChecked(
  dom: HTMLElement,
  listItemNode: ListItemNode,
  prevListItemNode: ListItemNode | null,
  listNode: ListNode,
): void {
  // Only add attributes for leaf list items
  if ($isListNode(listItemNode.getFirstChild())) {
    dom.removeAttribute('role');
    dom.removeAttribute('tabIndex');
    dom.removeAttribute('aria-checked');
  } else {
    dom.setAttribute('role', 'checkbox');
    dom.setAttribute('tabIndex', '-1');

    if (
      !prevListItemNode ||
      listItemNode.__checked !== prevListItemNode.__checked
    ) {
      dom.setAttribute(
        'aria-checked',
        listItemNode.getChecked() ? 'true' : 'false',
      );
    }
  }
}

function $convertListItemElement(domNode: HTMLElement): DOMConversionOutput {
  const isGitHubCheckList = domNode.classList.contains('task-list-item');
  if (isGitHubCheckList) {
    for (const child of domNode.children) {
      if (child.tagName === 'INPUT') {
        return $convertCheckboxInput(child);
      }
    }
  }

  const ariaCheckedAttr = domNode.getAttribute('aria-checked');
  const checked =
    ariaCheckedAttr === 'true'
      ? true
      : ariaCheckedAttr === 'false'
      ? false
      : undefined;
  return {node: $createListItemNode(checked)};
}

function $convertCheckboxInput(domNode: Element): DOMConversionOutput {
  const isCheckboxInput = domNode.getAttribute('type') === 'checkbox';
  if (!isCheckboxInput) {
    return {node: null};
  }
  const checked = domNode.hasAttribute('checked');
  return {node: $createListItemNode(checked)};
}

/**
 * Creates a new List Item node, passing true/false will convert it to a checkbox input.
 * @param checked - Is the List Item a checkbox and, if so, is it checked? undefined/null: not a checkbox, true/false is a checkbox and checked/unchecked, respectively.
 * @returns The new List Item.
 */
export function $createListItemNode(checked?: boolean): ListItemNode {
  return $applyNodeReplacement(new ListItemNode(undefined, checked));
}

/**
 * Checks to see if the node is a ListItemNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode, false otherwise.
 */
export function $isListItemNode(
  node: LexicalNode | null | undefined,
): node is ListItemNode {
  return node instanceof ListItemNode;
}
