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
  assertSnapshot,
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
        await page.keyboard.up('Shift');
        await page.keyboard.type('paragraph.');
        await page.keyboard.type(' :)');

        await assertSnapshot(page);
      });

      it('Empty paragraph and new line node selection', async () => {
        const {page} = e2e;

        await page.focus('div.editor');

        // Add paragraph
        await page.keyboard.press('Enter');
        await assertSnapshot(page);

        await page.keyboard.press('ArrowLeft');
        await assertSnapshot(page);

        // Remove paragraph
        await page.keyboard.press('Delete');
        await assertSnapshot(page);

        // Add line break
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
        await assertSnapshot(page);

        await page.keyboard.press('ArrowLeft');
        await assertSnapshot(page);

        // Remove line break
        await page.keyboard.press('Delete');
        await assertSnapshot(page);
      });

      it.only('Basic Copy + paste', async () => {
        const {page} = e2e;

        await new Promise((resolve) => {
          setTimeout(resolve, 4000);
        });

        await page.focus('div.editor');

        // Add paragraph
        await page.keyboard.type('Copy + pasting?');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Sounds good!');
        await assertSnapshot(page);

        // Select all the text
        await pressDownCtrlOrMeta(page);
        await page.keyboard.press('a');
        await pressUpCtrlOrMeta(page);
        await assertSnapshot(page);

        // Copy all the text
        const clipboard = await copyToClipboard(page);
        await assertSnapshot(page);

        // Paste after
        await page.keyboard.press('ArrowRight');
        await pasteFromClipboard(page, clipboard);
        await assertSnapshot(page);
      });
    });
  });
});
