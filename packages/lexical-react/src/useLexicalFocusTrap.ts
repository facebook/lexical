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
 * `initialFocus` chooses where to land when the trap activates:
 * - `'firstFocusable'` (default): focus the first focusable descendant.
 * - `'container'`: focus the container itself. The container must satisfy
 *   `tabIndex >= -1` (so it's programmatically focusable); callers typically
 *   set `tabIndex={-1}` to keep it out of the natural Tab order while
 *   remaining programmatically focusable.
 *   Use for dialogs whose first focusable is a dismiss/close action so the
 *   user lands on the dialog body and screen readers announce the dialog
 *   label before any control.
 * `initialFocus` is expected to stay stable for the lifetime of the trap.
 *
 * While the trap is active, *any* focus that lands outside the container is
 * pulled back inside via a document-level `focusin` listener. This is what
 * lets the trap recover from Safari's default Tab routing through the
 * browser chrome, but it also means descendants that mount into a portal
 * outside `containerRef.current` (autocomplete panels, tooltips, toasts
 * that auto-focus themselves) will be yanked back as soon as they take
 * focus. Portal them inside the container, or skip this hook for those
 * dialogs. The pull-back always lands on the first focusable descendant
 * (or the container as a fallback) — `initialFocus` only applies to the
 * activation-time landing, not to subsequent escape recoveries. Only one
 * trap should be mounted at a time — two active traps install competing
 * document-level `focusin` listeners and will fight over focus.
 *
 * Escape is not intercepted — the owner handles close-key behavior itself.
 */
export function useLexicalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  initialFocus: 'firstFocusable' | 'container' = 'firstFocusable',
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
    if (initialFocus === 'container' && container.tabIndex >= -1) {
      container.focus();
    } else if (focusable.length > 0) {
      focusable[0].focus();
    } else if (container.tabIndex >= -1) {
      container.focus();
    }

    // Full Tab management — every Tab / Shift+Tab is handled here.
    // Boundary-only cycling let Safari's default Tab route out to the
    // browser chrome (URL bar) between presses, producing a visible
    // focus flash. This trades contentEditable Tab indent for a
    // reliable trap; useLexicalFocusTrap is Modal-only today.
    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      const currentFocusable = getFocusableElements(container);
      if (currentFocusable.length === 0) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      const active = document.activeElement;
      const activeIndex =
        isHTMLElement(active) && container.contains(active)
          ? currentFocusable.indexOf(active)
          : -1;
      if (event.shiftKey) {
        (activeIndex <= 0 ? last : currentFocusable[activeIndex - 1]).focus();
      } else {
        (activeIndex === -1 || activeIndex === currentFocusable.length - 1
          ? first
          : currentFocusable[activeIndex + 1]
        ).focus();
      }
    };

    // Safety net — if focus ever escapes the container (e.g. portal
    // ordering routes the browser's default Tab past the modal in
    // Safari), pull it back to the first focusable inside.
    const focusinHandler = (event: FocusEvent) => {
      if (!isHTMLElement(event.target) || container.contains(event.target)) {
        return;
      }
      const currentFocusable = getFocusableElements(container);
      if (currentFocusable.length > 0) {
        currentFocusable[0].focus();
      } else if (container.tabIndex >= -1) {
        container.focus();
      }
    };

    container.addEventListener('keydown', keydownHandler);
    document.addEventListener('focusin', focusinHandler);

    return () => {
      container.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('focusin', focusinHandler);
      if (
        previouslyFocused !== null &&
        // `isHTMLElement` admits any `Element` whose nodeType is 1, so SVG
        // and other non-focusable elements can pass — keep the runtime
        // `focus` check as a guard against that.
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [isActive, containerRef, initialFocus]);
}
