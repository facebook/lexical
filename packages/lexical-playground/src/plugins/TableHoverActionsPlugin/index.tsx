/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $isTableCellNode,
  $isTableNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {$findMatchingParent} from '@lexical/utils';
import {$getNearestNodeFromDOMNode} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';

import {useDebounce} from '../CodeActionMenuPlugin/utils';

const BUTTON_SPACE_PX = 25;
const BUTTON_WIDTH_PX = 20;

function TableHoverActionsContainer({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isShownRow, setShownRow] = useState<boolean>(false);
  const [isShownColumn, setShownColumn] = useState<boolean>(false);
  const [shouldListenMouseMove, setShouldListenMouseMove] =
    useState<boolean>(false);
  const [position, setPosition] = useState({});
  const codeSetRef = useRef<Set<string>>(new Set());
  const tableDOMNodeRef = useRef<HTMLElement | null>(null);

  const debouncedOnMouseMove = useDebounce(
    (event: MouseEvent) => {
      const {tableDOMNode} = getMouseInfo(event);

      if (!tableDOMNode) {
        return;
      }

      tableDOMNodeRef.current = tableDOMNode;

      let hoveredRowNode: TableNode | null = null;
      let hoveredColumnNode: TableNode | null = null;
      let tableDOMElement;
      editor.update(() => {
        const maybeTableCell = $getNearestNodeFromDOMNode(tableDOMNode);

        if ($isTableCellNode(maybeTableCell)) {
          const table = $findMatchingParent(maybeTableCell, (node) =>
            $isTableNode(node),
          );
          if (!table) {
            setShownRow(false);
            setShownColumn(false);
            hoveredRowNode = null;
            return;
          }
          tableDOMElement = editor.getElementByKey(table?.getKey());

          if (tableDOMElement) {
            const rowCount = (table as TableNode).getChildrenSize();
            const colCount = (
              (table as TableNode).getChildAtIndex(0) as TableRowNode
            )?.getChildrenSize();

            const rowIndex = $getTableRowIndexFromTableCellNode(maybeTableCell);
            const colIndex =
              $getTableColumnIndexFromTableCellNode(maybeTableCell);

            const {clientX} = event;
            let isOverAddColumnButton = false;
            const {width: editorElemWidth, x: editorElemX} =
              tableDOMElement.getBoundingClientRect();
            isOverAddColumnButton =
              clientX >= editorElemX + editorElemWidth - BUTTON_SPACE_PX &&
              clientX <= editorElemX + editorElemWidth + BUTTON_SPACE_PX;
            //
            if (rowIndex === rowCount - 1) {
              hoveredRowNode = maybeTableCell;
            } else if (colIndex === colCount - 1) {
              hoveredColumnNode = maybeTableCell;
            } else if (isOverAddColumnButton) {
              hoveredColumnNode = maybeTableCell;
            } else {
              setShownRow(false);
              setShownColumn(false);
              hoveredRowNode = null;
            }
          } else {
            setShownRow(false);
            setShownColumn(false);
            hoveredRowNode = null;
          }
        } else {
          setShownRow(false);
          setShownColumn(false);
          hoveredRowNode = null;
        }
      });
      const {
        width: tableElemWidth,
        y: tableElemY,
        x: tableElemX,
        right: tableElemRight,
        bottom: tableElemBottom,
        height: tableElemHeight,
      } = tableDOMElement.getBoundingClientRect();

      const {y: editorElemY} = anchorElem.getBoundingClientRect();

      if (hoveredRowNode) {
        setShownRow(true);
        setPosition({
          height: BUTTON_WIDTH_PX,
          left: tableElemX,
          top: tableElemBottom - editorElemY + 5,
          width: tableElemWidth,
        });
      } else if (hoveredColumnNode) {
        setShownColumn(true);
        setPosition({
          height: tableElemHeight,
          left: tableElemRight + 5,
          top: tableElemY - editorElemY,
          width: BUTTON_WIDTH_PX,
        });
      }
    },
    50,
    250,
  );

  useEffect(() => {
    if (!shouldListenMouseMove) {
      return;
    }

    document.addEventListener('mousemove', debouncedOnMouseMove);

    return () => {
      setShownRow(false);
      setShownColumn(false);
      debouncedOnMouseMove.cancel();
      document.removeEventListener('mousemove', debouncedOnMouseMove);
    };
  }, [shouldListenMouseMove, debouncedOnMouseMove]);

  editor.registerMutationListener(TableNode, (mutations) => {
    editor.getEditorState().read(() => {
      for (const [key, type] of mutations) {
        switch (type) {
          case 'created':
            codeSetRef.current.add(key);
            setShouldListenMouseMove(codeSetRef.current.size > 0);
            break;

          case 'destroyed':
            codeSetRef.current.delete(key);
            setShouldListenMouseMove(codeSetRef.current.size > 0);
            break;

          default:
            break;
        }
      }
    });
  });

  const insertAction = (insertRow: boolean) => {
    editor.update(() => {
      const maybeTableCell = $getNearestNodeFromDOMNode(
        tableDOMNodeRef.current,
      );
      maybeTableCell?.selectEnd();
      if (insertRow) {
        $insertTableRow__EXPERIMENTAL();
        setShownRow(false);
      } else {
        $insertTableColumn__EXPERIMENTAL();
        setShownColumn(false);
      }
    });
  };

  return (
    <>
      {isShownRow && (
        <button
          className={'PlaygroundEditorTheme__tableAddRows'}
          style={{...position}}
          onClick={() => insertAction(true)}
        />
      )}
      {isShownColumn && (
        <button
          className={'PlaygroundEditorTheme__tableAddColumns'}
          style={{...position}}
          onClick={() => insertAction(false)}
        />
      )}
    </>
  );
}

function getMouseInfo(event: MouseEvent): {
  tableDOMNode: HTMLElement | null;
} {
  const target = event.target;

  if (target && target instanceof HTMLElement) {
    const tableDOMNode = target.closest<HTMLElement>(
      'td.PlaygroundEditorTheme__tableCell, th.PlaygroundEditorTheme__tableCell',
    );
    return {tableDOMNode};
  } else {
    return {tableDOMNode: null};
  }
}

export default function TableHoverActionsPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): React.ReactPortal | null {
  return createPortal(
    <TableHoverActionsContainer anchorElem={anchorElem} />,
    anchorElem,
  );
}
