/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {TableDOMCell, TableDOMRows} from './LexicalTableObserver';
import type {
  TableMapType,
  TableMapValueType,
  TableSelection,
} from './LexicalTableSelection';
import type {
  BaseSelection,
  CaretDirection,
  ChildCaret,
  EditorState,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  PointCaret,
  RangeSelection,
  SiblingCaret,
} from 'lexical';

import {
  $findMatchingParent,
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $caretFromPoint,
  $createParagraphNode,
  $extendCaretToRange,
  $getAdjacentChildCaret,
  $getChildCaret,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $getSiblingCaret,
  $isChildCaret,
  $isElementNode,
  $isExtendableTextPointCaret,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isSiblingCaret,
  $isTextNode,
  $normalizeCaret,
  $setPointFromCaret,
  $setSelection,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  getDOMSelection,
  isHTMLElement,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {
  $getElementForTableNode,
  $isScrollableTablesActive,
  $isTableNode,
  TableNode,
} from './LexicalTableNode';
import {TableDOMTable, TableObserver} from './LexicalTableObserver';
import {$isTableRowNode} from './LexicalTableRowNode';
import {$isTableSelection} from './LexicalTableSelection';
import {
  $computeTableCellRectBoundary,
  $computeTableCellRectSpans,
  $computeTableMap,
  $getNodeTriplet,
  TableCellRectBoundary,
} from './LexicalTableUtils';

export const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';

export const isPointerDownOnEvent = (event: PointerEvent) => {
  return (event.buttons & 1) === 1;
};

export function isHTMLTableElement(el: unknown): el is HTMLTableElement {
  return isHTMLElement(el) && el.nodeName === 'TABLE';
}

export function getTableElement<T extends HTMLElement | null>(
  tableNode: TableNode,
  dom: T,
): HTMLTableElementWithWithTableSelectionState | (T & null) {
  if (!dom) {
    return dom as T & null;
  }
  const element = (
    isHTMLTableElement(dom) ? dom : tableNode.getDOMSlot(dom).element
  ) as HTMLTableElementWithWithTableSelectionState;
  invariant(
    element.nodeName === 'TABLE',
    'getTableElement: Expecting table in as DOM node for TableNode, not %s',
    dom.nodeName,
  );
  return element;
}

export function getEditorWindow(editor: LexicalEditor): Window | null {
  return editor._window;
}

export function $findParentTableCellNodeInTable(
  tableNode: LexicalNode,
  node: LexicalNode | null,
): TableCellNode | null {
  for (
    let currentNode = node, lastTableCellNode: TableCellNode | null = null;
    currentNode !== null;
    currentNode = currentNode.getParent()
  ) {
    if (tableNode.is(currentNode)) {
      return lastTableCellNode;
    } else if ($isTableCellNode(currentNode)) {
      lastTableCellNode = currentNode;
    }
  }
  return null;
}

export const ARROW_KEY_COMMANDS_WITH_DIRECTION = [
  [KEY_ARROW_DOWN_COMMAND, 'down'],
  [KEY_ARROW_UP_COMMAND, 'up'],
  [KEY_ARROW_LEFT_COMMAND, 'backward'],
  [KEY_ARROW_RIGHT_COMMAND, 'forward'],
] as const;
export const DELETE_TEXT_COMMANDS = [
  DELETE_WORD_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_CHARACTER_COMMAND,
] as const;
export const DELETE_KEY_COMMANDS = [
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
] as const;

export type HTMLTableElementWithWithTableSelectionState = HTMLTableElement & {
  [LEXICAL_ELEMENT_KEY]?: TableObserver | undefined;
};

export function detachTableObserverFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableObserver: TableObserver,
) {
  if (getTableObserverFromTableElement(tableElement) === tableObserver) {
    delete tableElement[LEXICAL_ELEMENT_KEY];
  }
}

export function attachTableObserverToTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableObserver: TableObserver,
) {
  invariant(
    getTableObserverFromTableElement(tableElement) === null,
    'tableElement already has an attached TableObserver',
  );
  tableElement[LEXICAL_ELEMENT_KEY] = tableObserver;
}

export function getTableObserverFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
): TableObserver | null {
  return tableElement[LEXICAL_ELEMENT_KEY] || null;
}

export function getDOMCellFromTarget(node: null | Node): TableDOMCell | null {
  let currentNode: ParentNode | Node | null = node;

  while (currentNode != null) {
    const nodeName = currentNode.nodeName;

    if (nodeName === 'TD' || nodeName === 'TH') {
      // @ts-expect-error: internal field
      const cell = currentNode._cell;

      if (cell === undefined) {
        return null;
      }

      return cell;
    }

    currentNode = currentNode.parentNode;
  }

  return null;
}

