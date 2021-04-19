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
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  repeat,
  focusEditor,
} from '../utils';

describe('TextFormatting', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    e2e.flaky(['webkit'], () => {
      it(`Can create bold text using the shortcut`, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type(' World');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0],
          focusOffset: 6,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type('!');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      });

      it(`Can create italic text using the shortcut`, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type(' World');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0],
          focusOffset: 6,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type('!');
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      });

      it(`Can select text and boldify it with the shortcut`, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello world!');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.down('Shift');
        await repeat(5, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await page.keyboard.up('Shift');
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 11,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      });

      it(`Can select text and italicify it with the shortcut`, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello world!');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.down('Shift');
        await repeat(5, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await page.keyboard.up('Shift');
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 11,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      });

      it(`Can select multiple text parts and format them with shortcuts`, async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello world!');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.down('Shift');
        await repeat(5, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await page.keyboard.up('Shift');
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 11,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Shift');
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 1,
          focusPath: [0, 1, 0],
          focusOffset: 3,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0],
          focusOffset: 2,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0],
          focusOffset: 2,
        });

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.down('Shift');
        await repeat(5, async () => {
          await page.keyboard.press('ArrowRight');
        });
        await page.keyboard.up('Shift');
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 3, 0],
          focusOffset: 2,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 2, 0],
          focusOffset: 2,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTMLSnapshot(page);
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      });
    });
  });
});
