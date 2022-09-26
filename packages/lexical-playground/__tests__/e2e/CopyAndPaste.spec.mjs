/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {expect} from '@playwright/test';

import {
  moveLeft,
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineBeginning,
  moveToLineEnd,
  moveToPrevWord,
  selectAll,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  clearEditor,
  click,
  copyToClipboard,
  focus,
  focusEditor,
  html,
  initialize,
  insertTable,
  IS_LINUX,
  IS_WINDOWS,
  pasteFromClipboard,
  selectCellsFromTableCords,
  selectFromAlignDropdown,
  test,
} from '../utils/index.mjs';

test.describe('CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
    }

    // Paste after
    await page.keyboard.press('ArrowRight');
    await pasteFromClipboard(page, clipboard);
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 12,
        anchorPath: [0, 6, 0],
        focusOffset: 12,
        focusPath: [0, 6, 0],
      });
    }
  });

  test(`Copy and paste heading`, async ({isPlainText, page, browserName}) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('# Heading');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Some text');

    await moveToEditorBeginning(page);
    await page.keyboard.down('Shift');
    await moveToLineEnd(page);
    await page.keyboard.up('Shift');

    const clipboard = await copyToClipboard(page);

    await moveToEditorEnd(page);
    await page.keyboard.press('Enter');

    // Paste the content
    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Heading</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some text</span>
        </p>
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Heading</span>
        </h1>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 7,
      anchorPath: [2, 0, 0],
      focusOffset: 7,
      focusPath: [2, 0, 0],
    });
  });

  test(`Copy and paste between sections`, async ({
    isRichText,
    page,
    browserName,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world #foobar test #foobar2 when #not');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Next #line of #text test #foo');

    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
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
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });
  });

  test('Copy and paste of partial list items into an empty editor', async ({
    page,
    isPlainText,
  }) => {
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
    await moveLeft(page, 3);
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
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
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
  });

  test('Copy and paste of partial list items into the list', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
  }) => {
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
    await moveLeft(page, 3);
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
  });

  test('Copy list items and paste back into list', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
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
  });

  test('Copy and paste of list items and paste back into list on an existing item', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
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
  });

  test('Copy and paste two paragraphs into list on an existing item', async ({
    page,
    isPlainText,
  }) => {
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
    await moveLeft(page, 2);

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
  });

  test('Copy and paste two paragraphs at the end of a list', async ({
    page,
    isPlainText,
  }) => {
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
  });

  test('Copy and paste an inline element into a leaf node', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Root
    //   |- Paragraph
    //      |- Link
    //         |- Text "Hello"
    //      |- Text "World"
    await page.keyboard.type('Hello');
    await selectAll(page);
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
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </a>
          <span data-lexical-text="true">World</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </a>
          <span data-lexical-text="true">World</span>
        </p>
      `,
    );
  });

  test('HTML Copy + paste a plain DOM text node', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {'text/html': 'Hello!'};

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test('HTML Copy + paste a paragraph element', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {'text/html': '<p>Hello!<p>'};

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello!</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1],
      focusOffset: 0,
      focusPath: [1],
    });
  });

  test('HTML Copy + paste an anchor element', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<a href="https://facebook.com">Facebook!</a>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <a
            href="https://facebook.com"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Facebook!</span>
          </a>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 9,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 9,
      focusPath: [0, 0, 0, 0],
    });

    await selectAll(page);

    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">Facebook!</span>
        </p>
      `,
    );

    await click(page, '.link');
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <a
            href="https://facebook.com"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Facebook!</span>
          </a>
        </p>
      `,
    );
  });

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

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul></li></ul>',
    );

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
    );
  });

  test('HTML Copy + paste (Nested List - directly nested ul)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<ul><ul><li>Hello</li></ul><li>world!</li></ul>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
            </ul>
          </li>
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0, 0],
    });

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
              <li
                value="2"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );

    await page.keyboard.press('ArrowUp');

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
  });

  test('HTML Copy + paste (Nested List - li with non-list content plus ul child)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<ul><li>Hello<ul><li>world!</li></ul></li></ul>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0, 0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0, 0, 0, 0],
    });

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );

    await page.keyboard.press('ArrowUp');

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
            </ul>
          </li>
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );
  });

  test('HTML Copy + paste (Table - Google Docs)', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    test.fixme(
      isCollab,
      'Table selection styles are not properly synced to the right hand frame',
    );

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-225f7a7a-7fff-443e-8b2c-f0b1bb6cdc1c"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt"><colgroup><col /><col /><col /></colgroup><tbody><tr style="height:0pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">a</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">b</span></p><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">b</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">c</span></p></td></tr><tr style="height:0pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">d</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">e</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">f</span></p></td></tr></tbody></table></div></b>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <table class="PlaygroundEditorTheme__table">
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">a</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">c</span>
              </p>
            </td>
          </tr>
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">d</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">e</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">f</span>
              </p>
            </td>
          </tr>
        </table>
      `,
    );
  });

  test('HTML Copy + paste (Table - Quip)', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><table style="border-collapse: collapse;"><col style="width: 90px;"><col style="width: 90px;"><col style="width: 90px;"><tr><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">a</td><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">b<br>b</td><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">c</td></tr><tr><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">d</td><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">e</td><td style="border: 1px solid rgb(230, 230, 230); text-align: left;">f</td></tr></table>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <table class="PlaygroundEditorTheme__table">
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">a</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">c</span>
              </p>
            </td>
          </tr>
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">d</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">e</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">f</span>
              </p>
            </td>
          </tr>
        </table>
      `,
    );
  });

  test('HTML Copy + paste (Table - Google Sheets)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><google-sheets-html-origin><style type="text/css"><!--td {border: 1px solid #ccc;}br {mso-data-placement:same-cell;}--></style><table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;width:0px;border-collapse:collapse;border:none"><colgroup><col width="100"/><col width="100"/><col width="100"/></colgroup><tbody><tr style="height:21px;"><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;a&quot;}">a</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;b\nb&quot;}">b<br/>b</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;c&quot;}">c</td></tr><tr style="height:21px;"><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;d&quot;}">d</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;e&quot;}">e</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;f&quot;}">f</td></tr></tbody></table>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <table class="PlaygroundEditorTheme__table">
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">a</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">c</span>
              </p>
            </td>
          </tr>
          <tr>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">d</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">e</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">f</span>
              </p>
            </td>
          </tr>
        </table>
      `,
    );
  });

  test('Merge Grids on Copy + paste', async ({page, isPlainText, isCollab}) => {
    test.skip(isPlainText);
    test.fixme(
      isCollab,
      'Table selection styles are not properly synced to the right hand frame',
    );

    await focusEditor(page);
    await insertTable(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><table class="PlaygroundEditorTheme__table"><colgroup><col><col><col><col><col></colgroup><tbody><tr><th class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader" style="border: 1px solid black; width: 140px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p class="PlaygroundEditorTheme__paragraph"><span>a</span></p></th><th class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader" style="border: 1px solid black; width: 140px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p class="PlaygroundEditorTheme__paragraph"><span>b</span></p></th></tr><tr><th class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader" style="border: 1px solid black; width: 140px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p class="PlaygroundEditorTheme__paragraph"><span>c</span></p></th><td class="PlaygroundEditorTheme__tableCell" style="border: 1px solid black; width: 140px; vertical-align: top; text-align: start;"><p class="PlaygroundEditorTheme__paragraph"><span>d</span></p></td></tr></tbody></table>`,
    };

    await selectCellsFromTableCords(page, {x: 0, y: 0}, {x: 3, y: 3});

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <table class="PlaygroundEditorTheme__table disable-selection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent;">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">a</span>
              </p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent;">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">b</span>
              </p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent;">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">c</span>
              </p>
            </th>
            <td
              class="PlaygroundEditorTheme__tableCell"
              style="background-color: rgb(172, 206, 247); caret-color: transparent;">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">d</span>
              </p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('HTML Copy + paste multi line html with extra newlines', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);

    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/html':
        '<p>Hello\n</p>\n\n<p>\n\nWorld\n\n</p>\n\n<p>Hello\n\n   World   \n\n!\n\n</p><p>Hello <b>World</b> <i>!</i></p>',
    });

    const paragraphs = page.locator('div[contenteditable="true"] > p');
    await expect(paragraphs).toHaveCount(4);

    // Explicitly checking inner text, since regular assertHTML will prettify it and strip all
    // extra newlines, which makes this test less acurate
    await expect(paragraphs.nth(0)).toHaveText('Hello', {useInnerText: true});
    await expect(paragraphs.nth(1)).toHaveText('World', {useInnerText: true});
    await expect(paragraphs.nth(2)).toHaveText('Hello   World   !', {
      useInnerText: true,
    });
    await expect(paragraphs.nth(3)).toHaveText('Hello World !', {
      useInnerText: true,
    });
  });

  test('HTML Copy + paste in front of or after a link', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/html': `text<a href="https://test.com/1">link</a>text`,
    });
    await moveToEditorBeginning(page);
    await pasteFromClipboard(page, {
      'text/html': 'before',
    });
    await moveToEditorEnd(page);
    await pasteFromClipboard(page, {
      'text/html': 'after',
    });
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">beforetext</span>
          <a
            href="https://test.com/1"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">link</span>
          </a>
          <span data-lexical-text="true">textafter</span>
        </p>
      `,
    );
  });

  test('HTML Copy + paste link by selecting its (partial) content', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/html': `text<a href="https://test.com/">link</a>text`,
    });
    await moveLeft(page, 5);
    await page.keyboard.down('Shift');
    await moveLeft(page, 2);
    await page.keyboard.up('Shift');
    const clipboard = await copyToClipboard(page);
    await moveToEditorEnd(page);
    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text</span>
          <a
            href="https://test.com/"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">link</span>
          </a>
          <span data-lexical-text="true">text</span>
          <a
            href="https://test.com/"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">in</span>
          </a>
        </p>
      `,
    );
  });

  test('Copy + paste multi-line plain text into rich text produces separate paragraphs', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Hello ');
    await pasteFromClipboard(page, {
      'text/plain': 'world\nAnd text below',
    });
    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">And text below</span>
        </p>
      `,
    );
  });

  test('HTML Copy + paste html with BIU formatting', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    const clipboardData = {
      'text/html': `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-d6ac4fde-7fff-3941-b4d9-3903abcccdcb"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Italic</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">underline</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:italic;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold Italic Underline</span></p></b><br class="Apple-interchange-newline">`,
    };
    await pasteFromClipboard(page, clipboardData);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Bold
          </strong>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            Italic
          </em>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            underline
          </span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic
          PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            Bold Italic Underline
          </strong>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
      `,
    );
  });

  test('HTML Copy + paste text with subscript and superscript', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    const clipboardData = {
      'text/html':
        '<b style="font-weight:normal;" id="docs-internal-guid-374b5f9d-7fff-9120-bcb0-1f5c1b6d59fa"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="font-size:0.6em;vertical-align:sub;">subscript</span></span><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> and </span><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="font-size:0.6em;vertical-align:super;">superscript</span></span></b>',
    };
    await pasteFromClipboard(page, clipboardData);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <sub data-lexical-text="true">
            <span class="PlaygroundEditorTheme__textSubscript">subscript</span>
          </sub>
          <span data-lexical-text="true">and</span>
          <sup data-lexical-text="true">
            <span class="PlaygroundEditorTheme__textSuperscript">
              superscript
            </span>
          </sup>
        </p>
      `,
    );
  });

  test('HTML Copy + paste a Title from Google Docs', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-whatever"><span style="font-size:26pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">My document</span></b>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">My document</span>
        </h1>
      `,
    );

    await clearEditor(page);
    await focusEditor(page);

    // These can sometimes be put onto the clipboard wrapped in a paragraph element
    clipboard[
      'text/html'
    ] = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-wjatever"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:3pt;"><span style="font-size:26pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">My document</span></p></b>`;

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">My document</span>
        </h1>
      `,
    );
  });
});
