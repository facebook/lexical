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

describe('Emoticons', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    it(`Can handle a single emoticon`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('This is an emoji :)');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 17,
        focusPath: [0, 0, 0],
        focusOffset: 17,
      });

      await page.keyboard.type(':)');
      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 17,
        focusPath: [0, 0, 0],
        focusOffset: 17,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 17,
        focusPath: [0, 0, 0],
        focusOffset: 17,
      });
    });

    it(`Can enter mutliple emoticons`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type(':) :) <3 :(');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 8, 0],
        anchorOffset: 1,
        focusPath: [0, 8, 0],
        focusOffset: 1,
      });

      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 10, 0],
        anchorOffset: 0,
        focusPath: [0, 10, 0],
        focusOffset: 0,
      });

      await page.keyboard.type(':) :) <3 :(');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 18, 0],
        anchorOffset: 1,
        focusPath: [0, 18, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Enter');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.type(':) :) <3 :(');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [1, 8, 0],
        anchorOffset: 1,
        focusPath: [1, 8, 0],
        focusOffset: 1,
      });

      await repeat(23, async () => await page.keyboard.press('Backspace'));
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.type(':):):):):)');
      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 8, 0],
        anchorOffset: 1,
        focusPath: [0, 8, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 1,
        focusPath: [0, 6, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 4, 0],
        anchorOffset: 1,
        focusPath: [0, 4, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