export function getDOMCellInTableFromTarget(
  table: HTMLTableElementWithWithTableSelectionState,
  node: null | Node,
): TableDOMCell | null {
  if (!table.contains(node)) {
    return null;
  }
  let cell: null | TableDOMCell = null;
  for (
    let currentNode: ParentNode | Node | null = node;
    currentNode != null;
    currentNode = currentNode.parentNode
  ) {
    if (currentNode === table) {
      return cell;
    }
    const nodeName = currentNode.nodeName;
    if (nodeName === 'TD' || nodeName === 'TH') {
      // @ts-expect-error: internal field
      cell = currentNode._cell || null;
    }
  }
  return null;
}

export function doesTargetContainText(node: Node): boolean {
  const currentNode: ParentNode | Node | null = node;

  if (currentNode !== null) {
    const nodeName = currentNode.nodeName;

    if (nodeName === 'SPAN') {
      return true;
    }
  }
  return false;
}

export function getTable(
  tableNode: TableNode,
  dom: HTMLElement,
): TableDOMTable {
  const tableElement = getTableElement(tableNode, dom);
  const domRows: TableDOMRows = [];
  const grid = {
    columns: 0,
    domRows,
    rows: 0,
  };
  let currentNode = tableElement.querySelector('tr') as ChildNode | null;
  let x = 0;
  let y = 0;
  domRows.length = 0;

  while (currentNode != null) {
    const nodeMame = currentNode.nodeName;

    if (nodeMame === 'TD' || nodeMame === 'TH') {
      const elem = currentNode as HTMLElement;
      const cell = {
        elem,
        hasBackgroundColor: elem.style.backgroundColor !== '',
        highlighted: false,
        x,
        y,
      };

      // @ts-expect-error: internal field
      currentNode._cell = cell;

      let row = domRows[y];
      if (row === undefined) {
        row = domRows[y] = [];
      }

      row[x] = cell;
    } else {
      const child = currentNode.firstChild;

      if (child != null) {
        currentNode = child;
        continue;
      }
    }

    const sibling = currentNode.nextSibling;

    if (sibling != null) {
      x++;
      currentNode = sibling;
      continue;
    }

    const parent = currentNode.parentNode;

    if (parent != null) {
      const parentSibling = parent.nextSibling;

      if (parentSibling == null) {
        break;
      }

      y++;
      x = 0;
      currentNode = parentSibling;
    }
  }

  grid.columns = x + 1;
  grid.rows = y + 1;

  return grid;
}

export function $updateDOMForSelection(
  editor: LexicalEditor,
  table: TableDOMTable,
  selection: TableSelection | RangeSelection | null,
) {
  const selectedCellNodes = new Set(selection ? selection.getNodes() : []);
  $forEachTableCell(table, (cell, lexicalNode) => {
    const elem = cell.elem;

    if (selectedCellNodes.has(lexicalNode)) {
      cell.highlighted = true;
      $addHighlightToDOM(editor, cell);
    } else {
      cell.highlighted = false;
      $removeHighlightFromDOM(editor, cell);
      if (!elem.getAttribute('style')) {
        elem.removeAttribute('style');
      }
    }
  });
}

export function $forEachTableCell(
  grid: TableDOMTable,
  cb: (
    cell: TableDOMCell,
    lexicalNode: LexicalNode,
    cords: {
      x: number;
      y: number;
    },
  ) => void,
) {
  const {domRows} = grid;

  for (let y = 0; y < domRows.length; y++) {
    const row = domRows[y];
    if (!row) {
      continue;
    }

    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (!cell) {
        continue;
      }
      const lexicalNode = $getNearestNodeFromDOMNode(cell.elem);

      if (lexicalNode !== null) {
        cb(cell, lexicalNode, {
          x,
          y,
        });
      }
    }
  }
}

export function $addHighlightStyleToTable(
  editor: LexicalEditor,
  tableSelection: TableObserver,
) {
  tableSelection.$disableHighlightStyle();
  $forEachTableCell(tableSelection.table, (cell) => {
    cell.highlighted = true;
    $addHighlightToDOM(editor, cell);
  });
}

export function $removeHighlightStyleToTable(
  editor: LexicalEditor,
  tableObserver: TableObserver,
) {
  tableObserver.$enableHighlightStyle();
  $forEachTableCell(tableObserver.table, (cell) => {
    const elem = cell.elem;
    cell.highlighted = false;
    $removeHighlightFromDOM(editor, cell);

    if (!elem.getAttribute('style')) {
      elem.removeAttribute('style');
    }
  });
}

export function $selectAdjacentCell(
  tableCellNode: TableCellNode,
  direction: 'next' | 'previous',
) {
  const siblingMethod =
    direction === 'next' ? 'getNextSibling' : 'getPreviousSibling';
  const childMethod = direction === 'next' ? 'getFirstChild' : 'getLastChild';
  const sibling = tableCellNode[siblingMethod]();
  if ($isElementNode(sibling)) {
    return sibling.selectEnd();
  }
  const parentRow = $findMatchingParent(tableCellNode, $isTableRowNode);
  invariant(parentRow !== null, 'selectAdjacentCell: Cell not in table row');
  for (
    let nextRow = parentRow[siblingMethod]();
    $isTableRowNode(nextRow);
    nextRow = nextRow[siblingMethod]()
  ) {
    const child = nextRow[childMethod]();
    if ($isElementNode(child)) {
      return child.selectEnd();
    }
  }
  const parentTable = $findMatchingParent(parentRow, $isTableNode);
  invariant(parentTable !== null, 'selectAdjacentCell: Row not in table');
  return direction === 'next'
    ? parentTable.selectNext()
    : parentTable.selectPrevious();
}

