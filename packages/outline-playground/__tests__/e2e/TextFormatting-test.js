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
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');
      await page.keyboard.type('Hello');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await page.keyboard.type(' World');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span><strong class="editor-text-bold" data-outline-text="true"> World</strong></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span><strong class="editor-text-bold" data-outline-text="true"> World</strong><span data-outline-text="true">!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });

    it(`Can create italic text using the shortcut`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');
      await page.keyboard.type('Hello');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('i');
      await keyUpCtrlOrMeta(page);
      await page.keyboard.type(' World');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span><em class="editor-text-italic" data-outline-text="true"> World</em></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span><em class="editor-text-italic" data-outline-text="true"> World</em><span data-outline-text="true">!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });

    it(`Can select text and boldify it with the shortcut`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><strong class="editor-text-bold" data-outline-text="true">world</strong><span data-outline-text="true">!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });

    it(`Can select text and italicify it with the shortcut`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><em class="editor-text-italic" data-outline-text="true">world</em><span data-outline-text="true">!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });

    it(`Can select text and underline+strikethrough`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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
      await page.keyboard.press('u');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span class="editor-text-underline" data-outline-text="true">world</span><span data-outline-text="true">!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('u');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('u');
      await keyUpCtrlOrMeta(page);

      await page.waitForSelector('.strikethrough');
      await page.click('.strikethrough');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span class="editor-text-underlineStrikethrough" data-outline-text="true">world</span><span data-outline-text="true">!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await page.waitForSelector('.strikethrough');
      await page.click('.strikethrough');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span class="editor-text-underline" data-outline-text="true">world</span><span data-outline-text="true">!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });
    });

    it(`Can select text and change the font-size`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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

      await page.waitForSelector('.font-size');
      await page.selectOption('.font-size', {value: '10px'});

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span data-outline-text="true" style="font-size: 10px;">world</span><span data-outline-text="true">!</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });
    });

    it(`Can select text and change the font-size and font-family`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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

      await page.waitForSelector('.font-size');
      await page.selectOption('.font-size', {value: '10px'});

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span data-outline-text="true" style="font-size: 10px;">world</span><span data-outline-text="true">!</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await page.waitForSelector('.font-family');
      await page.selectOption('.font-family', {value: 'Georgia'});

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span data-outline-text="true" style="font-size: 10px; font-family: Georgia;">world</span><span data-outline-text="true">!</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await page.waitForSelector('.font-size');
      await page.selectOption('.font-size', {value: '20px'});

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><span data-outline-text="true" style="font-size: 20px; font-family: Georgia;">world</span><span data-outline-text="true">!</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });
    });

    it(`Can select multiple text parts and format them with shortcuts`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><strong class="editor-text-bold" data-outline-text="true">world</strong><span data-outline-text="true">!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><strong class="editor-text-bold" data-outline-text="true">w</strong><strong class="editor-text-bold editor-text-italic" data-outline-text="true">or</strong><strong class="editor-text-bold" data-outline-text="true">ld</strong><span data-outline-text="true">!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><strong class="editor-text-bold" data-outline-text="true">w</strong><em class="editor-text-italic" data-outline-text="true">or</em><strong class="editor-text-bold" data-outline-text="true">ld</strong><span data-outline-text="true">!</span></p>',
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
        focusPath: [0, 3, 0],
        focusOffset: 2,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello w</span><em class="editor-text-italic" data-outline-text="true">or</em><span data-outline-text="true">ld!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span><em class="editor-text-italic" data-outline-text="true">world</em><span data-outline-text="true">!</span></p>',
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world!</span></p>',
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
