/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey, TextFormatType} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getEditor,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRootNode,
  $setSelection,
  getDOMSelection,
  INSERT_PARAGRAPH_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {$isTableNode, TableNode} from './LexicalTableNode';
import {$isTableRowNode} from './LexicalTableRowNode';
import {
  $createTableSelection,
  $createTableSelectionFrom,
  $isTableSelection,
  type TableSelection,
} from './LexicalTableSelection';
import {
  $getNearestTableCellInTableFromDOMNode,
  $updateDOMForSelection,
  getTable,
  getTableElement,
  HTMLTableElementWithWithTableSelectionState,
} from './LexicalTableSelectionHelpers';

export type TableDOMCell = {
  elem: HTMLElement;
  highlighted: boolean;
  hasBackgroundColor: boolean;
  x: number;
  y: number;
};

export type TableDOMRows = Array<Array<TableDOMCell | undefined> | undefined>;

export type TableDOMTable = {
  domRows: TableDOMRows;
  columns: number;
  rows: number;
};

export function $getTableAndElementByKey(
  tableNodeKey: NodeKey,
  editor: LexicalEditor = $getEditor(),
): {
  tableNode: TableNode;
  tableElement: HTMLTableElementWithWithTableSelectionState;
} {
  const tableNode = $getNodeByKey(tableNodeKey);
  invariant(
    $isTableNode(tableNode),
    'TableObserver: Expected tableNodeKey %s to be a TableNode',
    tableNodeKey,
  );
  const tableElement = getTableElement(
    tableNode,
    editor.getElementByKey(tableNodeKey),
  );
  invariant(
    tableElement !== null,
    'TableObserver: Expected to find TableElement in DOM for key %s',
    tableNodeKey,
  );
  return {tableElement, tableNode};
}

export class TableObserver {
  focusX: number;
  focusY: number;
  listenersToRemove: Set<() => void>;
  table: TableDOMTable;
  isHighlightingCells: boolean;
  anchorX: number;
  anchorY: number;
  tableNodeKey: NodeKey;
  anchorCell: TableDOMCell | null;
  focusCell: TableDOMCell | null;
  anchorCellNodeKey: NodeKey | null;
  focusCellNodeKey: NodeKey | null;
  editor: LexicalEditor;
  tableSelection: TableSelection | null;
  hasHijackedSelectionStyles: boolean;
  isSelecting: boolean;
  pointerType: string | null;
  shouldCheckSelection: boolean;
  abortController: AbortController;
  listenerOptions: {signal: AbortSignal};
  nextFocus: {focusCell: TableDOMCell; override: boolean} | null;

  constructor(editor: LexicalEditor, tableNodeKey: string) {
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.listenersToRemove = new Set();
    this.tableNodeKey = tableNodeKey;
    this.editor = editor;
    this.table = {
      columns: 0,
      domRows: [],
      rows: 0,
    };
    this.tableSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;
    this.isSelecting = false;
    this.pointerType = null;
    this.shouldCheckSelection = false;
    this.abortController = new AbortController();
    this.listenerOptions = {signal: this.abortController.signal};
    this.nextFocus = null;
    this.trackTable();
  }

  getTable(): TableDOMTable {
    return this.table;
  }

  removeListeners() {
    this.abortController.abort('removeListeners');
    Array.from(this.listenersToRemove).forEach((removeListener) =>
      removeListener(),
    );
    this.listenersToRemove.clear();
  }

  $lookup(): {
    tableNode: TableNode;
    tableElement: HTMLTableElementWithWithTableSelectionState;
  } {
    return $getTableAndElementByKey(this.tableNodeKey, this.editor);
  }

  trackTable() {
    const observer = new MutationObserver((records) => {
      this.editor.getEditorState().read(
        () => {
          let gridNeedsRedraw = false;

          for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const target = record.target;
            const nodeName = target.nodeName;

            if (
              nodeName === 'TABLE' ||
              nodeName === 'TBODY' ||
              nodeName === 'THEAD' ||
              nodeName === 'TR'
            ) {
              gridNeedsRedraw = true;
              break;
            }
          }

          if (!gridNeedsRedraw) {
            return;
          }

          const {tableNode, tableElement} = this.$lookup();
          this.table = getTable(tableNode, tableElement);
        },
        {editor: this.editor},
      );
    });
    this.editor.getEditorState().read(
      () => {
        const {tableNode, tableElement} = this.$lookup();
        this.table = getTable(tableNode, tableElement);
        observer.observe(tableElement, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      },
      {editor: this.editor},
    );
  }

