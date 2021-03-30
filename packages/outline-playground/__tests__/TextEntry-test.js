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
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  copyToClipboard,
  pasteFromClipboard,
  keyDownCtrlOrAlt,
  keyUpCtrlOrAlt,
} from './utils';

describe('TextEntry', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    describe(`Rich text`, () => {
      it(`Can type 'Hello Outline' in the editor`, async () => {
        const {page} = e2e;

        const targetText = 'Hello Outline';
        await page.focus('div.editor');
        await page.keyboard.type(targetText);
        const enteredText = await page.textContent(
          'div.editor p:first-of-type',
        );
        expect(enteredText).toBe(targetText);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: targetText.length,
          focusPath: [0, 0, 0],
          focusOffset: targetText.length,
        });
      });

      it('Paragraphed text entry and selection', async () => {
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

      it(`Can delete characters after they're typed`, async () => {
        const {page} = e2e;

        await page.focus('div.editor');
        const text = 'Delete some of these characters.';
        const backspacedText = 'Delete some of these characte';
        await page.keyboard.type(text);
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        const remainingText = await page.textContent(
          'div.editor p:first-of-type',
        );
        expect(remainingText).toBe(backspacedText);

        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: backspacedText.length,
          focusPath: [0, 0, 0],
          focusOffset: backspacedText.length,
        });
      });

      // This test fails locally on Mac but seems to pass on CI.
      // Seems related to a bug in Playwright:
      // https://github.com/microsoft/playwright/issues/5929#issuecomment-805734335
      e2e.skip(['firefox-mac'], () => {
        it(`Can select and delete a word`, async () => {
          const {page} = e2e;

          await page.focus('div.editor');
          const text = 'Delete some of these characters.';
          const backspacedText = 'Delete some of these ';
          await page.keyboard.type(text);
          await keyDownCtrlOrAlt(page);
          await page.keyboard.down('Shift');
          await page.keyboard.press('ArrowLeft');
          await page.keyboard.up('Shift');
          await keyUpCtrlOrAlt(page);
          // Ensure the selection is now covering the whole word and period.
          await assertSelection(page, {
            anchorPath: [0, 0, 0],
            anchorOffset: text.length,
            focusPath: [0, 0, 0],
            focusOffset: backspacedText.length,
          });

          await page.keyboard.press('Backspace');
          const remainingText = await page.textContent(
            'div.editor p:first-of-type',
          );
          expect(remainingText).toBe(backspacedText);

          await assertSelection(page, {
            anchorPath: [0, 0, 0],
            anchorOffset: backspacedText.length,
            focusPath: [0, 0, 0],
            focusOffset: backspacedText.length,
          });
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
          anchorOffset: 0,
          focusPath: [1, 0, 0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowLeft');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowRight');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 0,
          focusPath: [1, 0, 0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowLeft');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });

        // Remove paragraph
        await page.keyboard.press('Delete');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });

        // Add line break
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowLeft');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });

        // Remove line break
        await page.keyboard.press('Delete');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
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
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('a');
        await keyUpCtrlOrMeta(page);
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
