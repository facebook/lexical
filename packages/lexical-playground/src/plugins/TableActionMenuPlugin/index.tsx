/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {
  $computeTableMapSkipCellCheck,
  $deleteTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $isTableCellNode,
  $isTableRowNode,
  $isTableSelection,
  $unmergeCell,
  getTableElement,
  getTableObserverFromTableElement,
  TableCellHeaderStates,
  TableCellNode,
  TableObserver,
  TableRowNode,
  TableSelection,
} from '@lexical/table';
import {mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  getDOMSelection,
  isDOMNode,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {ReactPortal, useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import invariant from 'shared/invariant';

import useModal from '../../hooks/useModal';
import ColorPicker from '../../ui/ColorPicker';
import DropDown, {DropDownItem} from '../../ui/DropDown';

function computeSelectionCount(selection: TableSelection): {
  columns: number;
  rows: number;
} {
  const selectionShape = selection.getShape();
  return {
    columns: selectionShape.toX - selectionShape.fromX + 1,
    rows: selectionShape.toY - selectionShape.fromY + 1,
  };
}

function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  const [cell] = $getNodeTriplet(selection.anchor);
  return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function $cellContainsEmptyParagraph(cell: TableCellNode): boolean {
  if (cell.getChildrenSize() !== 1) {
    return false;
  }
  const firstChild = cell.getFirstChildOrThrow();
  if (!$isParagraphNode(firstChild) || !firstChild.isEmpty()) {
    return false;
  }
  return true;
}

function $selectLastDescendant(node: ElementNode): void {
  const lastDescendant = node.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

function currentCellBackgroundColor(editor: LexicalEditor): null | string {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      const [cell] = $getNodeTriplet(selection.anchor);
      if ($isTableCellNode(cell)) {
        return cell.getBackgroundColor();
      }
    }
    return null;
  });
}

type TableCellActionMenuProps = Readonly<{
  contextRef: {current: null | HTMLElement};
  onClose: () => void;
  setIsMenuOpen: (isOpen: boolean) => void;
  showColorPickerModal: (
    title: string,
    showModal: (onClose: () => void) => JSX.Element,
  ) => void;
  tableCellNode: TableCellNode;
  cellMerge: boolean;
}>;

