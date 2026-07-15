/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
import {$descendantsMatching} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $getDocument,
  $getEditor,
  $getNearestNodeFromDOMNode,
  addClassNamesToElement,
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementDOMSlot,
  type ElementFormatType,
  ElementNode,
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  removeClassNamesFromElement,
  SerializedElementNode,
  setDOMStyleFromCSS,
  setDOMUnmanaged,
  Spread,
} from 'lexical';

import {PIXEL_VALUE_REG_EXP} from './constants';
import {$isTableCellNode, type TableCellNode} from './LexicalTableCellNode';
import {TableDOMCell, TableDOMTable} from './LexicalTableObserver';
import {$isTableRowNode} from './LexicalTableRowNode';
import {
  $getNearestTableCellInTableFromDOMNode,
  getTable,
  getTableElement,
  isHTMLTableElement,
} from './LexicalTableSelectionHelpers';
import {$computeTableMapSkipCellCheck} from './LexicalTableUtils';

const __DEV__ = process.env.NODE_ENV !== 'production';

function isHTMLDivElement(element: unknown): element is HTMLDivElement {
  return isHTMLElement(element) && element.nodeName === 'DIV';
}

export type SerializedTableNode = Spread<
  {
    colWidths?: readonly number[];
    rowStriping?: boolean;
    frozenColumnCount?: number;
    frozenRowCount?: number;
  },
  SerializedElementNode
>;

function $updateColgroup(
  dom: HTMLTableElement,
  colCount: number,
  colWidths?: number[] | readonly number[],
) {
  const colGroup = dom.querySelector('colgroup');
  if (!colGroup) {
    return;
  }
  const cols = [];
  for (let i = 0; i < colCount; i++) {
    const col = $getDocument().createElement('col');
    const width = colWidths && colWidths[i];
    if (width) {
      col.style.width = `${width}px`;
    }
    cols.push(col);
  }
  colGroup.replaceChildren(...cols);
}

function setRowStriping(
  dom: HTMLTableElement,
  config: EditorConfig,
  rowStriping: boolean,
): void {
  if (rowStriping) {
    addClassNamesToElement(dom, config.theme.tableRowStriping);
    dom.setAttribute('data-lexical-row-striping', 'true');
  } else {
    removeClassNamesFromElement(dom, config.theme.tableRowStriping);
    dom.removeAttribute('data-lexical-row-striping');
  }
}

function setFrozenColumns(
  dom: HTMLDivElement,
  tableElement: HTMLTableElement,
  config: EditorConfig,
  frozenColumnCount: number,
): void {
  if (frozenColumnCount > 0) {
    addClassNamesToElement(dom, config.theme.tableFrozenColumn);
    tableElement.setAttribute('data-lexical-frozen-column', 'true');
  } else {
    removeClassNamesFromElement(dom, config.theme.tableFrozenColumn);
    tableElement.removeAttribute('data-lexical-frozen-column');
  }
}

function setFrozenRows(
  dom: HTMLDivElement,
  tableElement: HTMLTableElement,
  config: EditorConfig,
  frozenRowCount: number,
): void {
  if (frozenRowCount > 0) {
    addClassNamesToElement(dom, config.theme.tableFrozenRow);
    tableElement.setAttribute('data-lexical-frozen-row', 'true');
  } else {
    removeClassNamesFromElement(dom, config.theme.tableFrozenRow);
    tableElement.removeAttribute('data-lexical-frozen-row');
  }
}

function alignTableElement(
  dom: HTMLTableElement,
  config: EditorConfig,
  formatType: ElementFormatType,
): void {
  if (!config.theme.tableAlignment) {
    return;
  }
  const removeClasses: string[] = [];
  const addClasses: string[] = [];
  for (const format of ['center', 'right'] as const) {
    const classes = config.theme.tableAlignment[format];
    if (!classes) {
      continue;
    }
    (format === formatType ? addClasses : removeClasses).push(classes);
  }
  removeClassNamesFromElement(dom, ...removeClasses);
  addClassNamesToElement(dom, ...addClasses);
}

