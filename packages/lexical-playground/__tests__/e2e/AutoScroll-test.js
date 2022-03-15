/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {evaluate, focusEditor, initializeE2E} from '../utils';

describe('Auto scroll while typing', () => {
  initializeE2E((e2e) => {
    async function addScroll(page, selector) {
      await evaluate(
        page,
        (selectorArg) => {
          const element = document.querySelector(selectorArg);
          element.style.overflow = 'auto';
          element.style.maxHeight = '50px';
        },
        selector,
      );
    }

    async function isCaretVisible(page) {
      return await evaluate(page, () => {
        const selection = document.getSelection();
        const anchorNode = selection.anchorNode;
        const element =
          anchorNode.nodeName === '#text' ? anchorNode.parentNode : anchorNode;

        const rect = element.getBoundingClientRect();
        const elementFromPoint = document.elementFromPoint(rect.left, rect.top);

        return (
          rect.bottom <= window.innerHeight &&
          rect.top >= 0 &&
          elementFromPoint === element
        );
      });
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
      it.skipIf(e2e.isPlainText, testCase.name, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await addScroll(page, testCase.selector);

        for (let i = 0; i < 15; i++) {
          await page.keyboard.type('Hello');
          await page.keyboard.press('Enter');
          expect(await isCaretVisible(page)).toBe(true);
        }
      });
    });
  });
});
