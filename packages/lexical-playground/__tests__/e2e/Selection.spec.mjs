/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  deleteBackward,
  deleteForward,
  moveDown,
  moveLeft,
  moveRight,
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineBeginning,
  moveToPrevWord,
  moveUp,
  pressShiftEnter,
  selectAll,
  selectPrevWord,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  assertTableSelectionCoordinates,
  click,
  evaluate,
  expect,
  focusEditor,
  html,
  initialize,
  insertCollapsible,
  insertHorizontalRule,
  insertImageCaption,
  insertSampleImage,
  insertTable,
  insertYouTubeEmbed,
  IS_LINUX,
  IS_MAC,
  IS_WINDOWS,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  pasteFromClipboard,
  pressToggleBold,
  pressToggleItalic,
  selectFromFormatDropdown,
  sleep,
  test,
  YOUTUBE_SAMPLE_URL,
} from '../utils/index.mjs';

test.describe.parallel('Selection', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('does not focus the editor on load', async ({page}) => {
    const editorHasFocus = async () =>
      await evaluate(page, () => {
        const editorElement = document.querySelector(
          'div[contenteditable="true"]',
        );
        return document.activeElement === editorElement;
      });

    await focusEditor(page);
    await evaluate(page, () => {
      const editorElement = document.querySelector(
        'div[contenteditable="true"]',
      );
      return editorElement.blur();
    });
    expect(await editorHasFocus()).toEqual(false);
    await sleep(500);
    expect(await editorHasFocus()).toEqual(false);
  });

  test('keeps single active selection for nested editors', async ({
    page,
    isPlainText,
    browserName,
  }) => {
    test.skip(isPlainText);
    const hasSelection = async (parentSelector) =>
      await evaluate(
        page,
        (_parentSelector) => {
          return (
            document
              .querySelector(`${_parentSelector} > .tree-view-output pre`)
              .__lexicalEditor.getEditorState()._selection !== null
          );
        },
        parentSelector,
      );

    await focusEditor(page);
    await insertSampleImage(page);
    await insertImageCaption(page, 'Hello world');
    expect(await hasSelection('.image-caption-container')).toBe(true);
    expect(await hasSelection('.editor-shell')).toBe(false);

    // Click outside of the editor and check that selection remains the same
    await click(page, 'header img');
    expect(await hasSelection('.image-caption-container')).toBe(true);
    expect(await hasSelection('.editor-shell')).toBe(false);

    // Back to root editor
    if (browserName === 'firefox') {
      // TODO:
      // In firefox .focus() on editor does not trigger selectionchange, while checking it
      // explicitly clicking on an editor (passing position that is on the right side to
      // prevent clicking on image and its nested editor)
      await click(page, '.editor-shell', {position: {x: 600, y: 150}});
    } else {
      await focusEditor(page);
    }
    expect(await hasSelection('.image-caption-container')).toBe(false);
    expect(await hasSelection('.editor-shell')).toBe(true);

    // Click outside of the editor and check that selection remains the same
    await click(page, 'header img');
    expect(await hasSelection('.image-caption-container')).toBe(false);
    expect(await hasSelection('.editor-shell')).toBe(true);

    // Back to nested editor editor
    await focusEditor(page, '.image-caption-container');
    expect(await hasSelection('.image-caption-container')).toBe(true);
    expect(await hasSelection('.editor-shell')).toBe(false);
  });

  test('can wrap post-linebreak nodes into new element', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Line1');
    await pressShiftEnter(page);
    await page.keyboard.type('Line2');
    await page.keyboard.down('Shift');
    await moveToLineBeginning(page);
    await page.keyboard.up('Shift');
    await selectFromFormatDropdown(page, '.code');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line1</span>
        </p>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript"
          data-language="javascript">
          <span data-lexical-text="true">Line2</span>
        </code>
      `,
    );
  });

  test('can delete text by line with CMD+delete', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText || !IS_MAC);
    await focusEditor(page);
    await page.keyboard.type('One');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Two');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Three');

    const deleteLine = async () => {
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('Backspace');
      await keyUpCtrlOrMeta(page);
    };

    const lines = [
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">One</span>
        </p>
      `,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Two</span>
        </p>
      `,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Three</span>
        </p>
      `,
    ];

    await deleteLine();
    await assertHTML(page, lines.slice(0, 3).join(''));
    await deleteLine();
    await assertHTML(page, lines.slice(0, 2).join(''));
    await deleteLine();
    await assertHTML(page, lines.slice(0, 1).join(''));
    await deleteLine();
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('can delete line which ends with element with CMD+delete', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText || !IS_MAC);
    await focusEditor(page);
    await page.keyboard.type('One');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Two');
    // sample image
    await pasteFromClipboard(page, {
      'text/html': `
          <span class="editor-image" data-lexical-decorator="true" contenteditable="false">
            <div draggable="false">
              <img src="/assets/yellow-flower-vav9Hsve.jpg" alt="Yellow flower in tilt shift lens" draggable="false" style="height: inherit; max-width: 500px; width: inherit;">
            </div>
          </span>
        `,
    });

    const deleteLine = async () => {
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('Backspace');
      await keyUpCtrlOrMeta(page);
    };

    await deleteLine();
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">One</span>
        </p>
      `,
    );
    await deleteLine();
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can insert inline element within text and put selection after it', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await moveToPrevWord(page);
    await pasteFromClipboard(page, {
      'text/html': `<a href="https://test.com">link</a>`,
    });
    await sleep(3000);
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 4,
      focusPath: [0, 1, 0, 0],
    });
  });

  test('Can delete at boundary #4221', async ({page, isPlainText}) => {
    test.skip(!isPlainText);
    await focusEditor(page);
    await page.keyboard.type('aaa');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    await page.keyboard.type('c');

    await page.keyboard.down('Shift');
    await moveLeft(page, 3);
    await page.keyboard.up('Shift');
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">aaa</span>
          <br />
          <br />
        </p>
      `,
    );

    await page.keyboard.down('Shift');
    await moveLeft(page, 1);
    await page.keyboard.up('Shift');
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">aaa</span>
        </p>
      `,
    );
  });

  test('Can select all with node selection', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Text before');
    await insertSampleImage(page);
    await page.keyboard.type('Text after');
    await selectAll(page);
    await deleteBackward(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete forward a Collapsible', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    if (!IS_MAC) {
      // Do Windows/Linux have equivalent shortcuts?
      return;
    }
    await focusEditor(page);
    await page.keyboard.type('abc');
    await insertCollapsible(page);
    await moveToEditorBeginning(page);
    await moveRight(page, 3);
    await deleteForward(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  // TODO I don't think this test is correct but at least this test will prevent it from regressing
  // even further
  test('Can delete forward a Table', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    if (!IS_MAC) {
      // Do Windows/Linux have equivalent shortcuts?
      return;
    }
    await focusEditor(page);
    await page.keyboard.type('abc');
    await insertTable(page, 1, 2);
    await moveToEditorBeginning(page);
    await moveRight(page, 3);
    await deleteForward(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
        </p>
        <table class="PlaygroundEditorTheme__table">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete block elements', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# A');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">A</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">b</span>
        </p>
      `,
    );
    await moveLeft(page, 2);

    await deleteBackward(page);
    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1">
          <br />
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">b</span>
        </p>
      `,
    );

    await deleteBackward(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">b</span>
        </p>
      `,
    );

    await deleteBackward(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph  PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">b</span>
        </p>
      `,
    );
  });

  test(
    'Can delete sibling elements forward',
    {
      tag: '@flaky',
    },
    async ({page, isPlainText}) => {
      test.skip(isPlainText);

      await focusEditor(page);
      await page.keyboard.press('Enter');
      await page.keyboard.type('# Title');
      await page.keyboard.press('ArrowUp');
      await deleteForward(page);
      await assertHTML(
        page,
        html`
          <h1
            class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Title</span>
          </h1>
        `,
      );
    },
  );

  test('Can adjust tripple click selection', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);

    await page.keyboard.type('Paragraph 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 2');
    await page
      .locator('div[contenteditable="true"] > p')
      .first()
      .click({clickCount: 3});

    await click(page, '.block-controls');
    await click(page, '.dropdown .item:has(.icon.h1)');

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Paragraph 1</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Paragraph 2</span>
        </p>
      `,
    );
  });

  test('Select all from Node selection #4658', async ({page, isPlainText}) => {
    // TODO selectAll is bad for Linux #4665
    test.skip(isPlainText || IS_LINUX);

    await insertYouTubeEmbed(page, YOUTUBE_SAMPLE_URL);
    await page.keyboard.type('abcdefg');
    await moveLeft(page, 'abcdefg'.length + 1);

    await selectAll(page);
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Select all (DecoratorNode at start) #4670', async ({
    page,
    isPlainText,
  }) => {
    // TODO selectAll is bad for Linux #4665
    test.skip(isPlainText || IS_LINUX);

    await insertYouTubeEmbed(page, YOUTUBE_SAMPLE_URL);
    // Delete empty paragraph in front
    await moveLeft(page, 2);
    await page.keyboard.press('Backspace');
    await moveRight(page, 2);
    await page.keyboard.type('abcdefg');

    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can use block controls on selections including decorator nodes #5371', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);

    await page.keyboard.type('Some text');
    await insertHorizontalRule(page);
    await page.keyboard.type('More text');
    await selectAll(page);

    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some text</span>
        </h1>
        <hr
          class="PlaygroundEditorTheme__hr selected"
          contenteditable="false"
          data-lexical-decorator="true" />
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">More text</span>
        </h1>
      `,
    );
  });

  test('Can delete table node present at the end #5543', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
    legacyEvents,
  }) => {
    test.skip(isPlainText);
    test.fixme(
      legacyEvents && browserName === 'chromium' && IS_WINDOWS,
      'Flaky on Windows + Chromium + legacy events',
    );

    await focusEditor(page);
    await insertTable(page, 1, 2);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can persist the text format from the paragraph', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pressToggleBold(page);
    await page.keyboard.type('Line1');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line2');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Line3');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Line1
          </strong>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Line3
          </strong>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Line2
          </strong>
        </p>
      `,
    );
  });

  test('toggle format at the start of paragraph to a different format persists the format', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pressToggleBold(page);
    await page.keyboard.type('Line1');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await pressToggleItalic(page);
    await page.keyboard.type('Line2');
    await page.keyboard.press('ArrowUp');
    await pressToggleBold(page);
    await page.keyboard.type('Line3');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Line1
          </strong>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line3</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            Line2
          </strong>
        </p>
      `,
    );
  });

  test('formatting is persisted after deleting all nodes from the paragraph node', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pressToggleBold(page);
    await page.keyboard.type('Line1');
    await page.keyboard.press('Enter');
    await pressToggleBold(page);
    await page.keyboard.type('Line2');
    await selectPrevWord(page);
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Line3');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Line1
          </strong>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line3</span>
        </p>
      `,
    );
  });

  test('Can persist the text style (color) from the paragraph', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await click(page, '.color-picker');
    await click(page, '.color-picker-basic-color > button');
    await click(page, '.PlaygroundEditorTheme__paragraph');
    await page.keyboard.type('Line1');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line2');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Line3');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="color: rgb(208, 2, 27)" data-lexical-text="true">
            Line1
          </span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="color: rgb(208, 2, 27)" data-lexical-text="true">
            Line3
          </span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="color: rgb(208, 2, 27)" data-lexical-text="true">
            Line2
          </span>
        </p>
      `,
    );
  });

  test('shift+arrowdown into a table selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
    legacyEvents,
  }) => {
    test.skip(isPlainText);
    test.fixme(
      browserName === 'firefox' || IS_LINUX || (legacyEvents && IS_WINDOWS),
    );
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorBeginning(page);
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [2],
    });
  });

  test('shift+arrowup into a table selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
    legacyEvents,
  }) => {
    test.skip(isPlainText);
    test.fixme(
      browserName === 'firefox' || IS_LINUX || (legacyEvents && IS_WINDOWS),
    );
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorEnd(page);
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [0],
    });
  });

  test('shift+arrowdown into a table, when the table is the last node, selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
    legacyEvents,
  }) => {
    test.skip(isPlainText);
    test.fixme(browserName === 'chromium' && legacyEvents);
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorEnd(page);
    await deleteBackward(page);
    await moveToEditorBeginning(page);
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [1, 1, 1],
    });
  });

  test('shift+arrowup into a table, when the table is the first node, selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
    legacyEvents,
  }) => {
    test.skip(isPlainText);
    test.fixme(browserName === 'chromium' && legacyEvents);
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorBeginning(page);
    await deleteBackward(page);
    await moveToEditorEnd(page);
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1],
      focusOffset: 1,
      focusPath: [0, 0, 0],
    });
  });

  test('shift+arrowdown into a table, when the table is the only node, selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    legacyEvents,
    browserName,
  }) => {
    test.skip(isPlainText);
    test.fixme(browserName === 'chromium' && legacyEvents);
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorBeginning(page);
    await deleteBackward(page);
    await moveToEditorEnd(page);
    await deleteBackward(page);
    await moveToEditorBeginning(page);
    await moveUp(page, 1);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [],
      focusOffset: 0,
      focusPath: [],
    });
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await assertTableSelectionCoordinates(page, {
      anchor: {x: 0, y: 0},
      focus: {x: 1, y: 1},
    });
  });

  test('shift+arrowup into a table, when the table is the only node, selects the whole table', async ({
    page,
    isPlainText,
    isCollab,
    legacyEvents,
    browserName,
  }) => {
    test.skip(isPlainText);
    test.fixme(browserName === 'chromium' && legacyEvents);
    await focusEditor(page);
    await insertTable(page, 2, 2);
    await moveToEditorBeginning(page);
    await deleteBackward(page);
    await moveToEditorEnd(page);
    await deleteBackward(page);
    await moveDown(page, 1);
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [],
      focusOffset: 1,
      focusPath: [],
    });
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await assertTableSelectionCoordinates(page, {
      anchor: {x: 0, y: 0},
      focus: {x: 1, y: 1},
    });
  });
});
