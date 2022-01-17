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
  focusEditor,
  waitForSelector,
  click,
  repeat,
} from '../utils';
import {moveToLineEnd, selectAll} from '../keyboardShortcuts';

describe('Regression test #1083', () => {
  initializeE2E((e2e) => {
    it(`Backspace with ElementNode at the front of the paragraph`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }
      if (process.env.E2E_EVENTS_MODE === 'legacy-events') {
        // TODO #1099
        return;
      }
      await focusEditor(page);

      await page.keyboard.type('Hello');
      await selectAll(page);
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await moveToLineEnd(page);
      await page.keyboard.type('World');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true">World</span></p>',
      );

      await selectAll(page);
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><br></p>',
      );
    });

    it(`Backspace with ElementNode at the front of the selection`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }
      if (process.env.E2E_EVENTS_MODE === 'legacy-events') {
        // TODO #1099
        return;
      }
      await focusEditor(page);

      await page.keyboard.type('Say');

      await page.keyboard.type('Hello');
      await page.keyboard.down('Shift');
      await repeat('Hello'.length, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.up('Shift');
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await moveToLineEnd(page);
      await page.keyboard.type('World');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Say</span><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true">World</span></p>',
      );

      await page.keyboard.down('Shift');
      await repeat('HelloWorld'.length, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.up('Shift');
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Say</span></p>',
      );
    });
  });
});
