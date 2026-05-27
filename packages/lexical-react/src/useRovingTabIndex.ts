/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {RefObject, useEffect} from 'react';

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface RovingTabIndexOptions {
  /**
   * Which arrow keys move focus.
   * - `horizontal` (default): ArrowLeft / ArrowRight
   * - `vertical`: ArrowUp / ArrowDown
   * - `both`: any arrow key
   */
  orientation?: RovingOrientation;
  /**
   * Selector for the group's roving items. The default matches direct-child
   * non-disabled buttons. Pass a custom selector to include other focusables
   * or to scope to a marker attribute (e.g. `[data-roving-item]`).
   */
  itemSelector?: string;
}

const DEFAULT_SELECTOR = ':scope > button:not([disabled])';

/**
 * Implements the WAI-ARIA roving-tabindex pattern on `containerRef`. One item
 * carries `tabindex="0"` at a time; the rest are `-1`. Arrow keys move focus
 * inside the group; Home/End jump to the ends. Tab leaves the group as a
 * unit, matching the toolbar / menubar pattern.
 *
 * Items are queried lazily on every interaction so additions or removals
 * during the lifetime of the group are picked up without extra wiring.
 */
export function useRovingTabIndex(
  containerRef: RefObject<HTMLElement | null>,
  options: RovingTabIndexOptions = {},
): void {
  const orientation = options.orientation ?? 'horizontal';
  const selector = options.itemSelector ?? DEFAULT_SELECTOR;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const getItems = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(selector));

    const applyTabIndex = (items: HTMLElement[], activeIndex: number): void => {
      items.forEach((item, i) => {
        item.tabIndex = i === activeIndex ? 0 : -1;
      });
    };

    const init = (): void => {
      const items = getItems();
      if (items.length === 0) {
        return;
      }
      const activeIdx = items.findIndex(el => el === document.activeElement);
      applyTabIndex(items, activeIdx >= 0 ? activeIdx : 0);
    };

    init();

    const handler = (event: KeyboardEvent): void => {
      const items = getItems();
      if (items.length === 0) {
        return;
      }
      const currentIdx = items.findIndex(el => el === document.activeElement);
      if (currentIdx < 0) {
        return;
      }

      const horizontal = orientation === 'horizontal' || orientation === 'both';
      const vertical = orientation === 'vertical' || orientation === 'both';
      let nextIdx = currentIdx;
      switch (event.key) {
        case 'ArrowRight':
          if (!horizontal) {
            return;
          }
          nextIdx = (currentIdx + 1) % items.length;
          break;
        case 'ArrowLeft':
          if (!horizontal) {
            return;
          }
          nextIdx = (currentIdx - 1 + items.length) % items.length;
          break;
        case 'ArrowDown':
          if (!vertical) {
            return;
          }
          nextIdx = (currentIdx + 1) % items.length;
          break;
        case 'ArrowUp':
          if (!vertical) {
            return;
          }
          nextIdx = (currentIdx - 1 + items.length) % items.length;
          break;
        case 'Home':
          nextIdx = 0;
          break;
        case 'End':
          nextIdx = items.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      applyTabIndex(items, nextIdx);
      items[nextIdx].focus();
    };

    container.addEventListener('keydown', handler);
    return () => {
      container.removeEventListener('keydown', handler);
    };
  }, [containerRef, orientation, selector]);
}
