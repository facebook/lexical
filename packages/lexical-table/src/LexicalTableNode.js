/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {Cell, Grid, SelectionShape} from './lexicalTableCoreHelpers';
import type {EditorConfig, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {$getNearestNodeFromDOMNode, GridNode} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {updateCells} from './lexicalTableCoreHelpers';

export class TableNode extends GridNode {
  __selectionShape: ?SelectionShape;
  __grid: ?Grid;

  static getType(): 'table' {
    return 'table';
  }

  static clone(
    node: TableNode,
    selectionShape: ?SelectionShape,
    grid: ?Grid,
  ): TableNode {
    // TODO: selectionShape and grid aren't being deeply cloned?
    // They shouldn't really be on the table node IMO.
    return new TableNode(node.__selectionShape, node.__grid, node.__key);
  }

  constructor(
    selectionShape: ?SelectionShape,
    grid: ?Grid,
    key?: NodeKey,
  ): void {
    super(key);

    this.__selectionShape = selectionShape;
    this.__grid = grid;
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

  setSelectionState(selectionShape: ?SelectionShape): Array<Cell> {
    const self = this.getWritable();

    self.__selectionShape = selectionShape;

    const grid = this.getGrid();

    if (grid == null) return [];

    if (!selectionShape) {
      return updateCells(-1, -1, -1, -1, grid.cells);
    }

    return updateCells(
      selectionShape.fromX,
      selectionShape.toX,
      selectionShape.fromY,
      selectionShape.toY,
      grid.cells,
    );
  }

  getSelectionState(): ?SelectionShape {
    return this.getLatest().__selectionShape;
  }

  getCordsFromCellNode(tableCellNode: TableCellNode): {x: number, y: number} {
    const grid = this.getGrid();

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

  getCellNodeFromCords(x: number, y: number): ?TableCellNode {
    const grid = this.getGrid();

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

    const node = $getNearestNodeFromDOMNode(cell.elem);

    if ($isTableCellNode(node)) {
      return node;
    }

    return null;
  }

  getCellNodeFromCordsOrThrow(x: number, y: number): TableCellNode {
    const node = this.getCellNodeFromCords(x, y);

    if (!node) {
      throw new Error('Node at cords not TableCellNode.');
    }

    return node;
  }

  setGrid(grid: ?Grid): TableNode {
    const self = this.getWritable();
    self.__grid = grid;
    return self;
  }

  getGrid(): ?Grid {
    return this.getLatest().__grid;
  }

  canSelectBefore(): true {
    return true;
  }
}

export function $createTableNode(): TableNode {
  return new TableNode();
}

export function $isTableNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableNode;
}
