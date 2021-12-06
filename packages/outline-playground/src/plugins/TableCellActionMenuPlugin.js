/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, State} from 'outline';

import {TableCellNode} from 'outline/TableCellNode';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {OutlineNode, createTextNode} from 'outline';
import {TableRowNode, createTableRowNode} from 'outline/TableRowNode';
import {createTableCellNode} from 'outline/TableCellNode';
import {TableNode, createTableNode} from 'outline/TableNode';

export function findNodeInTreeParents(
  state: State,
  startingNode: OutlineNode,
  findFn: (OutlineNode) => boolean,
): OutlineNode | null {
  let curr = startingNode;

  while (curr !== state.getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }

    curr = curr?.getParent();
  }

  return null;
}

export function getTableCellNodeOrNullFromTextNode(
  state: State,
  startingNode: OutlineNode,
): TableCellNode | null {
  const node = findNodeInTreeParents(
    state,
    startingNode,
    (n) => n instanceof TableCellNode,
  );

  if (node instanceof TableCellNode) {
    return node;
  }

  return null;
}

export function getTableCellNodeFromTextNode(
  state: State,
  startingNode: OutlineNode,
): TableCellNode {
  const node = findNodeInTreeParents(
    state,
    startingNode,
    (n) => n instanceof TableCellNode,
  );

  if (node instanceof TableCellNode) {
    return node;
  }

  throw new Error('Expected text node to be inside of table cell.');
}

export function getTableRowNodeFromTableCellNode(
  state: State,
  startingNode: OutlineNode,
): TableRowNode {
  const node = findNodeInTreeParents(
    state,
    startingNode,
    (n) => n instanceof TableRowNode,
  );

  if (node instanceof TableRowNode) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table row.');
}

export function getTableCellNodeFromSelection(
  state: State,
): TableCellNode | null {
  const selection = state.getSelection();

  if (selection == null) {
    return null;
  }

  return getTableCellNodeOrNullFromTextNode(state, selection.anchor.getNode());
}

export function getTableNodeFromInnerTableNode(
  state: State,
  startingNode: OutlineNode,
): TableNode {
  const node = findNodeInTreeParents(
    state,
    startingNode,
    (n) => n instanceof TableNode,
  );

  if (node instanceof TableNode) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table.');
}

export function getTableRowIndexFromTableCellNode(
  state: State,
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = getTableRowNodeFromTableCellNode(state, tableCellNode);

  const tableNode = getTableNodeFromInnerTableNode(state, tableRowNode);

  return tableNode.getChildren().findIndex((n) => n === tableRowNode);
}

export function getTableColumnIndexFromTableCellNode(
  state: State,
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = getTableRowNodeFromTableCellNode(state, tableCellNode);

  return tableRowNode.getChildren().findIndex((n) => n === tableCellNode);
}

export function createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeader?: boolean = true,
): TableNode {
  const tableNode = createTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRow = createTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      const tableCell = createTableCellNode(iRow === 0 && includeHeader);
      tableCell.append(createTextNode());
      tableRow.append(tableCell);
    }

    tableNode.append(tableRow);
  }

  return tableNode;
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

    const newTableRow = createTableRowNode();

    for (let i = 0; i < tableColumnCount; i++) {
      const tableCell = createTableCellNode(false);

      tableCell.append(createTextNode());
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
      const newTableCell = createTableCellNode(i === 0);

      newTableCell.append(createTextNode());

      const targetCell = currentTableRow.getChildren()[targetIndex];

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
      currentTableRow.getChildren()[targetIndex].remove();
    }
  }

  return tableNode;
}

function getTableMenuCellStyles(
  editor: OutlineEditor,
  tableCellNode: TableCellNode,
  menu: HTMLElement,
) {
  const tableCellParentNodeDOM = editor.getElementByKey(tableCellNode.getKey());

  if (tableCellParentNodeDOM != null) {
    const tableCellRect = tableCellParentNodeDOM.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    menu.style.opacity = '1';

    menu.style.left = `${
      tableCellRect.left +
      window.pageXOffset -
      menuRect.width +
      tableCellRect.width -
      10
    }px`;

    menu.style.top = `${tableCellRect.top + window.pageYOffset + 5}px`;
  } else {
    menu.style.opacity = '0';
  }
}

