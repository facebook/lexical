/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {afterEach, describe, expect, it} from 'vitest';

import {registerPrintHandlers} from '../../plugins/PagesExtension/print';

describe('registerPrintHandlers', () => {
  const rootStyle = document.documentElement.style;
  let cleanup = () => {};
  afterEach(() => {
    cleanup();
    for (const prop of [
      '--page-width',
      '--page-height',
      '--page-margin-top',
      '--page-margin-right',
      '--page-margin-bottom',
      '--page-margin-left',
    ]) {
      rootStyle.removeProperty(prop);
    }
  });

  it('reserves the header and footer bands inside the printed margins', () => {
    const host = document.createElement('div');
    host.style.setProperty('--page-width', '816px');
    host.style.setProperty('--page-height', '1056px');
    host.style.setProperty('--page-margin-top', '48px');
    host.style.setProperty('--page-margin-right', '48px');
    host.style.setProperty('--page-margin-bottom', '48px');
    host.style.setProperty('--page-margin-left', '48px');
    host.style.setProperty('--page-header-height', '30px');
    host.style.setProperty('--page-footer-height', '20.5px');
    document.body.appendChild(host);
    cleanup = registerPrintHandlers(host);

    window.dispatchEvent(new Event('beforeprint'));
    expect(rootStyle.getPropertyValue('--page-width')).toBe('816px');
    expect(rootStyle.getPropertyValue('--page-height')).toBe('1056px');
    expect(rootStyle.getPropertyValue('--page-margin-left')).toBe('48px');
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('78px');
    expect(rootStyle.getPropertyValue('--page-margin-bottom')).toBe('68.5px');

    window.dispatchEvent(new Event('afterprint'));
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('');
    expect(rootStyle.getPropertyValue('--page-width')).toBe('');
    host.remove();
  });

  it('leaves :root alone when the host has no page geometry', () => {
    const host = document.createElement('div');
    cleanup = registerPrintHandlers(host);
    window.dispatchEvent(new Event('beforeprint'));
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('');
  });
});
