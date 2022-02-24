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
  repeat,
  focusEditor,
} from '../utils';

describe('Regression test #429', () => {
  initializeE2E((e2e) => {
    it(`Can add new lines before the line with emoji`, async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);
      await page.keyboard.type(':) or :(');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙁</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 2, 0, 0],
        focusOffset: 2,
      });

      await repeat(6, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.press('Enter');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙁</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0, 0],
          anchorOffset: 0,
          focusPath: [1, 0, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><br><span class="emoji happysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙁</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0, 0],
          focusOffset: 0,
        });
      }

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span style="clip-path: circle(0% at 50% 50%);">🙁</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
