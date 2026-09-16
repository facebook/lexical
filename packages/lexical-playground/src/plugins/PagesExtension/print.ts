/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PagesLayout} from './PagesLayout';

import {registerEventListeners} from 'lexical';

const ROOT_PROPS = [
  '--page-width',
  '--page-height',
  '--page-margin-top',
  '--page-margin-right',
  '--page-margin-bottom',
  '--page-margin-left',
];

/**
 * Print the page layer as it is on screen: each on-screen page becomes one
 * printed page, headers, footers and page numbers included.
 *
 * Before printing the layout switches to print mode (zero gap, whole-pixel
 * geometry) and is flushed synchronously, so the host is exactly
 * `pageCount` page heights tall and the browser's own pagination falls on
 * the same boundaries as the on-screen breaks. `@page` cannot read custom properties from arbitrary
 * elements, so the page size is copied onto `:root` and the `@page` margins
 * are zeroed (the layout already draws the margins). Everything is undone
 * after printing.
 */
export function registerPrintHandlers(layout: PagesLayout): () => void {
  const {host} = layout;
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    return () => {};
  }
  const rootStyle = doc.documentElement.style;
  return registerEventListeners(win, {
    afterprint: () => {
      layout.setPrintMode(false);
      layout.flush();
      for (const prop of ROOT_PROPS) {
        rootStyle.removeProperty(prop);
      }
    },
    beforeprint: () => {
      layout.setPrintMode(true);
      layout.flush();
      const width = host.style.getPropertyValue('--page-width');
      const height = host.style.getPropertyValue('--page-height');
      if (!width || !height) {
        return;
      }
      rootStyle.setProperty('--page-width', width);
      rootStyle.setProperty('--page-height', height);
      rootStyle.setProperty('--page-margin-top', '0px');
      rootStyle.setProperty('--page-margin-right', '0px');
      rootStyle.setProperty('--page-margin-bottom', '0px');
      rootStyle.setProperty('--page-margin-left', '0px');
    },
  });
}