type Direction = 'backward' | 'forward' | 'up' | 'down';

const selectTableNodeInDirection = (
  tableObserver: TableObserver,
  tableNode: TableNode,
  x: number,
  y: number,
  direction: Direction,
): boolean => {
  const isForward = direction === 'forward';

  switch (direction) {
    case 'backward':
    case 'forward':
      if (x !== (isForward ? tableObserver.table.columns - 1 : 0)) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(
            x + (isForward ? 1 : -1),
            y,
            tableObserver.table,
          ),
          isForward,
        );
      } else {
        if (y !== (isForward ? tableObserver.table.rows - 1 : 0)) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(
              isForward ? 0 : tableObserver.table.columns - 1,
              y + (isForward ? 1 : -1),
              tableObserver.table,
            ),
            isForward,
          );
        } else if (!isForward) {
          tableNode.selectPrevious();
        } else {
          tableNode.selectNext();
        }
      }

      return true;

    case 'up':
      if (y !== 0) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y - 1, tableObserver.table),
          false,
        );
      } else {
        tableNode.selectPrevious();
      }

      return true;

    case 'down':
      if (y !== tableObserver.table.rows - 1) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y + 1, tableObserver.table),
          true,
        );
      } else {
        tableNode.selectNext();
      }

      return true;
    default:
      return false;
  }
};

type Corner = ['minColumn' | 'maxColumn', 'minRow' | 'maxRow'];
function getCorner(
  rect: TableCellRectBoundary,
  cellValue: TableMapValueType,
): Corner | null {
  let colName: 'minColumn' | 'maxColumn';
  let rowName: 'minRow' | 'maxRow';
  if (cellValue.startColumn === rect.minColumn) {
    colName = 'minColumn';
  } else if (
    cellValue.startColumn + cellValue.cell.__colSpan - 1 ===
    rect.maxColumn
  ) {
    colName = 'maxColumn';
  } else {
    return null;
  }
  if (cellValue.startRow === rect.minRow) {
    rowName = 'minRow';
  } else if (
    cellValue.startRow + cellValue.cell.__rowSpan - 1 ===
    rect.maxRow
  ) {
    rowName = 'maxRow';
  } else {
    return null;
  }
  return [colName, rowName];
}

function getCornerOrThrow(
  rect: TableCellRectBoundary,
  cellValue: TableMapValueType,
): Corner {
  const corner = getCorner(rect, cellValue);
  invariant(
    corner !== null,
    'getCornerOrThrow: cell %s is not at a corner of rect',
    cellValue.cell.getKey(),
  );
  return corner;
}

function oppositeCorner([colName, rowName]: Corner): Corner {
  return [
    colName === 'minColumn' ? 'maxColumn' : 'minColumn',
    rowName === 'minRow' ? 'maxRow' : 'minRow',
  ];
}

function cellAtCornerOrThrow(
  tableMap: TableMapType,
  rect: TableCellRectBoundary,
  [colName, rowName]: Corner,
): TableMapValueType {
  const rowNum = rect[rowName];
  const rowMap = tableMap[rowNum];
  invariant(
    rowMap !== undefined,
    'cellAtCornerOrThrow: %s = %s missing in tableMap',
    rowName,
    String(rowNum),
  );
  const colNum = rect[colName];
  const cell = rowMap[colNum];
  invariant(
    cell !== undefined,
    'cellAtCornerOrThrow: %s = %s missing in tableMap',
    colName,
    String(colNum),
  );
  return cell;
}

function $extractRectCorners(
  tableMap: TableMapType,
  anchorCellValue: TableMapValueType,
  newFocusCellValue: TableMapValueType,
) {
  // We are sure that the focus now either contracts or expands the rect
  // but both the anchor and focus might be moved to ensure a rectangle
  // given a potentially ragged merge shape
  const rect = $computeTableCellRectBoundary(
    tableMap,
    anchorCellValue,
    newFocusCellValue,
  );
  const anchorCorner = getCorner(rect, anchorCellValue);
  if (anchorCorner) {
    return [
      cellAtCornerOrThrow(tableMap, rect, anchorCorner),
      cellAtCornerOrThrow(tableMap, rect, oppositeCorner(anchorCorner)),
    ];
  }
  const newFocusCorner = getCorner(rect, newFocusCellValue);
  if (newFocusCorner) {
    return [
      cellAtCornerOrThrow(tableMap, rect, oppositeCorner(newFocusCorner)),
      cellAtCornerOrThrow(tableMap, rect, newFocusCorner),
    ];
  }
  // TODO this doesn't have to be arbitrary, use the closest corner instead
  const newAnchorCorner: Corner = ['minColumn', 'minRow'];
  return [
    cellAtCornerOrThrow(tableMap, rect, newAnchorCorner),
    cellAtCornerOrThrow(tableMap, rect, oppositeCorner(newAnchorCorner)),
  ];
}

