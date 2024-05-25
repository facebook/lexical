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
$isTableNode, TableNode,
  TableRowNode} from '@lexical/table';
import {$findMatchingParent} from '@lexical/utils';
import {$getNearestNodeFromDOMNode} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';

import {useDebounce} from '../CodeActionMenuPlugin/utils';

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
  const codeDOMNodeRef = useRef<HTMLElement | null>(null);

  const debouncedOnMouseMove = useDebounce(
    (event: MouseEvent) => {
      const {codeDOMNode, isOutside} = getMouseInfo(event);
      if (isOutside) {
        setShownRow(false);
        setShownColumn(false);
        return;
      }

      if (!codeDOMNode) {
        return;
      }

      codeDOMNodeRef.current = codeDOMNode;

      let hoveredRowNode: TableNode | null = null;
      let hoveredColumnNode: TableNode | null = null;
      let tableDOMElement;
      editor.update(() => {
        const maybeTableCell = $getNearestNodeFromDOMNode(codeDOMNode);

        if ($isTableCellNode(maybeTableCell)) {
          const table = $findMatchingParent(maybeTableCell, (node) =>
            $isTableNode(node),
          );
          if (!table) {
            return;
          }
          tableDOMElement = editor.getElementByKey(table?.getKey());

          const rowCount = (table as TableNode).getChildrenSize();
          const colCount = (
            (table as TableNode).getChildAtIndex(0) as TableRowNode
          )?.getChildrenSize();

          const rowIndex = $getTableRowIndexFromTableCellNode(maybeTableCell);
          const colIndex =
            $getTableColumnIndexFromTableCellNode(maybeTableCell);

          if (rowIndex === rowCount - 1) {
            hoveredRowNode = maybeTableCell;
          } else if (colIndex === colCount - 1) {
            hoveredColumnNode = maybeTableCell;
          } else {
            setShownRow(false);
            setShownColumn(false);
            hoveredRowNode = null;
          }
        }
      });

      const {
        width: editorElemWidth,
        y: editorElemY,
        x: editorElemX,
        right: editorElemRight,
        bottom: editorElemBottom,
        height: editorElemHeight,
      } = tableDOMElement.getBoundingClientRect();
      if (hoveredRowNode) {
        setShownRow(true);
        setPosition({
          left: editorElemX,
          top: editorElemBottom + 5,
          width: editorElemWidth,
        });
      } else if (hoveredColumnNode) {
        setShownColumn(true);
        setPosition({
          height: editorElemHeight,
          left: editorElemRight + 5,
          top: editorElemY,
        });
      }

      // const {clientX, clientY} = event;
      // const isOverAddColumnButton =
      //   clientX > editorElemX + editorElemWidth &&
      //   clientX < editorElemX + editorElemWidth + 25;
      // const isOverAddRowButton =
      //   clientY > editorElemY + editorElemHeight &&
      //   clientY < editorElemY + editorElemHeight + 25;
      // setShownColumn(isOverAddColumnButton);
      // setShownRow(isOverAddRowButton);
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

  const insertActionRowOrColumn = (insertRow: boolean) => {
    editor.update(() => {
      if (insertRow) {
        $insertTableRow__EXPERIMENTAL();
      } else {
        $insertTableColumn__EXPERIMENTAL();
      }
    });
  };

  return (
    <>
      {isShownRow || isShownColumn ? (
        <button
          className={
            isShownRow
              ? 'PlaygroundEditorTheme__tableAddRows'
              : 'PlaygroundEditorTheme__tableAddColumns'
          }
          style={{...position}}
          onClick={() => insertActionRowOrColumn(isShownRow)}
        />
      ) : null}
    </>
  );
}

function getMouseInfo(event: MouseEvent): {
  codeDOMNode: HTMLElement | null;
  isOutside: boolean;
} {
  const target = event.target;

  if (target && target instanceof HTMLElement) {
    const codeDOMNode = target.closest<HTMLElement>(
      'td.PlaygroundEditorTheme__tableCell, th.PlaygroundEditorTheme__tableCell',
    );
    const isOutside = !(
      codeDOMNode ||
      target.closest<HTMLElement>('div.code-action-menu-container')
    );

    return {codeDOMNode, isOutside};
  } else {
    return {codeDOMNode: null, isOutside: true};
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