type TableCellActionMenuProps = $ReadOnly<{
  onClose: () => void,
  tableCellNode: TableCellNode,
  contextRef: {current: null | HTMLElement},
}>;

function TableActionMenu({
  onClose,
  tableCellNode,
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
        menuButtonRect.left + menuButtonRect.width + window.pageXOffset
      }px`;

      dropDownElement.style.top = `${
        menuButtonRect.top + window.pageYOffset + 5
      }px`;
    }
  }, [contextRef, dropDownRef]);

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update((state) => {
        const tableNode = getTableNodeFromInnerTableNode(state, tableCellNode);

        const tableRowIndex = getTableRowIndexFromTableCellNode(
          state,
          tableCellNode,
        );

        insertTableRow(tableNode, tableRowIndex, shouldInsertAfter);

        state.clearSelection();

        onClose();
      });
    },
    [editor, onClose, tableCellNode],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter) => {
      editor.update((state) => {
        const tableNode = getTableNodeFromInnerTableNode(state, tableCellNode);

        const tableColumnIndex = getTableColumnIndexFromTableCellNode(
          state,
          tableCellNode,
        );

        insertTableColumn(tableNode, tableColumnIndex, shouldInsertAfter);

        onClose();
      });
    },
    [editor, onClose, tableCellNode],
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update((state) => {
      const tableNode = getTableNodeFromInnerTableNode(state, tableCellNode);

      const tableRowIndex = getTableRowIndexFromTableCellNode(
        state,
        tableCellNode,
      );

      removeTableRowAtIndex(tableNode, tableRowIndex);

      state.clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  const deleteTableAtSelection = useCallback(() => {
    editor.update((state) => {
      const tableNode = getTableNodeFromInnerTableNode(state, tableCellNode);

      tableNode.remove();

      state.clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update((state) => {
      const tableNode = getTableNodeFromInnerTableNode(state, tableCellNode);

      const tableColumnIndex = getTableColumnIndexFromTableCellNode(
        state,
        tableCellNode,
      );

      deleteTableColumn(tableNode, tableColumnIndex);

      state.clearSelection();

      onClose();
    });
  }, [editor, onClose, tableCellNode]);

  return createPortal(
    <div className="dropdown" ref={dropDownRef}>
      <button className="item" onClick={() => insertTableRowAtSelection(false)}>
        <span className="text">Insert row above</span>
      </button>
      <button className="item" onClick={() => insertTableRowAtSelection(true)}>
        <span className="text">Insert row below</span>
      </button>
      <hr />
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(false)}
      >
        <span className="text">Insert column left</span>
      </button>
      <button
        className="item"
        onClick={() => insertTableColumnAtSelection(true)}
      >
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

  const moveMenu = useCallback(
    (state: State) => {
      const menu = menuButtonRef.current;
      const selection = state.getSelection();
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
        const tableCellNodeFromSelection = getTableCellNodeOrNullFromTextNode(
          state,
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
    },
    [editor],
  );

  useEffect(() => {
    const removeUpdateListener = editor.addListener('update', () => {
      editor.getEditorState().read((state) => {
        moveMenu(state);
      });
    });

    return () => {
      removeUpdateListener();
    };
  });

  const prevTableCellDOM = useRef(tableCellNode);

  useEffect(() => {
    if (prevTableCellDOM.current !== tableCellNode) {
      setIsMenuOpen(false);
    }

    prevTableCellDOM.current = tableCellNode;
  }, [prevTableCellDOM, tableCellNode]);

  console.log({isMenuOpen});

  return (
    <div
      ref={(menuDOM) => {
        menuButtonRef.current = menuDOM;

        if (menuDOM != null && tableCellNode != null) {
          getTableMenuCellStyles(editor, tableCellNode, menuDOM);
        }
      }}
      style={{
        position: 'absolute',
      }}
    >
      {tableCellNode != null && (
        <>
          <button
            className="table-cell-action-button chevron-down"
            onClick={() => {
              console.log('clicked chevron');
              setIsMenuOpen(!isMenuOpen);
            }}
            ref={menuRootRef}
          >
            <i className="chevron-down" />
          </button>
          {isMenuOpen && (
            <TableActionMenu
              contextRef={menuRootRef}
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
