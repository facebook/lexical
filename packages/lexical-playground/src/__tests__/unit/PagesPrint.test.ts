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

  it('prints one screen page per printed page without touching the screen layout', () => {
    const {host, layout} = mountLayout();
    // Gap-dependent values derive from --page-gap so print CSS can zero it.
    expect(host.style.getPropertyValue('--page-gap')).toBe('24px');
    // One page: the host is exactly one page tall (sizes are inline).
    expect(host.style.minHeight).toBe('1056px');
    cleanups.push(registerPrintHandlers(layout));

    window.dispatchEvent(new Event('beforeprint'));
    // The host is left alone; only :root gets the page size for @page.
    expect(host.style.getPropertyValue('--page-gap')).toBe('24px');
    expect(host.style.getPropertyValue('--page-content-height')).toBe(
      `${1056 - 76}px`,
    );
    expect(rootStyle.getPropertyValue('--page-width')).toBe('816px');
    expect(rootStyle.getPropertyValue('--page-height')).toBe('1056px');
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('0px');
    expect(rootStyle.getPropertyValue('--page-margin-left')).toBe('0px');

    window.dispatchEvent(new Event('afterprint'));
    expect(rootStyle.getPropertyValue('--page-width')).toBe('');
    expect(rootStyle.getPropertyValue('--page-margin-top')).toBe('');
  });
});