function $createScrollableWrapper(
  tableElement: HTMLTableElement,
  config: EditorConfig,
  hideNativeScrollbar: boolean,
): HTMLDivElement {
  const wrapper = $getDocument().createElement('div');
  const classes = config.theme.tableScrollableWrapper;
  if (classes) {
    addClassNamesToElement(wrapper, classes);
  } else {
    wrapper.style.overflowX = 'auto';
    if (hideNativeScrollbar) {
      wrapper.style.scrollbarWidth = 'none';
    }
  }
  wrapper.appendChild(tableElement);
  return wrapper;
}

function $createStickyScrollbar(
  scrollableWrapper: HTMLDivElement,
  tableElement: HTMLTableElement,
  config: EditorConfig,
): HTMLDivElement {
  const doc = $getDocument();
  const scrollbar = doc.createElement('div');
  const classes = config.theme.tableStickyScrollbar;
  if (classes) {
    addClassNamesToElement(scrollbar, classes);
  } else {
    scrollbar.style.position = 'sticky';
    scrollbar.style.bottom = '0';
    scrollbar.style.overflowX = 'scroll';
    scrollbar.style.overflowY = 'hidden';
  }
  scrollbar.style.display = 'none';
  const spacer = doc.createElement('div');
  spacer.style.height = '1px';
  spacer.style.width = '0px';
  scrollbar.appendChild(spacer);

  let syncing = false;
  scrollableWrapper.addEventListener(
    'scroll',
    () => {
      if (syncing) {
        return;
      }
      syncing = true;
      scrollbar.scrollLeft = scrollableWrapper.scrollLeft;
      syncing = false;
    },
    {passive: true},
  );
  scrollbar.addEventListener(
    'scroll',
    () => {
      if (syncing) {
        return;
      }
      syncing = true;
      scrollableWrapper.scrollLeft = scrollbar.scrollLeft;
      syncing = false;
    },
    {passive: true},
  );

  queueMicrotask(() => syncStickyScrollbar(scrollbar, tableElement));
  const resizeObserver = new ResizeObserver(() => {
    syncStickyScrollbar(scrollbar, tableElement);
  });
  resizeObserver.observe(scrollableWrapper);
  resizeObserver.observe(tableElement);
  return scrollbar;
}

function syncStickyScrollbar(
  scrollbar: HTMLDivElement,
  tableElement: HTMLTableElement,
): void {
  const spacer = scrollbar.firstElementChild;
  if (!spacer || !isHTMLElement(spacer) || !tableElement.isConnected) {
    return;
  }
  spacer.style.width = tableElement.scrollWidth + 'px';
  const scrollableWrapper = scrollbar.previousElementSibling;
  const containerWidth =
    scrollableWrapper && isHTMLElement(scrollableWrapper)
      ? scrollableWrapper.clientWidth
      : 0;
  const hasOverflow = tableElement.scrollWidth > containerWidth;
  scrollbar.style.display = hasOverflow ? '' : 'none';
}

function getScrollableWrapper(dom: HTMLElement): HTMLDivElement | null {
  if (!isHTMLDivElement(dom)) {
    return null;
  }
  const firstChild = dom.firstElementChild;
  if (isHTMLDivElement(firstChild) && firstChild.querySelector('table')) {
    return firstChild;
  }
  return dom.querySelector('table') ? dom : null;
}

const scrollableEditors = new WeakSet<LexicalEditor>();
const stickyScrollbarEditors = new WeakSet<LexicalEditor>();

export function $isScrollableTablesActive(
  editor: LexicalEditor = $getEditor(),
): boolean {
  return scrollableEditors.has(editor);
}

export function $isStickyScrollbarActive(
  editor: LexicalEditor = $getEditor(),
): boolean {
  return stickyScrollbarEditors.has(editor);
}

