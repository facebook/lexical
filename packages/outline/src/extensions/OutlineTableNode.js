/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @emails oncall+unified_editor
 * @flow strict-local
 * @format
 */

'use strict';

import type {OutlineNode} from '../core/OutlineNode';
import type {EditorConfig, NodeKey} from 'outline';

import {createTextNode} from '../core/OutlineTextNode';
import {createOutlineTableCellNode} from './OutlineTableCellNode';
import {createOutlineTableRowNode} from './OutlineTableRowNode';
import {BlockNode} from 'outline';

export class OutlineTableNode extends BlockNode {
  static getType(): string {
    return 'table';
  }

  static clone(node: OutlineTableNode): OutlineTableNode {
    return new OutlineTableNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('table');

    if (config.theme.table != null) {
      element.classList.add(config.theme.table);
    }

    return element;
  }

  updateDOM(): boolean {
    return false;
  }
}

export function createOutlineTableNode(): OutlineTableNode {
  return new OutlineTableNode();
}

export function isOutlineTableNode(node: OutlineNode): boolean {
  return node instanceof OutlineTableNode;
}

export function createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeader?: boolean = true,
): OutlineTableNode {
  const tableNode = createOutlineTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRow = createOutlineTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      const tableCell = createOutlineTableCellNode(iRow === 0 && includeHeader);
      tableCell.append(createTextNode());
      tableRow.append(tableCell);
    }

    tableNode.append(tableRow);
  }

  return tableNode;
}
