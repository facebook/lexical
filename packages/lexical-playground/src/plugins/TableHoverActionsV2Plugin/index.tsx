/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import './index.css';

import {
  autoUpdate,
  offset,
  shift,
  useFloating,
  type VirtualElement,
} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {
  $computeTableMapSkipCellCheck,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableNode,
} from '@lexical/table';
import {
  $getChildCaret,
  $getNearestNodeFromDOMNode,
  $getSiblingCaret,
  type EditorThemeClasses,
  isHTMLElement,
} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import DropDown, {DropDownItem} from '../../ui/DropDown';
import {getThemeSelector} from '../../utils/getThemeSelector';

const INDICATOR_SIZE_PX = 18;
const SIDE_INDICATOR_SIZE_PX = 18;
const TOP_BUTTON_OVERHANG = INDICATOR_SIZE_PX / 2;
const LEFT_BUTTON_OVERHANG = SIDE_INDICATOR_SIZE_PX / 2;

/**
 * Checks if the table does not have any merged cells.
 *
 * @param table Table to check for if it has any merged cells.
 * @returns True if the table does not have any merged cells, false otherwise.
 */
function $isSimpleTable(table: TableNode): boolean {
  const rows = table.getChildren();
  let columns: null | number = null;
  for (const row of rows) {
    if (!$isTableRowNode(row)) {
      return false;
    }
    if (columns === null) {
      columns = row.getChildrenSize();
    }
    if (row.getChildrenSize() !== columns) {
      return false;
    }
    const cells = row.getChildren();
    for (const cell of cells) {
      if (
        !$isTableCellNode(cell) ||
        cell.getRowSpan() !== 1 ||
        cell.getColSpan() !== 1
      ) {
        return false;
      }
    }
  }
  return (columns || 0) > 0;
}

function getTableFromMouseEvent(
  event: MouseEvent,
  getTheme: () => EditorThemeClasses | null | undefined,
): {
  isOutside: boolean;
  tableElement: HTMLTableElement | null;
} {
  if (!isHTMLElement(event.target)) {
    return {isOutside: true, tableElement: null};
  }

  const cellSelector = `td${getThemeSelector(getTheme, 'tableCell')}, th${getThemeSelector(getTheme, 'tableCell')}`;
  const cell = event.target.closest<HTMLTableCellElement>(cellSelector);
  const tableElement = cell?.closest<HTMLTableElement>('table') ?? null;

  return {
    isOutside: tableElement == null,
    tableElement,
  };
}

function getClosestTopCellPosition(
  tableElement: HTMLTableElement,
  clientX: number,
): {centerX: number; top: number; cell: HTMLTableCellElement} | null {
  const firstRow = tableElement.rows[0];
  if (!firstRow) {
    return null;
  }

  let closest: {
    cell: HTMLTableCellElement;
    centerX: number;
    top: number;
  } | null = null;
  let smallestDelta = Number.POSITIVE_INFINITY;

  for (const cell of Array.from(firstRow.cells)) {
    const rect = cell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const delta = Math.abs(centerX - clientX);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = {cell, centerX, top: rect.top};
    }
  }

  return closest;
}