export function setScrollableTablesActive(
  editor: LexicalEditor,
  active: boolean,
): void {
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

export function setStickyScrollbarActive(
  editor: LexicalEditor,
  active: boolean,
): void {
  if (active) {
    stickyScrollbarEditors.add(editor);
  } else {
    stickyScrollbarEditors.delete(editor);
  }
}

/** @noInheritDoc */
export class TableNode extends ElementNode {
  /** @internal */
  __rowStriping: boolean;
  __frozenColumnCount: number;
  __frozenRowCount: number;
  __colWidths?: readonly number[];

  static getType(): string {
    return 'table';
  }

  getColWidths(): readonly number[] | undefined {
    const self = this.getLatest();
    return self.__colWidths;
  }

  setColWidths(colWidths: readonly number[] | undefined): this {
    const self = this.getWritable();
    // NOTE: Node properties should be immutable. Freeze to prevent accidental mutation.
    self.__colWidths =
      colWidths !== undefined && __DEV__ ? Object.freeze(colWidths) : colWidths;
    return self;
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__colWidths = prevNode.__colWidths;
    this.__rowStriping = prevNode.__rowStriping;
    this.__frozenColumnCount = prevNode.__frozenColumnCount;
    this.__frozenRowCount = prevNode.__frozenRowCount;
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
    return $createTableNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedTableNode>): this {
    return super
      .updateFromJSON(serializedNode)
      .setRowStriping(serializedNode.rowStriping || false)
      .setFrozenColumns(serializedNode.frozenColumnCount || 0)
      .setFrozenRows(serializedNode.frozenRowCount || 0)
      .setColWidths(serializedNode.colWidths);
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__rowStriping = false;
    this.__frozenColumnCount = 0;
    this.__frozenRowCount = 0;
    this.__colWidths = undefined;
  }

  exportJSON(): SerializedTableNode {
    return {
      ...super.exportJSON(),
      colWidths: this.getColWidths(),
      frozenColumnCount: this.__frozenColumnCount
        ? this.__frozenColumnCount
        : undefined,
      frozenRowCount: this.__frozenRowCount ? this.__frozenRowCount : undefined,
      rowStriping: this.__rowStriping ? this.__rowStriping : undefined,
    };
  }

  extractWithChild(
    child: LexicalNode,
    selection: BaseSelection | null,
    destination: 'clone' | 'html',
  ): boolean {
    return destination === 'html';
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLTableElement> {
    const tableElement = !isHTMLTableElement(element)
      ? element.querySelector('table')
      : element;
    invariant(
      isHTMLTableElement(tableElement),
      'TableNode.getDOMSlot: createDOM() did not return a table',
    );
    return super
      .getDOMSlot(element)
      .withElement(tableElement)
      .withAfter(tableElement.querySelector('colgroup'));
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const tableElement = $getDocument().createElement('table');
    if (this.__style) {
      setDOMStyleFromCSS(tableElement.style, this.__style);
    }
    const colGroup = $getDocument().createElement('colgroup');
    tableElement.appendChild(colGroup);
    setDOMUnmanaged(colGroup);
    addClassNamesToElement(tableElement, config.theme.table);
    this.updateTableElement(null, tableElement, config);
    if ($isScrollableTablesActive(editor)) {
      const hasStickyScrollbar = $isStickyScrollbarActive(editor);
      const scrollableWrapper = $createScrollableWrapper(
        tableElement,
        config,
        hasStickyScrollbar,
      );
      if (hasStickyScrollbar) {
        const stickyScrollbar = $createStickyScrollbar(
          scrollableWrapper,
          tableElement,
          config,
        );
        const outerWrapper = $getDocument().createElement('div');
        outerWrapper.appendChild(scrollableWrapper);
        outerWrapper.appendChild(stickyScrollbar);
        setDOMUnmanaged(stickyScrollbar);
        this.updateTableWrapper(null, scrollableWrapper, tableElement, config);
        return outerWrapper;
      }
      this.updateTableWrapper(null, scrollableWrapper, tableElement, config);
      return scrollableWrapper;
    }
    return tableElement;
  }

  updateTableWrapper(
    prevNode: this | null,
    tableWrapper: HTMLDivElement,
    tableElement: HTMLTableElement,
    config: EditorConfig,
  ): void {
    if (
      this.__frozenColumnCount !== (prevNode ? prevNode.__frozenColumnCount : 0)
    ) {
      setFrozenColumns(
        tableWrapper,
        tableElement,
        config,
        this.__frozenColumnCount,
      );
    }
    if (this.__frozenRowCount !== (prevNode ? prevNode.__frozenRowCount : 0)) {
      setFrozenRows(tableWrapper, tableElement, config, this.__frozenRowCount);
    }
  }

  updateTableElement(
    prevNode: this | null,
    tableElement: HTMLTableElement,
    config: EditorConfig,
  ): void {
    if (this.__style !== (prevNode ? prevNode.__style : '')) {
      setDOMStyleFromCSS(
        tableElement.style,
        this.__style,
        prevNode ? prevNode.__style : '',
      );
    }
    if (this.__rowStriping !== (prevNode ? prevNode.__rowStriping : false)) {
      setRowStriping(tableElement, config, this.__rowStriping);
    }
    const prevColCount = prevNode ? prevNode.getColumnCount() : 0;
    const prevColWidths = prevNode ? prevNode.__colWidths : undefined;
    if (
      this.getColumnCount() !== prevColCount ||
      this.getColWidths() !== prevColWidths
    ) {
      $updateColgroup(tableElement, this.getColumnCount(), this.getColWidths());
    }
    alignTableElement(tableElement, config, this.getFormatType());
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const tableElement = getTableElement(this, dom);
    if ((dom === tableElement) === $isScrollableTablesActive()) {
      return true;
    }
    if (isHTMLDivElement(dom)) {
      const scrollable = getScrollableWrapper(dom);
      if (scrollable) {
        const hasStickyDom = scrollable !== dom;
        if (hasStickyDom !== $isStickyScrollbarActive()) {
          return true;
        }
        this.updateTableWrapper(prevNode, scrollable, tableElement, config);
        if (hasStickyDom) {
          const stickyScrollbar = scrollable.nextElementSibling;
          if (isHTMLDivElement(stickyScrollbar)) {
            queueMicrotask(() =>
              syncStickyScrollbar(stickyScrollbar, tableElement),
            );
          }
        }
      } else if (__DEV__) {
        console.warn(
          'TableNode.updateDOM: Could not find scrollable wrapper in DOM',
        );
      }
    }
    this.updateTableElement(prevNode, tableElement, config);
    return false;
  }

  scaleDOMColWidths(dom: HTMLElement, scale: number): void {
    const colWidths = this.getColWidths();
    if (!colWidths) {
      return;
    }
    const tableElement = getTableElement(this, dom);
    $updateColgroup(
      tableElement,
      this.getColumnCount(),
      colWidths.map(width => width * scale),
    );
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const superExport = super.exportDOM(editor);
    const {element} = superExport;
    return {
      after: tableElement => {
        if (superExport.after) {
          tableElement = superExport.after(tableElement);
        }
        if (!isHTMLTableElement(tableElement) && isHTMLElement(tableElement)) {
          tableElement = tableElement.querySelector('table');
        }
        if (!isHTMLTableElement(tableElement)) {
          return null;
        }
        alignTableElement(tableElement, editor._config, this.getFormatType());

        // Scan the table map to build a map of table cell key to the columns it needs
        const [tableMap] = $computeTableMapSkipCellCheck(this, null, null);
        const cellValues = new Map<
          NodeKey,
          {startColumn: number; colSpan: number}
        >();
        for (const mapRow of tableMap) {
          for (const mapValue of mapRow) {
            const key = mapValue.cell.getKey();
            if (!cellValues.has(key)) {
              cellValues.set(key, {
                colSpan: mapValue.cell.getColSpan(),
                startColumn: mapValue.startColumn,
              });
            }
          }
        }

        // scan the DOM to find the table cell keys that were used and mark those columns
        const knownColumns = new Set<number>();
        for (const cellDOM of tableElement.querySelectorAll(
          ':scope > tr > [data-temporary-table-cell-lexical-key]',
        )) {
          const key = cellDOM.getAttribute(
            'data-temporary-table-cell-lexical-key',
          );
          if (key) {
            const cellSpan = cellValues.get(key);
            cellDOM.removeAttribute('data-temporary-table-cell-lexical-key');
            if (cellSpan) {
              cellValues.delete(key);
              for (let i = 0; i < cellSpan.colSpan; i++) {
                knownColumns.add(i + cellSpan.startColumn);
              }
            }
          }
        }

        // Compute the colgroup and columns in the export
        const colGroup = tableElement.querySelector(':scope > colgroup');
        if (colGroup) {
          // Only include the <col /> for rows that are in the output
          const cols = Array.from(
            tableElement.querySelectorAll(':scope > colgroup > col'),
          ).filter((dom, i) => knownColumns.has(i));
          colGroup.replaceChildren(...cols);
        }

        // Wrap direct descendant rows in a tbody for export
        const rows = tableElement.querySelectorAll(':scope > tr');
        if (rows.length > 0) {
          const tBody = $getDocument().createElement('tbody');
          for (const row of rows) {
            tBody.appendChild(row);
          }
          tableElement.append(tBody);
        }
        return tableElement;
      },
      element:
        !isHTMLTableElement(element) && isHTMLElement(element)
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

  setRowStriping(newRowStriping: boolean): this {
    const self = this.getWritable();
    self.__rowStriping = newRowStriping;
    return self;
  }

  setFrozenColumns(columnCount: number): this {
    const self = this.getWritable();
    self.__frozenColumnCount = columnCount;
    return self;
  }

  getFrozenColumns(): number {
    return this.getLatest().__frozenColumnCount;
  }

  setFrozenRows(rowCount: number): this {
    const self = this.getWritable();
    self.__frozenRowCount = rowCount;
    return self;
  }

  getFrozenRows(): number {
    return this.getLatest().__frozenRowCount;
  }

  canSelectBefore(): true {
    return true;
  }

  canIndent(): false {
    return false;
  }

  getColumnCount(): number {
    const firstRow = this.getFirstChild();
    if (!$isTableRowNode(firstRow)) {
      return 0;
    }

    let columnCount = 0;
    firstRow.getChildren().forEach(cell => {
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
  if (domNode.hasAttribute('data-lexical-frozen-column')) {
    tableNode.setFrozenColumns(1);
  }
  if (domNode.hasAttribute('data-lexical-frozen-row')) {
    tableNode.setFrozenRows(1);
  }
  const colGroup = domNode.querySelector(':scope > colgroup');
  if (colGroup) {
    let columns: number[] | undefined = [];
    for (const col of colGroup.querySelectorAll(':scope > col')) {
      let width = (col as HTMLElement).style.width || '';
      if (!PIXEL_VALUE_REG_EXP.test(width)) {
        // Also support deprecated width attribute for google docs
        width = col.getAttribute('width') || '';
        if (!/^\d+$/.test(width)) {
          columns = undefined;
          break;
        }
      }
      columns.push(parseFloat(width));
    }
    if (columns) {
      tableNode.setColWidths(columns);
    }
  }
  return {
    after: children => $descendantsMatching(children, $isTableRowNode),
    node: tableNode,
  };
}

export function $createTableNode(): TableNode {
  return $applyNodeReplacement(new TableNode());
}

export function $isTableNode(
  node: LexicalNode | null | undefined,
): node is TableNode {
  return node instanceof TableNode;
}
