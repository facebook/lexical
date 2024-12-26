/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {BaseSelection, LexicalUpdateJSON, Spread} from 'lexical';

import {$descendantsMatching, addClassNamesToElement} from '@lexical/utils';
import {
  $applyNodeReplacement,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
} from 'lexical';

import {PIXEL_VALUE_REG_EXP} from './constants';
import {$isTableCellNode} from './LexicalTableCellNode';

export type SerializedTableRowNode = Spread<
  {
    height?: number;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class TableRowNode extends ElementNode {
  /** @internal */
  __height?: number;

  static getType(): string {
    return 'tablerow';
  }

  static clone(node: TableRowNode): TableRowNode {
    return new TableRowNode(node.__height, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      tr: (node: Node) => ({
        conversion: $convertTableRowElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableRowNode): TableRowNode {
    return $createTableRowNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedTableRowNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setHeight(serializedNode.height);
  }

  constructor(height?: number, key?: NodeKey) {
    super(key);
    this.__height = height;
  }

  exportJSON(): SerializedTableRowNode {
    const height = this.getHeight();
    return {
      ...super.exportJSON(),
      ...(height === undefined ? undefined : {height}),
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('tr');

    if (this.__height) {
      element.style.height = `${this.__height}px`;
    }

    addClassNamesToElement(element, config.theme.tableRow);

    return element;
  }

  extractWithChild(
    child: LexicalNode,
    selection: BaseSelection | null,
    destination: 'clone' | 'html',
  ): boolean {
    return destination === 'html';
  }

  isShadowRoot(): boolean {
    return true;
  }

  setHeight(height?: number | undefined): this {
    const self = this.getWritable();
    self.__height = height;
    return self;
  }

  getHeight(): number | undefined {
    return this.getLatest().__height;
  }

  updateDOM(prevNode: this): boolean {
    return prevNode.__height !== this.__height;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export function $convertTableRowElement(domNode: Node): DOMConversionOutput {
  const domNode_ = domNode as HTMLTableCellElement;
  let height: number | undefined = undefined;

  if (PIXEL_VALUE_REG_EXP.test(domNode_.style.height)) {
    height = parseFloat(domNode_.style.height);
  }

  return {
    after: (children) => $descendantsMatching(children, $isTableCellNode),
    node: $createTableRowNode(height),
  };
}

export function $createTableRowNode(height?: number): TableRowNode {
  return $applyNodeReplacement(new TableRowNode(height));
}

export function $isTableRowNode(
  node: LexicalNode | null | undefined,
): node is TableRowNode {
  return node instanceof TableRowNode;
}