function $adjustFocusInDirection(
  tableObserver: TableObserver,
  tableMap: TableMapType,
  anchorCellValue: TableMapValueType,
  focusCellValue: TableMapValueType,
  direction: Direction,
): boolean {
  const rect = $computeTableCellRectBoundary(
    tableMap,
    anchorCellValue,
    focusCellValue,
  );
  const spans = $computeTableCellRectSpans(tableMap, rect);
  const {topSpan, leftSpan, bottomSpan, rightSpan} = spans;
  const anchorCorner = getCornerOrThrow(rect, anchorCellValue);
  const [focusColumn, focusRow] = oppositeCorner(anchorCorner);
  let fCol = rect[focusColumn];
  let fRow = rect[focusRow];
  if (direction === 'forward') {
    fCol += focusColumn === 'maxColumn' ? 1 : leftSpan;
  } else if (direction === 'backward') {
    fCol -= focusColumn === 'minColumn' ? 1 : rightSpan;
  } else if (direction === 'down') {
    fRow += focusRow === 'maxRow' ? 1 : topSpan;
  } else if (direction === 'up') {
    fRow -= focusRow === 'minRow' ? 1 : bottomSpan;
  }
  const targetRowMap = tableMap[fRow];
  if (targetRowMap === undefined) {
    return false;
  }
  const newFocusCellValue = targetRowMap[fCol];
  if (newFocusCellValue === undefined) {
    return false;
  }
  // We can be certain that anchorCellValue and newFocusCellValue are
  // contained within the desired selection, but we are not certain if
  // they need to be expanded or not to maintain a rectangular shape
  const [finalAnchorCell, finalFocusCell] = $extractRectCorners(
    tableMap,
    anchorCellValue,
    newFocusCellValue,
  );
  const anchorDOM = $getObserverCellFromCellNodeOrThrow(
    tableObserver,
    finalAnchorCell.cell,
  )!;
  const focusDOM = $getObserverCellFromCellNodeOrThrow(
    tableObserver,
    finalFocusCell.cell,
  );
  tableObserver.$setAnchorCellForSelection(anchorDOM);
  tableObserver.$setFocusCellForSelection(focusDOM, true);
  return true;
}

export function $isSelectionInTable(
  selection: null | BaseSelection,
  tableNode: TableNode,
): boolean {
  if ($isRangeSelection(selection) || $isTableSelection(selection)) {
    // TODO this should probably return false if there's an unrelated
    //      shadow root between the node and the table (e.g. another table,
    //      collapsible, etc.)
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());

    return isAnchorInside && isFocusInside;
  }

  return false;
}

export function $isFullTableSelection(
  selection: null | BaseSelection,
  tableNode: TableNode,
): boolean {
  if ($isTableSelection(selection)) {
    const anchorNode = selection.anchor.getNode() as TableCellNode;
    const focusNode = selection.focus.getNode() as TableCellNode;
    if (tableNode && anchorNode && focusNode) {
      const [map] = $computeTableMap(tableNode, anchorNode, focusNode);
      return (
        anchorNode.getKey() === map[0][0].cell.getKey() &&
        focusNode.getKey() === map[map.length - 1].at(-1)!.cell.getKey()
      );
    }
  }
  return false;
}

function selectTableCellNode(tableCell: TableCellNode, fromStart: boolean) {
  if (fromStart) {
    tableCell.selectStart();
  } else {
    tableCell.selectEnd();
  }
}

function $addHighlightToDOM(editor: LexicalEditor, cell: TableDOMCell): void {
  const element = cell.elem;
  const editorThemeClasses = editor._config.theme;
  const node = $getNearestNodeFromDOMNode(element);
  invariant(
    $isTableCellNode(node),
    'Expected to find LexicalNode from Table Cell DOMNode',
  );
  addClassNamesToElement(element, editorThemeClasses.tableCellSelected);
}

function $removeHighlightFromDOM(
  editor: LexicalEditor,
  cell: TableDOMCell,
): void {
  const element = cell.elem;
  const node = $getNearestNodeFromDOMNode(element);
  invariant(
    $isTableCellNode(node),
    'Expected to find LexicalNode from Table Cell DOMNode',
  );
  const editorThemeClasses = editor._config.theme;
  removeClassNamesFromElement(element, editorThemeClasses.tableCellSelected);
}

export function $findCellNode(node: LexicalNode): null | TableCellNode {
  const cellNode = $findMatchingParent(node, $isTableCellNode);
  return $isTableCellNode(cellNode) ? cellNode : null;
}

