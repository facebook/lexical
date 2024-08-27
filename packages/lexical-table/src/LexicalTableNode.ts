/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {
  addClassNamesToElement,
  isHTMLElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $getNearestNodeFromDOMNode,
  ElementNode,
} from 'lexical';

import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {TableDOMCell, TableDOMTable} from './LexicalTableObserver';
import {$isTableRowNode, TableRowNode} from './LexicalTableRowNode';
import {getTable} from './LexicalTableSelectionHelpers';

export type SerializedTableNode = Spread<
  {
    rowStriping?: boolean;
  },
  SerializedElementNode
>;

function setRowStriping(
  dom: HTMLElement,
  config: EditorConfig,
  rowStriping: boolean,
) {
  if (rowStriping) {
    addClassNamesToElement(dom, config.theme.tableRowStriping);
    dom.setAttribute('data-lexical-row-striping', 'true');
  } else {
    removeClassNamesFromElement(dom, config.theme.tableRowStriping);
    dom.removeAttribute('data-lexical-row-striping');
  }
}

/** @noInheritDoc */
export class TableNode extends ElementNode {
  /** @internal */
  __rowStriping: boolean;

  static getType(): string {
    return 'table';
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__rowStriping = prevNode.__rowStriping;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      table: (_node: Node) => ({
        conversion: $convertTableElement,
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableNode): TableNode {
    const tableNode = $createTableNode();
    tableNode.__rowStriping = serializedNode.rowStriping || false;
    return tableNode;
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__rowStriping = false;
  }

  exportJSON(): SerializedTableNode {
    return {
      ...super.exportJSON(),
      rowStriping: this.__rowStriping ? this.__rowStriping : undefined,
      type: 'table',
      version: 1,
    };
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const tableElement = document.createElement('table');

    addClassNamesToElement(tableElement, config.theme.table);
    if (this.__rowStriping) {
      setRowStriping(tableElement, config, true);
    }

    return tableElement;
  }

  updateDOM(
    prevNode: TableNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    if (prevNode.__rowStriping !== this.__rowStriping) {
      setRowStriping(dom, config, this.__rowStriping);
    }
    return false;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    return {
      ...super.exportDOM(editor),
      after: (tableElement) => {
        if (tableElement) {
          const newElement = tableElement.cloneNode() as ParentNode;
          const colGroup = document.createElement('colgroup');
          const tBody = document.createElement('tbody');
          if (isHTMLElement(tableElement)) {
            tBody.append(...tableElement.children);
          }
          const firstRow = this.getFirstChildOrThrow<TableRowNode>();

          if (!$isTableRowNode(firstRow)) {
            throw new Error('Expected to find row node.');
          }

          const colCount = firstRow.getChildrenSize();

          for (let i = 0; i < colCount; i++) {
            const col = document.createElement('col');
            colGroup.append(col);
          }

          newElement.replaceChildren(colGroup, tBody);

          return newElement as HTMLElement;
        }
      },
    };
  }

  canBeEmpty(): false {
    return false;
  }

  isShadowRoot(): boolean {
    return true;
  }

  getCordsFromCellNode(
    tableCellNode: TableCellNode,
    table: TableDOMTable,
  ): {x: number; y: number} {
    const {rows, domRows} = table;

    for (let y = 0; y < rows; y++) {
      const row = domRows[y];

      if (row == null) {
        continue;
      }

      const x = row.findIndex((cell) => {
        if (!cell) {
          return;
        }
        const {elem} = cell;
        const cellNode = $getNearestNodeFromDOMNode(elem);
        return cellNode === tableCellNode;
      });

      if (x !== -1) {
        return {x, y};
      }
    }

    throw new Error('Cell not found in table.');
  }

  getDOMCellFromCords(
    x: number,
    y: number,
    table: TableDOMTable,
  ): null | TableDOMCell {
    const {domRows} = table;

    const row = domRows[y];

    if (row == null) {
      return null;
    }

    const index = x < row.length ? x : row.length - 1;

    const cell = row[index];

    if (cell == null) {
      return null;
    }

    return cell;
  }

  getDOMCellFromCordsOrThrow(
    x: number,
    y: number,
    table: TableDOMTable,
  ): TableDOMCell {
    const cell = this.getDOMCellFromCords(x, y, table);

    if (!cell) {
      throw new Error('Cell not found at cords.');
    }

    return cell;
  }

  getCellNodeFromCords(
    x: number,
    y: number,
    table: TableDOMTable,
  ): null | TableCellNode {
    const cell = this.getDOMCellFromCords(x, y, table);

    if (cell == null) {
      return null;
    }

    const node = $getNearestNodeFromDOMNode(cell.elem);

    if ($isTableCellNode(node)) {
      return node;
    }

    return null;
  }

  getCellNodeFromCordsOrThrow(
    x: number,
    y: number,
    table: TableDOMTable,
  ): TableCellNode {
    const node = this.getCellNodeFromCords(x, y, table);

    if (!node) {
      throw new Error('Node at cords not TableCellNode.');
    }

    return node;
  }

  getRowStriping(): boolean {
    return Boolean(this.getLatest().__rowStriping);
  }

  setRowStriping(newRowStriping: boolean): void {
    this.getWritable().__rowStriping = newRowStriping;
  }

  canSelectBefore(): true {
    return true;
  }

  canIndent(): false {
    return false;
  }
}

export function $getElementForTableNode(
  editor: LexicalEditor,
  tableNode: TableNode,
): TableDOMTable {
  const tableElement = editor.getElementByKey(tableNode.getKey());

  if (tableElement == null) {
    throw new Error('Table Element Not Found');
  }

  return getTable(tableElement);
}

export function $convertTableElement(
  domNode: HTMLElement,
): DOMConversionOutput {
  const tableNode = $createTableNode();
  if (domNode.hasAttribute('data-lexical-row-striping')) {
    tableNode.setRowStriping(true);
  }
  return {node: tableNode};
}

export function $createTableNode(): TableNode {
  return $applyNodeReplacement(new TableNode());
}

export function $isTableNode(
  node: LexicalNode | null | undefined,
): node is TableNode {
  return node instanceof TableNode;
}
