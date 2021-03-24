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
} from './utils';

describe('Hashtags', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    it(`Can handle a single hashtag`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('#yolo');

      await page.waitForSelector('.editor-text-hashtag');

      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });

      await page.keyboard.press('Backspace');
      await page.keyboard.type('once');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await repeat(10, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.press('Delete');
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
