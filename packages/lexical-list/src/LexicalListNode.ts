/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  addClassNamesToElement,
  isHTMLElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createTextNode,
  $isElementNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  EditorThemeClasses,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {$createListItemNode, $isListItemNode, ListItemNode} from '.';
import {updateChildrenListItemValue} from './formatList';
import {$getListDepth, wrapInListItem} from './utils';

export type SerializedListNode = Spread<
  {
    listType: ListType;
    start: number;
    tag: ListNodeTagType;
  },
  SerializedElementNode
>;

export type ListType = 'number' | 'bullet' | 'check';

export type ListNodeTagType = 'ul' | 'ol';

/** @noInheritDoc */
export class ListNode extends ElementNode {
  /** @internal */
  __tag: ListNodeTagType;
  /** @internal */
  __start: number;
  /** @internal */
  __listType: ListType;

  static getType(): string {
    return 'list';
  }

  static clone(node: ListNode): ListNode {
    const listType = node.__listType || TAG_TO_LIST_TYPE[node.__tag];

    return new ListNode(listType, node.__start, node.__key);
  }

  constructor(listType: ListType, start: number, key?: NodeKey) {
    super(key);
    const _listType = TAG_TO_LIST_TYPE[listType] || listType;
    this.__listType = _listType;
    this.__tag = _listType === 'number' ? 'ol' : 'ul';
    this.__start = start;
  }

  getTag(): ListNodeTagType {
    return this.__tag;
  }

  setListType(type: ListType): void {
    const writable = this.getWritable();
    writable.__listType = type;
    writable.__tag = type === 'number' ? 'ol' : 'ul';
  }

  getListType(): ListType {
    return this.__listType;
  }

  getStart(): number {
    return this.__start;
  }

  // View

  createDOM(config: EditorConfig, _editor?: LexicalEditor): HTMLElement {
    const tag = this.__tag;
    const dom = document.createElement(tag);

    if (this.__start !== 1) {
      dom.setAttribute('start', String(this.__start));
    }
    // @ts-expect-error Internal field.
    dom.__lexicalListType = this.__listType;
    setListThemeClassNames(dom, config.theme, this);

    return dom;
  }

  updateDOM(
    prevNode: ListNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    if (prevNode.__tag !== this.__tag) {
      return true;
    }

    setListThemeClassNames(dom, config.theme, this);

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      ol: (node: Node) => ({
        conversion: convertListNode,
        priority: 0,
      }),
      ul: (node: Node) => ({
        conversion: convertListNode,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedListNode): ListNode {
    const node = $createListNode(serializedNode.listType, serializedNode.start);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);
    if (element && isHTMLElement(element)) {
      if (this.__start !== 1) {
        element.setAttribute('start', String(this.__start));
      }
      if (this.__listType === 'check') {
        element.setAttribute('__lexicalListType', 'check');
      }
    }
    return {
      element,
    };
  }

  exportJSON(): SerializedListNode {
    return {
      ...super.exportJSON(),
      listType: this.getListType(),
      start: this.getStart(),
      tag: this.getTag(),
      type: 'list',
      version: 1,
    };
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }

  append(...nodesToAppend: LexicalNode[]): this {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const currentNode = nodesToAppend[i];

      if ($isListItemNode(currentNode)) {
        super.append(currentNode);
      } else {
        const listItemNode = $createListItemNode();

        if ($isListNode(currentNode)) {
          listItemNode.append(currentNode);
        } else if ($isElementNode(currentNode)) {
          const textNode = $createTextNode(currentNode.getTextContent());
          listItemNode.append(textNode);
        } else {
          listItemNode.append(currentNode);
        }
        super.append(listItemNode);
      }
    }
    updateChildrenListItemValue(this);
    return this;
  }

  extractWithChild(child: LexicalNode): boolean {
    return $isListItemNode(child);
  }
}

function setListThemeClassNames(
  dom: HTMLElement,
  editorThemeClasses: EditorThemeClasses,
  node: ListNode,
): void {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;

  if (listTheme !== undefined) {
    const listLevelsClassNames = listTheme[`${node.__tag}Depth`] || [];
    const listDepth = $getListDepth(node) - 1;
    const normalizedListDepth = listDepth % listLevelsClassNames.length;
    const listLevelClassName = listLevelsClassNames[normalizedListDepth];
    const listClassName = listTheme[node.__tag];
    let nestedListClassName;
    const nestedListTheme = listTheme.nested;
    const checklistClassName = listTheme.checklist;

    if (nestedListTheme !== undefined && nestedListTheme.list) {
      nestedListClassName = nestedListTheme.list;
    }

    if (listClassName !== undefined) {
      classesToAdd.push(listClassName);
    }

    if (checklistClassName !== undefined && node.__listType === 'check') {
      classesToAdd.push(checklistClassName);
    }

    if (listLevelClassName !== undefined) {
      const listItemClasses = listLevelClassName.split(' ');
      classesToAdd.push(...listItemClasses);
      for (let i = 0; i < listLevelsClassNames.length; i++) {
        if (i !== normalizedListDepth) {
          classesToRemove.push(node.__tag + i);
        }
      }
    }

    if (nestedListClassName !== undefined) {
      const nestedListItemClasses = nestedListClassName.split(' ');

      if (listDepth > 1) {
        classesToAdd.push(...nestedListItemClasses);
      } else {
        classesToRemove.push(...nestedListItemClasses);
      }
    }
  }

  if (classesToRemove.length > 0) {
    removeClassNamesFromElement(dom, ...classesToRemove);
  }

  if (classesToAdd.length > 0) {
    addClassNamesToElement(dom, ...classesToAdd);
  }
}

/*
 * This function normalizes the children of a ListNode after the conversion from HTML,
 * ensuring that they are all ListItemNodes and contain either a single nested ListNode
 * or some other inline content.
 */
function normalizeChildren(nodes: Array<LexicalNode>): Array<ListItemNode> {
  const normalizedListItems: Array<ListItemNode> = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isListItemNode(node)) {
      normalizedListItems.push(node);
      const children = node.getChildren();
      if (children.length > 1) {
        children.forEach((child) => {
          if ($isListNode(child)) {
            normalizedListItems.push(wrapInListItem(child));
          }
        });
      }
    } else {
      normalizedListItems.push(wrapInListItem(node));
    }
  }
  return normalizedListItems;
}

function convertListNode(domNode: Node): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (nodeName === 'ol') {
    // @ts-ignore
    const start = domNode.start;
    node = $createListNode('number', start);
  } else if (nodeName === 'ul') {
    if (
      isHTMLElement(domNode) &&
      domNode.getAttribute('__lexicallisttype') === 'check'
    ) {
      node = $createListNode('check');
    } else {
      node = $createListNode('bullet');
    }
  }

  return {
    after: normalizeChildren,
    node,
  };
}

const TAG_TO_LIST_TYPE: Record<string, ListType> = {
  ol: 'number',
  ul: 'bullet',
};

/**
 * Creates a ListNode of listType.
 * @param listType - The type of list to be created. Can be 'number', 'bullet', or 'check'.
 * @param start - Where an ordered list starts its count, start = 1 if left undefined.
 * @returns The new ListNode
 */
export function $createListNode(listType: ListType, start = 1): ListNode {
  return $applyNodeReplacement(new ListNode(listType, start));
}

/**
 * Checks to see if the node is a ListNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListNode, false otherwise.
 */
export function $isListNode(
  node: LexicalNode | null | undefined,
): node is ListNode {
  return node instanceof ListNode;
}
