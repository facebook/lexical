/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

 import {initializeE2E, assertSelection, assertHTML} from '../utils';

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

      await assertHTML(
        page,
        '<p class="editor-paragraph"><br></p>',
      );
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
   })
})