/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineBeginning} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  repeat,
  E2E_BROWSER,
  focusEditor,
  waitForSelector,
  selectOption,
  click,
} from '../utils';

describe('TextFormatting', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      `Can create bold text using the shortcut`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type(' World');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true"> World</strong></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true"> World</strong><span data-lexical-text="true">!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create italic text using the shortcut`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('Hello');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await page.keyboard.type(' World');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true"> World</em></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true"> World</em><span data-lexical-text="true">!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select text and boldify it with the shortcut`,
      async () => {
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
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">world</strong><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Should not format the text in the subsequent paragraph after a triple click selection event.',
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('hello world');
        await page.keyboard.press('Enter');
        await page.keyboard.type('hello world');

        await click(page, 'div[contenteditable="true"] > p', {
          clickCount: 1,
          delay: 100,
        });
        await click(page, 'div[contenteditable="true"] > p', {
          clickCount: 2,
          delay: 100,
        });
        await click(page, 'div[contenteditable="true"] > p', {
          clickCount: 3,
          delay: 100,
        });

        await keyDownCtrlOrMeta(page);
        await page.keyboard.type('b');
        await keyUpCtrlOrMeta(page);
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">hello world</strong></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">hello world</span></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select text and italicify it with the shortcut`,
      async () => {
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
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">world</em><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select text and underline+strikethrough`,
      async () => {
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
        await page.keyboard.press('u');
        await keyUpCtrlOrMeta(page);
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true">world</span><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world!</span></p>',
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

        await waitForSelector(page, '.strikethrough');
        await click(page, '.strikethrough');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span class="PlaygroundEditorTheme__textUnderlineStrikethrough" data-lexical-text="true">world</span><span data-lexical-text="true">!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await waitForSelector(page, '.strikethrough');
        await click(page, '.strikethrough');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true">world</span><span data-lexical-text="true">!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select text and change the font-size`,
      async () => {
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

        await waitForSelector(page, '.font-size');
        await selectOption(page, '.font-size', {value: '10px'});

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span data-lexical-text="true" style="font-size: 10px;">world</span><span data-lexical-text="true">!</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select text and change the font-size and font-family`,
      async () => {
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

        await waitForSelector(page, '.font-size');
        await selectOption(page, '.font-size', {value: '10px'});

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span data-lexical-text="true" style="font-size: 10px;">world</span><span data-lexical-text="true">!</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await waitForSelector(page, '.font-family');
        await selectOption(page, '.font-family', {value: 'Georgia'});

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span data-lexical-text="true" style="font-size: 10px; font-family: Georgia;">world</span><span data-lexical-text="true">!</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });

        await waitForSelector(page, '.font-size');
        await selectOption(page, '.font-size', {value: '20px'});

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><span data-lexical-text="true" style="font-size: 20px; font-family: Georgia;">world</span><span data-lexical-text="true">!</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0],
          focusOffset: 5,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can select multiple text parts and format them with shortcuts`,
      async () => {
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
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">world</strong><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">w</strong><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic" data-lexical-text="true">or</strong><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">ld</strong><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">w</strong><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">or</em><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">ld</strong><span data-lexical-text="true">!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello w</span><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">or</em><span data-lexical-text="true">ld!</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">world</em><span data-lexical-text="true">!</span></p>',
        );

        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorPath: [0, 1, 0],
            anchorOffset: 0,
            focusPath: [0, 1, 0],
            focusOffset: 5,
          });
        } else {
          await assertSelection(page, {
            anchorPath: [0, 0, 0],
            anchorOffset: 6,
            focusPath: [0, 1, 0],
            focusOffset: 5,
          });
        }

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('i');
        await keyUpCtrlOrMeta(page);
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can insert range of formatted text and select part and replace with character`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('123');

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);

        await page.keyboard.type('456');

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);

        await page.keyboard.type('789');

        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');

        await page.keyboard.type('abc');

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);

        await page.keyboard.type('def');

        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);

        await page.keyboard.type('ghi');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">123</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">456</strong><span data-lexical-text="true">789</span><br><span data-lexical-text="true">abc</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">def</strong><span data-lexical-text="true">ghi</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 6, 0],
          anchorOffset: 3,
          focusPath: [0, 6, 0],
          focusOffset: 3,
        });

        await page.keyboard.press('ArrowUp');
        await moveToLineBeginning(page);

        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowDown');
        await repeat(8, async () => {
          await page.keyboard.press('ArrowRight');
        });
        await page.keyboard.down('Shift');

        await page.keyboard.type('c');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">12c</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 3,
          focusPath: [0, 0, 0],
          focusOffset: 3,
        });
      },
    );
  });
});