export function $findTableNode(node: LexicalNode): null | TableNode {
  const tableNode = $findMatchingParent(node, $isTableNode);
  return $isTableNode(tableNode) ? tableNode : null;
}

function $getBlockParentIfFirstNode(node: LexicalNode): ElementNode | null {
  for (
    let prevNode = node, currentNode: LexicalNode | null = node;
    currentNode !== null;
    prevNode = currentNode, currentNode = currentNode.getParent()
  ) {
    if ($isElementNode(currentNode)) {
      if (
        currentNode !== prevNode &&
        currentNode.getFirstChild() !== prevNode
      ) {
        // Not the first child or the initial node
        return null;
      } else if (!currentNode.isInline()) {
        return currentNode;
      }
    }
  }
  return null;
}

function $handleHorizontalArrowKeyRangeSelection(
  editor: LexicalEditor,
  event: KeyboardEvent,
  selection: RangeSelection,
  alter: 'extend' | 'move',
  isBackward: boolean,
  tableNode: TableNode,
  tableObserver: TableObserver,
): boolean {
  const initialFocus = $caretFromPoint(
    selection.focus,
    isBackward ? 'previous' : 'next',
  );
  if ($isExtendableTextPointCaret(initialFocus)) {
    return false;
  }
  let lastCaret = initialFocus;
  // TableCellNode is the only shadow root we are interested in piercing so
  // we find the last internal caret and then check its parent
  for (const nextCaret of $extendCaretToRange(initialFocus).iterNodeCarets(
    'shadowRoot',
  )) {
    if (!($isSiblingCaret(nextCaret) && $isElementNode(nextCaret.origin))) {
      return false;
    }
    lastCaret = nextCaret;
  }
  const lastCaretParent = lastCaret.getParentAtCaret();
  if (!$isTableCellNode(lastCaretParent)) {
    return false;
  }
  const anchorCell = lastCaretParent;
  const focusCaret = $findNextTableCell(
    $getSiblingCaret(anchorCell, lastCaret.direction),
  );
  const anchorCellTable = $findMatchingParent(anchorCell, $isTableNode);
  if (!(anchorCellTable && anchorCellTable.is(tableNode))) {
    return false;
  }
  const anchorCellDOM = editor.getElementByKey(anchorCell.getKey());
  const anchorDOMCell = getDOMCellFromTarget(anchorCellDOM);
  if (!anchorCellDOM || !anchorDOMCell) {
    return false;
  }

  const anchorCellTableElement = $getElementForTableNode(
    editor,
    anchorCellTable,
  );
  tableObserver.table = anchorCellTableElement;
  if (!focusCaret) {
    if (alter === 'extend') {
      // extend the selection from a range inside the cell to a table selection of the cell
      tableObserver.$setAnchorCellForSelection(anchorDOMCell);
      tableObserver.$setFocusCellForSelection(anchorDOMCell, true);
    } else {
      // exit the table
      const outerFocusCaret = $getTableExitCaret(
        $getSiblingCaret(anchorCellTable, initialFocus.direction),
      );
      $setPointFromCaret(selection.anchor, outerFocusCaret);
      $setPointFromCaret(selection.focus, outerFocusCaret);
    }
  } else if (alter === 'extend') {
    const focusDOMCell = getDOMCellFromTarget(
      editor.getElementByKey(focusCaret.origin.getKey()),
    );
    if (!focusDOMCell) {
      return false;
    }
    tableObserver.$setAnchorCellForSelection(anchorDOMCell);
    tableObserver.$setFocusCellForSelection(focusDOMCell, true);
  } else {
    // alter === 'move'
    const innerFocusCaret = $normalizeCaret(focusCaret);
    $setPointFromCaret(selection.anchor, innerFocusCaret);
    $setPointFromCaret(selection.focus, innerFocusCaret);
  }
  stopEvent(event);
  return true;
}

function $getTableExitCaret<D extends CaretDirection>(
  initialCaret: SiblingCaret<TableNode, D>,
): PointCaret<D> {
  const adjacent = $getAdjacentChildCaret(initialCaret);
  return $isChildCaret(adjacent) ? $normalizeCaret(adjacent) : initialCaret;
}

function $findNextTableCell<D extends CaretDirection>(
  initialCaret: SiblingCaret<TableCellNode, D>,
): null | ChildCaret<TableCellNode, D> {
  for (const nextCaret of $extendCaretToRange(initialCaret).iterNodeCarets(
    'root',
  )) {
    const {origin} = nextCaret;
    if ($isTableCellNode(origin)) {
      // not sure why ts isn't narrowing here (even if the guard is on nextCaret.origin)
      // but returning a new caret is fine
      if ($isChildCaret(nextCaret)) {
        return $getChildCaret(origin, initialCaret.direction);
      }
    } else if (!$isTableRowNode(origin)) {
      break;
    }
  }
  return null;
}

