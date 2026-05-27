/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {isHTMLElement} from 'lexical';
import {RefObject, useEffect} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

/**
 * Traps Tab / Shift+Tab focus inside `containerRef` while `isActive` is true,
 * and restores focus to the previously-focused element when the trap
 * deactivates. Intended for modal dialogs and other transient overlays.
 *
 * Escape is not intercepted — the owner handles close-key behavior itself.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const previouslyFocused = isHTMLElement(document.activeElement)
      ? document.activeElement
      : null;

    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else if (container.tabIndex >= -1) {
      container.focus();
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      const currentFocusable = getFocusableElements(container);
      if (currentFocusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (
          active === first ||
          active === container ||
          !container.contains(active)
        ) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handler);

    return () => {
      container.removeEventListener('keydown', handler);
      if (
        previouslyFocused !== null &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [isActive, containerRef]);
}
