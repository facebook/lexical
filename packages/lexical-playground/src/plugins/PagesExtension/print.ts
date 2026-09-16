/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {registerEventListeners} from 'lexical';

const PAGE_PROPS = [
  '--page-width',
  '--page-height',
  '--page-margin-top',
  '--page-margin-right',
  '--page-margin-bottom',
  '--page-margin-left',
];

/**
 * `@page` rules cannot read custom properties from arbitrary elements, so
 * copy the page dimensions from the host onto `:root` for the duration of a
 * print and remove them afterwards.
 */
export function registerPrintHandlers(host: HTMLElement): () => void {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    return () => {};
  }
  const rootStyle = doc.documentElement.style;
  return registerEventListeners(win, {
    afterprint: () => {
      for (const prop of PAGE_PROPS) {
        rootStyle.removeProperty(prop);
      }
    },
    beforeprint: () => {
      for (const prop of PAGE_PROPS) {
        const value = host.style.getPropertyValue(prop);
        if (value) {
          rootStyle.setProperty(prop, value);
        }
      }
    },
  });
}
