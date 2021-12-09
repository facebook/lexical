/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {TableCellNode} from 'outline/TableCellNode';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {
  OutlineNode,
  $createTextNode,
  $getSelection,
  $clearSelection,
} from 'outline';
import {TableRowNode, $createTableRowNode} from 'outline/TableRowNode';
import {$createTableCellNode} from 'outline/TableCellNode';
import {TableNode} from 'outline/TableNode';
import {$findMatchingParent} from 'outline/nodes';

export function getTableCellNodeFromOutlineNode(
  startingNode: OutlineNode,
): TableCellNode | null {
  const node = $findMatchingParent(
    startingNode,
    (n) => n instanceof TableCellNode,
  );

  if (node instanceof TableCellNode) {
    return node;
  }

  return null;
}

export function getTableRowNodeFromTableCellNodeOrThrow(
  startingNode: OutlineNode,
): TableRowNode {
  const node = $findMatchingParent(
    startingNode,
    (n) => n instanceof TableRowNode,
  );

  if (node instanceof TableRowNode) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table row.');
}

export function getTableNodeFromOutlineNodeOrThrow(
  startingNode: OutlineNode,
): TableNode {
  const node = $findMatchingParent(startingNode, (n) => n instanceof TableNode);

  if (node instanceof TableNode) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table.');
}

export function getTableRowIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);

  const tableNode = getTableNodeFromOutlineNodeOrThrow(tableRowNode);

  return tableNode.getChildren().findIndex((n) => n.is(tableRowNode));
}

export function getTableColumnIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);

  return tableRowNode.getChildren().findIndex((n) => n.is(tableCellNode));
}

export function removeTableRowAtIndex(
  tableNode: TableNode,
  indexToDelete: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (indexToDelete >= tableRows.length || indexToDelete < 0) {
    throw new Error('Expected table cell to be inside of table row.');
  }

  const targetRow = tableRows[indexToDelete];

  targetRow.remove();

  return tableNode;
}

export function insertTableRow(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter?: boolean = true,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (targetIndex >= tableRows.length || targetIndex < 0) {
    throw new Error('Table row target index out of range');
  }

  const targetRow = tableRows[targetIndex];

  if (targetRow instanceof TableRowNode) {
    const tableColumnCount = targetRow.getChildren()?.length;

    const newTableRow = $createTableRowNode();

    for (let i = 0; i < tableColumnCount; i++) {
      const tableCell = $createTableCellNode(false);

      tableCell.append($createTextNode());
      newTableRow.append(tableCell);
    }

    if (shouldInsertAfter) {
      targetRow.insertAfter(newTableRow);
    } else {
      targetRow.insertBefore(newTableRow);
    }
  } else {
    throw new Error('Row before insertion index does not exist.');
  }

  return tableNode;
}

export function insertTableColumn(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter?: boolean = true,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let i = 0; i < tableRows.length; i++) {
    const currentTableRow = tableRows[i];

    if (currentTableRow instanceof TableRowNode) {
      const newTableCell = $createTableCellNode(i === 0);

      newTableCell.append($createTextNode());

      const tableRowChildren = currentTableRow.getChildren();

      if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
        throw new Error('Table column target index out of range');
      }

      const targetCell = tableRowChildren[targetIndex];

      if (shouldInsertAfter) {
        targetCell.insertAfter(newTableCell);
      } else {
        targetCell.insertBefore(newTableCell);
      }
    }
  }

  return tableNode;
}

export function deleteTableColumn(
  tableNode: TableNode,
  targetIndex: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let i = 0; i < tableRows.length; i++) {
    const currentTableRow = tableRows[i];

    if (currentTableRow instanceof TableRowNode) {
      const tableRowChildren = currentTableRow.getChildren();

      if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
        throw new Error('Table column target index out of range');
      }

      tableRowChildren[targetIndex].remove();
    }
  }

  return tableNode;
}

type TableCellActionMenuProps = $ReadOnly<{
  onClose: () => void,
  tableCellNode: TableCellNode,
  setIsMenuOpen: (boolean) => void,
  contextRef: {current: null | HTMLElement},
}>;

function TableActionMenu({
  onClose,
  tableCellNode,
  setIsMenuOpen,
  contextRef,
}: TableCellActionMenuProps) {
  const [editor] = useOutlineComposerContext();
  const dropDownRef = useRef();

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

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update(() => {
        const tableNode = getTableNodeFromOutlineNodeOrThrow(tableCellNode);

        const tableRowIndex = getTableRowIndexFromTableCellNode(tableCellNode);

        insertTableRow(tableNode, tableRowIndex, shouldInsertAfter);

        $clearSelection();

        onClose();
      });
    },
    [editor, onClose, tableCellNode],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update(() => {
        const tableNode = getTableNodeFromOutlineNodeOrThrow(tableCellNode);

        const tableColumnIndex =
          getTableColumnIndexFromTableCellNode(tableCellNode);

        insertTableColumn(tableNode, tableColumnIndex, shouldInsertAfter);

        onClose();
      });
    },
    [editor, onClose, tableCellNode],
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = getTableNodeFromOutlineNodeOrThrow(tableCellNode);

      const tableRowIndex = getTableRowIndexFromTableCellNode(tableCellNode);

      removeTableRowAtIndex(tableNode, tableRowIndex);

      $clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  const deleteTableAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = getTableNodeFromOutlineNodeOrThrow(tableCellNode);

      tableNode.remove();

      $clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = getTableNodeFromOutlineNodeOrThrow(tableCellNode);

      const tableColumnIndex =
        getTableColumnIndexFromTableCellNode(tableCellNode);

      deleteTableColumn(tableNode, tableColumnIndex);

      $clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  return createPortal(
    <div className="dropdown" ref={dropDownRef}>
      {!tableCellNode.__isHeader && (
        <button
          className="item"
          onClick={() => insertTableRowAtSelection(false)}>
          <span className="text">Insert row above</span>
        </button>
      )}
      <button className="item" onClick={() => insertTableRowAtSelection(true)}>
        <span className="text">Insert row below</span>
      </button>
      <hr />
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(false)}>
        <span className="text">Insert column left</span>
      </button>
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(true)}>
        <span className="text">Insert column right</span>
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
    </div>,
    document.body,
  );
}

function TableCellActionMenuContainer(): React.MixedElement {
  const [editor] = useOutlineComposerContext();

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
      selection !== null &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const tableCellNodeFromSelection = getTableCellNodeFromOutlineNode(
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
    const removeUpdateListener = editor.addListener('update', () => {
      editor.getEditorState().read(() => {
        moveMenu();
      });
    });

    return () => {
      removeUpdateListener();
    };
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
            onClick={() => {
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

export default function TableCellActionMenuPlugin(): React.Portal {
  const [editor] = useOutlineComposerContext();

  return useMemo(
    () =>
      createPortal(
        <TableCellActionMenuContainer editor={editor} />,
        document.body,
      ),
    [editor],
  );
}