  $clearHighlight(): void {
    const editor = this.editor;
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.tableSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;

    this.$enableHighlightStyle();

    const {tableNode, tableElement} = this.$lookup();
    const grid = getTable(tableNode, tableElement);
    $updateDOMForSelection(editor, grid, null);
    if ($getSelection() !== null) {
      $setSelection(null);
      editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    }
  }

  $enableHighlightStyle() {
    const editor = this.editor;
    const {tableElement} = this.$lookup();

    removeClassNamesFromElement(
      tableElement,
      editor._config.theme.tableSelection,
    );
    tableElement.classList.remove('disable-selection');
    this.hasHijackedSelectionStyles = false;
  }

  $disableHighlightStyle() {
    const {tableElement} = this.$lookup();
    addClassNamesToElement(
      tableElement,
      this.editor._config.theme.tableSelection,
    );
    this.hasHijackedSelectionStyles = true;
  }

  $updateTableTableSelection(selection: TableSelection | null): void {
    if (selection !== null) {
      invariant(
        selection.tableKey === this.tableNodeKey,
        "TableObserver.$updateTableTableSelection: selection.tableKey !== this.tableNodeKey ('%s' !== '%s')",
        selection.tableKey,
        this.tableNodeKey,
      );
      const editor = this.editor;
      this.tableSelection = selection;
      this.isHighlightingCells = true;
      this.$disableHighlightStyle();
      this.updateDOMSelection();
      $updateDOMForSelection(editor, this.table, this.tableSelection);
    } else {
      this.$clearHighlight();
    }
  }

  /**
   * @internal
   * Firefox has a strange behavior where pressing the down arrow key from
   * above the table will move the caret after the table and then lexical
   * will select the last cell instead of the first.
   * We do still want to let the browser handle caret movement but we will
   * use this property to "tag" the update so that we can recheck the
   * selection after the event is processed.
   */
  setShouldCheckSelection(): void {
    this.shouldCheckSelection = true;
  }
  /**
   * @internal
   */
  getAndClearShouldCheckSelection(): boolean {
    if (this.shouldCheckSelection) {
      this.shouldCheckSelection = false;
      return true;
    }
    return false;
  }

  /**
   * @internal
   * When handling mousemove events we track what the focus cell should be, but
   * the DOM selection may end up somewhere else entirely. We don't have an elegant
   * way to handle this after the DOM selection has been resolved in a
   * SELECTION_CHANGE_COMMAND callback.
   */
  setNextFocus(
    nextFocus: null | {focusCell: TableDOMCell; override: boolean},
  ): void {
    this.nextFocus = nextFocus;
  }

  /** @internal */
  getAndClearNextFocus(): {
    focusCell: TableDOMCell;
    override: boolean;
  } | null {
    const {nextFocus} = this;
    if (nextFocus !== null) {
      this.nextFocus = null;
    }
    return nextFocus;
  }

  /** @internal */
  updateDOMSelection() {
    if (this.anchorCell !== null && this.focusCell !== null) {
      const domSelection = getDOMSelection(this.editor._window);
      // We are not using a native selection for tables, and if we
      // set one then the reconciler will undo it.
      // TODO - it would make sense to have one so that native
      //        copy/paste worked. Right now we have to emulate with
      //        keyboard events but it won't fire if triggered from the menu
      if (domSelection && domSelection.rangeCount > 0) {
        domSelection.removeAllRanges();
      }
    }
  }

  $setFocusCellForSelection(cell: TableDOMCell, ignoreStart = false): boolean {
    const editor = this.editor;
    const {tableNode} = this.$lookup();

    const cellX = cell.x;
    const cellY = cell.y;
    this.focusCell = cell;

    if (
      !this.isHighlightingCells &&
      (this.anchorX !== cellX || this.anchorY !== cellY || ignoreStart)
    ) {
      this.isHighlightingCells = true;
      this.$disableHighlightStyle();
    } else if (cellX === this.focusX && cellY === this.focusY) {
      return false;
    }

    this.focusX = cellX;
    this.focusY = cellY;

    if (this.isHighlightingCells) {
      const focusTableCellNode = $getNearestTableCellInTableFromDOMNode(
        tableNode,
        cell.elem,
      );

      if (
        this.tableSelection != null &&
        this.anchorCellNodeKey != null &&
        focusTableCellNode !== null
      ) {
        this.focusCellNodeKey = focusTableCellNode.getKey();
        this.tableSelection = $createTableSelectionFrom(
          tableNode,
          this.$getAnchorTableCellOrThrow(),
          focusTableCellNode,
        );

        $setSelection(this.tableSelection);

        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

        $updateDOMForSelection(editor, this.table, this.tableSelection);
        return true;
      }
    }
    return false;
  }

