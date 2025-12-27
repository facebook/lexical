/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {VirtualElement} from '@floating-ui/react';
import type {CSSProperties, JSX} from 'react';

import {autoUpdate, offset, shift, useFloating} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {EditorThemeClasses, isHTMLElement} from 'lexical';
import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {getThemeSelector} from '../../utils/getThemeSelector';

const INDICATOR_WIDTH_PX = 24;
const INDICATOR_HEIGHT_PX = 12;
const SIDE_INDICATOR_WIDTH_PX = 12;
const SIDE_INDICATOR_HEIGHT_PX = 24;

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
): {centerX: number; top: number} | null {
  const firstRow = tableElement.rows[0];
  if (!firstRow) {
    return null;
  }

  let closest: {centerX: number; top: number} | null = null;
  let smallestDelta = Number.POSITIVE_INFINITY;

  for (const cell of Array.from(firstRow.cells)) {
    const rect = cell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const delta = Math.abs(centerX - clientX);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = {centerX, top: rect.top};
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
  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const leftVirtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const floatingElemRef = useRef<HTMLElement | null>(null);
  const leftFloatingElemRef = useRef<HTMLElement | null>(null);
  const handleMouseLeaveRef = useRef<((event: MouseEvent) => void) | null>(
    null,
  );

  const {refs, floatingStyles, update} = useFloating({
    elements: {
      reference: virtualRef.current as unknown as Element,
    },
    middleware: [
      offset(-1),
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
      offset(-1),
      shift({
        padding: 8,
      }),
    ],
    placement: 'left',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const indicatorStyle: CSSProperties = useMemo(
    () => ({
      border: '1px solid red',
      borderRadius: 2,
      boxSizing: 'border-box',
      height: INDICATOR_HEIGHT_PX,
      pointerEvents: 'auto',
      transition: 'opacity 80ms ease',
      width: INDICATOR_WIDTH_PX,
      zIndex: 10,
    }),
    [],
  );

  const leftIndicatorStyle: CSSProperties = useMemo(
    () => ({
      border: '1px solid red',
      borderRadius: 2,
      boxSizing: 'border-box',
      height: SIDE_INDICATOR_HEIGHT_PX,
      pointerEvents: 'auto',
      transition: 'opacity 80ms ease',
      width: SIDE_INDICATOR_WIDTH_PX,
      zIndex: 10,
    }),
    [],
  );

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

      const closestTopCell = getClosestTopCellPosition(
        tableElement,
        event.clientX,
      );

      if (!closestTopCell) {
        setIsVisible(false);
        setIsLeftVisible(false);
        return;
      }

      const tableRect = tableElement.getBoundingClientRect();
      let closestRowCenterY: number | null = null;

      for (const row of Array.from(tableElement.rows)) {
        const rect = row.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        if (
          closestRowCenterY === null ||
          Math.abs(centerY - event.clientY) <
            Math.abs(closestRowCenterY - event.clientY)
        ) {
          closestRowCenterY = centerY;
        }
      }

      if (closestRowCenterY === null) {
        setIsLeftVisible(false);
      } else {
        leftVirtualRef.current.getBoundingClientRect = () =>
          new DOMRect(tableRect.left, closestRowCenterY, 0, 0);
        leftRefs.setReference(leftVirtualRef.current as unknown as Element);
        setIsLeftVisible(true);
        updateLeft?.();
      }

      virtualRef.current.getBoundingClientRect = () =>
        new DOMRect(closestTopCell.centerX, closestTopCell.top, 0, 0);

      refs.setReference(virtualRef.current as unknown as Element);
      setIsVisible(true);
      update?.();
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

  return (
    <>
      <div
        ref={(node) => {
          floatingElemRef.current = node;
          refs.setFloating(node);
        }}
        style={{
          ...floatingStyles,
          ...indicatorStyle,
          opacity: isVisible ? 1 : 0,
        }}
      />
      <div
        ref={(node) => {
          leftFloatingElemRef.current = node;
          leftRefs.setFloating(node);
        }}
        style={{
          ...leftFloatingStyles,
          ...leftIndicatorStyle,
          opacity: isLeftVisible ? 1 : 0,
        }}
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