function TableActionMenu({
  onClose,
  tableCellNode: _tableCellNode,
  setIsMenuOpen,
  contextRef,
  cellMerge,
  showColorPickerModal,
}: TableCellActionMenuProps) {
  const [editor] = useLexicalComposerContext();
  const dropDownRef = useRef<HTMLDivElement | null>(null);
  const [tableCellNode, updateTableCellNode] = useState(_tableCellNode);
  const [selectionCounts, updateSelectionCounts] = useState({
    columns: 1,
    rows: 1,
  });
  const [canMergeCells, setCanMergeCells] = useState(false);
  const [canUnmergeCell, setCanUnmergeCell] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(
    () => currentCellBackgroundColor(editor) || '',
  );

  useEffect(() => {
    return editor.registerMutationListener(
      TableCellNode,
      (nodeMutations) => {
        const nodeUpdated =
          nodeMutations.get(tableCellNode.getKey()) === 'updated';

        if (nodeUpdated) {
          editor.getEditorState().read(() => {
            updateTableCellNode(tableCellNode.getLatest());
          });
          setBackgroundColor(currentCellBackgroundColor(editor) || '');
        }
      },
      {skipInitialization: true},
    );
  }, [editor, tableCellNode]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      // Merge cells
      if ($isTableSelection(selection)) {
        const currentSelectionCounts = computeSelectionCount(selection);
        updateSelectionCounts(computeSelectionCount(selection));
        setCanMergeCells(
          currentSelectionCounts.columns > 1 || currentSelectionCounts.rows > 1,
        );
      }
      // Unmerge cell
      setCanUnmergeCell($canUnmerge());
    });
  }, [editor]);

  useEffect(() => {
    const menuButtonElement = contextRef.current;
    const dropDownElement = dropDownRef.current;
    const rootElement = editor.getRootElement();

    if (
      menuButtonElement != null &&
      dropDownElement != null &&
      rootElement != null
    ) {
      const rootEleRect = rootElement.getBoundingClientRect();
      const menuButtonRect = menuButtonElement.getBoundingClientRect();
      dropDownElement.style.opacity = '1';
      const dropDownElementRect = dropDownElement.getBoundingClientRect();
      const margin = 5;
      let leftPosition = menuButtonRect.right + margin;
      if (
        leftPosition + dropDownElementRect.width > window.innerWidth ||
        leftPosition + dropDownElementRect.width > rootEleRect.right
      ) {
        const position =
          menuButtonRect.left - dropDownElementRect.width - margin;
        leftPosition = (position < 0 ? margin : position) + window.pageXOffset;
      }
      dropDownElement.style.left = `${leftPosition + window.pageXOffset}px`;

      let topPosition = menuButtonRect.top;
      if (topPosition + dropDownElementRect.height > window.innerHeight) {
        const position = menuButtonRect.bottom - dropDownElementRect.height;
        topPosition = position < 0 ? margin : position;
      }
      dropDownElement.style.top = `${topPosition}px`;
    }
  }, [contextRef, dropDownRef, editor]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropDownRef.current != null &&
        contextRef.current != null &&
        isDOMNode(event.target) &&
        !dropDownRef.current.contains(event.target) &&
        !contextRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('click', handleClickOutside);

    return () => window.removeEventListener('click', handleClickOutside);
  }, [setIsMenuOpen, contextRef]);

  const clearTableSelection = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableElement = getTableElement(
          tableNode,
          editor.getElementByKey(tableNode.getKey()),
        );

        invariant(
          tableElement !== null,
          'TableActionMenu: Expected to find tableElement in DOM',
        );

        const tableObserver = getTableObserverFromTableElement(tableElement);
        if (tableObserver !== null) {
          tableObserver.$clearHighlight();
        }

        tableNode.markDirty();
        updateTableCellNode(tableCellNode.getLatest());
      }

      const rootNode = $getRoot();
      rootNode.selectStart();
    });
  }, [editor, tableCellNode]);

  const mergeTableCellsAtSelection = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isTableSelection(selection)) {
        // Get all selected cells and compute the total area
        const nodes = selection.getNodes();
        const tableCells = nodes.filter($isTableCellNode);

        if (tableCells.length === 0) {
          return;
        }

        // Find the table node
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCells[0]);
        const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null);

        // Find the boundaries of the selection including merged cells
        let minRow = Infinity;
        let maxRow = -Infinity;
        let minCol = Infinity;
        let maxCol = -Infinity;

        // First pass: find the actual boundaries considering merged cells
        const processedCells = new Set();
        for (const row of gridMap) {
          for (const mapCell of row) {
            if (!mapCell || !mapCell.cell) {
              continue;
            }

            const cellKey = mapCell.cell.getKey();
            if (processedCells.has(cellKey)) {
              continue;
            }

            if (tableCells.some((cell) => cell.is(mapCell.cell))) {
              processedCells.add(cellKey);
              // Get the actual position of this cell in the grid
              const cellStartRow = mapCell.startRow;
              const cellStartCol = mapCell.startColumn;
              const cellRowSpan = mapCell.cell.__rowSpan || 1;
              const cellColSpan = mapCell.cell.__colSpan || 1;

              // Update boundaries considering the cell's actual position and span
              minRow = Math.min(minRow, cellStartRow);
              maxRow = Math.max(maxRow, cellStartRow + cellRowSpan - 1);
              minCol = Math.min(minCol, cellStartCol);
              maxCol = Math.max(maxCol, cellStartCol + cellColSpan - 1);
            }
          }
        }

        // Validate boundaries
        if (minRow === Infinity || minCol === Infinity) {
          return;
        }

        // The total span of the merged cell
        const totalRowSpan = maxRow - minRow + 1;
        const totalColSpan = maxCol - minCol + 1;

        // Use the top-left cell as the target cell
        const targetCellMap = gridMap[minRow][minCol];
        if (!targetCellMap?.cell) {
          return;
        }
        const targetCell = targetCellMap.cell;

        // Set the spans for the target cell
        targetCell.setColSpan(totalColSpan);
        targetCell.setRowSpan(totalRowSpan);

        // Move content from other cells to the target cell
        const seenCells = new Set([targetCell.getKey()]);

        // Second pass: merge content and remove other cells
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const mapCell = gridMap[row][col];
            if (!mapCell?.cell) {
              continue;
            }

            const currentCell = mapCell.cell;
            const key = currentCell.getKey();

            if (!seenCells.has(key)) {
              seenCells.add(key);
              const isEmpty = $cellContainsEmptyParagraph(currentCell);
              if (!isEmpty) {
                targetCell.append(...currentCell.getChildren());
              }
              currentCell.remove();
            }
          }
        }

        // Ensure target cell has content
        if (targetCell.getChildrenSize() === 0) {
          targetCell.append($createParagraphNode());
        }

        $selectLastDescendant(targetCell);
        onClose();
      }
    });
  };

  const unmergeTableCellsAtSelection = () => {
    editor.update(() => {
      $unmergeCell();
    });
  };

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.rows; i++) {
          $insertTableRow__EXPERIMENTAL(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.rows],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.columns; i++) {
          $insertTableColumn__EXPERIMENTAL(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.columns],
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableRow__EXPERIMENTAL();
      onClose();
    });
  }, [editor, onClose]);

  const deleteTableAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      tableNode.remove();

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableColumn__EXPERIMENTAL();
      onClose();
    });
  }, [editor, onClose]);

  const toggleTableRowIsHeader = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

      const tableRows = tableNode.getChildren();

      if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
        throw new Error('Expected table cell to be inside of table row.');
      }

      const tableRow = tableRows[tableRowIndex];

      if (!$isTableRowNode(tableRow)) {
        throw new Error('Expected table row');
      }

      const newStyle =
        tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.ROW;
      tableRow.getChildren().forEach((tableCell) => {
        if (!$isTableCellNode(tableCell)) {
          throw new Error('Expected table cell');
        }

        tableCell.setHeaderStyles(newStyle, TableCellHeaderStates.ROW);
      });

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleTableColumnIsHeader = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const tableColumnIndex =
        $getTableColumnIndexFromTableCellNode(tableCellNode);

      const tableRows = tableNode.getChildren<TableRowNode>();
      const maxRowsLength = Math.max(
        ...tableRows.map((row) => row.getChildren().length),
      );

      if (tableColumnIndex >= maxRowsLength || tableColumnIndex < 0) {
        throw new Error('Expected table cell to be inside of table row.');
      }

      const newStyle =
        tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.COLUMN;
      for (let r = 0; r < tableRows.length; r++) {
        const tableRow = tableRows[r];

        if (!$isTableRowNode(tableRow)) {
          throw new Error('Expected table row');
        }

        const tableCells = tableRow.getChildren();
        if (tableColumnIndex >= tableCells.length) {
          // if cell is outside of bounds for the current row (for example various merge cell cases) we shouldn't highlight it
          continue;
        }

        const tableCell = tableCells[tableColumnIndex];

        if (!$isTableCellNode(tableCell)) {
          throw new Error('Expected table cell');
        }

        tableCell.setHeaderStyles(newStyle, TableCellHeaderStates.COLUMN);
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleRowStriping = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setRowStriping(!tableNode.getRowStriping());
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleFirstRowFreeze = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setFrozenRows(tableNode.getFrozenRows() === 0 ? 1 : 0);
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleFirstColumnFreeze = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setFrozenColumns(
            tableNode.getFrozenColumns() === 0 ? 1 : 0,
          );
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const handleCellBackgroundColor = useCallback(
    (value: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
          const [cell] = $getNodeTriplet(selection.anchor);
          if ($isTableCellNode(cell)) {
            cell.setBackgroundColor(value);
          }

          if ($isTableSelection(selection)) {
            const nodes = selection.getNodes();

            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              if ($isTableCellNode(node)) {
                node.setBackgroundColor(value);
              }
            }
          }
        }
      });
    },
    [editor],
  );

  const formatVerticalAlign = (value: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        const [cell] = $getNodeTriplet(selection.anchor);
        if ($isTableCellNode(cell)) {
          cell.setVerticalAlign(value);
        }

        if ($isTableSelection(selection)) {
          const nodes = selection.getNodes();

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if ($isTableCellNode(node)) {
              node.setVerticalAlign(value);
            }
          }
        }
      }
    });
  };

  let mergeCellButton: null | JSX.Element = null;
  if (cellMerge) {
    if (canMergeCells) {
      mergeCellButton = (
        <button
          type="button"
          className="item"
          onClick={() => mergeTableCellsAtSelection()}
          data-test-id="table-merge-cells">
          <span className="text">Merge cells</span>
        </button>
      );
    } else if (canUnmergeCell) {
      mergeCellButton = (
        <button
          type="button"
          className="item"
          onClick={() => unmergeTableCellsAtSelection()}
          data-test-id="table-unmerge-cells">
          <span className="text">Unmerge cells</span>
        </button>
      );
    }
  }

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="dropdown"
      ref={dropDownRef}
      onClick={(e) => {
        e.stopPropagation();
      }}>
      {mergeCellButton}
      <button
        type="button"
        className="item"
        onClick={() =>
          showColorPickerModal('Cell background color', () => (
            <ColorPicker
              color={backgroundColor}
              onChange={handleCellBackgroundColor}
            />
          ))
        }
        data-test-id="table-background-color">
        <span className="text">Background color</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => toggleRowStriping()}
        data-test-id="table-row-striping">
        <span className="text">Toggle Row Striping</span>
      </button>
      <DropDown
        buttonLabel="Vertical Align"
        buttonClassName="item"
        buttonAriaLabel="Formatting options for vertical alignment">
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('top');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-top" />
            <span className="text">Top Align</span>
          </div>
        </DropDownItem>
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('middle');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-middle" />
            <span className="text">Middle Align</span>
          </div>
        </DropDownItem>
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('bottom');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-bottom" />
            <span className="text">Bottom Align</span>
          </div>
        </DropDownItem>
      </DropDown>
      <button
        type="button"
        className="item"
        onClick={() => toggleFirstRowFreeze()}
        data-test-id="table-freeze-first-row">
        <span className="text">Toggle First Row Freeze</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => toggleFirstColumnFreeze()}
        data-test-id="table-freeze-first-column">
        <span className="text">Toggle First Column Freeze</span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => insertTableRowAtSelection(false)}
        data-test-id="table-insert-row-above">
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          above
        </span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => insertTableRowAtSelection(true)}
        data-test-id="table-insert-row-below">
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          below
        </span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => insertTableColumnAtSelection(false)}
        data-test-id="table-insert-column-before">
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          left
        </span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => insertTableColumnAtSelection(true)}
        data-test-id="table-insert-column-after">
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          right
        </span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => deleteTableColumnAtSelection()}
        data-test-id="table-delete-columns">
        <span className="text">Delete column</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => deleteTableRowAtSelection()}
        data-test-id="table-delete-rows">
        <span className="text">Delete row</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => deleteTableAtSelection()}
        data-test-id="table-delete">
        <span className="text">Delete table</span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => toggleTableRowIsHeader()}>
        <span className="text">
          {(tableCellNode.__headerState & TableCellHeaderStates.ROW) ===
          TableCellHeaderStates.ROW
            ? 'Remove'
            : 'Add'}{' '}
          row header
        </span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => toggleTableColumnIsHeader()}
        data-test-id="table-column-header">
        <span className="text">
          {(tableCellNode.__headerState & TableCellHeaderStates.COLUMN) ===
          TableCellHeaderStates.COLUMN
            ? 'Remove'
            : 'Add'}{' '}
          column header
        </span>
      </button>
    </div>,
    document.body,
  );
}

