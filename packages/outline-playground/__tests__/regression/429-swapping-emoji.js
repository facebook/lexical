/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection, repeat} from '../utils';

describe('Regression test #429', () => {
  initializeE2E((e2e) => {
    it(`Can add new lines before the line with emoji`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type(':) or :(');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span></span><span class="emoji happysmile">🙂</span><span> or </span><span class="emoji unhappysmile">🙁</span><span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 4, 0],
        anchorOffset: 0,
        focusPath: [0, 4, 0],
        focusOffset: 0,
      });

      await repeat(6, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span><br></span></p><p class="editor-paragraph" dir="ltr"><span></span><span class="emoji happysmile">🙂</span><span> or </span><span class="emoji unhappysmile">🙁</span><span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span></span><span class="emoji happysmile">🙂</span><span> or </span><span class="emoji unhappysmile">🙁</span><span></span></p>',
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
