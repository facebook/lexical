/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  repeat,
  assertSelection,
  assertHTMLSnapshot,
  pressDownCtrlOrMeta,
  pressUpCtrlOrMeta,
  copyToClipboard,
  pasteFromClipboard,
} from './utils';

describe('BasicTextEntry', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    describe(`Rich text`, () => {
      it('Simple text entry and selection', async () => {
        const {page} = e2e;

        await page.focus('div.editor');
        await page.keyboard.type('Hello World.');
        await page.keyboard.press('Enter');
        await page.keyboard.type('This is another block.');
        await page.keyboard.down('Shift');
        await repeat(6, async () => await page.keyboard.down('ArrowLeft'));
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 22,
          focusPath: [1, 0, 0],
          focusOffset: 16,
        });

        await page.keyboard.up('Shift');
        await page.keyboard.type('paragraph.');
        await page.keyboard.type(' :)');

        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [1, 2, 0],
          anchorOffset: 1,
          focusPath: [1, 2, 0],
          focusOffset: 1,
        });
      });

      it('Empty paragraph and new line node selection', async () => {
        const {page} = e2e;

        await page.focus('div.editor');

        // Add paragraph
        await page.keyboard.press('Enter');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 1,
          focusPath: [1, 0, 0],
          focusOffset: 1,
        });

        await page.keyboard.press('ArrowLeft');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });

        // Remove paragraph
        await page.keyboard.press('Delete');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });

        // Add line break
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });

        await page.keyboard.press('ArrowLeft');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });

        // Remove line break
        await page.keyboard.press('Delete');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });
      });

      it('Basic copy + paste', async () => {
        const {page} = e2e;

        await page.focus('div.editor');

        // Add paragraph
        await page.keyboard.type('Copy + pasting?');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Sounds good!');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [2, 0, 0],
          anchorOffset: 12,
          focusPath: [2, 0, 0],
          focusOffset: 12,
        });

        // Select all the text
        await pressDownCtrlOrMeta(page);
        await page.keyboard.press('a');
        await pressUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [2, 0, 0],
          focusOffset: 12,
        });

        // Copy all the text
        const clipboard = await copyToClipboard(page);
        await assertHTMLSnapshot(page);

        // Paste after
        await page.keyboard.press('ArrowRight');
        await pasteFromClipboard(page, clipboard);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [4, 0, 0],
          anchorOffset: 12,
          focusPath: [4, 0, 0],
          focusOffset: 12,
        });
      });
    });
  });
});
