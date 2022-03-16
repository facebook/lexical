/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {E2E_BROWSER, evaluate, focusEditor, initializeE2E} from '../utils';

describe('Auto scroll while typing', () => {
  initializeE2E((e2e) => {
    async function addScroll(page, selector_) {
      await evaluate(
        page,
        (selector) => {
          const element = document.querySelector(selector);
          element.style.overflow = 'auto';
          element.style.maxHeight = '100px';
        },
        selector_,
      );
    }

    async function isCaretVisible(page, selector_) {
      return await evaluate(
        page,
        (selector) => {
          const selection = document.getSelection();
          const range = selection.getRangeAt(0);
          const element = document.createElement('span');
          range.insertNode(element);
          const selectionRect = element.getBoundingClientRect();
          element.parentNode.removeChild(element);
          const containerRect = document
            .querySelector(selector)
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
      [true, false].forEach((isSoftLineBreak) => {
        it.skipIf(
          // TODO:
          // skip due to existing bug with safari - #1473
          (e2e.isPlainText || isSoftLineBreak) && E2E_BROWSER === 'webkit',
          `${testCase.name}${isSoftLineBreak ? ' (soft line break)' : ''}`,
          async () => {
            const {page} = e2e;

            await focusEditor(page);
            await addScroll(page, testCase.selector);

            for (let i = 0; i < 15; i++) {
              await page.keyboard.type('Hello');

              if (isSoftLineBreak) {
                await page.keyboard.down('Shift');
                await page.keyboard.press('Enter');
                await page.keyboard.up('Shift');
              } else {
                await page.keyboard.press('Enter');
              }

              expect(await isCaretVisible(page, testCase.selector)).toBe(true);
            }
          },
        );
      });
    });
  });
});
