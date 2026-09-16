/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';
import {afterEach, describe, expect, it} from 'vitest';

import {PageBreakExtension} from '../../plugins/PageBreakExtension';
import {
  DEFAULT_PAGE_SETUP,
  PagesLayout,
  registerPrintHandlers,
} from '../../plugins/PagesExtension';

describe('registerPrintHandlers', () => {
  const rootStyle = document.documentElement.style;
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
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

  function mountLayout() {
    const host = document.createElement('div');
    const root = document.createElement('div');
    host.appendChild(root);
    document.body.appendChild(host);
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RichTextExtension, PageBreakExtension],
        name: 'PagesPrint.test',
      }),
    );
    editor.setRootElement(root);
    const layout = new PagesLayout(editor, root, {gap: 24});
    layout.setPageSetup({...DEFAULT_PAGE_SETUP, pageSize: 'Letter'});
    layout.flush();
    cleanups.push(() => {
      layout.dispose();
      editor.dispose();
      host.remove();
    });
    return {host, layout};
  }

  it('prints one screen page per printed page', () => {
    const {host, layout} = mountLayout();
    expect(host.style.getPropertyValue('--page-gap')).toBe('24px');
    cleanups.push(registerPrintHandlers(layout));

    window.dispatchEvent(new Event('beforeprint'));
    expect(host.style.getPropertyValue('--page-gap')).toBe('0px');
    // Whole-pixel geometry: 0.4in = 38.4px rounds to 38px per margin.
    expect(host.style.getPropertyValue('--page-break-height')).toBe('76px');
    expect(host.style.getPropertyValue('--page-content-height')).toBe(
      `${1056 - 76}px`,
    );
    expect(rootStyle.getPropertyValue('--page-width')).toBe('816px');
    expect(rootStyle.getPropertyValue('--page-height')).toBe('1056px');
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('0px');
    expect(rootStyle.getPropertyValue('--page-margin-left')).toBe('0px');

    window.dispatchEvent(new Event('afterprint'));
    expect(host.style.getPropertyValue('--page-gap')).toBe('24px');
    expect(host.style.getPropertyValue('--page-break-height')).toBe(
      `${38.4 * 2 + 24}px`,
    );
    expect(rootStyle.getPropertyValue('--page-width')).toBe('');
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('');
  });
});
