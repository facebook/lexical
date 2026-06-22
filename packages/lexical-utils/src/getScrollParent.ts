/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getParentElement} from 'lexical';

// Got from https://stackoverflow.com/a/42543908/2013580
/**
 * Walks up from `element` and returns the nearest scrollable ancestor (or
 * `ownerDocument.body` if none is found), used to keep the active typeahead
 * option scrolled into view. Set `includeHidden` to also treat
 * `overflow: hidden` ancestors as scroll parents.
 *
 * The walk crosses ShadowRoot→host (via `getParentElement`) so a
 * shadow-mounted editor's scroll parent is found in the enclosing light-DOM
 * ancestor chain, and the styles / body are resolved through the element's
 * own realm so an iframe-mounted editor stays inside its document.
 */
export function getScrollParent(
  element: HTMLElement,
  includeHidden: boolean,
): HTMLElement | HTMLBodyElement {
  // Resolve through the element's own realm so an iframe-mounted editor's
  // scroll parent and computed styles come from its document, not the top one.
  const ownerDocument = element.ownerDocument;
  const win = ownerDocument.defaultView || window;
  let style = win.getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return ownerDocument.body;
  }
  for (
    let parent: HTMLElement | null = element;
    (parent = getParentElement(parent));
  ) {
    style = win.getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (
      overflowRegex.test(style.overflow + style.overflowY + style.overflowX)
    ) {
      return parent;
    }
  }
  return ownerDocument.body;
}