function TableHoverActionsV2({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element | null {
  const [editor, {getTheme}] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeftVisible, setIsLeftVisible] = useState(false);
  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const leftVirtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const floatingElemRef = useRef<HTMLElement | null>(null);
  const leftFloatingElemRef = useRef<HTMLElement | null>(null);
  const hoveredLeftCellRef = useRef<HTMLTableCellElement | null>(null);
  const hoveredTopCellRef = useRef<HTMLTableCellElement | null>(null);
  const handleMouseLeaveRef = useRef<((event: MouseEvent) => void) | null>(
    null,
  );

  const {refs, floatingStyles, update} = useFloating({
    elements: {
      reference: virtualRef.current as unknown as Element,
    },
    middleware: [
      offset({mainAxis: -TOP_BUTTON_OVERHANG}),
      shift({
        padding: 8,
      }),
    ],
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const {
    refs: leftRefs,
    floatingStyles: leftFloatingStyles,
    update: updateLeft,
  } = useFloating({
    elements: {
      reference: leftVirtualRef.current as unknown as Element,
    },
    middleware: [
      offset({mainAxis: -LEFT_BUTTON_OVERHANG}),
      shift({
        padding: 8,
      }),
    ],
    placement: 'left',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!isEditable) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (
        (floatingElemRef.current &&
          event.target instanceof Node &&
          floatingElemRef.current.contains(event.target)) ||
        (leftFloatingElemRef.current &&
          event.target instanceof Node &&
          leftFloatingElemRef.current.contains(event.target))
      ) {
        return;
      }

      const {tableElement, isOutside} = getTableFromMouseEvent(event, getTheme);

      if (
        isOutside ||
        tableElement == null ||
        (anchorElem && !anchorElem.contains(tableElement))
      ) {
        setIsVisible(false);
        setIsLeftVisible(false);
        return;
      }

      const cellSelector = `td${getThemeSelector(getTheme, 'tableCell')}, th${getThemeSelector(getTheme, 'tableCell')}`;
      const hoveredCell = isHTMLElement(event.target)
        ? event.target.closest<HTMLTableCellElement>(cellSelector)
        : null;

      if (!hoveredCell) {
        setIsVisible(false);
        setIsLeftVisible(false);
        hoveredTopCellRef.current = null;
        hoveredLeftCellRef.current = null;
        return;
      }

      const rowIndex =
        hoveredCell.parentElement instanceof HTMLTableRowElement
          ? hoveredCell.parentElement.rowIndex
          : -1;
      const colIndex = hoveredCell.cellIndex ?? -1;

      const closestTopCell = getClosestTopCellPosition(
        tableElement,
        event.clientX,
      );

      if (!closestTopCell || rowIndex !== 0) {
        setIsVisible(false);
        hoveredTopCellRef.current = null;
      } else {
        hoveredTopCellRef.current = closestTopCell.cell;
        virtualRef.current.getBoundingClientRect = () =>
          new DOMRect(closestTopCell.centerX, closestTopCell.top, 0, 0);
        refs.setReference(virtualRef.current as unknown as Element);
        setIsVisible(true);
        update?.();
      }

      const tableRect = tableElement.getBoundingClientRect();
      if (colIndex !== 0) {
        setIsLeftVisible(false);
        hoveredLeftCellRef.current = null;
      } else {
        const {top, height} = hoveredCell.getBoundingClientRect();
        const centerY = top + height / 2;
        hoveredLeftCellRef.current = hoveredCell;
        leftVirtualRef.current.getBoundingClientRect = () =>
          new DOMRect(tableRect.left, centerY, 0, 0);
        leftRefs.setReference(leftVirtualRef.current as unknown as Element);
        setIsLeftVisible(true);
        updateLeft?.();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      setIsVisible(false);
      setIsLeftVisible(false);
    };
  }, [anchorElem, getTheme, isEditable, leftRefs, refs, update, updateLeft]);

  useEffect(() => {
    const handleMouseLeave = (event: MouseEvent) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget &&
        floatingElemRef.current &&
        floatingElemRef.current.contains(nextTarget as Node)
      ) {
        return;
      }
      if (
        nextTarget &&
        leftFloatingElemRef.current &&
        leftFloatingElemRef.current.contains(nextTarget as Node)
      ) {
        return;
      }
      setIsVisible(false);
      setIsLeftVisible(false);
    };
    handleMouseLeaveRef.current = handleMouseLeave;

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement && handleMouseLeaveRef.current) {
        prevRootElement.removeEventListener(
          'mouseleave',
          handleMouseLeaveRef.current,
        );
      }
      if (rootElement && handleMouseLeaveRef.current) {
        rootElement.addEventListener('mouseleave', handleMouseLeaveRef.current);
      }
    });
  }, [editor]);

  if (!isEditable) {
    return null;
  }

  const handleAddColumn = () => {
    const targetCell = hoveredTopCellRef.current;
    if (!targetCell) {
      return;
    }
    editor.update(() => {
      const maybeCellNode = $getNearestNodeFromDOMNode(targetCell);
      if ($isTableCellNode(maybeCellNode)) {
        maybeCellNode.selectEnd();
        $insertTableColumnAtSelection();
      }
    });
  };

  const handleAddRow = () => {
    const targetCell = hoveredLeftCellRef.current;
    if (!targetCell) {
      return;
    }
    editor.update(() => {
      const maybeCellNode = $getNearestNodeFromDOMNode(targetCell);
      if ($isTableCellNode(maybeCellNode)) {
        maybeCellNode.selectEnd();
        $insertTableRowAtSelection();
      }
    });
  };

  const handleSortColumn = (direction: 'asc' | 'desc') => {
    const targetCell = hoveredTopCellRef.current;
    if (!targetCell) {
      return;
    }

    editor.update(() => {
      const cellNode = $getNearestNodeFromDOMNode(targetCell);
      if (!$isTableCellNode(cellNode)) {
        return;
      }

      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) {
        return;
      }

      const tableNode = rowNode.getParent();
      if (!$isTableNode(tableNode) || !$isSimpleTable(tableNode)) {
        return;
      }

      const colIndex = cellNode.getIndexWithinParent();
      const rows = tableNode.getChildren().filter($isTableRowNode);

      const [tableMap] = $computeTableMapSkipCellCheck(
        tableNode,
        cellNode,
        cellNode,
      );

      const headerCell = tableMap[0]?.[colIndex]?.cell;
      const shouldSkipTopRow = headerCell?.hasHeader() ?? false;

      const sortableRows = shouldSkipTopRow ? rows.slice(1) : rows;

      if (sortableRows.length <= 1) {
        return;
      }

      sortableRows.sort((a, b) => {
        const aRowIndex = rows.indexOf(a);
        const bRowIndex = rows.indexOf(b);

        const aMapRow = tableMap[aRowIndex] ?? [];
        const bMapRow = tableMap[bRowIndex] ?? [];

        const aCellValue = aMapRow[colIndex];
        const bCellValue = bMapRow[colIndex];

        const aText = aCellValue?.cell.getTextContent() ?? '';
        const bText = bCellValue?.cell.getTextContent() ?? '';
        const result = aText.localeCompare(bText, undefined, {numeric: true});
        return direction === 'asc' ? -result : result;
      });

      const insertionCaret = shouldSkipTopRow
        ? $getSiblingCaret(rows[0], 'next')
        : $getChildCaret(tableNode, 'next');

      insertionCaret?.splice(0, sortableRows);
    });
  };

  return (
    <>
      <div
        ref={(node) => {
          floatingElemRef.current = node;
          refs.setFloating(node);
        }}
        style={{
          ...floatingStyles,
          opacity: isVisible ? 1 : 0,
        }}
        className="floating-top-actions">
        <DropDown
          buttonAriaLabel="Sort column"
          buttonClassName="floating-filter-indicator"
          hideChevron={true}>
          <DropDownItem
            className="item"
            onClick={() => handleSortColumn('desc')}>
            Sort Ascending
          </DropDownItem>
          <DropDownItem
            className="item"
            onClick={() => handleSortColumn('asc')}>
            Sort Descending
          </DropDownItem>
        </DropDown>
        <button
          className="floating-add-indicator"
          aria-label="Add column"
          type="button"
          onClick={handleAddColumn}
        />
      </div>
      <button
        ref={(node) => {
          leftFloatingElemRef.current = node;
          leftRefs.setFloating(node);
        }}
        style={{
          ...leftFloatingStyles,
          opacity: isLeftVisible ? 1 : 0,
        }}
        className="floating-add-indicator"
        aria-label="Add row"
        type="button"
        onClick={handleAddRow}
      />
    </>
  );
}

export default function TableHoverActionsV2Plugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): React.ReactPortal | null {
  const isEditable = useLexicalEditable();

  return isEditable
    ? createPortal(<TableHoverActionsV2 anchorElem={anchorElem} />, anchorElem)
    : null;
}