  $getAnchorTableCell(): TableCellNode | null {
    return this.anchorCellNodeKey
      ? $getNodeByKey(this.anchorCellNodeKey)
      : null;
  }
  $getAnchorTableCellOrThrow(): TableCellNode {
    const anchorTableCell = this.$getAnchorTableCell();
    invariant(
      anchorTableCell !== null,
      'TableObserver anchorTableCell is null',
    );
    return anchorTableCell;
  }

  $getFocusTableCell(): TableCellNode | null {
    return this.focusCellNodeKey ? $getNodeByKey(this.focusCellNodeKey) : null;
  }

  $getFocusTableCellOrThrow(): TableCellNode {
    const focusTableCell = this.$getFocusTableCell();
    invariant(focusTableCell !== null, 'TableObserver focusTableCell is null');
    return focusTableCell;
  }

  $setAnchorCellForSelection(cell: TableDOMCell) {
    this.isHighlightingCells = false;
    this.anchorCell = cell;
    this.anchorX = cell.x;
    this.anchorY = cell.y;

    const {tableNode} = this.$lookup();
    const anchorTableCellNode = $getNearestTableCellInTableFromDOMNode(
      tableNode,
      cell.elem,
    );

    if (anchorTableCellNode !== null) {
      const anchorNodeKey = anchorTableCellNode.getKey();
      this.tableSelection =
        this.tableSelection != null
          ? this.tableSelection.clone()
          : $createTableSelection();
      this.anchorCellNodeKey = anchorNodeKey;
    }
  }

  $formatCells(type: TextFormatType) {
    const selection = $getSelection();

    invariant($isTableSelection(selection), 'Expected Table selection');

    const formatSelection = $createRangeSelection();

    const anchor = formatSelection.anchor;
    const focus = formatSelection.focus;

    const cellNodes = selection.getNodes().filter($isTableCellNode);
    invariant(cellNodes.length > 0, 'No table cells present');
    const paragraph = cellNodes[0].getFirstChild();
    const alignFormatWith = $isParagraphNode(paragraph)
      ? paragraph.getFormatFlags(type, null)
      : null;

    cellNodes.forEach((cellNode: TableCellNode) => {
      anchor.set(cellNode.getKey(), 0, 'element');
      focus.set(cellNode.getKey(), cellNode.getChildrenSize(), 'element');
      formatSelection.formatText(type, alignFormatWith);
    });

    $setSelection(selection);

    this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
  }

  $clearText() {
    const {editor} = this;
    const tableNode = $getNodeByKey(this.tableNodeKey);

    if (!$isTableNode(tableNode)) {
      throw new Error('Expected TableNode.');
    }

    const selection = $getSelection();

    invariant($isTableSelection(selection), 'Expected TableSelection');

    const selectedNodes = selection.getNodes().filter($isTableCellNode);

    // Check if the entire table is selected by verifying first and last cells
    const firstRow = tableNode.getFirstChild();
    const lastRow = tableNode.getLastChild();

    const isEntireTableSelected =
      selectedNodes.length > 0 &&
      firstRow !== null &&
      lastRow !== null &&
      $isTableRowNode(firstRow) &&
      $isTableRowNode(lastRow) &&
      selectedNodes[0] === firstRow.getFirstChild() &&
      selectedNodes[selectedNodes.length - 1] === lastRow.getLastChild();

    if (isEntireTableSelected) {
      tableNode.selectPrevious();
      const parent = tableNode.getParent();
      // Delete entire table
      tableNode.remove();
      // Handle case when table was the only node
      if ($isRootNode(parent) && parent.isEmpty()) {
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      }
      return;
    }

    selectedNodes.forEach((cellNode) => {
      if ($isElementNode(cellNode)) {
        const paragraphNode = $createParagraphNode();
        const textNode = $createTextNode();
        paragraphNode.append(textNode);
        cellNode.append(paragraphNode);
        cellNode.getChildren().forEach((child) => {
          if (child !== paragraphNode) {
            child.remove();
          }
        });
      }
    });

    $updateDOMForSelection(editor, this.table, null);

    $setSelection(null);

    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
  }
}
