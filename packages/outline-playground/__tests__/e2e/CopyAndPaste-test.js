/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToPrevWord,
  selectAll,
  moveToLineBeginning,
  moveToLineEnd,
} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertSelection,
  assertHTML,
  copyToClipboard,
  pasteFromClipboard,
  E2E_BROWSER,
  IS_LINUX,
} from '../utils';

describe('CopyAndPaste', () => {
  initializeE2E((e2e) => {
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
      await selectAll(page);
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
      await selectAll(page);

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
      await selectAll(page);

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

    it('Copy and paste of partial list items', async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');

      // Add three list items
      await page.keyboard.type('- One');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Two');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Three');

      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');

      // Add a paragraph
      await page.keyboard.type('Some text.');

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">One</span></li><li class="editor-listitem"><span data-outline-text="true">Two</span></li><li class="editor-listitem"><span data-outline-text="true">Three</span></li></ul><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Some text.</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 10,
        focusPath: [1, 0, 0],
        focusOffset: 10,
      });

      await page.keyboard.down('Shift');
      await moveToLineBeginning(page);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.up('Shift');

      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 10,
        focusPath: [0, 2, 0, 0],
        focusOffset: 3,
      });

      // Copy the partial list item and paragraph
      const clipboard = await copyToClipboard(page);

      // Select all and remove content
      await selectAll(page);
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      // Paste

      await pasteFromClipboard(page, clipboard);

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">ee</span></li></ul><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Some text.</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 10,
        focusPath: [1, 0, 0],
        focusOffset: 10,
      });
    });

    it('Copy and paste of list items and paste back into list', async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');

      await page.keyboard.type('- One');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Two');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Three');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Four');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Five');

      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');

      await moveToLineBeginning(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowDown');
      await moveToLineEnd(page);
      await page.keyboard.up('Shift');

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">One</span></li><li class="editor-listitem"><span data-outline-text="true">Two</span></li><li class="editor-listitem"><span data-outline-text="true">Three</span></li><li class="editor-listitem"><span data-outline-text="true">Four</span></li><li class="editor-listitem"><span data-outline-text="true">Five</span></li></ul>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 3, 0, 0],
        focusOffset: 4,
      });

      const clipboard = await copyToClipboard(page);

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">One</span></li><li class="editor-listitem"><span data-outline-text="true">Two</span></li><li class="editor-listitem"><br></li><li class="editor-listitem"><span data-outline-text="true">Five</span></li></ul>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2],
        anchorOffset: 0,
        focusPath: [0, 2],
        focusOffset: 0,
      });

      await pasteFromClipboard(page, clipboard);

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">One</span></li><li class="editor-listitem"><span data-outline-text="true">Two</span></li></ul><ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">Three</span></li><li class="editor-listitem"><span data-outline-text="true">Four</span></li><li class="editor-listitem"><span data-outline-text="true">Five</span></li></ul><ul class="editor-list-ul"><br></ul>',
      );
      await assertSelection(page, {
        anchorPath: [1, 1, 0, 0],
        anchorOffset: 4,
        focusPath: [1, 1, 0, 0],
        focusOffset: 4,
      });
    });
  });
});
