/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {registerEventListeners} from 'lexical';

const COPIED_PROPS = [
  '--page-width',
  '--page-height',
  '--page-margin-right',
  '--page-margin-left',
];
const ROOT_PROPS = [
  ...COPIED_PROPS,
  '--page-margin-top',
  '--page-margin-bottom',
];

function px(host: HTMLElement, prop: string): number {
  return parseFloat(host.style.getPropertyValue(prop)) || 0;
}

/**
 * `@page` rules cannot read custom properties from arbitrary elements, so
 * copy the page dimensions from the host onto `:root` for the duration of a
 * print and remove them afterwards.
 *
 * The page layer (and with it the header and footer bands) is not printed,
 * so the bands' heights are folded into the printed top and bottom margins.
 * That keeps the printable area the same height as the on-screen content
 * area, and therefore the page breaks in the same places.
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
      for (const prop of ROOT_PROPS) {
        rootStyle.removeProperty(prop);
      }
    },
    beforeprint: () => {
      for (const prop of COPIED_PROPS) {
        const value = host.style.getPropertyValue(prop);
        if (value) {
          rootStyle.setProperty(prop, value);
        }
      }
      if (host.style.getPropertyValue('--page-height')) {
        rootStyle.setProperty(
          '--page-margin-top',
          `${px(host, '--page-margin-top') + px(host, '--page-header-height')}px`,
        );
        rootStyle.setProperty(
          '--page-margin-bottom',
          `${px(host, '--page-margin-bottom') + px(host, '--page-footer-height')}px`,
        );
      }
    },
  });
}
