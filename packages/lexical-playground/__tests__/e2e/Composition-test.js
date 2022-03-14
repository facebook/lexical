/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineBeginning} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertSelection,
  assertHTML,
  E2E_BROWSER,
  repeat,
  focusEditor,
  waitForSelector,
} from '../utils';

describe('Composition', () => {
  initializeE2E((e2e) => {
    it('Handles Hiragana characters', async () => {
      const {page} = e2e;

      await focusEditor(page);

      await page.keyboard.type('も');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">も</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">もじ</span></p>',
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

      await focusEditor(page);

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">هَ</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">ه</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">هَ</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">ه</span></p>',
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

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">すし もじあ</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });
      });

      it('Can type Hiragana via IME between line breaks', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');

        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');

        await page.keyboard.press('ArrowLeft');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><br><span data-lexical-text="true">すし もじあ</span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0],
          focusOffset: 6,
        });
      });

      it('Can type Hiragana via IME between emojis', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.type(':):)');

        await page.keyboard.press('ArrowLeft');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true">すし もじあ</span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0],
          focusOffset: 6,
        });

        await repeat(6, async () => {
          await page.keyboard.press('Backspace');
        });

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0, 0],
          focusOffset: 2,
        });

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('', 0, 0);
        // Escape would fire here
        await page.keyboard.insertText('');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0, 0],
          focusOffset: 2,
        });
      });

      it('Can type Hiragana via IME at the end of a mention', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.type('Luke');
        await waitForSelector(page, '#mentions-typeahead ul li');
        await page.keyboard.press('Enter');

        await waitForSelector(page, '.mention');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true">すし もじあ</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0],
          focusOffset: 6,
        });
      });

      it('Can type Hiragana via IME part way through a mention', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.type('Luke');
        await waitForSelector(page, '#mentions-typeahead ul li');
        await page.keyboard.press('Enter');

        await waitForSelector(page, '.mention');

        await repeat(9, async () => {
          await page.keyboard.press('ArrowLeft');
        });

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');
        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Luke すし もじあSkywalker</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 11,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      });

      it('Can type Hiragana via IME with hashtags', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.type('#');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');

        await page.keyboard.type(' ');
        await page.keyboard.imeSetComposition('m', 1, 1);
        await page.keyboard.imeSetComposition('も', 1, 1);
        await page.keyboard.imeSetComposition('もj', 2, 2);
        await page.keyboard.imeSetComposition('もじ', 2, 2);
        await page.keyboard.imeSetComposition('もじあ', 3, 3);
        await page.keyboard.insertText('もじあ');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#すし</span><span data-lexical-text="true"> もじあ</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 4,
          focusPath: [0, 1, 0],
          focusOffset: 4,
        });

        await moveToLineBeginning(page);

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.insertText('すし');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">すし#すし もじあ</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0],
          focusOffset: 2,
        });
      });

      it('Can type, delete and cancel Hiragana via IME', async () => {
        const {page} = e2e;

        // We don't yet support FF.
        if (E2E_BROWSER === 'firefox') {
          return;
        }

        await focusEditor(page);

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('', 0, 0);
        // Escape would fire here
        await page.keyboard.insertText('');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.type(' ');
        await page.keyboard.press('ArrowLeft');

        await page.keyboard.imeSetComposition('ｓ', 1, 1);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('すｓ', 2, 2);
        await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
        await page.keyboard.imeSetComposition('すし', 2, 2);
        await page.keyboard.imeSetComposition('す', 1, 1);
        await page.keyboard.imeSetComposition('', 0, 0);
        // Escape would fire here
        await page.keyboard.insertText('');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true"> </span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });
      });
    });
  });
});
