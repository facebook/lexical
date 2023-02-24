/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {addClassNamesToElement} from '@lexical/utils';
import {
  $applyNodeReplacement,
  DEPRECATED_GridRowNode,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
} from 'lexical';

/** @noInheritDoc */
export class TableRowNode extends DEPRECATED_GridRowNode {
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
        conversion: convertTableRowElement,
        priority: 0,
      }),
    };
  }

  constructor(height?: number, key?: NodeKey) {
    super(key);
    this.__height = height;
    return $applyNodeReplacement(this);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('tr');

    if (this.__height) {
      element.style.height = `${this.__height}px`;
    }

    addClassNamesToElement(element, config.theme.tableRow);

    return element;
  }

  isShadowRoot(): boolean {
    return true;
  }

  setHeight(height: number): number | null | undefined {
    const self = this.getWritable();
    self.__height = height;
    return this.__height;
  }

  getHeight(): number | null | undefined {
    return this.getLatest().__height;
  }

  updateDOM(prevNode: TableRowNode): boolean {
    return prevNode.__height !== this.__height;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export function convertTableRowElement(domNode: Node): DOMConversionOutput {
  return {node: $createTableRowNode()};
}

export function $createTableRowNode(height?: number): TableRowNode {
  return new TableRowNode(height);
}

export function $isTableRowNode(
  node: LexicalNode | null | undefined,
): node is TableRowNode {
  return node instanceof TableRowNode;
}
