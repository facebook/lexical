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
  $getEditor,
  $getNearestNodeFromDOMNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementDOMSlot,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  setDOMUnmanaged,
  Spread,
} from 'lexical';
import invariant from 'shared/invariant';

import {PIXEL_VALUE_REG_EXP} from './constants';
import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {TableDOMCell, TableDOMTable} from './LexicalTableObserver';
import {TableRowNode} from './LexicalTableRowNode';
import {
  $getNearestTableCellInTableFromDOMNode,
  getTable,
} from './LexicalTableSelectionHelpers';

export type SerializedTableNode = Spread<
  {
    colWidths?: readonly number[];
    rowStriping?: boolean;
  },
  SerializedElementNode
>;

function updateColgroup(
  dom: HTMLElement,
  config: EditorConfig,
  colCount: number,
  colWidths?: number[] | readonly number[],
) {
  const colGroup = dom.querySelector('colgroup');
  if (!colGroup) {
    return;
  }
  const cols = [];
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement('col');
    const width = colWidths && colWidths[i];
    if (width) {
      col.style.width = `${width}px`;
    }
    cols.push(col);
  }
  colGroup.replaceChildren(...cols);
}

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

const scrollableEditors = new WeakSet<LexicalEditor>();

export function $isScrollableTablesActive(
  editor: LexicalEditor = $getEditor(),
): boolean {
  return scrollableEditors.has(editor);
}

export function setScrollableTablesActive(
  editor: LexicalEditor,
  active: boolean,
) {
  if (active) {
    if (__DEV__ && !editor._config.theme.tableScrollableWrapper) {
      console.warn(
        'TableNode: hasHorizontalScroll is active but theme.tableScrollableWrapper is not defined.',
      );
    }
    scrollableEditors.add(editor);
  } else {
    scrollableEditors.delete(editor);
  }
}

/** @noInheritDoc */
export class TableNode extends ElementNode {
  /** @internal */
  __rowStriping: boolean;
  __colWidths?: number[] | readonly number[];

  static getType(): string {
    return 'table';
  }

  getColWidths(): number[] | readonly number[] | undefined {
    const self = this.getLatest();
    return self.__colWidths;
  }

  setColWidths(colWidths: readonly number[]): this {
    const self = this.getWritable();
    // NOTE: Node properties should be immutable. Freeze to prevent accidental mutation.
    self.__colWidths = __DEV__ ? Object.freeze(colWidths) : colWidths;
    return self;
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__colWidths = prevNode.__colWidths;
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
    tableNode.__colWidths = serializedNode.colWidths;
    return tableNode;
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__rowStriping = false;
  }

  exportJSON(): SerializedTableNode {
    return {
      ...super.exportJSON(),
      colWidths: this.getColWidths(),
      rowStriping: this.__rowStriping ? this.__rowStriping : undefined,
      type: 'table',
      version: 1,
    };
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot {
    const tableElement =
      (element.nodeName !== 'TABLE' && element.querySelector('table')) ||
      element;
    invariant(
      tableElement.nodeName === 'TABLE',
      'TableNode.getDOMSlot: createDOM() did not return a table',
    );
    return super
      .getDOMSlot(tableElement)
      .withAfter(tableElement.querySelector('colgroup'));
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const tableElement = document.createElement('table');
    const colGroup = document.createElement('colgroup');
    tableElement.appendChild(colGroup);
    updateColgroup(
      tableElement,
      config,
      this.getColumnCount(),
      this.getColWidths(),
    );
    setDOMUnmanaged(colGroup);

    addClassNamesToElement(tableElement, config.theme.table);
    if (this.__rowStriping) {
      setRowStriping(tableElement, config, true);
    }
    if ($isScrollableTablesActive(editor)) {
      const wrapperElement = document.createElement('div');
      const classes = config.theme.tableScrollableWrapper;
      if (classes) {
        addClassNamesToElement(wrapperElement, classes);
      } else {
        wrapperElement.style.cssText = 'overflow-x: auto;';
      }
      wrapperElement.appendChild(tableElement);
      return wrapperElement;
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
    updateColgroup(dom, config, this.getColumnCount(), this.getColWidths());
    return false;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element, after} = super.exportDOM(editor);
    return {
      after: (tableElement) => {
        if (after) {
          tableElement = after(tableElement);
        }
        if (
          tableElement &&
          isHTMLElement(tableElement) &&
          tableElement.nodeName !== 'TABLE'
        ) {
          tableElement = tableElement.querySelector('table');
        }
        if (!tableElement || !isHTMLElement(tableElement)) {
          return null;
        }
        // Wrap direct descendant rows in a tbody for export
        const rows = tableElement.querySelectorAll(':scope > tr');
        if (rows.length > 0) {
          const tBody = document.createElement('tbody');
          tBody.append(...rows);
          tableElement.append(tBody);
        }
        return tableElement;
      },
      element:
        element && isHTMLElement(element) && element.nodeName !== 'TABLE'
          ? element.querySelector('table')
          : element,
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

      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (cell == null) {
          continue;
        }
        const {elem} = cell;
        const cellNode = $getNearestTableCellInTableFromDOMNode(this, elem);
        if (cellNode !== null && tableCellNode.is(cellNode)) {
          return {x, y};
        }
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

  getColumnCount(): number {
    const firstRow = this.getFirstChild<TableRowNode>();
    if (!firstRow) {
      return 0;
    }

    let columnCount = 0;
    firstRow.getChildren().forEach((cell) => {
      if ($isTableCellNode(cell)) {
        columnCount += cell.getColSpan();
      }
    });

    return columnCount;
  }
}

export function $getElementForTableNode(
  editor: LexicalEditor,
  tableNode: TableNode,
): TableDOMTable {
  const tableElement = editor.getElementByKey(tableNode.getKey());
  invariant(
    tableElement !== null,
    '$getElementForTableNode: Table Element Not Found',
  );
  return getTable(tableNode, tableElement);
}

export function $convertTableElement(
  domNode: HTMLElement,
): DOMConversionOutput {
  const tableNode = $createTableNode();
  if (domNode.hasAttribute('data-lexical-row-striping')) {
    tableNode.setRowStriping(true);
  }
  const colGroup = domNode.querySelector(':scope > colgroup');
  if (colGroup) {
    let columns: number[] | undefined = [];
    for (const col of colGroup.querySelectorAll(':scope > col')) {
      const width = (col as HTMLElement).style.width;
      if (!width || !PIXEL_VALUE_REG_EXP.test(width)) {
        columns = undefined;
        break;
      }
      columns.push(parseFloat(width));
    }
    if (columns) {
      tableNode.setColWidths(columns);
    }
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
