/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  EditorThemeClasses,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {$createTextNode, ElementNode} from 'lexical';

import {$createListItemNode, $isListItemNode} from '.';
import {$getListDepth} from './utils';

export interface SerializedListNode<SerializedNode>
  extends SerializedElementNode<SerializedNode> {
  listType: ListType;
  start: number;
  tag: ListNodeTagType;
  type: 'list';
}

export type ListType = 'number' | 'bullet' | 'check';

export type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends ElementNode {
  __tag: ListNodeTagType;
  __start: number;
  __listType: ListType;

  static getType(): string {
    return 'list';
  }

  static clone(node: ListNode): ListNode {
    const listType = node.__listType || TAG_TO_LIST_TYPE[node.__tag];
    return new ListNode(listType, node.__start, node.__key);
  }

  constructor(listType: ListType, start: number, key?: NodeKey): void {
    super(key);
    // $FlowFixMe added for backward compatibility to map tags to list type
    const _listType = TAG_TO_LIST_TYPE[listType] || listType;
    this.__listType = _listType;
    this.__tag = _listType === 'number' ? 'ol' : 'ul';
    this.__start = start;
  }

  getTag(): ListNodeTagType {
    return this.__tag;
  }

  getListType(): ListType {
    return this.__listType;
  }

  getStart(): number {
    return this.__start;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const tag = this.__tag;
    const dom = document.createElement(tag);
    if (this.__start !== 1) {
      dom.setAttribute('start', String(this.__start));
    }
    // $FlowFixMe internal field
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

  static importJSON<SerializedNode>(
    serializedNode: SerializedListNode<SerializedNode>,
  ): ListNode {
    const node = $createListNode(serializedNode.listType, serializedNode.start);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON<SerializedNode>(): SerializedListNode<SerializedNode> {
    // $FlowFixMe: Flow limitation
    return {
      ...super.exportJSON(),
      listType: this.getListType(),
      start: this.getStart(),
      tag: this.getTag(),
      type: 'list',
    };
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }

  append(...nodesToAppend: LexicalNode[]): ListNode {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const currentNode = nodesToAppend[i];
      if ($isListItemNode(currentNode)) {
        super.append(currentNode);
      } else {
        const listItemNode = $createListItemNode();
        if ($isListNode(currentNode)) {
          listItemNode.append(currentNode);
        } else {
          const textNode = $createTextNode(currentNode.getTextContent());
          listItemNode.append(textNode);
        }
        super.append(listItemNode);
      }
    }
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
    const listLevelsClassNames = listTheme[node.__tag + 'Depth'] || [];
    const listDepth = $getListDepth(node) - 1;
    const normalizedListDepth = listDepth % listLevelsClassNames.length;
    const listLevelClassName = listLevelsClassNames[normalizedListDepth];
    const listClassName = listTheme[node.__tag];
    let nestedListClassName;
    const nestedListTheme = listTheme.nested;
    if (nestedListTheme !== undefined && nestedListTheme.list) {
      nestedListClassName = nestedListTheme.list;
    }

    if (listClassName !== undefined) {
      classesToAdd.push(listClassName);
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

function convertListNode(domNode: Node): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (nodeName === 'ol') {
    node = $createListNode('number');
  } else if (nodeName === 'ul') {
    node = $createListNode('bullet');
  }
  return {node};
}

const TAG_TO_LIST_TYPE: $ReadOnly<{[ListNodeTagType]: ListType}> = {
  ol: 'number',
  ul: 'bullet',
};

export function $createListNode(
  listType: ListType,
  start?: number = 1,
): ListNode {
  return new ListNode(listType, start);
}

export function $isListNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ListNode;
}
