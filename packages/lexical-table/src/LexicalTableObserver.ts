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
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {CAN_USE_DOM} from 'shared/canUseDOM';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {$isTableNode} from './LexicalTableNode';
import {
  type TableSelection,
  $createTableSelection,
  $isTableSelection,
} from './LexicalTableSelection';
import {$updateDOMForSelection, getTable} from './LexicalTableSelectionHelpers';

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

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

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
    this.trackTable();
  }

  getTable(): TableDOMTable {
    return this.table;
  }

  removeListeners() {
    Array.from(this.listenersToRemove).forEach((removeListener) =>
      removeListener(),
    );
  }

  trackTable() {
    const observer = new MutationObserver((records) => {
      this.editor.update(() => {
        let gridNeedsRedraw = false;

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const target = record.target;
          const nodeName = target.nodeName;

          if (nodeName === 'TABLE' || nodeName === 'TR') {
            gridNeedsRedraw = true;
            break;
          }
        }

        if (!gridNeedsRedraw) {
          return;
        }

        const tableElement = this.editor.getElementByKey(this.tableNodeKey);

        if (!tableElement) {
          throw new Error('Expected to find TableElement in DOM');
        }

        this.table = getTable(tableElement);
      });
    });
    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      this.table = getTable(tableElement);
      observer.observe(tableElement, {
        childList: true,
        subtree: true,
      });
    });
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
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      const grid = getTable(tableElement);
      $updateDOMForSelection(editor, grid, null);
      $setSelection(null);
      editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    });
  }

  enableHighlightStyle() {
    const editor = this.editor;
    editor.update(() => {
      const tableElement = editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      removeClassNamesFromElement(
        tableElement,
        editor._config.theme.tableSelection,
      );
      tableElement.classList.remove('disable-selection');
      this.hasHijackedSelectionStyles = false;
    });
  }

  disableHighlightStyle() {
    const editor = this.editor;
    editor.update(() => {
      const tableElement = editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      addClassNamesToElement(tableElement, editor._config.theme.tableSelection);
      this.hasHijackedSelectionStyles = true;
    });
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
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

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
          $isTableCellNode(focusTableCellNode)
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

      selection.getNodes().forEach((cellNode) => {
        if ($isTableCellNode(cellNode) && cellNode.getTextContentSize() !== 0) {
          anchor.set(cellNode.getKey(), 0, 'element');
          focus.set(cellNode.getKey(), cellNode.getChildrenSize(), 'element');
          formatSelection.formatText(type);
        }
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
