/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';

import {moveToEditorEnd} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
  LEGACY_EVENTS,
  pasteFromClipboard,
  SAMPLE_IMAGE_URL,
  test,
} from '../utils/index.mjs';

test.describe('Regression #7635', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isCollab, page, showNestedEditorTreeView: false}),
  );

  test('Paste into image caption', async ({page, isPlainText, isCollab}) => {
    test.skip(isPlainText || isCollab || LEGACY_EVENTS);

    await focusEditor(page);
    await insertSampleImage(page);

    await click(page, '.editor-image img');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="true">
              <img
                class="focused draggable"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
            <div>
              <button class="image-caption-button">Add Caption</button>
              <div class="image-resizer image-resizer-n"></div>
              <div class="image-resizer image-resizer-ne"></div>
              <div class="image-resizer image-resizer-e"></div>
              <div class="image-resizer image-resizer-se"></div>
              <div class="image-resizer image-resizer-s"></div>
              <div class="image-resizer image-resizer-sw"></div>
              <div class="image-resizer image-resizer-w"></div>
              <div class="image-resizer image-resizer-nw"></div>
            </div>
          </span>
          <br />
        </p>
      `,
    );
    await click(page, '.image-caption-button');
    await expect(page.locator('.ImageNode__contentEditable')).toBeVisible();
    const TEST_TEXT = 'some content';
    await page.keyboard.type(TEST_TEXT);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
            <div class="image-caption-container">
              <div
                class="ImageNode__contentEditable"
                contenteditable="true"
                role="textbox"
                spellcheck="true"
                style="user-select: text; white-space: pre-wrap; word-break: break-word"
                aria-placeholder="Enter a caption..."
                data-lexical-editor="true">
                <p
                  class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                  dir="ltr">
                  <span data-lexical-text="true">some content</span>
                </p>
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
    );
    for (let i = 0; i < TEST_TEXT.length; i++) {
      await page.keyboard.press('Backspace');
    }
    await pasteFromClipboard(
      page,
      {
        'text/html': html`
          <p>
            Hello
            <b>World</b>
          </p>
        `,
        'text/plain': 'Hello World',
      },
      'div.ImageNode__contentEditable[contenteditable="true"]',
    );
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
            <div class="image-caption-container">
              <div
                class="ImageNode__contentEditable"
                contenteditable="true"
                role="textbox"
                spellcheck="true"
                style="user-select: text; white-space: pre-wrap; word-break: break-word"
                aria-placeholder="Enter a caption..."
                data-lexical-editor="true">
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
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
    );

    // Focus the parent editor (Firefox doesn't let you do this with arrow keys)
    await page.keyboard.press('Escape');
    await focusEditor(page);
    await moveToEditorEnd(page);

    await page.keyboard.press('Enter');
    await page.keyboard.type('Below the image');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
            <div class="image-caption-container">
              <div
                class="ImageNode__contentEditable"
                contenteditable="true"
                role="textbox"
                spellcheck="true"
                style="user-select: text; white-space: pre-wrap; word-break: break-word"
                aria-placeholder="Enter a caption..."
                data-lexical-editor="true">
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
              </div>
            </div>
          </span>
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Below the image</span>
        </p>
      `,
    );
  });
});
