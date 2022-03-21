/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {Cell, Grid} from './LexicalTableSelection';
import type {EditorConfig, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$getNearestNodeFromDOMNode, GridNode} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {getTableGrid} from './LexicalTableSelectionHelpers';

export class TableNode extends GridNode {
  __grid: ?Grid;

  static getType(): 'table' {
    return 'table';
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  createDOM<EditorContext>(
    config: EditorConfig<EditorContext>,
    editor: LexicalEditor,
  ): HTMLElement {
    const element = document.createElement('table');

    addClassNamesToElement(element, config.theme.table);

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  canExtractContents(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  getCordsFromCellNode(
    tableCellNode: TableCellNode,
    grid: Grid,
  ): {x: number, y: number} {
    invariant(grid, 'Grid not found.');

    const {rows, cells} = grid;

    for (let y = 0; y < rows; y++) {
      const row = cells[y];
      if (row == null) {
        throw new Error(`Row not found at y:${y}`);
      }

      const x = row.findIndex(({elem}) => {
        const cellNode = $getNearestNodeFromDOMNode(elem);
        return cellNode === tableCellNode;
      });

      if (x !== -1) {
        return {x, y};
      }
    }

    throw new Error('Cell not found in table.');
  }

  getCellFromCords(x: number, y: number, grid: Grid): ?Cell {
    invariant(grid, 'Grid not found.');

    const {cells} = grid;

    const row = cells[y];

    if (row == null) {
      return null;
    }

    const cell = row[x];

    if (cell == null) {
      return null;
    }

    return cell;
  }

  getCellFromCordsOrThrow(x: number, y: number, grid: Grid): Cell {
    const cell = this.getCellFromCords(x, y, grid);

    if (!cell) {
      throw new Error('Cell not found at cords.');
    }

    return cell;
  }

  getCellNodeFromCords(x: number, y: number, grid: Grid): ?TableCellNode {
    const cell = this.getCellFromCords(x, y, grid);

    if (cell == null) {
      return null;
    }

    const node = $getNearestNodeFromDOMNode(cell.elem);

    if ($isTableCellNode(node)) {
      return node;
    }

    return null;
  }

  getCellNodeFromCordsOrThrow(x: number, y: number, grid: Grid): TableCellNode {
    const node = this.getCellNodeFromCords(x, y, grid);

    if (!node) {
      throw new Error('Node at cords not TableCellNode.');
    }

    return node;
  }

  canSelectBefore(): true {
    return true;
  }
}

export function $getElementGridForTableNode(
  editor: LexicalEditor,
  tableNode: TableNode,
): Grid {
  const tableElement = editor.getElementByKey(tableNode.getKey());

  if (tableElement == null) {
    throw new Error('Table Element Not Found');
  }

  return getTableGrid(tableElement);
}

export function $createTableNode(): TableNode {
  return new TableNode();
}

export function $isTableNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableNode;
}
