/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getParentElement} from 'lexical';

const EDGE_ZONE = 40;
const MAX_SPEED = 1080; // CSS pixels per second.

type Bounds = {left: number; right: number; top: number; bottom: number};

function edgeSpeed(y: number, {top, bottom}: Bounds): number {
  const zone = Math.min(EDGE_ZONE, (bottom - top) / 2);
  if (zone <= 0) {
    return 0;
  }
  if (y < top + zone) {
    return -MAX_SPEED * Math.min(1, (top + zone - y) / zone);
  }
  if (y > bottom - zone) {
    return MAX_SPEED * Math.min(1, (y - bottom + zone) / zone);
  }
  return 0;
}

function intersect(a: Bounds, b: Bounds): Bounds {
  return {
    bottom: Math.min(a.bottom, b.bottom),
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top),
  };
}

/** Private controller; the caller owns drag event registration and eligibility. */
export function createDragAutoScroller(
  root: HTMLElement,
  onScroll: (x: number, y: number) => void,
): {update: (x: number, y: number) => void; stop: () => void} {
  const ownerDocument = root.ownerDocument;
  const view = ownerDocument.defaultView;
  let frame: number | null = null;
  let point: {x: number; y: number} | null = null;
  let lastTime: number | null = null;

  function stop(): void {
    if (frame !== null && view) {
      view.cancelAnimationFrame(frame);
    }
    frame = null;
    point = null;
    lastTime = null;
  }

  function scroll(elapsed: number, x: number, y: number): boolean {
    if (!view || !root.isConnected) {
      return false;
    }
    const viewport: Bounds = {
      bottom: view.innerHeight,
      left: 0,
      right: ownerDocument.documentElement.clientWidth,
      top: 0,
    };
    if (x < 0 || x > viewport.right || y < 0 || y > viewport.bottom) {
      return false;
    }
    const scrollingElement = ownerDocument.scrollingElement;
    const ancestors: {
      element: HTMLElement;
      bounds: Bounds;
      style: CSSStyleDeclaration;
    }[] = [];
    for (let el: HTMLElement | null = root; el; el = getParentElement(el)) {
      if (el === scrollingElement) {
        break;
      }
      const rect = el.getBoundingClientRect();
      const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
      const left = rect.left + el.clientLeft * scale;
      const top = rect.top + el.clientTop * scale;
      ancestors.push({
        bounds: {
          bottom: top + el.clientHeight * scale,
          left,
          right: left + el.clientWidth * scale,
          top,
        },
        element: el,
        style: view.getComputedStyle(el),
      });
    }
    // Work from the viewport inward so each scrollport uses its visible edges.
    let visible = viewport;
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const entry = ancestors[i];
      const {overflowX, overflowY} = entry.style;
      const clipped = {...visible};
      if (overflowX !== 'visible') {
        clipped.left = entry.bounds.left;
        clipped.right = entry.bounds.right;
      }
      if (overflowY !== 'visible') {
        clipped.top = entry.bounds.top;
        clipped.bottom = entry.bounds.bottom;
      }
      visible = intersect(visible, clipped);
      entry.bounds = visible;
    }
    for (const {element, bounds, style} of ancestors) {
      if (!/^(auto|scroll|overlay)$/.test(style.overflowY)) {
        continue;
      }
      if (
        x < bounds.left ||
        x > bounds.right ||
        y < bounds.top ||
        y > bounds.bottom
      ) {
        return false;
      }
      const speed = edgeSpeed(y, bounds);
      if (speed === 0) {
        return false;
      }
      const before = element.scrollTop;
      // Override CSS smooth scrolling so each frame takes effect immediately.
      element.scrollTo({
        behavior: 'instant',
        top: Math.max(
          0,
          Math.min(
            element.scrollHeight - element.clientHeight,
            before + (speed * elapsed) / 1000,
          ),
        ),
      });
      if (element.scrollTop !== before) {
        return true;
      }
      if (
        style.overscrollBehaviorY === 'contain' ||
        style.overscrollBehaviorY === 'none'
      ) {
        return false;
      }
    }
    if (scrollingElement) {
      const before = scrollingElement.scrollTop;
      scrollingElement.scrollTo({
        behavior: 'instant',
        top: Math.max(
          0,
          Math.min(
            scrollingElement.scrollHeight - viewport.bottom,
            before + (edgeSpeed(y, viewport) * elapsed) / 1000,
          ),
        ),
      });
      return scrollingElement.scrollTop !== before;
    }
    return false;
  }

  function tick(time: number): void {
    frame = null;
    if (!point || !view) {
      return;
    }
    const {x, y} = point;
    const elapsed =
      lastTime === null ? 1000 / 60 : Math.min(32, time - lastTime);
    lastTime = time;
    if (scroll(elapsed, x, y)) {
      onScroll(x, y);
      if (point) {
        frame = view.requestAnimationFrame(tick);
      }
    } else {
      lastTime = null;
    }
  }

  function update(x: number, y: number): void {
    point = {x, y};
    if (view && frame === null) {
      frame = view.requestAnimationFrame(tick);
    }
  }

  return {stop, update};
}
