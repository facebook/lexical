/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {TableDOMCell} from '@lexical/table';
import type {LexicalEditor} from 'lexical';

import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLexicalEditable from '@lexical/react/useLexicalEditable';
import {
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableRowNode,
  getDOMCellFromTarget,
  TableCellNode,
} from '@lexical/table';
import {calculateZoomLevel} from '@lexical/utils';
import {$getNearestNodeFromDOMNode} from 'lexical';
import * as React from 'react';
import {
  MouseEventHandler,
  ReactPortal,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

type MousePosition = {
  x: number;
  y: number;
};

type MouseDraggingDirection = 'right' | 'bottom';

const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 50;

function TableCellResizer({editor}: {editor: LexicalEditor}): JSX.Element {
  const targetRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const tableRectRef = useRef<ClientRect | null>(null);

  const mouseStartPosRef = useRef<MousePosition | null>(null);
  const [mouseCurrentPos, updateMouseCurrentPos] =
    useState<MousePosition | null>(null);

  const [activeCell, updateActiveCell] = useState<TableDOMCell | null>(null);
  const [isMouseDown, updateIsMouseDown] = useState<boolean>(false);
  const [draggingDirection, updateDraggingDirection] =
    useState<MouseDraggingDirection | null>(null);

  const resetState = useCallback(() => {
    updateActiveCell(null);
    targetRef.current = null;
    updateDraggingDirection(null);
    mouseStartPosRef.current = null;
    tableRectRef.current = null;
  }, []);

  const isMouseDownOnEvent = (event: MouseEvent) => {
    return (event.buttons & 1) === 1;
  };

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      setTimeout(() => {
        const target = event.target;

        if (draggingDirection) {
          updateMouseCurrentPos({
            x: event.clientX,
            y: event.clientY,
          });
          return;
        }
        updateIsMouseDown(isMouseDownOnEvent(event));
        if (resizerRef.current && resizerRef.current.contains(target as Node)) {
          return;
        }

        if (targetRef.current !== target) {
          targetRef.current = target as HTMLElement;
          const cell = getDOMCellFromTarget(target as HTMLElement);

          if (cell && activeCell !== cell) {
            editor.update(() => {
              const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
              if (!tableCellNode) {
                throw new Error('TableCellResizer: Table cell node not found.');
              }

              const tableNode =
                $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
              const tableElement = editor.getElementByKey(tableNode.getKey());

              if (!tableElement) {
                throw new Error('TableCellResizer: Table element not found.');
              }

              targetRef.current = target as HTMLElement;
              tableRectRef.current = tableElement.getBoundingClientRect();
              updateActiveCell(cell);
            });
          } else if (cell == null) {
            resetState();
          }
        }
      }, 0);
    };

    const onMouseDown = (event: MouseEvent) => {
      setTimeout(() => {
        updateIsMouseDown(true);
      }, 0);
    };

    const onMouseUp = (event: MouseEvent) => {
      setTimeout(() => {
        updateIsMouseDown(false);
      }, 0);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [activeCell, draggingDirection, editor, resetState]);

  const isHeightChanging = (direction: MouseDraggingDirection) => {
    if (direction === 'bottom') {
      return true;
    }
    return false;
  };

  const updateRowHeight = useCallback(
    (newHeight: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      editor.update(() => {
        const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
        if (!$isTableCellNode(tableCellNode)) {
          throw new Error('TableCellResizer: Table cell node not found.');
        }

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

        tableRow.setHeight(newHeight);
      });
    },
    [activeCell, editor],
  );

  const updateColumnWidth = useCallback(
    (newWidth: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }
      editor.update(() => {
        const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
        if (!$isTableCellNode(tableCellNode)) {
          throw new Error('TableCellResizer: Table cell node not found.');
        }

        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

        const tableColumnIndex =
          $getTableColumnIndexFromTableCellNode(tableCellNode);

        const tableRows = tableNode.getChildren();

        for (let r = 0; r < tableRows.length; r++) {
          const tableRow = tableRows[r];

          if (!$isTableRowNode(tableRow)) {
            throw new Error('Expected table row');
          }

          const rowCells = tableRow.getChildren<TableCellNode>();
          const rowCellsSpan = rowCells.map((cell) => cell.getColSpan());

          const aggregatedRowSpans = rowCellsSpan.reduce(
            (rowSpans: number[], cellSpan) => {
              const previousCell = rowSpans[rowSpans.length - 1] ?? 0;
              rowSpans.push(previousCell + cellSpan);
              return rowSpans;
            },
            [],
          );
          const rowColumnIndexWithSpan = aggregatedRowSpans.findIndex(
            (cellSpan: number) => cellSpan > tableColumnIndex,
          );

          if (
            rowColumnIndexWithSpan >= rowCells.length ||
            rowColumnIndexWithSpan < 0
          ) {
            throw new Error('Expected table cell to be inside of table row.');
          }

          const tableCell = rowCells[rowColumnIndexWithSpan];

          if (!$isTableCellNode(tableCell)) {
            throw new Error('Expected table cell');
          }

          tableCell.setWidth(newWidth);
        }
      });
    },
    [activeCell, editor],
  );

  const mouseUpHandler = useCallback(
    (direction: MouseDraggingDirection) => {
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        if (mouseStartPosRef.current) {
          const {x, y} = mouseStartPosRef.current;

          if (activeCell === null) {
            return;
          }
          const zoom = calculateZoomLevel(event.target as Element);

          if (isHeightChanging(direction)) {
            const height = activeCell.elem.getBoundingClientRect().height;
            const heightChange = Math.abs(event.clientY - y) / zoom;

            const isShrinking = direction === 'bottom' && y > event.clientY;

            updateRowHeight(
              Math.max(
                isShrinking ? height - heightChange : heightChange + height,
                MIN_ROW_HEIGHT,
              ),
            );
          } else {
            const computedStyle = getComputedStyle(activeCell.elem);
            let width = activeCell.elem.clientWidth; // width with padding
            width -=
              parseFloat(computedStyle.paddingLeft) +
              parseFloat(computedStyle.paddingRight);
            const widthChange = Math.abs(event.clientX - x) / zoom;

            const isShrinking = direction === 'right' && x > event.clientX;

            updateColumnWidth(
              Math.max(
                isShrinking ? width - widthChange : widthChange + width,
                MIN_COLUMN_WIDTH,
              ),
            );
          }

          resetState();
          document.removeEventListener('mouseup', handler);
        }
      };
      return handler;
    },
    [activeCell, resetState, updateColumnWidth, updateRowHeight],
  );

  const toggleResize = useCallback(
    (direction: MouseDraggingDirection): MouseEventHandler<HTMLDivElement> =>
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        mouseStartPosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
        updateMouseCurrentPos(mouseStartPosRef.current);
        updateDraggingDirection(direction);

        document.addEventListener('mouseup', mouseUpHandler(direction));
      },
    [activeCell, mouseUpHandler],
  );

  const getResizers = useCallback(() => {
    if (activeCell) {
      const {height, width, top, left} =
        activeCell.elem.getBoundingClientRect();
      const zoom = calculateZoomLevel(activeCell.elem);

      const styles = {
        bottom: {
          backgroundColor: 'none',
          cursor: 'row-resize',
          height: '10px',
          left: `${window.pageXOffset + left}px`,
          top: `${window.pageYOffset + top + height}px`,
          width: `${width}px`,
        },
        right: {
          backgroundColor: 'none',
          cursor: 'col-resize',
          height: `${height}px`,
          left: `${window.pageXOffset + left + width}px`,
          top: `${window.pageYOffset + top}px`,
          width: '10px',
        },
      };

      const tableRect = tableRectRef.current;

      if (draggingDirection && mouseCurrentPos && tableRect) {
        if (isHeightChanging(draggingDirection)) {
          styles[draggingDirection].left = `${
            window.pageXOffset + tableRect.left
          }px`;
          styles[draggingDirection].top = `${
            window.pageYOffset + mouseCurrentPos.y / zoom
          }px`;
          styles[draggingDirection].height = '3px';
          styles[draggingDirection].width = `${tableRect.width}px`;
        } else {
          styles[draggingDirection].top = `${
            window.pageYOffset + tableRect.top
          }px`;
          styles[draggingDirection].left = `${
            window.pageXOffset + mouseCurrentPos.x / zoom
          }px`;
          styles[draggingDirection].width = '3px';
          styles[draggingDirection].height = `${tableRect.height}px`;
        }

        styles[draggingDirection].backgroundColor = '#adf';
      }

      return styles;
    }

    return {
      bottom: null,
      left: null,
      right: null,
      top: null,
    };
  }, [activeCell, draggingDirection, mouseCurrentPos]);

  const resizerStyles = getResizers();

  return (
    <div ref={resizerRef}>
      {activeCell != null && !isMouseDown && (
        <>
          <div
            className="TableCellResizer__resizer TableCellResizer__ui"
            style={resizerStyles.right || undefined}
            onMouseDown={toggleResize('right')}
          />
          <div
            className="TableCellResizer__resizer TableCellResizer__ui"
            style={resizerStyles.bottom || undefined}
            onMouseDown={toggleResize('bottom')}
          />
        </>
      )}
    </div>
  );
}

export default function TableCellResizerPlugin(): null | ReactPortal {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  return useMemo(
    () =>
      isEditable
        ? createPortal(<TableCellResizer editor={editor} />, document.body)
        : null,
    [editor, isEditable],
  );
}
