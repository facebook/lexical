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
  LexicalNode,
  NodeKey,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {GridRowNode} from 'lexical';

export class TableRowNode extends GridRowNode {
  __height: ?number;

  static getType(): 'tablerow' {
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

  constructor(height?: ?number, key?: NodeKey): void {
    super(key);
    this.__height = height;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('tr');

    if (this.__height) {
      element.style.height = `${this.__height}px`;
    }

    addClassNamesToElement(element, config.theme.tableRow);

    return element;
  }

  setHeight(height: number): ?number {
    const self = this.getWritable();
    self.__height = height;
    return this.__height;
  }

  getHeight(): ?number {
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

export function $createTableRowNode(height?: ?number): TableRowNode {
  return new TableRowNode(height);
}

export function $isTableRowNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableRowNode;
}
