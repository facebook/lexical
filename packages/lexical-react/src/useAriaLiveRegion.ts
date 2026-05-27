/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useCallback, useEffect, useRef} from 'react';

export type AriaPoliteness = 'polite' | 'assertive';

export interface AriaLiveRegionOptions {
  /**
   * How insistently the screen reader announces updates.
   * - `polite` (default): announce after the current speech completes.
   * - `assertive`: interrupt the current speech.
   */
  politeness?: AriaPoliteness;
  /**
   * Owner element to append the live region to. Defaults to `document.body`.
   * Passing a specific element keeps the region in the same accessibility
   * subtree as the editor when the editor lives inside a shadow root or a
   * portaled overlay.
   */
  owner?: HTMLElement;
}

function applyVisuallyHidden(el: HTMLElement): void {
  const style = el.style;
  style.border = '0';
  style.clip = 'rect(0 0 0 0)';
  style.height = '1px';
  style.margin = '-1px';
  style.overflow = 'hidden';
  style.padding = '0';
  style.position = 'absolute';
  style.whiteSpace = 'nowrap';
  style.width = '1px';
}

/**
 * Mounts a visually hidden `aria-live` region and returns an `announce`
 * function that writes a message into it. The region is created on mount,
 * removed on unmount, and lives inside `owner` (default `document.body`).
 *
 * Calling `announce` with the same string back-to-back appends a zero-width
 * space so screen readers register the change and re-announce. WAI-ARIA
 * status message pattern (WCAG 4.1.3).
 */
export function useAriaLiveRegion(
  options: AriaLiveRegionOptions = {},
): (message: string) => void {
  const politeness = options.politeness ?? 'polite';
  const owner = options.owner;
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host =
      owner ?? (typeof document !== 'undefined' ? document.body : null);
    if (host === null) {
      return;
    }
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    applyVisuallyHidden(region);
    host.appendChild(region);
    regionRef.current = region;
    return () => {
      if (region.parentNode !== null) {
        region.parentNode.removeChild(region);
      }
      regionRef.current = null;
    };
  }, [politeness, owner]);

  return useCallback((message: string) => {
    const region = regionRef.current;
    if (region === null) {
      return;
    }
    // Toggle a trailing zero-width space when the message would repeat so
    // the screen reader detects a textContent change and re-announces.
    const next = region.textContent === message ? message + '\u200B' : message;
    region.textContent = next;
  }, []);
}
