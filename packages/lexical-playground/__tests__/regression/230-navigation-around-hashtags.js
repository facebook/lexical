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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span class="PlaygroundEditorTheme__hashtag bx9fcus2 o5sf49vg" data-lexical-text="true">#foo</span></p>',
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
