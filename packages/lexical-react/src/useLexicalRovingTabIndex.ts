/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  registerRovingTabIndex,
  type RovingTabIndexOptions,
} from '@lexical/a11y';
import {RefObject, useEffect} from 'react';

export type {RovingOrientation, RovingTabIndexOptions} from '@lexical/a11y';

/**
 * React wrapper around `registerRovingTabIndex` from `@lexical/a11y`.
 *
 * Implements the WAI-ARIA roving-tabindex pattern on `containerRef`.
 * One item carries `tabindex="0"` at a time; the rest are `-1`. Arrow
 * keys move focus inside the group; Home / End jump to the ends.
 *
 * See `registerRovingTabIndex` JSDoc for the lazy-item-query semantics.
 */
export function useLexicalRovingTabIndex(
  containerRef: RefObject<HTMLElement | null>,
  options: RovingTabIndexOptions = {},
): void {
  const {orientation, itemSelector} = options;
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    return registerRovingTabIndex(container, {itemSelector, orientation});
  }, [containerRef, orientation, itemSelector]);
}
