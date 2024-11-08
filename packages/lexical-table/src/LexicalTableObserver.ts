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
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {$isTableNode, TableNode} from './LexicalTableNode';
import {
  $createTableSelection,
  $isTableSelection,
  type TableSelection,
} from './LexicalTableSelection';
import {
  $findTableNode,
  $updateDOMForSelection,
  getDOMSelection,
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
  abortController: AbortController;
  listenerOptions: {signal: AbortSignal};

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
    this.abortController = new AbortController();
    this.listenerOptions = {signal: this.abortController.signal};
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

  clearHighlight() {
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

    this.enableHighlightStyle();

    editor.update(() => {
      const {tableNode, tableElement} = this.$lookup();
      const grid = getTable(tableNode, tableElement);
      $updateDOMForSelection(editor, grid, null);
      $setSelection(null);
      editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    });
  }

  enableHighlightStyle() {
    const editor = this.editor;
    editor.getEditorState().read(
      () => {
        const {tableElement} = this.$lookup();

        removeClassNamesFromElement(
          tableElement,
          editor._config.theme.tableSelection,
        );
        tableElement.classList.remove('disable-selection');
        this.hasHijackedSelectionStyles = false;
      },
      {editor},
    );
  }

  disableHighlightStyle() {
    const editor = this.editor;
    editor.getEditorState().read(
      () => {
        const {tableElement} = this.$lookup();
        addClassNamesToElement(
          tableElement,
          editor._config.theme.tableSelection,
        );
        this.hasHijackedSelectionStyles = true;
      },
      {editor},
    );
  }

  updateTableTableSelection(selection: TableSelection | null): void {
    if (selection !== null && selection.tableKey === this.tableNodeKey) {
      const editor = this.editor;
      this.tableSelection = selection;
      this.isHighlightingCells = true;
      this.disableHighlightStyle();
      $updateDOMForSelection(editor, this.table, this.tableSelection);
    } else if (selection == null) {
      this.clearHighlight();
    } else {
      this.tableNodeKey = selection.tableKey;
      this.updateTableTableSelection(selection);
    }
  }

  setFocusCellForSelection(cell: TableDOMCell, ignoreStart = false) {
    const editor = this.editor;
    editor.update(() => {
      const {tableNode} = this.$lookup();

      const cellX = cell.x;
      const cellY = cell.y;
      this.focusCell = cell;

      if (this.anchorCell !== null) {
        const domSelection = getDOMSelection(editor._window);
        // Collapse the selection
        if (domSelection) {
          domSelection.setBaseAndExtent(
            this.anchorCell.elem,
            0,
            this.focusCell.elem,
            0,
          );
        }
      }

      if (
        !this.isHighlightingCells &&
        (this.anchorX !== cellX || this.anchorY !== cellY || ignoreStart)
      ) {
        this.isHighlightingCells = true;
        this.disableHighlightStyle();
      } else if (cellX === this.focusX && cellY === this.focusY) {
        return;
      }

      this.focusX = cellX;
      this.focusY = cellY;

      if (this.isHighlightingCells) {
        const focusTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

        if (
          this.tableSelection != null &&
          this.anchorCellNodeKey != null &&
          $isTableCellNode(focusTableCellNode) &&
          tableNode.is($findTableNode(focusTableCellNode))
        ) {
          const focusNodeKey = focusTableCellNode.getKey();

          this.tableSelection =
            this.tableSelection.clone() || $createTableSelection();

          this.focusCellNodeKey = focusNodeKey;
          this.tableSelection.set(
            this.tableNodeKey,
            this.anchorCellNodeKey,
            this.focusCellNodeKey,
          );

          $setSelection(this.tableSelection);

          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

          $updateDOMForSelection(editor, this.table, this.tableSelection);
        }
      }
    });
  }

  setAnchorCellForSelection(cell: TableDOMCell) {
    this.isHighlightingCells = false;
    this.anchorCell = cell;
    this.anchorX = cell.x;
    this.anchorY = cell.y;

    this.editor.update(() => {
      const anchorTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

      if ($isTableCellNode(anchorTableCellNode)) {
        const anchorNodeKey = anchorTableCellNode.getKey();
        this.tableSelection =
          this.tableSelection != null
            ? this.tableSelection.clone()
            : $createTableSelection();
        this.anchorCellNodeKey = anchorNodeKey;
      }
    });
  }

  formatCells(type: TextFormatType) {
    this.editor.update(() => {
      const selection = $getSelection();

      if (!$isTableSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      const formatSelection = $createRangeSelection();

      const anchor = formatSelection.anchor;
      const focus = formatSelection.focus;

      const cellNodes = selection.getNodes().filter($isTableCellNode);
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
    });
  }

  clearText() {
    const editor = this.editor;
    editor.update(() => {
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const selection = $getSelection();

      if (!$isTableSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      const selectedNodes = selection.getNodes().filter($isTableCellNode);

      if (selectedNodes.length === this.table.columns * this.table.rows) {
        tableNode.selectPrevious();
        // Delete entire table
        tableNode.remove();
        const rootNode = $getRoot();
        rootNode.selectStart();
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
    });
  }
}
