/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToPrevWord} from '../keyboardShortcuts';
import {
  initializeE2E,
  repeat,
  assertSelection,
  assertHTML,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  copyToClipboard,
  pasteFromClipboard,
  keyDownCtrlOrAlt,
  keyUpCtrlOrAlt,
  E2E_BROWSER,
  IS_LINUX,
} from '../utils';

describe('TextEntry', () => {
  initializeE2E((e2e) => {
    it(`Can type 'Hello Outline' in the editor`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Outline';
      await page.focus('div.editor');
      await page.keyboard.type(targetText);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello Outline</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: targetText.length,
        focusPath: [0, 0, 0],
        focusOffset: targetText.length,
      });
    });

    it(`Can type 'Hello Outline' in the editor and replace it with foo`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Outline';
      await page.focus('div.editor');
      await page.keyboard.type(targetText);

      // Select all the text
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type('Foo');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
    });

    it(`Can type 'Hello Outline' in the editor and replace it with an empty space`, async () => {
      const {page} = e2e;

      const targetText = 'Hello Outline';
      await page.focus('div.editor');
      await page.keyboard.type(targetText);

      // Select all the text
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type(' ');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true"> </span></p>',
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

      await page.focus('div.editor');
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
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello World.</span></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">This is another paragraph. </span><span class="emoji happysmile" data-outline-text="true">🙂</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 1, 0],
          anchorOffset: 2,
          focusPath: [1, 1, 0],
          focusOffset: 2,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello World.</span><br><span data-outline-text="true">This is another paragraph. </span><span class="emoji happysmile" data-outline-text="true">🙂</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 3, 0],
          anchorOffset: 2,
          focusPath: [0, 3, 0],
          focusOffset: 2,
        });
      }
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

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Delete some of these characte</span></p>',
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

      await page.focus('div.editor');
      const text = 'Hello foobar.';
      await page.keyboard.type(text);
      await repeat(7, async () => await page.keyboard.down('ArrowLeft'));
      await page.keyboard.down('Shift');
      await repeat(3, async () => await page.keyboard.down('ArrowRight'));
      await page.keyboard.up('Shift');
      await page.keyboard.type('lol');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello lolbar.</span></p>',
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

      await page.focus('div.editor');
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
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Delete some of these </span></p>',
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

      await page.focus('div.editor');

      // Add some trimmable text
      await page.keyboard.type('  ');

      // Add paragraph
      await page.keyboard.press('Enter');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">  </span></p><p class="editor-paragraph"><br></p>',
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
          '<p class="editor-paragraph"><span data-outline-text="true">  </span><br><br></p>',
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
        await assertHTML(page, '<p class="editor-paragraph"><br></p>');
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">  </span><br><br></p>',
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

      await page.focus('div.editor');

      // Add some line breaks
      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><br><br><br><br></p>',
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
          '<p class="editor-paragraph"><br></p><p class="editor-paragraph"><br><br><br><br></p>',
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
          '<p class="editor-paragraph"><br><br><br><br><br></p>',
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
          '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span></p><p class="editor-paragraph"><br><br><br><br></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span><br><br><br><br><br></p>',
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

      await page.focus('div.editor');

      // Add paragraph
      await page.keyboard.press('Enter');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph"><br></p><p class="editor-paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertHTML(page, '<p class="editor-paragraph"><br><br></p>');
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
      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
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
      await assertHTML(page, '<p class="editor-paragraph"><br><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 1,
        focusPath: [0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertHTML(page, '<p class="editor-paragraph"><br><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Remove line break
      await page.keyboard.press('Delete');
      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });
    });

    it('Handles Arabic characters with diacritics', async () => {
      const {page} = e2e;

      await page.focus('div.editor');

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">ه</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');

      await page.keyboard.type('هَ');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">هَ</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="rtl"><span data-outline-text="true">ه</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 1,
        focusPath: [0, 0, 0],
        focusOffset: 1,
      });
    });

    it('Basic copy + paste', async () => {
      const {isRichText, page} = e2e;

      await page.focus('div.editor');

      // Add paragraph
      await page.keyboard.type('Copy + pasting?');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Sounds good!');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span></p><p class="editor-paragraph" dir="ltr"><br></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [2, 0, 0],
          anchorOffset: 12,
          focusPath: [2, 0, 0],
          focusOffset: 12,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span><br><br><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 3, 0],
          anchorOffset: 12,
          focusPath: [0, 3, 0],
          focusOffset: 12,
        });
      }

      // Select all the text
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span></p><p class="editor-paragraph" dir="ltr"><br></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [2, 0, 0],
          focusOffset: 12,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span><br><br><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 3, 0],
          focusOffset: 12,
        });
      }

      // Copy all the text
      const clipboard = await copyToClipboard(page);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span></p><p class="editor-paragraph" dir="ltr"><br></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Sounds good!</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span><br><br><span data-outline-text="true">Sounds good!</span></p>',
        );
      }

      // Paste after
      await page.keyboard.press('ArrowRight');
      await pasteFromClipboard(page, clipboard);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span></p><p class="editor-paragraph" dir="ltr"><br></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Sounds good!Copy + pasting?</span></p><p class="editor-paragraph" dir="ltr"><br></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [4, 0, 0],
          anchorOffset: 12,
          focusPath: [4, 0, 0],
          focusOffset: 12,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Copy + pasting?</span><br><br><span data-outline-text="true">Sounds good!Copy + pasting?</span><br><br><span data-outline-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 6, 0],
          anchorOffset: 12,
          focusPath: [0, 6, 0],
          focusOffset: 12,
        });
      }
    });

    it(`Copy and paste between sections`, async () => {
      const {isRichText, page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Hello world #foobar test #foobar2 when #not');

      await page.keyboard.press('Enter');
      await page.keyboard.type('Next #line of #text test #foo');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 5, 0],
          anchorOffset: 4,
          focusPath: [1, 5, 0],
          focusOffset: 4,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span><br><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 12, 0],
          anchorOffset: 4,
          focusPath: [0, 12, 0],
          focusOffset: 4,
        });
      }

      // Select all the content
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);

      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [1, 5, 0],
          focusOffset: 4,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 12, 0],
          focusOffset: 4,
        });
      }

      // Copy all the text
      let clipboard = await copyToClipboard(page);
      await page.keyboard.press('Delete');
      // Paste the content
      await pasteFromClipboard(page, clipboard);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 5, 0],
          anchorOffset: 4,
          focusPath: [1, 5, 0],
          focusOffset: 4,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span><br><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 12, 0],
          anchorOffset: 4,
          focusPath: [0, 12, 0],
          focusOffset: 4,
        });
      }

      await moveToPrevWord(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowUp');
      await moveToPrevWord(page);
      // Once more for linux on Chromium
      if (IS_LINUX && E2E_BROWSER === 'chromium') {
        await moveToPrevWord(page);
      }
      await page.keyboard.up('Shift');

      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [1, 5, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 12, 0],
          anchorOffset: 1,
          focusPath: [0, 2, 0],
          focusOffset: 1,
        });
      }

      // Copy selected text
      clipboard = await copyToClipboard(page);
      await page.keyboard.press('Delete');
      // Paste the content
      await pasteFromClipboard(page, clipboard);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span></p><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#</span><span data-outline-text="true">foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 5, 0],
          anchorOffset: 1,
          focusPath: [1, 5, 0],
          focusOffset: 1,
        });
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world </span><span class="editor-text-hashtag" data-outline-text="true">#foobar</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foobar2</span><span data-outline-text="true"> when </span><span class="editor-text-hashtag" data-outline-text="true">#not</span><br><span data-outline-text="true">Next </span><span class="editor-text-hashtag" data-outline-text="true">#line</span><span data-outline-text="true"> of </span><span class="editor-text-hashtag" data-outline-text="true">#text</span><span data-outline-text="true"> test </span><span class="editor-text-hashtag" data-outline-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 12, 0],
          anchorOffset: 1,
          focusPath: [0, 12, 0],
          focusOffset: 1,
        });
      }

      // Select all the content
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);

      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [1, 6, 0],
          focusOffset: 3,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 12, 0],
          focusOffset: 4,
        });
      }

      await page.keyboard.press('Delete');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><br></p>',
        );
      } else {
        await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      }
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });
    });
  });
});
