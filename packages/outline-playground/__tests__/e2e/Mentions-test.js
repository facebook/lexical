/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTMLSnapshot, assertSelection} from '../utils';

describe('Mentions', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    it(`Can enter the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTMLSnapshot(page);

      await page.keyboard.press('Enter');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });

    it(`Can enter and delete part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTMLSnapshot(page);

      await page.keyboard.press('Enter');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
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

    it(`Can enter and backspace part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTMLSnapshot(page);

      await page.keyboard.press('Enter');
      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('Backspace');
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
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