export function $handleArrowKey(
  editor: LexicalEditor,
  event: KeyboardEvent,
  direction: Direction,
  tableNode: TableNode,
  tableObserver: TableObserver,
): boolean {
  if (
    (direction === 'up' || direction === 'down') &&
    isTypeaheadMenuInView(editor)
  ) {
    return false;
  }

  const selection = $getSelection();

  if (!$isSelectionInTable(selection, tableNode)) {
    if ($isRangeSelection(selection)) {
      if (direction === 'backward') {
        if (selection.focus.offset > 0) {
          return false;
        }
        const parentNode = $getBlockParentIfFirstNode(
          selection.focus.getNode(),
        );
        if (!parentNode) {
          return false;
        }
        const siblingNode = parentNode.getPreviousSibling();
        if (!$isTableNode(siblingNode)) {
          return false;
        }
        stopEvent(event);
        if (event.shiftKey) {
          selection.focus.set(
            siblingNode.getParentOrThrow().getKey(),
            siblingNode.getIndexWithinParent(),
            'element',
          );
        } else {
          siblingNode.selectEnd();
        }
        return true;
      } else if (
        event.shiftKey &&
        (direction === 'up' || direction === 'down')
      ) {
        const focusNode = selection.focus.getNode();
        const isTableUnselect =
          !selection.isCollapsed() &&
          ((direction === 'up' && !selection.isBackward()) ||
            (direction === 'down' && selection.isBackward()));
        if (isTableUnselect) {
          let focusParentNode = $findMatchingParent(focusNode, (n) =>
            $isTableNode(n),
          );
          if ($isTableCellNode(focusParentNode)) {
            focusParentNode = $findMatchingParent(
              focusParentNode,
              $isTableNode,
            );
          }
          if (focusParentNode !== tableNode) {
            return false;
          }
          if (!focusParentNode) {
            return false;
          }
          const sibling =
            direction === 'down'
              ? focusParentNode.getNextSibling()
              : focusParentNode.getPreviousSibling();
          if (!sibling) {
            return false;
          }
          let newOffset = 0;
          if (direction === 'up') {
            if ($isElementNode(sibling)) {
              newOffset = sibling.getChildrenSize();
            }
          }
          let newFocusNode = sibling;
          if (direction === 'up') {
            if ($isElementNode(sibling)) {
              const lastCell = sibling.getLastChild();
              newFocusNode = lastCell ? lastCell : sibling;
              newOffset = $isTextNode(newFocusNode)
                ? newFocusNode.getTextContentSize()
                : 0;
            }
          }
          const newSelection = selection.clone();

          newSelection.focus.set(
            newFocusNode.getKey(),
            newOffset,
            $isTextNode(newFocusNode) ? 'text' : 'element',
          );
          $setSelection(newSelection);
          stopEvent(event);
          return true;
        } else if ($isRootOrShadowRoot(focusNode)) {
          const selectedNode =
            direction === 'up'
              ? selection.getNodes()[selection.getNodes().length - 1]
              : selection.getNodes()[0];
          if (selectedNode) {
            const tableCellNode = $findParentTableCellNodeInTable(
              tableNode,
              selectedNode,
            );
            if (tableCellNode !== null) {
              const firstDescendant = tableNode.getFirstDescendant();
              const lastDescendant = tableNode.getLastDescendant();
              if (!firstDescendant || !lastDescendant) {
                return false;
              }
              const [firstCellNode] = $getNodeTriplet(firstDescendant);
              const [lastCellNode] = $getNodeTriplet(lastDescendant);
              const firstCellCoords = tableNode.getCordsFromCellNode(
                firstCellNode,
                tableObserver.table,
              );
              const lastCellCoords = tableNode.getCordsFromCellNode(
                lastCellNode,
                tableObserver.table,
              );
              const firstCellDOM = tableNode.getDOMCellFromCordsOrThrow(
                firstCellCoords.x,
                firstCellCoords.y,
                tableObserver.table,
              );
              const lastCellDOM = tableNode.getDOMCellFromCordsOrThrow(
                lastCellCoords.x,
                lastCellCoords.y,
                tableObserver.table,
              );
              tableObserver.$setAnchorCellForSelection(firstCellDOM);
              tableObserver.$setFocusCellForSelection(lastCellDOM, true);
              return true;
            }
          }
          return false;
        } else {
          let focusParentNode = $findMatchingParent(
            focusNode,
            (n) => $isElementNode(n) && !n.isInline(),
          );
          if ($isTableCellNode(focusParentNode)) {
            focusParentNode = $findMatchingParent(
              focusParentNode,
              $isTableNode,
            );
          }
          if (!focusParentNode) {
            return false;
          }
          const sibling =
            direction === 'down'
              ? focusParentNode.getNextSibling()
              : focusParentNode.getPreviousSibling();
          if (
            $isTableNode(sibling) &&
            tableObserver.tableNodeKey === sibling.getKey()
          ) {
            const firstDescendant = sibling.getFirstDescendant();
            const lastDescendant = sibling.getLastDescendant();
            if (!firstDescendant || !lastDescendant) {
              return false;
            }
            const [firstCellNode] = $getNodeTriplet(firstDescendant);
            const [lastCellNode] = $getNodeTriplet(lastDescendant);
            const newSelection = selection.clone();
            newSelection.focus.set(
              (direction === 'up' ? firstCellNode : lastCellNode).getKey(),
              direction === 'up' ? 0 : lastCellNode.getChildrenSize(),
              'element',
            );
            stopEvent(event);
            $setSelection(newSelection);
            return true;
          }
        }
      }
    }
    if (direction === 'down' && $isScrollableTablesActive(editor)) {
      // Enable Firefox workaround
      tableObserver.setShouldCheckSelection();
    }
    return false;
  }

  if ($isRangeSelection(selection)) {
    if (direction === 'backward' || direction === 'forward') {
      const alter = event.shiftKey ? 'extend' : 'move';
      return $handleHorizontalArrowKeyRangeSelection(
        editor,
        event,
        selection,
        alter,
        direction === 'backward',
        tableNode,
        tableObserver,
      );
    }

    if (selection.isCollapsed()) {
      const {anchor, focus} = selection;
      const anchorCellNode = $findMatchingParent(
        anchor.getNode(),
        $isTableCellNode,
      );
      const focusCellNode = $findMatchingParent(
        focus.getNode(),
        $isTableCellNode,
      );
      if (
        !$isTableCellNode(anchorCellNode) ||
        !anchorCellNode.is(focusCellNode)
      ) {
        return false;
      }
      const anchorCellTable = $findTableNode(anchorCellNode);
      if (anchorCellTable !== tableNode && anchorCellTable != null) {
        const anchorCellTableElement = getTableElement(
          anchorCellTable,
          editor.getElementByKey(anchorCellTable.getKey()),
        );
        if (anchorCellTableElement != null) {
          tableObserver.table = getTable(
            anchorCellTable,
            anchorCellTableElement,
          );
          return $handleArrowKey(
            editor,
            event,
            direction,
            anchorCellTable,
            tableObserver,
          );
        }
      }

      const anchorCellDom = editor.getElementByKey(anchorCellNode.__key);
      const anchorDOM = editor.getElementByKey(anchor.key);
      if (anchorDOM == null || anchorCellDom == null) {
        return false;
      }

      let edgeSelectionRect;
      if (anchor.type === 'element') {
        edgeSelectionRect = anchorDOM.getBoundingClientRect();
      } else {
        const domSelection = getDOMSelection(getEditorWindow(editor));
        if (domSelection === null || domSelection.rangeCount === 0) {
          return false;
        }

        const range = domSelection.getRangeAt(0);
        edgeSelectionRect = range.getBoundingClientRect();
      }

      const edgeChild =
        direction === 'up'
          ? anchorCellNode.getFirstChild()
          : anchorCellNode.getLastChild();
      if (edgeChild == null) {
        return false;
      }

      const edgeChildDOM = editor.getElementByKey(edgeChild.__key);

      if (edgeChildDOM == null) {
        return false;
      }

      const edgeRect = edgeChildDOM.getBoundingClientRect();
      const isExiting =
        direction === 'up'
          ? edgeRect.top > edgeSelectionRect.top - edgeSelectionRect.height
          : edgeSelectionRect.bottom + edgeSelectionRect.height >
            edgeRect.bottom;

      if (isExiting) {
        stopEvent(event);

        const cords = tableNode.getCordsFromCellNode(
          anchorCellNode,
          tableObserver.table,
        );

        if (event.shiftKey) {
          const cell = tableNode.getDOMCellFromCordsOrThrow(
            cords.x,
            cords.y,
            tableObserver.table,
          );
          tableObserver.$setAnchorCellForSelection(cell);
          tableObserver.$setFocusCellForSelection(cell, true);
        } else {
          return selectTableNodeInDirection(
            tableObserver,
            tableNode,
            cords.x,
            cords.y,
            direction,
          );
        }

        return true;
      }
    }
  } else if ($isTableSelection(selection)) {
    const {anchor, focus} = selection;
    const anchorCellNode = $findMatchingParent(
      anchor.getNode(),
      $isTableCellNode,
    );
    const focusCellNode = $findMatchingParent(
      focus.getNode(),
      $isTableCellNode,
    );

    const [tableNodeFromSelection] = selection.getNodes();
    invariant(
      $isTableNode(tableNodeFromSelection),
      '$handleArrowKey: TableSelection.getNodes()[0] expected to be TableNode',
    );
    const tableElement = getTableElement(
      tableNodeFromSelection,
      editor.getElementByKey(tableNodeFromSelection.getKey()),
    );
    if (
      !$isTableCellNode(anchorCellNode) ||
      !$isTableCellNode(focusCellNode) ||
      !$isTableNode(tableNodeFromSelection) ||
      tableElement == null
    ) {
      return false;
    }
    tableObserver.$updateTableTableSelection(selection);

    const grid = getTable(tableNodeFromSelection, tableElement);
    const cordsAnchor = tableNode.getCordsFromCellNode(anchorCellNode, grid);
    const anchorCell = tableNode.getDOMCellFromCordsOrThrow(
      cordsAnchor.x,
      cordsAnchor.y,
      grid,
    );
    tableObserver.$setAnchorCellForSelection(anchorCell);

    stopEvent(event);

    if (event.shiftKey) {
      const [tableMap, anchorValue, focusValue] = $computeTableMap(
        tableNode,
        anchorCellNode,
        focusCellNode,
      );
      return $adjustFocusInDirection(
        tableObserver,
        tableMap,
        anchorValue,
        focusValue,
        direction,
      );
    } else {
      focusCellNode.selectEnd();
    }

    return true;
  }

  return false;
}