function TableCellActionMenuContainer({
  anchorElem,
  cellMerge,
}: {
  anchorElem: HTMLElement;
  cellMerge: boolean;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const menuButtonRef = useRef<HTMLDivElement | null>(null);
  const menuRootRef = useRef<HTMLButtonElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(
    null,
  );

  const [colorPickerModal, showColorPickerModal] = useModal();

  const $moveMenu = useCallback(() => {
    const menu = menuButtonRef.current;
    const selection = $getSelection();
    const nativeSelection = getDOMSelection(editor._window);
    const activeElement = document.activeElement;
    function disable() {
      if (menu) {
        menu.classList.remove('table-cell-action-button-container--active');
        menu.classList.add('table-cell-action-button-container--inactive');
      }
      setTableMenuCellNode(null);
    }

    if (selection == null || menu == null) {
      return disable();
    }

    const rootElement = editor.getRootElement();
    let tableObserver: TableObserver | null = null;
    let tableCellParentNodeDOM: HTMLElement | null = null;

    if (
      $isRangeSelection(selection) &&
      rootElement !== null &&
      nativeSelection !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode(),
      );

      if (tableCellNodeFromSelection == null) {
        return disable();
      }

      tableCellParentNodeDOM = editor.getElementByKey(
        tableCellNodeFromSelection.getKey(),
      );

      if (
        tableCellParentNodeDOM == null ||
        !tableCellNodeFromSelection.isAttached()
      ) {
        return disable();
      }

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(
        tableCellNodeFromSelection,
      );
      const tableElement = getTableElement(
        tableNode,
        editor.getElementByKey(tableNode.getKey()),
      );

      invariant(
        tableElement !== null,
        'TableActionMenu: Expected to find tableElement in DOM',
      );

      tableObserver = getTableObserverFromTableElement(tableElement);
      setTableMenuCellNode(tableCellNodeFromSelection);
    } else if ($isTableSelection(selection)) {
      const anchorNode = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode(),
      );
      invariant(
        $isTableCellNode(anchorNode),
        'TableSelection anchorNode must be a TableCellNode',
      );
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(anchorNode);
      const tableElement = getTableElement(
        tableNode,
        editor.getElementByKey(tableNode.getKey()),
      );
      invariant(
        tableElement !== null,
        'TableActionMenu: Expected to find tableElement in DOM',
      );
      tableObserver = getTableObserverFromTableElement(tableElement);
      tableCellParentNodeDOM = editor.getElementByKey(anchorNode.getKey());
    } else if (!activeElement) {
      return disable();
    }
    if (tableObserver === null || tableCellParentNodeDOM === null) {
      return disable();
    }
    const enabled = !tableObserver || !tableObserver.isSelecting;
    menu.classList.toggle(
      'table-cell-action-button-container--active',
      enabled,
    );
    menu.classList.toggle(
      'table-cell-action-button-container--inactive',
      !enabled,
    );
    if (enabled) {
      const tableCellRect = tableCellParentNodeDOM.getBoundingClientRect();
      const anchorRect = anchorElem.getBoundingClientRect();
      const top = tableCellRect.top - anchorRect.top;
      const left = tableCellRect.right - anchorRect.left;
      menu.style.transform = `translate(${left}px, ${top}px)`;
    }
  }, [editor, anchorElem]);

  useEffect(() => {
    // We call the $moveMenu callback every time the selection changes,
    // once up front, and once after each mouseUp
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    const callback = () => {
      timeoutId = undefined;
      editor.getEditorState().read($moveMenu);
    };
    const delayedCallback = () => {
      if (timeoutId === undefined) {
        timeoutId = setTimeout(callback, 0);
      }
      return false;
    };
    return mergeRegister(
      editor.registerUpdateListener(delayedCallback),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        delayedCallback,
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerRootListener((rootElement, prevRootElement) => {
        if (prevRootElement) {
          prevRootElement.removeEventListener('mouseup', delayedCallback);
        }
        if (rootElement) {
          rootElement.addEventListener('mouseup', delayedCallback);
          delayedCallback();
        }
      }),
      () => clearTimeout(timeoutId),
    );
  });

  const prevTableCellDOM = useRef(tableCellNode);

  useEffect(() => {
    if (prevTableCellDOM.current !== tableCellNode) {
      setIsMenuOpen(false);
    }

    prevTableCellDOM.current = tableCellNode;
  }, [prevTableCellDOM, tableCellNode]);

  return (
    <div className="table-cell-action-button-container" ref={menuButtonRef}>
      {tableCellNode != null && (
        <>
          <button
            type="button"
            className="table-cell-action-button chevron-down"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            ref={menuRootRef}>
            <i className="chevron-down" />
          </button>
          {colorPickerModal}
          {isMenuOpen && (
            <TableActionMenu
              contextRef={menuRootRef}
              setIsMenuOpen={setIsMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              tableCellNode={tableCellNode}
              cellMerge={cellMerge}
              showColorPickerModal={showColorPickerModal}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function TableActionMenuPlugin({
  anchorElem = document.body,
  cellMerge = false,
}: {
  anchorElem?: HTMLElement;
  cellMerge?: boolean;
}): null | ReactPortal {
  const isEditable = useLexicalEditable();
  return createPortal(
    isEditable ? (
      <TableCellActionMenuContainer
        anchorElem={anchorElem}
        cellMerge={cellMerge}
      />
    ) : null,
    anchorElem,
  );
}
