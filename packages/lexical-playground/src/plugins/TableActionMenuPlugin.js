/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $setSelection, $isRangeSelection} from 'lexical';
import {
  $deleteTableColumn,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn,
  $insertTableRow,
  $isTableRowNode,
  $isTableCellNode,
  $removeTableRowAtIndex,
  TableCellNode,
} from '@lexical/table';

type TableCellActionMenuProps = $ReadOnly<{
  onClose: () => void,
  tableCellNode: TableCellNode,
  setIsMenuOpen: (boolean) => void,
  contextRef: {current: null | HTMLElement},
}>;

function TableActionMenu({
  onClose,
  tableCellNode: _tableCellNode,
  setIsMenuOpen,
  contextRef,
}: TableCellActionMenuProps) {
  const [editor] = useLexicalComposerContext();
  const dropDownRef = useRef();
  const [tableCellNode, updateTableCellNode] = useState(_tableCellNode);
  const [selectionCounts, updateSelectionCounts] = useState({
    rows: 1,
    columns: 1,
  });

  useEffect(() => {
    return editor.addListener('mutation', TableCellNode, (nodeMutations) => {
      const nodeUpdated =
        nodeMutations.get(tableCellNode.getKey()) === 'updated';

      if (nodeUpdated) {
        editor.getEditorState().read(() => {
          updateTableCellNode(tableCellNode.getLatest());
        });
      }
    });
  }, [_tableCellNode, editor, tableCellNode]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const selectionState = tableNode.getSelectionState();

      updateSelectionCounts({
        rows:
          selectionState == null
            ? 1
            : selectionState.toY - selectionState.fromY + 1,
        columns:
          selectionState == null
            ? 1
            : selectionState.toX - selectionState.fromX + 1,
      });
    });
  }, [editor, tableCellNode]);

  useEffect(() => {
    const menuButtonElement = contextRef.current;
    const dropDownElement = dropDownRef.current;

    if (menuButtonElement != null && dropDownElement != null) {
      const menuButtonRect = menuButtonElement.getBoundingClientRect();

      dropDownElement.style.opacity = '1';

      dropDownElement.style.left = `${
        menuButtonRect.left + menuButtonRect.width + window.pageXOffset + 5
      }px`;

      dropDownElement.style.top = `${
        menuButtonRect.top + window.pageYOffset
      }px`;
    }
  }, [contextRef, dropDownRef]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropDownRef.current != null &&
        contextRef.current != null &&
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
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      tableNode.setSelectionState(null);
      tableNode.markDirty();

      $setSelection(null);
    });
  }, [editor, tableCellNode]);

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update(() => {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

        const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

        $insertTableRow(
          tableNode,
          tableRowIndex,
          shouldInsertAfter,
          selectionCounts.rows,
        );

        clearTableSelection();

        onClose();
      });
    },
    [editor, tableCellNode, selectionCounts.rows, clearTableSelection, onClose],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update(() => {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableColumnIndex =
          $getTableColumnIndexFromTableCellNode(tableCellNode);

        $insertTableColumn(
          tableNode,
          tableColumnIndex,
          shouldInsertAfter,
          selectionCounts.columns,
        );

        clearTableSelection();

        onClose();
      });
    },
    [
      editor,
      tableCellNode,
      selectionCounts.columns,
      clearTableSelection,
      onClose,
    ],
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

      $removeTableRowAtIndex(tableNode, tableRowIndex);

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

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
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const tableColumnIndex =
        $getTableColumnIndexFromTableCellNode(tableCellNode);

      $deleteTableColumn(tableNode, tableColumnIndex);

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleTableRowIsHeader = useCallback(
    (isHeader) => {
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

        tableRow.getChildren().forEach((tableCell) => {
          if (!$isTableCellNode(tableCell)) {
            throw new Error('Expected table cell');
          }

          tableCell.toggleHeaderStyle('row');
        });

        clearTableSelection();
        onClose();
      });
    },
    [editor, tableCellNode, clearTableSelection, onClose],
  );

  const toggleTableColumnIsHeader = useCallback(
    (isHeader) => {
      editor.update(() => {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

        const tableColumnIndex =
          $getTableColumnIndexFromTableCellNode(tableCellNode);

        const tableRows = tableNode.getChildren();

        for (let r = 0; r < tableRows.length; r++) {
          const tableRow = tableRows[r];

          if (!$isTableRowNode(tableRow)) {
            throw new Error('Expected table row');
          }

          const tableCells = tableRow.getChildren();

          if (tableColumnIndex >= tableCells.length || tableColumnIndex < 0) {
            throw new Error('Expected table cell to be inside of table row.');
          }

          const tableCell = tableCells[tableColumnIndex];

          if (!$isTableCellNode(tableCell)) {
            throw new Error('Expected table cell');
          }

          tableCell.toggleHeaderStyle('column');
        }

        clearTableSelection();
        onClose();
      });
    },
    [editor, tableCellNode, clearTableSelection, onClose],
  );

  return createPortal(
    <div
      className="dropdown"
      ref={dropDownRef}
      onClick={(e) => {
        e.stopPropagation();
      }}>
      <button className="item" onClick={() => insertTableRowAtSelection(false)}>
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          above
        </span>
      </button>
      <button className="item" onClick={() => insertTableRowAtSelection(true)}>
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          below
        </span>
      </button>
      <hr />
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(false)}>
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          left
        </span>
      </button>
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(true)}>
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          right
        </span>
      </button>
      <hr />
      <button className="item" onClick={() => deleteTableColumnAtSelection()}>
        <span className="text">Delete column</span>
      </button>
      <button className="item" onClick={() => deleteTableRowAtSelection()}>
        <span className="text">Delete row</span>
      </button>
      <button className="item" onClick={() => deleteTableAtSelection()}>
        <span className="text">Delete table</span>
      </button>
      <hr />
      <button className="item" onClick={() => toggleTableRowIsHeader()}>
        <span className="text">
          {tableCellNode.__headerStyles.has('row') ? 'Remove' : 'Add'} row
          header
        </span>
      </button>
      <button className="item" onClick={() => toggleTableColumnIsHeader()}>
        <span className="text">
          {tableCellNode.__headerStyles.has('column') ? 'Remove' : 'Add'} column
          header
        </span>
      </button>
    </div>,
    document.body,
  );
}

