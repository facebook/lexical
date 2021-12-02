/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey, EditorConfig} from 'outline';

import {ElementNode} from 'outline';

export class TableCellNode extends ElementNode {
  __isHeader: boolean;

  static getType(): string {
    return 'table-cell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(false, node.__key);
  }

  constructor(isHeader?: boolean = false, key?: NodeKey) {
    super(key);
    this.__isHeader = isHeader;
  }

  getTag(): string {
    return this.__isHeader ? 'th' : 'td';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement(this.getTag());

    if (config.theme.tableCell != null) {
      element.classList.add(config.theme.tableCell);
    }

    if (this.__isHeader === true && config.theme.tableCellHeader) {
      element.classList.add(config.theme.tableCellHeader);
    }

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  collapseAtStart(): true {
    return true;
  }

  canSelectionRemove(): boolean {
    return false;
  }
}

export function createTableCellNode(isHeader: boolean): TableCellNode {
  return new TableCellNode(isHeader);
}

export function isTableCellNode(node: OutlineNode): boolean {
  return node instanceof TableCellNode;
}
