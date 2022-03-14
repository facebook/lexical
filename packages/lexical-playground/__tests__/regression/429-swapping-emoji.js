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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> or </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
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