function TableCellActionMenuContainer(): React.MixedElement {
  const [editor] = useLexicalComposerContext();

  const menuButtonRef = useRef(null);
  const menuRootRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(
    null,
  );

  const moveMenu = useCallback(() => {
    const menu = menuButtonRef.current;
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (selection == null || menu == null) {
      setTableMenuCellNode(null);
      return;
    }

    const rootElement = editor.getRootElement();

    if (
      $isRangeSelection(selection) &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode(),
      );

      if (tableCellNodeFromSelection == null) {
        setTableMenuCellNode(null);
        return;
      }

      const tableCellParentNodeDOM = editor.getElementByKey(
        tableCellNodeFromSelection.getKey(),
      );

      if (tableCellParentNodeDOM == null) {
        setTableMenuCellNode(null);
        return;
      }

      setTableMenuCellNode(tableCellNodeFromSelection);
    } else if (!activeElement) {
      setTableMenuCellNode(null);
    }
  }, [editor]);

  useEffect(() => {
    return editor.addListener('update', () => {
      editor.getEditorState().read(() => {
        moveMenu();
      });
    });
  });

  useEffect(() => {
    const menuButtonDOM = menuButtonRef.current;

    if (menuButtonDOM != null && tableCellNode != null) {
      const tableCellNodeDOM = editor.getElementByKey(tableCellNode.getKey());

      if (tableCellNodeDOM != null) {
        const tableCellRect = tableCellNodeDOM.getBoundingClientRect();
        const menuRect = menuButtonDOM.getBoundingClientRect();

        menuButtonDOM.style.opacity = '1';

        menuButtonDOM.style.left = `${
          tableCellRect.left +
          window.pageXOffset -
          menuRect.width +
          tableCellRect.width -
          10
        }px`;

        menuButtonDOM.style.top = `${
          tableCellRect.top + window.pageYOffset + 5
        }px`;
      } else {
        menuButtonDOM.style.opacity = '0';
      }
    }
  }, [menuButtonRef, tableCellNode, editor]);

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
            className="table-cell-action-button chevron-down"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            ref={menuRootRef}>
            <i className="chevron-down" />
          </button>
          {isMenuOpen && (
            <TableActionMenu
              contextRef={menuRootRef}
              setIsMenuOpen={setIsMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              tableCellNode={tableCellNode}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function TableActionMenuPlugin(): React.Portal {
  const [editor] = useLexicalComposerContext();

  return useMemo(
    () =>
      createPortal(
        <TableCellActionMenuContainer editor={editor} />,
        document.body,
      ),
    [editor],
  );
}
