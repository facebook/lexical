/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Page} from '@playwright/test';

import {evaluate, expect, focusEditor, initialize, test} from '../utils';

test.describe('Auto scroll while typing', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  async function addScroll(page: Page, selector_: string) {
    await evaluate(
      page,
      (selector) => {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
          element.style.overflow = 'auto';
          element.style.maxHeight = '200px';
        }
      },
      selector_,
    );
  }

  async function isCaretVisible(page: Page, selector_: string) {
    return await evaluate(
      page,
      (selector) => {
        const selection = document.getSelection();
        const range = selection?.getRangeAt(0);
        const element = document.createElement('span');
        element.innerHTML = '|';
        range?.insertNode(element);
        const selectionRect = element.getBoundingClientRect();
        element.parentNode?.removeChild(element);
        const containerRect = document
          .querySelector(selector)!
          .getBoundingClientRect();

        return (
          selectionRect.top >= containerRect.top &&
          selectionRect.top < containerRect.bottom
        );
      },
      selector_,
    );
  }

  [
    {
      name: 'Can auto scroll if content editable element is scrollable',
      selector: '.ContentEditable__root',
    },
    {
      name: 'Can auto scroll if parent element is scrollable',
      selector: '.editor-container',
    },
  ].forEach((testCase) => {
    test(testCase.name, async ({page, isPlainText}) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await addScroll(page, testCase.selector);

      for (let i = 0; i < 15; i++) {
        await page.keyboard.type('Hello');
        await page.keyboard.press('Enter');

        expect(await isCaretVisible(page, testCase.selector)).toBe(true);
      }
    });
  });
});
