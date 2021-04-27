/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTMLSnapshot, assertSelection} from '../utils';

describe('Regression test #221', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    it(`Can handle space in hashtag`, async () => {
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

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });
    });

    it(`Can handle delete in hashtag`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('#yolo ');
      await page.waitForSelector('.editor-text-hashtag');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });

    it(`Can handle backspace into hashtag`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('#yolo ');
      await page.waitForSelector('.editor-text-hashtag');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });
    });
  });
});
