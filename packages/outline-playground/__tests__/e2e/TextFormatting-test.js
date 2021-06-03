/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  repeat,
} from '../utils';

describe('TextFormatting', () => {
  initializeE2E((e2e) => {
    it(`Can create bold text using the shortcut`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Hello');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await page.keyboard.type(' World');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello</span><strong class="editor-text-bold"> World</strong></p>',
      );
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello</span><strong class="editor-text-bold"> World</strong><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });

    it(`Can create italic text using the shortcut`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Hello');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('i');
      await keyUpCtrlOrMeta(page);
      await page.keyboard.type(' World');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello</span><em class="editor-text-italic"> World</em></p>',
      );
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello</span><em class="editor-text-italic"> World</em><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });

    it(`Can select text and boldify it with the shortcut`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><strong class="editor-text-bold">world</strong><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });

    it(`Can select text and italicify it with the shortcut`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><em class="editor-text-italic">world</em><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('i');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });

    it(`Can select multiple text parts and format them with shortcuts`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><strong class="editor-text-bold">world</strong><span>!</span></p>',
      );
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
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><strong class="editor-text-bold">w</strong><strong class="editor-text-bold editor-text-italic">or</strong><strong class="editor-text-bold">ld</strong><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 2,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><strong class="editor-text-bold">w</strong><em class="editor-text-italic">or</em><strong class="editor-text-bold">ld</strong><span>!</span></p>',
      );
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
        focusPath: [0, 4, 0],
        focusOffset: 0,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello w</span><em class="editor-text-italic">or</em><span>ld!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 2, 0],
        focusOffset: 2,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('i');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello </span><em class="editor-text-italic">world</em><span>!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('i');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });
  });
});