export function stopEvent(event: Event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
}

function isTypeaheadMenuInView(editor: LexicalEditor) {
  // There is no inbuilt way to check if the component picker is in view
  // but we can check if the root DOM element has the aria-controls attribute "typeahead-menu".
  const root = editor.getRootElement();
  if (!root) {
    return false;
  }
  return (
    root.hasAttribute('aria-controls') &&
    root.getAttribute('aria-controls') === 'typeahead-menu'
  );
}

export function $insertParagraphAtTableEdge(
  edgePosition: 'first' | 'last',
  tableNode: TableNode,
  children?: LexicalNode[],
) {
  const paragraphNode = $createParagraphNode();
  if (edgePosition === 'first') {
    tableNode.insertBefore(paragraphNode);
  } else {
    tableNode.insertAfter(paragraphNode);
  }
  paragraphNode.append(...(children || []));
  paragraphNode.selectEnd();
}

export function $getTableEdgeCursorPosition(
  editor: LexicalEditor,
  selection: RangeSelection,
  tableNode: TableNode,
) {
  const tableNodeParent = tableNode.getParent();
  if (!tableNodeParent) {
    return undefined;
  }

  // TODO: Add support for nested tables
  const domSelection = getDOMSelection(getEditorWindow(editor));
  if (!domSelection) {
    return undefined;
  }
  const domAnchorNode = domSelection.anchorNode;
  const tableNodeParentDOM = editor.getElementByKey(tableNodeParent.getKey());
  const tableElement = getTableElement(
    tableNode,
    editor.getElementByKey(tableNode.getKey()),
  );
  // We are only interested in the scenario where the
  // native selection anchor is:
  // - at or inside the table's parent DOM
  // - and NOT at or inside the table DOM
  // It may be adjacent to the table DOM (e.g. in a wrapper)
  if (
    !domAnchorNode ||
    !tableNodeParentDOM ||
    !tableElement ||
    !tableNodeParentDOM.contains(domAnchorNode) ||
    tableElement.contains(domAnchorNode)
  ) {
    return undefined;
  }

  const anchorCellNode = $findMatchingParent(selection.anchor.getNode(), (n) =>
    $isTableCellNode(n),
  ) as TableCellNode | null;
  if (!anchorCellNode) {
    return undefined;
  }

  const parentTable = $findMatchingParent(anchorCellNode, (n) =>
    $isTableNode(n),
  );
  if (!$isTableNode(parentTable) || !parentTable.is(tableNode)) {
    return undefined;
  }

  const [tableMap, cellValue] = $computeTableMap(
    tableNode,
    anchorCellNode,
    anchorCellNode,
  );
  const firstCell = tableMap[0][0];
  const lastCell = tableMap[tableMap.length - 1][tableMap[0].length - 1];
  const {startRow, startColumn} = cellValue;

  const isAtFirstCell =
    startRow === firstCell.startRow && startColumn === firstCell.startColumn;
  const isAtLastCell =
    startRow === lastCell.startRow && startColumn === lastCell.startColumn;

  if (isAtFirstCell) {
    return 'first';
  } else if (isAtLastCell) {
    return 'last';
  } else {
    return undefined;
  }
}

export function $getObserverCellFromCellNodeOrThrow(
  tableObserver: TableObserver,
  tableCellNode: TableCellNode,
): TableDOMCell {
  const {tableNode} = tableObserver.$lookup();
  const currentCords = tableNode.getCordsFromCellNode(
    tableCellNode,
    tableObserver.table,
  );
  return tableNode.getDOMCellFromCordsOrThrow(
    currentCords.x,
    currentCords.y,
    tableObserver.table,
  );
}

export function $getNearestTableCellInTableFromDOMNode(
  tableNode: TableNode,
  startingDOM: Node,
  editorState?: EditorState,
) {
  return $findParentTableCellNodeInTable(
    tableNode,
    $getNearestNodeFromDOMNode(startingDOM, editorState),
  );
}
