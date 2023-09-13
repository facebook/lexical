/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  selectAll,
  toggleBold,
  toggleItalic,
  toggleUnderline,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  clearEditor,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  selectFromAdditionalStylesDropdown,
  selectFromBackgroundColorPicker,
  selectFromColorPicker,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Clear All Formatting', () => {
  test.beforeEach(({isPlainText, isCollab, page}) => {
    test.skip(isPlainText);
    initialize({isCollab, page});
  });
  test(`Can clear BIU formatting`, async ({page}) => {
    await focusEditor(page);

    await page.keyboard.type('Hello');
    await toggleBold(page);
    await page.keyboard.type(' World');
    await toggleItalic(page);
    await toggleUnderline(page);
    await page.keyboard.type(' Test');
    await selectAll(page);
    await selectFromAdditionalStylesDropdown(page, '.clear');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello World Test</span>
        </p>
      `,
    );
  });

  test(`Should preserve the default styling of links and quoted text`, async ({
    page,
  }) => {
    await focusEditor(page);

    const clipboard = {
      'text/html': '<a href="https://facebook.com">Facebook!</a>',
    };

    await pasteFromClipboard(page, clipboard);
    await selectAll(page);
    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await selectFromColorPicker(page);
    await selectFromAdditionalStylesDropdown(page, '.clear');
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

    await clearEditor(page);

    await page.keyboard.type('> Testing for quote node');
    await selectAll(page);
    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await selectFromBackgroundColorPicker(page);
    await selectFromColorPicker(page);
    await selectFromAdditionalStylesDropdown(page, '.clear');
    await assertHTML(
      page,
      html`
        <blockquote
          class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Testing for quote node</span>
        </blockquote>
      `,
    );
  });

  test(`Should preserve the default styling of hashtags and mentions`, async ({
    page,
  }) => {
    await focusEditor(page);

    await page.keyboard.type('#facebook testing');
    await selectAll(page);
    await toggleItalic(page);
    await selectFromBackgroundColorPicker(page);
    await selectFromColorPicker(page);
    await selectFromAdditionalStylesDropdown(page, '.clear');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #facebook
          </span>
          <span data-lexical-text="true">testing</span>
        </p>
      `,
    );

    await clearEditor(page);

    await page.keyboard.type('@Luke');

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">@Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );

    await page.keyboard.type(' is testing');
    await selectAll(page);
    await toggleBold(page);
    await selectFromColorPicker(page);
    await selectFromAdditionalStylesDropdown(page, '.clear');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true">is testing</span>
        </p>
      `,
    );
  });
});
