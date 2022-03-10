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
  waitForSelector,
} from '../utils';

describe('Regression test #231', () => {
  initializeE2E((e2e) => {
    it(`Does not generate segment error when editing empty text nodes`, async () => {
      const {page} = e2e;
      await focusEditor(page);
      await page.keyboard.type('#foo');
      await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
      await repeat(4, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.type('a');
      await page.keyboard.press('Backspace');
      await repeat(4, async () => {
        await page.keyboard.press('ArrowRight');
      });
      await repeat(5, async () => {
        await page.keyboard.press('Backspace');
      });
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
  });
});
