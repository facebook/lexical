/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts';
import {
  initializeE2E,
  repeat,
  assertSelection,
  assertHTML,
  keyDownCtrlOrAlt,
  keyUpCtrlOrAlt,
  focusEditor,
  E2E_BROWSER,
} from '../utils';

describe('TextEntry', () => {
  initializeE2E((e2e) => {
    it(`Can type 'Hello Lexical' in the editor`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Lexical';
      await focusEditor(page);
      await page.keyboard.type(targetText);
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello Lexical</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: targetText.length,
        focusPath: [0, 0, 0],
        focusOffset: targetText.length,
      });
    });

    it(`Can type 'Hello Lexical' in the editor and replace it with foo`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Lexical';
      await focusEditor(page);
      await page.keyboard.type(targetText);

      // Select all the text
      await selectAll(page);

      await page.keyboard.type('Foo');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
    });

    it(`Can type 'Hello Lexical' in the editor and replace it with an empty space`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Lexical';
      await focusEditor(page);
      await page.keyboard.type(targetText);

      // Select all the text
      await selectAll(page);

      await page.keyboard.type(' ');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true"> </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });
    });

    it('Paragraphed text entry and selection', async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('Hello World.');
      await page.keyboard.press('Enter');
      await page.keyboard.type('This is another block.');
      await page.keyboard.down('Shift');
      await repeat(6, async () => await page.keyboard.down('ArrowLeft'));
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 22,
          focusPath: [1, 0, 0],
          focusOffset: 16,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 22,
          focusPath: [0, 2, 0],
          focusOffset: 16,
        });
      }

      await page.keyboard.up('Shift');
      await page.keyboard.type('paragraph.');
      await page.keyboard.type(' :)');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello World.</span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">This is another paragraph. </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 1, 0, 0],
          anchorOffset: 2,
          focusPath: [1, 1, 0, 0],
          focusOffset: 2,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello World.</span><br><span data-lexical-text="true">This is another paragraph. </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 3, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 3, 0, 0],
          focusOffset: 2,
        });
      }
    });

    it(`Can delete characters after they're typed`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      const text = 'Delete some of these characters.';
      const backspacedText = 'Delete some of these characte';
      await page.keyboard.type(text);
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Delete some of these characte</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: backspacedText.length,
        focusPath: [0, 0, 0],
        focusOffset: backspacedText.length,
      });
    });

    it(`Can type characters, and select and replace a part`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      const text = 'Hello foobar.';
      await page.keyboard.type(text);
      await repeat(7, async () => await page.keyboard.down('ArrowLeft'));
      await page.keyboard.down('Shift');
      await repeat(3, async () => await page.keyboard.down('ArrowRight'));
      await page.keyboard.up('Shift');
      await page.keyboard.type('lol');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello lolbar.</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });
    });

    it(`Can select and delete a word`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      const text = 'Delete some of these characters.';
      const backspacedText = 'Delete some of these ';
      await page.keyboard.type(text);
      await keyDownCtrlOrAlt(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowLeft');
      // Chrome stops words on punctuation, so we need to trigger
      // the left arrow key one more time.
      if (E2E_BROWSER === 'chromium') {
        await page.keyboard.press('ArrowLeft');
      }
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

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Delete some of these </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: backspacedText.length,
        focusPath: [0, 0, 0],
        focusOffset: backspacedText.length,
      });
    });

    it('First paragraph backspace handling', async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);

      // Add some trimmable text
      await page.keyboard.type('  ');

      // Add paragraph
      await page.keyboard.press('Enter');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">  </span></p><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">  </span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 2,
          focusPath: [0],
          focusOffset: 2,
        });
      }

      // Move to previous paragraph and press backspace
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Backspace');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">  </span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });
      }
    });

    it('Mix of paragraphs and break points', async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);

      // Add some line breaks
      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br><br><br><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 3,
        focusPath: [0],
        focusOffset: 3,
      });

      // Move to top
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Add paragraph
      await page.keyboard.press('Enter');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph"><br><br><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br><br><br><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });
      }

      await page.keyboard.press('ArrowUp');
      await page.keyboard.type('هَ');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">هَ</span></p><p class="PlaygroundEditorTheme__paragraph"><br><br><br><br></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__rtl" dir="rtl"><span data-lexical-text="true">هَ</span><br><br><br><br><br></p>',
        );
      }

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });
    });

    it('Empty paragraph and new line node selection', async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);

      // Add paragraph
      await page.keyboard.press('Enter');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });
      }

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });
      }

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Remove paragraph
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Add line break
      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 1,
        focusPath: [0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Remove line break
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });
    });
  });
});
