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
  moveToLineBeginning,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  expect,
  focusEditor,
  html,
  initialize,
  repeat,
  selectFromInsertDropdown,
  test,
} from '../utils/index.mjs';

test.describe('TableOfContents', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({
      isCollab,
      page,
      showTableOfContents: true,
    }),
  );

  test('Can insert the Table of Contents node via the Insert dropdown', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // prepare headings
    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('h2');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('h1 again');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    // Insert Contents using the Insert dropdown
    await selectFromInsertDropdown(page, '.item .toc');

    // contents generates as a list with elements according to the existing headings
    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" id="heading-1" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <h2 class="PlaygroundEditorTheme__h2" id="heading-2" dir="auto">
          <span data-lexical-text="true">h2</span>
        </h2>
        <h1 class="PlaygroundEditorTheme__h1" id="heading-3" dir="auto">
          <span data-lexical-text="true">h1 again</span>
        </h1>
        <ol
          class="PlaygroundEditorTheme__ol1 PlaygroundEditorTheme__contents"
          dir="auto">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-1"
              target="_self">
              <span data-lexical-text="true">h1</span>
            </a>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem PlaygroundEditorTheme__contentsItem"
            value="2">
            <ol
              class="PlaygroundEditorTheme__ol2 PlaygroundEditorTheme__contents">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
                value="1">
                <a
                  class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
                  href="#heading-2"
                  target="_self">
                  <span data-lexical-text="true">h2</span>
                </a>
              </li>
            </ol>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="2">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-3"
              target="_self">
              <span data-lexical-text="true">h1 again</span>
            </a>
          </li>
        </ol>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });

  test('The table of contents is not inserted if the document does not have headings', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Insert Contents using the Insert dropdown
    await selectFromInsertDropdown(page, '.item .toc');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });

  test('Clicking on the contents link scrolls to the heading', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // creating headings with ample spacing between them
    await page.keyboard.type('first h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await repeat(42, async () => await page.keyboard.press('Enter'));
    await page.keyboard.type('another h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    // make sure that the first heading isn't visible
    const firstHeading = page.getByRole('heading').getByText('first h1');
    await expect(firstHeading).not.toBeInViewport();

    // after clicking the link in the contents,
    // the page should scroll so that the heading is visible
    await selectFromInsertDropdown(page, '.item .toc');
    await click(page, 'a[href="#heading-1"]');
    await click(page, '.link-view a[href="#heading-1"]');

    await expect(firstHeading).toBeInViewport();
  });

  test('Text after the link and before it is appended to the link', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('first h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    await selectFromInsertDropdown(page, '.item .toc');
    await page.keyboard.type(' el');
    await moveToLineBeginning(page);
    await page.keyboard.type('the ');

    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" id="heading-1" dir="auto">
          <span data-lexical-text="true">first h1</span>
        </h1>
        <ol
          class="PlaygroundEditorTheme__ol1 PlaygroundEditorTheme__contents"
          dir="auto">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-1"
              target="_self">
              <span data-lexical-text="true">the first h1 el</span>
            </a>
          </li>
        </ol>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });

  test('The contents link should be preserved in the contents element if it does not contain text.', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    await selectFromInsertDropdown(page, '.item .toc');
    // removes text only
    await deleteBackward(page);
    await deleteBackward(page);

    // the selection must be inside the empty contents link
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2, 1],
      focusOffset: 0,
      focusPath: [2, 1],
    });

    // new text must be entered inside the contents link
    await page.keyboard.type('h1');

    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" id="heading-1" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <h1 class="PlaygroundEditorTheme__h1" id="heading-2" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <ol
          class="PlaygroundEditorTheme__ol1 PlaygroundEditorTheme__contents"
          dir="auto">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-1"
              target="_self">
              <span data-lexical-text="true">h1</span>
            </a>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="2">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-2"
              target="_self">
              <span data-lexical-text="true">h1</span>
            </a>
          </li>
        </ol>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });

  test('The contents link should be removed by backward deleting #8205', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    await selectFromInsertDropdown(page, '.item .toc');
    // removes text and element
    await deleteBackward(page);
    await deleteBackward(page);
    await deleteBackward(page);

    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" id="heading-1" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <h1 class="PlaygroundEditorTheme__h1" id="heading-2" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <ol
          class="PlaygroundEditorTheme__ol1 PlaygroundEditorTheme__contents"
          dir="auto">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-1"
              target="_self">
              <span data-lexical-text="true">h1</span>
            </a>
          </li>
        </ol>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });

  test('The contenst link should be removed by forward deleting #8205', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('h1');
    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');
    await page.keyboard.press('Enter');

    await selectFromInsertDropdown(page, '.item .toc');
    // removes text and element
    await moveToLineBeginning(page);
    await deleteForward(page);
    await deleteForward(page);
    await deleteForward(page);

    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" id="heading-1" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <h1 class="PlaygroundEditorTheme__h1" id="heading-2" dir="auto">
          <span data-lexical-text="true">h1</span>
        </h1>
        <ol
          class="PlaygroundEditorTheme__ol1 PlaygroundEditorTheme__contents"
          dir="auto">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__contentsItem"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__contentsLink"
              href="#heading-1"
              target="_self">
              <span data-lexical-text="true">h1</span>
            </a>
          </li>
        </ol>
      `,
      undefined,
      {ignoreInlineStyles: true},
    );
  });
});
