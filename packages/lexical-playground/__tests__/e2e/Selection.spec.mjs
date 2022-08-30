/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToLineBeginning,
  moveToPrevWord,
  pressShiftEnter,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  evaluate,
  expect,
  focusEditor,
  html,
  initialize,
  insertImageCaption,
  insertSampleImage,
  IS_MAC,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  pasteFromClipboard,
  selectFromFormatDropdown,
  sleep,
  test,
} from '../utils/index.mjs';

test.describe('Selection', () => {
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
          spellcheck="false"
          dir="ltr"
          data-highlight-language="javascript"
          data-gutter="1">
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
});
