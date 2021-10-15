/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertSelection,
  assertHTML,
  E2E_BROWSER,
} from '../utils';

describe('Composition', () => {
  initializeE2E((e2e) => {
    it('Handles Hiragana characters', async () => {
      const {page} = e2e;

      await page.focus('div.editor');

      await page.keyboard.type('も');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">も</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.type('もじ');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">もじ</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });
    });

    it('Handles Arabic characters with diacritics', async () => {
      const {page} = e2e;

      await page.focus('div.editor');

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">ه</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">ه</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });
    });

    describe('IME', () => {
      it('Can type Hiragana via IME', async () => {
        const {page} = e2e;

        // This only runs on Chrome for now due to imeSetComposition not being implemented
        // in other browsers.
        if (E2E_BROWSER !== 'chromium') {
          return;
        }

        await page.focus('div.editor');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.insertText(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 3, 3);
        await page.keyboard.imeSetComposition('もじあ', 4, 4);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">すし もじあ</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });
      });

      it('Can type, delete and cancel Hiragana via IME', async () => {
        const {page} = e2e;

        // This only runs on Chrome for now due to imeSetComposition not being implemented
        // in other browsers.
        if (E2E_BROWSER !== 'chromium') {
          return;
        }

        await page.focus('div.editor');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('', 0, 0);
        // Escape would fire here
        await page.keyboard.insertText('');

        await assertHTML(page, '<p class="editor-paragraph"><br></p>');
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });
      });
    });
  });
});
