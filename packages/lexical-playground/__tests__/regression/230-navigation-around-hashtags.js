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

describe('Regression test #230', () => {
  initializeE2E((e2e) => {
    it(`Is able to right arrow before hashtag after inserting text node`, async () => {
      const {page} = e2e;
      await focusEditor(page);
      await page.keyboard.type('#foo');
      await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
      await repeat(4, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.type('a');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('ArrowRight');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });
    });
  });
});
