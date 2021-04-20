/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTMLSnapshot,
  assertSelection,
  repeat,
} from '../utils';

describe('Regression test #231', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    it(`Does not generate segment error when editing empty text nodes`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');
      await page.keyboard.type('#foo');
      await page.waitForSelector('.editor-text-hashtag');
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
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
