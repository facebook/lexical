/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {type FocusTrapInitialFocus, registerFocusTrap} from '@lexical/a11y';
import {RefObject, useEffect} from 'react';

export type {FocusTrapInitialFocus} from '@lexical/a11y';

/**
 * React wrapper around `registerFocusTrap` from `@lexical/a11y`.
 *
 * Traps Tab / Shift+Tab focus inside `containerRef` while `isActive` is
 * true, and restores focus to the previously-focused element when the
 * trap deactivates. Intended for modal dialogs and other transient
 * overlays.
 *
 * `initialFocus` is expected to stay stable for the lifetime of the
 * trap. See `registerFocusTrap` JSDoc for the trap's caveats (portal
 * descendants, single-trap requirement).
 */
export function useLexicalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  initialFocus: FocusTrapInitialFocus = 'firstFocusable',
): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    return registerFocusTrap(container, {initialFocus});
  }, [isActive, containerRef, initialFocus]);
}
