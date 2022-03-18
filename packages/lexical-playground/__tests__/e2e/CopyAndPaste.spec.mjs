/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToLineBeginning,
  moveToLineEnd,
  moveToPrevWord,
  selectAll,
} from '../keyboardShortcuts/index.mjs';
import { assertHTML,
  assertSelection,
  click,
  copyToClipboard,
  focus,
  focusEditor,
initialize ,
  IS_LINUX,
  IS_WINDOWS,
  pasteFromClipboard,
  test,
  waitForSelector
} from '../utils/index.mjs';

test.describe('CopyAndPaste', () => {
  test.beforeEach(({isCollab, page }) => initialize({ isCollab, page }));
    test('Basic copy + paste', async ({isRichText, page, browserName}) => {
      await focusEditor(page);

      // Add paragraph
      await page.keyboard.type('Copy + pasting?');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Sounds good!');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 12,
          anchorPath: [2, 0, 0],
          focusOffset: 12,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span><br><br><span data-lexical-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 12,
          anchorPath: [0, 3, 0],
          focusOffset: 12,
          focusPath: [0, 3, 0],
        });
      }

      // Select all the text
      await selectAll(page);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Sounds good!</span></p>',
        );
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 3,
            focusPath: [],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 12,
            focusPath: [2, 0, 0],
          });
        }
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span><br><br><span data-lexical-text="true">Sounds good!</span></p>',
        );
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 1,
            focusPath: [],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 12,
            focusPath: [0, 3, 0],
          });
        }
      }

      // Copy all the text
      const clipboard = await copyToClipboard(page);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Sounds good!</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span><br><br><span data-lexical-text="true">Sounds good!</span></p>',
        );
      }

      // Paste after
      await page.keyboard.press('ArrowRight');
      await pasteFromClipboard(page, clipboard);
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Sounds good!Copy + pasting?</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 12,
          anchorPath: [4, 0, 0],
          focusOffset: 12,
          focusPath: [4, 0, 0],
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Copy + pasting?</span><br><br><span data-lexical-text="true">Sounds good!Copy + pasting?</span><br><br><span data-lexical-text="true">Sounds good!</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 12,
          anchorPath: [0, 6, 0],
          focusOffset: 12,
          focusPath: [0, 6, 0],
        });
      }
    });

    test(`Copy and paste between sections`, async ({isRichText, page, browserName}) => {
      await focusEditor(page);
      await page.keyboard.type('Hello world #foobar test #foobar2 when #not');

      await page.keyboard.press('Enter');
      await page.keyboard.type('Next #line of #text test #foo');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );

        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [1, 5, 0],
          focusOffset: 4,
          focusPath: [1, 5, 0],
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span><br><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 12, 0],
          focusOffset: 4,
          focusPath: [0, 12, 0],
        });
      }

      // Select all the content
      await selectAll(page);

      if (isRichText) {
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 2,
            focusPath: [],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 4,
            focusPath: [1, 5, 0],
          });
        }
      } else {
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 1,
            focusPath: [],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 4,
            focusPath: [0, 12, 0],
          });
        }
      }

      // Copy all the text
      let clipboard = await copyToClipboard(page);
      await page.keyboard.press('Delete');
      // Paste the content
      await pasteFromClipboard(page, clipboard);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [1, 5, 0],
          focusOffset: 4,
          focusPath: [1, 5, 0],
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span><br><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 12, 0],
          focusOffset: 4,
          focusPath: [0, 12, 0],
        });
      }

      await moveToPrevWord(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowUp');
      await moveToPrevWord(page);
      // Once more for linux on Chromium
      if (IS_LINUX && browserName === 'chromium') {
        await moveToPrevWord(page);
      }
      await page.keyboard.up('Shift');

      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [1, 5, 0],
          focusOffset: 1,
          focusPath: [0, 2, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [0, 12, 0],
          focusOffset: 1,
          focusPath: [0, 2, 0],
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
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [1, 5, 0],
          focusOffset: 1,
          focusPath: [1, 5, 0],
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello world </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foobar2</span><span data-lexical-text="true"> when </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#not</span><br><span data-lexical-text="true">Next </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#line</span><span data-lexical-text="true"> of </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#text</span><span data-lexical-text="true"> test </span><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#foo</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [0, 12, 0],
          focusOffset: 1,
          focusPath: [0, 12, 0],
        });
      }

      // Select all the content
      await selectAll(page);

      if (isRichText) {
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 2,
            focusPath: [],
          });
        } else {
          if (browserName === 'firefox') {
            await assertSelection(page, {
              anchorOffset: 0,
              anchorPath: [0, 0, 0],
              focusOffset: 3,
              focusPath: [1, 5, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 0,
              anchorPath: [0, 0, 0],
              focusOffset: 4,
              focusPath: [1, 5, 0],
            });
          }
        }
      } else {
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [],
            focusOffset: 1,
            focusPath: [],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 4,
            focusPath: [0, 12, 0],
          });
        }
      }

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0],
        focusOffset: 0,
        focusPath: [0],
      });
    });

    test(
      'Copy and paste of partial list items into an empty editor',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);
        await focusEditor(page);

        // Add three list items
        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Add a paragraph
        await page.keyboard.type('Some text.');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 10,
          focusPath: [1, 0, 0],
        });

        await page.keyboard.down('Shift');
        await moveToLineBeginning(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');

        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 3,
          focusPath: [0, 2, 0, 0],
        });

        // Copy the partial list item and paragraph
        const clipboard = await copyToClipboard(page);

        // Select all and remove content
        await selectAll(page);
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        // Paste

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">ee</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 10,
          focusPath: [1, 0, 0],
        });
      },
    );

    test(
      'Copy and paste of partial list items into the list',
      async ({page, isPlainText, browserName}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        // Add three list items
        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Add a paragraph
        await page.keyboard.type('Some text.');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 10,
          focusPath: [1, 0, 0],
        });

        await page.keyboard.down('Shift');
        await moveToLineBeginning(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');

        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 3,
          focusPath: [0, 2, 0, 0],
        });

        // Copy the partial list item and paragraph
        const clipboard = await copyToClipboard(page);

        // Select all and remove content
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        if (!IS_WINDOWS && browserName === 'firefox') {
          await page.keyboard.press('ArrowUp');
        }
        await moveToLineEnd(page);

        await page.keyboard.down('Enter');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><br></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 1],
          focusOffset: 0,
          focusPath: [0, 1],
        });

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">ee</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text.</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [1, 0, 0],
          focusOffset: 10,
          focusPath: [1, 0, 0],
        });
      },
    );

    test(
      'Copy and paste of list items and paste back into list',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');
        await page.keyboard.press('Enter');
        await page.keyboard.type('four');
        await page.keyboard.press('Enter');
        await page.keyboard.type('five');

        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');

        await moveToLineBeginning(page);
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowDown');
        await moveToLineEnd(page);
        await page.keyboard.up('Shift');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 2, 0, 0],
          focusOffset: 4,
          focusPath: [0, 3, 0, 0],
        });

        const clipboard = await copyToClipboard(page);

        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem"><br></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 2],
          focusOffset: 0,
          focusPath: [0, 2],
        });

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 3, 0, 0],
          focusOffset: 4,
          focusPath: [0, 3, 0, 0],
        });
      },
    );

    test(
      'Copy and paste of list items and paste back into list on an existing item',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');
        await page.keyboard.press('Enter');
        await page.keyboard.type('four');
        await page.keyboard.press('Enter');
        await page.keyboard.type('five');

        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');

        await moveToLineBeginning(page);
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowDown');
        await moveToLineEnd(page);
        await page.keyboard.up('Shift');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 2, 0, 0],
          focusOffset: 4,
          focusPath: [0, 3, 0, 0],
        });

        const clipboard = await copyToClipboard(page);

        await page.keyboard.press('ArrowRight');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 3, 0, 0],
          focusOffset: 4,
          focusPath: [0, 3, 0, 0],
        });

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">fourthree</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="6" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 4, 0, 0],
          focusOffset: 4,
          focusPath: [0, 4, 0, 0],
        });
      },
    );

    test(
      'Copy and paste two paragraphs into list on an existing item',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);
        await focusEditor(page);

        await page.keyboard.type('Hello');
        await page.keyboard.press('Enter');
        await page.keyboard.type('World');

        await selectAll(page);

        const clipboard = await copyToClipboard(page);

        await page.keyboard.press('Backspace');

        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');
        await page.keyboard.press('Enter');
        await page.keyboard.type('four');
        await page.keyboard.press('Enter');
        await page.keyboard.type('five');

        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');

        await moveToLineBeginning(page);
        await page.keyboard.press('ArrowDown');
        await moveToLineEnd(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 2,
          anchorPath: [0, 3, 0, 0],
          focusOffset: 2,
          focusPath: [0, 3, 0, 0],
        });

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foHello</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Worldur</span></p><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li></ul>',
        );
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [1, 0, 0],
          focusOffset: 5,
          focusPath: [1, 0, 0],
        });
      },
    );

    test(
      'Copy and paste two paragraphs at the end of a list',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        await page.keyboard.type('Hello');
        await page.keyboard.press('Enter');
        await page.keyboard.type('World');

        await selectAll(page);

        const clipboard = await copyToClipboard(page);

        await page.keyboard.press('Backspace');

        await page.keyboard.type('- one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('two');
        await page.keyboard.press('Enter');
        await page.keyboard.type('three');
        await page.keyboard.press('Enter');
        await page.keyboard.type('four');
        await page.keyboard.press('Enter');
        await page.keyboard.type('five');
        await page.keyboard.press('Enter');

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li><li value="6" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">World</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [1, 0, 0],
          focusOffset: 5,
          focusPath: [1, 0, 0],
        });

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">four</span></li><li value="5" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">five</span></li><li value="6" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li></ul><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">WorldHello</span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">World</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [2, 0, 0],
          focusOffset: 5,
          focusPath: [2, 0, 0],
        });
      },
    );

    test(
      'Copy and paste an inline element into a leaf node',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);
        await focusEditor(page);

        // Root
        //   |- Paragraph
        //      |- Link
        //         |- Text "Hello"
        //      |- Text "World"
        await page.keyboard.type('Hello');
        await selectAll(page);
        await waitForSelector(page, '.link');
        await click(page, '.link');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Space');
        await page.keyboard.type('World');

        await selectAll(page);

        const clipboard = await copyToClipboard(page);

        await page.keyboard.press('ArrowRight');

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><a href="https://" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true"> World</span><a href="https://" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true"> World</span></p>',
        );
      },
    );

    test(
      'HTML Copy + paste a plain DOM text node',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        const clipboard = {'text/html': 'Hello!'};

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello!</span></p>',
        );
        await assertSelection(page, {
          anchorOffset: 6,
          anchorPath: [0, 0, 0],
          focusOffset: 6,
          focusPath: [0, 0, 0],
        });
      },
    );

    test(
      'HTML Copy + paste a paragraph element',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        const clipboard = {'text/html': '<p>Hello!<p>'};

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello!</span></p><p class="PlaygroundEditorTheme__paragraph"></br></p>',
        );

        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [1],
          focusOffset: 0,
          focusPath: [1],
        });
      },
    );

    test(
      'HTML Copy + paste an anchor element',
      async ({page, isPlainText}) => {
        test.skip(isPlainText);

        await focusEditor(page);

        const clipboard = {
          'text/html': '<a href="https://facebook.com">Facebook!</a>',
        };

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><a class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr" href="https://facebook.com/"><span data-lexical-text="true">Facebook!</span></a></p>',
        );

        await assertSelection(page, {
          anchorOffset: 9,
          anchorPath: [0, 0, 0, 0],
          focusOffset: 9,
          focusPath: [0, 0, 0, 0],
        });

        await selectAll(page);

        await waitForSelector(page, '.link');
        await click(page, '.link');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">Facebook!</span></p>',
        );

        await click(page, '.link');
        await waitForSelector(page, '.link-input');
        await click(page, '.link-edit');
        await focus(page, '.link-input');
        await page.keyboard.type('facebook.com');
        await page.keyboard.press('Enter');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><a href="https://facebook.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Facebook!</span></a></p>',
        );
      },
    );

    test('HTML Copy + paste a list element', async ({page, isPlainText}) => {
      test.skip(isPlainText);

      await focusEditor(page);

      const clipboard = {'text/html': '<ul><li>Hello</li><li>world!</li></ul>'};

      await pasteFromClipboard(page, clipboard);

      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
      );

      await assertSelection(page, {
        anchorOffset: 6,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 6,
        focusPath: [0, 1, 0, 0],
      });

      await waitForSelector(page, '.indent');
      await click(page, '.indent');

      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul></li></ul>',
      );

      await waitForSelector(page, '.outdent');
      await click(page, '.outdent');

      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
      );
    });
});
