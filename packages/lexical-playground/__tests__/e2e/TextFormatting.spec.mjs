/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveRight,
  moveToLineBeginning,
  moveToLineEnd,
  selectCharacters,
  toggleBold,
  toggleItalic,
  toggleUnderline,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  evaluate,
  expect,
  fill,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
  SAMPLE_IMAGE_URL,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('TextFormatting', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can create bold text using the shortcut`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello');
    await toggleBold(page);
    await page.keyboard.type(' World');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            World
          </strong>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0],
    });

    await toggleBold(page);
    await page.keyboard.type('!');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            World
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 2, 0],
      focusOffset: 1,
      focusPath: [0, 2, 0],
    });
  });

  test(`Can create italic text using the shortcut`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello');
    await toggleItalic(page);
    await page.keyboard.type(' World');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            World
          </em>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0],
    });

    await toggleItalic(page);
    await page.keyboard.type('!');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            World
          </em>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 2, 0],
      focusOffset: 1,
      focusPath: [0, 2, 0],
    });
  });

  test(`Can select text and boldify it with the shortcut`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test('Should not format the text in the subsequent paragraph after a triple click selection event.', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

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

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            hello world
          </strong>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello world</span>
        </p>
      `,
    );
  });

  test(`Can select text and italicify it with the shortcut`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await toggleItalic(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            world
          </em>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });

    await toggleItalic(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can select text and underline+strikethrough`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await toggleUnderline(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span
            class="PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            world
          </span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });

    await toggleUnderline(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await toggleUnderline(page);

    await click(page, '.strikethrough');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span
            class="PlaygroundEditorTheme__textUnderlineStrikethrough"
            data-lexical-text="true">
            world
          </span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });

    await click(page, '.strikethrough');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span
            class="PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            world
          </span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can select text and increase the font-size`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);

    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await click(page, '.font-increment');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span style="font-size: 17px;" data-lexical-text="true">world</span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can select text with different size and increase the font-size relatively`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await selectCharacters(page, 'left', 6);
    await click(page, '.font-increment');
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 12);
    await click(page, '.font-increment');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="font-size: 17px;" data-lexical-text="true">Hello</span>
          <span style="font-size: 19px;" data-lexical-text="true">world!</span>
        </p>
      `,
    );
  });

  test(`Can select text and decrease the font-size`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);

    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await click(page, '.font-decrement');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span style="font-size: 13px;" data-lexical-text="true">world</span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can select text with different size and decrease the font-size relatively`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await selectCharacters(page, 'left', 6);
    await click(page, '.font-decrement');
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 12);
    await click(page, '.font-decrement');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="font-size: 13px;" data-lexical-text="true">Hello</span>
          <span style="font-size: 12px;" data-lexical-text="true">world!</span>
        </p>
      `,
    );
  });

  test(`Can select text and change the font-size and font-family`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');

    await moveLeft(page);
    await selectCharacters(page, 'left', 5);

    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await click(page, '.font-increment');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span style="font-size: 17px;" data-lexical-text="true">world</span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });

    await click(page, '.font-family');
    await click(page, 'button:has-text("Georgia")');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span
            style="font-size: 17px; font-family: Georgia;"
            data-lexical-text="true">
            world
          </span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });

    await click(page, '.font-decrement');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span
            style="font-size: 15px; font-family: Georgia;"
            data-lexical-text="true">
            world
          </span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can select text and update font size by entering the value`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);

    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await fill(page, '.font-size-input', '20');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span style="font-size: 20px;" data-lexical-text="true">world</span>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can select text with different size and update font size by entering the value`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await selectCharacters(page, 'left', 6);
    await click(page, '.font-decrement');
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 12);
    await fill(page, '.font-size-input', '20');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="font-size: 20px;" data-lexical-text="true">
            Hello world!
          </span>
        </p>
      `,
    );
  });

  test(`Can select multiple text parts and format them with shortcuts`, async ({
    page,
    isPlainText,
    browserName,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('Hello world!');
    await moveLeft(page);
    await selectCharacters(page, 'left', 5);
    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 1, 0],
    });

    await moveLeft(page);
    await moveRight(page);
    await selectCharacters(page, 'right', 2);
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 3,
      focusPath: [0, 1, 0],
    });

    await toggleItalic(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            w
          </strong>
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            or
          </strong>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            ld
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 2, 0],
      focusOffset: 2,
      focusPath: [0, 2, 0],
    });

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            w
          </strong>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            or
          </em>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            ld
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 2, 0],
      focusOffset: 2,
      focusPath: [0, 2, 0],
    });

    await moveLeft(page, 2);
    await selectCharacters(page, 'right', 5);

    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello w</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            or
          </em>
          <span data-lexical-text="true">ld!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 2,
      focusPath: [0, 2, 0],
    });

    await toggleItalic(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            world
          </em>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 1, 0],
      focusOffset: 5,
      focusPath: [0, 1, 0],
    });

    await toggleItalic(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world!</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 11,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can insert range of formatted text and select part and replace with character`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await page.keyboard.type('123');

    await toggleBold(page);

    await page.keyboard.type('456');

    await toggleBold(page);

    await page.keyboard.type('789');

    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');

    await page.keyboard.type('abc');

    await toggleBold(page);

    await page.keyboard.type('def');

    await toggleBold(page);

    await page.keyboard.type('ghi');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">123</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            456
          </strong>
          <span data-lexical-text="true">789</span>
          <br />
          <span data-lexical-text="true">abc</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            def
          </strong>
          <span data-lexical-text="true">ghi</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 6, 0],
      focusOffset: 3,
      focusPath: [0, 6, 0],
    });

    await page.keyboard.press('ArrowUp');
    await moveToLineBeginning(page);

    await moveRight(page, 2);

    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await moveRight(page, 8);
    await page.keyboard.down('Shift');

    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 6, 0],
    });

    await page.keyboard.type('z');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">12z</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });
  });

  test(`Regression #2439: can format backwards when at first text node boundary`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('123456');

    await moveLeft(page, 3);
    await page.keyboard.down('Shift');
    await moveLeft(page, 3);
    await page.keyboard.up('Shift');
    await toggleBold(page);

    await moveToLineEnd(page);
    await page.keyboard.down('Shift');
    await moveLeft(page, 4);
    await page.keyboard.up('Shift');
    await toggleBold(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            12
          </strong>
          <span data-lexical-text="true">3456</span>
        </p>
      `,
    );

    // Toggle once more
    await toggleBold(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            123456
          </strong>
        </p>
      `,
    );
  });

  test(`The active state of the button in the toolbar should to be displayed correctly`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('A');
    await page.keyboard.press('Enter');
    await page.keyboard.type('B');
    await selectCharacters(page, 'left', 3);
    await toggleBold(page);
    await toggleItalic(page);

    const isButtonActiveStatusDisplayedCorrectly = await evaluate(page, () => {
      const isFloatingToolbarBoldButtonActive = !!document.querySelector(
        '.floating-text-format-popup .popup-item.active i.format.bold',
      );
      const isFloatingToolbarItalicButtonActive = !!document.querySelector(
        '.floating-text-format-popup .popup-item.active i.format.italic',
      );
      const isToolbarBoldButtonActive = !!document.querySelector(
        '.toolbar .toolbar-item.active i.format.bold',
      );
      const isToolbarItalicButtonActive = !!document.querySelector(
        '.toolbar .toolbar-item.active i.format.italic',
      );

      return (
        isFloatingToolbarBoldButtonActive &&
        isFloatingToolbarItalicButtonActive &&
        isToolbarBoldButtonActive &&
        isToolbarItalicButtonActive
      );
    });

    expect(isButtonActiveStatusDisplayedCorrectly).toBe(true);
  });

  test('Regression #2523: can toggle format when selecting a TextNode edge followed by a non TextNode; ', async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('A');
    await insertSampleImage(page);
    await page.keyboard.type('BC');

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 2);

    if (!isCollab) {
      await waitForSelector(page, '.editor-image img');
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">A</span>
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  alt="Yellow flower in tilt shift lens"
                  class="focused"
                  draggable="false"
                  src="${SAMPLE_IMAGE_URL}"
                  style="height: inherit; max-width: 500px; width: inherit" />
              </div>
            </span>
            <span data-lexical-text="true">BC</span>
          </p>
        `,
      );
    }
    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">A</span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            B
          </strong>
          <span data-lexical-text="true">C</span>
        </p>
      `,
    );
    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">A</span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <span data-lexical-text="true">BC</span>
        </p>
      `,
    );
  });

  test('Multiline selection format ignores new lines', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    let leftFrame = page;
    if (isCollab) {
      leftFrame = await page.frame('left');
    }
    await focusEditor(page);

    await page.keyboard.type('Fist');
    await page.keyboard.press('Enter');
    await toggleUnderline(page);
    await page.keyboard.type('Second');
    await page.pause();

    await moveLeft(page, 'Second'.length + 1);
    await page.pause();
    await selectCharacters(page, 'right', 'Second'.length + 1);
    await page.pause();

    await expect(
      leftFrame.locator('.toolbar-item[title^="Underline"]'),
    ).toHaveClass(/active/);
  });
});
