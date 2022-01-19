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
  focusEditor,
} from '../utils';

describe('Regression test #1113', () => {
  initializeE2E((e2e) => {
    it(`Selects new line when inserting a new line at the end of a link`, async () => {
      const {isRichText, page} = e2e;
      if (isRichText || process.env.E2E_EVENTS_MODE === 'legacy-events') {
        // Legacy events are so broken..
        return;
      }
      await focusEditor(page);

      await page.keyboard.type('https://www.example.com');
      await page.keyboard.press('Enter');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><a href="https://www.example.com" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">https://www.example.com</span></a><br><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 2,
        focusPath: [0],
        focusOffset: 2,
      });
    });
  });
});
