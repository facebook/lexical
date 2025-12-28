/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {VirtualElement} from '@floating-ui/react';
import type {JSX} from 'react';

import './index.css';

import {autoUpdate, offset, shift, useFloating} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
} from '@lexical/table';
import {
  $getNearestNodeFromDOMNode,
  EditorThemeClasses,
  isHTMLElement,
} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {getThemeSelector} from '../../utils/getThemeSelector';

const INDICATOR_SIZE_PX = 18;
const SIDE_INDICATOR_SIZE_PX = 18;
const TOP_BUTTON_OVERHANG = INDICATOR_SIZE_PX / 2;
const LEFT_BUTTON_OVERHANG = SIDE_INDICATOR_SIZE_PX / 2;

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

function FloatingTableTopBorder({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element | null {
  const [editor, {getTheme}] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeftVisible, setIsLeftVisible] = useState(false);
  const [isTopHovering, setIsTopHovering] = useState(false);
  const [isLeftHovering, setIsLeftHovering] = useState(false);
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
        event.target === floatingElemRef.current ||
        event.target === leftFloatingElemRef.current
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

  const handleTopButtonClick = () => {
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

  const handleLeftButtonClick = () => {
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

  return (
    <>
      <button
        ref={(node) => {
          floatingElemRef.current = node;
          refs.setFloating(node);
        }}
        style={{
          ...floatingStyles,
          backgroundColor: isTopHovering ? '#f3f3f3' : 'white',
          opacity: isVisible ? 1 : 0,
        }}
        className="floating-table-top-border-indicator"
        aria-label="Add column"
        type="button"
        onClick={handleTopButtonClick}
        onMouseEnter={() => setIsTopHovering(true)}
        onMouseLeave={() => setIsTopHovering(false)}
      />
      <button
        ref={(node) => {
          leftFloatingElemRef.current = node;
          leftRefs.setFloating(node);
        }}
        style={{
          ...leftFloatingStyles,
          backgroundColor: isLeftHovering ? '#f3f3f3' : 'white',
          opacity: isLeftVisible ? 1 : 0,
        }}
        className="floating-table-top-border-indicator-left"
        aria-label="Add row"
        type="button"
        onClick={handleLeftButtonClick}
        onMouseEnter={() => setIsLeftHovering(true)}
        onMouseLeave={() => setIsLeftHovering(false)}
      />
    </>
  );
}

export default function FloatingTableTopBorderPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): React.ReactPortal | null {
  const isEditable = useLexicalEditable();

  return isEditable
    ? createPortal(
        <FloatingTableTopBorder anchorElem={anchorElem} />,
        anchorElem,
      )
    : null;
}
