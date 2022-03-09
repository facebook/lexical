/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  IS_WINDOWS,
  E2E_BROWSER,
  repeat,
  waitForSelector,
  focusEditor,
} from '../utils';
import {deleteNextWord, moveToEditorBeginning} from '../keyboardShortcuts';

describe('Mentions', () => {
  initializeE2E((e2e) => {
    it(`Can enter the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await waitForSelector(page, '#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Luke</span></p>',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });

      await waitForSelector(page, '.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 13,
        focusPath: [0, 0, 0],
        focusOffset: 13,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });
    });

    it(`Can enter and delete part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await waitForSelector(page, '#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Luke</span></p',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });

      await waitForSelector(page, '.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 13,
        focusPath: [0, 0, 0],
        focusOffset: 13,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
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
    });

    it(`Can enter and backspace part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await waitForSelector(page, '#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Luke</span></p>',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });

      await waitForSelector(page, '.mention');

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
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

      await page.keyboard.type('abc  def');

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">abc  def</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.keyboard.type('Luke');

      await waitForSelector(page, '#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">abc Luke def</span></p>',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">abc </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> def</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 14,
        focusPath: [0, 1, 0],
        focusOffset: 14,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">abc </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke</span><span data-lexical-text="true"> def</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 4,
        focusPath: [0, 1, 0],
        focusOffset: 4,
      });
    });

    it(`Can enter multiple Luke Skywalker mentions and then delete them from start`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await waitForSelector(page, '#mentions-typeahead ul li');
      await page.keyboard.press('Enter');

      await waitForSelector(page, '.mention');

      await page.keyboard.type(' ');

      await page.keyboard.type('Luke');

      await waitForSelector(page, '#mentions-typeahead ul li');
      await page.keyboard.press('Enter');

      await waitForSelector(page, '.mention:nth-child(1)');

      await page.keyboard.type(' ');

      await page.keyboard.type('Luke');

      await waitForSelector(page, '#mentions-typeahead ul li');
      await page.keyboard.press('Enter');

      await waitForSelector(page, '.mention:nth-child(3)');

      await page.keyboard.type(' ');

      await page.keyboard.type('Luke');

      await waitForSelector(page, '#mentions-typeahead ul li');
      await page.keyboard.press('Enter');

      await waitForSelector(page, '.mention:nth-child(5)');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 14,
        focusPath: [0, 6, 0],
        focusOffset: 14,
      });

      await moveToEditorBeginning(page);

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await deleteNextWord(page);

      if (IS_WINDOWS && E2E_BROWSER === 'chromium') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Skywalker </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true"> Skywalker </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      }
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await deleteNextWord(page);
      if (IS_WINDOWS && E2E_BROWSER === 'chromium') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      }
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await deleteNextWord(page);
      if (IS_WINDOWS && E2E_BROWSER === 'chromium') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Skywalker </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true"> Skywalker </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> </span><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
        );
      }
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await deleteNextWord(page);
      await deleteNextWord(page);
      await deleteNextWord(page);
      await deleteNextWord(page);
      await deleteNextWord(page);

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
    });

    it(`Can enter a mention then delete it and partially remove text after`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await waitForSelector(page, '#mentions-typeahead ul li');
      await page.keyboard.press('Enter');

      await waitForSelector(page, '.mention');

      await page.keyboard.type(' foo bar');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="mention" data-lexical-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-lexical-text="true"> foo bar</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 8,
        focusPath: [0, 1, 0],
        focusOffset: 8,
      });

      await repeat(4, async () => {
        await page.keyboard.press('ArrowLeft');
      });

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 4,
        focusPath: [0, 1, 0],
        focusOffset: 4,
      });

      await page.keyboard.down('Shift');
      await repeat(18, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.up('Shift');

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true"> bar</span></p>',
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
