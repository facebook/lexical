/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveLeft, undo} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  LEXICAL_IMAGE_BASE64,
  pasteFromClipboard,
  sleepInsertImage,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML Image CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste an image', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'playwright/base64': [LEXICAL_IMAGE_BASE64, 'image/png'],
    };

    await page.keyboard.type('An image');
    await moveLeft(page, 'image'.length);
    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();
    await page.keyboard.type(' inline ');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">An</span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="file"
                draggable="false"
                src="${LEXICAL_IMAGE_BASE64}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <span data-lexical-text="true">inline image</span>
        </p>
      `,
    );
  });

  test('Copy + paste + undo multiple image', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'playwright/base64_1': [LEXICAL_IMAGE_BASE64, 'image/png'],
      'playwright/base64_2': [LEXICAL_IMAGE_BASE64, 'image/png'],
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage(2);

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
                alt="file"
                draggable="false"
                src="${LEXICAL_IMAGE_BASE64}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="file"
                draggable="false"
                src="${LEXICAL_IMAGE_BASE64}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );

    await undo(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });
});
