/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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

export interface AriaLiveRegionHandle {
  /**
   * Write a message into the live region. Calling with the same string
   * back-to-back appends a zero-width space so screen readers register
   * the change and re-announce.
   */
  announce: (message: string) => void;
  /**
   * Remove the live region element from its owner. Safe to call more
   * than once.
   */
  dispose: () => void;
}

const NOOP_HANDLE: AriaLiveRegionHandle = {
  announce: () => {},
  dispose: () => {},
};

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
 * Mounts a visually hidden `aria-live` region as a child of `owner`
 * (default `document.body`) and returns a handle that announces messages
 * and disposes the region when called.
 *
 * Framework-agnostic — call from React via `useLexicalAriaLiveRegion`,
 * from Svelte via `onMount` / `onDestroy`, or imperatively from vanilla
 * JS. WAI-ARIA status message pattern (WCAG 4.1.3).
 *
 * If neither `owner` nor `document.body` is available (e.g. SSR), the
 * returned handle is a no-op.
 */
export function registerAriaLiveRegion(
  options: AriaLiveRegionOptions = {},
): AriaLiveRegionHandle {
  const politeness = options.politeness ?? 'polite';
  const host =
    options.owner ?? (typeof document !== 'undefined' ? document.body : null);
  if (host === null) {
    return NOOP_HANDLE;
  }
  const region = document.createElement('div');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  applyVisuallyHidden(region);
  host.appendChild(region);
  let disposed = false;
  return {
    announce(message) {
      if (disposed) {
        return;
      }
      // Toggle a trailing zero-width space when the message would repeat
      // so the screen reader detects a textContent change and re-announces.
      const next =
        region.textContent === message ? message + '\u200B' : message;
      region.textContent = next;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      if (region.parentNode !== null) {
        region.parentNode.removeChild(region);
      }
    },
  };
}
