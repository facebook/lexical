/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveLeft} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  E2E_PORT,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
  test,
  waitForSelector,
} from '../utils/index.mjs';

const IMAGE_URL =
  E2E_PORT === 3000
    ? '/src/images/yellow-flower.jpg'
    : '/assets/yellow-flower.bf6d0400.jpg';

test.describe('Images', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can create a decorator and move selection around it`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await insertSampleImage(page);

    await waitForSelector(page, '.editor-image img');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });

    await focusEditor(page);
    await page.keyboard.press('ArrowLeft');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowRight');
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowRight');
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
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;"
              class="focused" />
            <button class="image-caption-button">Add Caption</button>
            <div class="image-resizer-ne"></div>
            <div class="image-resizer-se"></div>
            <div class="image-resizer-sw"></div>
            <div class="image-resizer-nw"></div>
          </span>
          <br />
        </p>
      `,
      true,
    );

    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await click(page, 'div[contenteditable="true"]');

    await insertSampleImage(page);

    await waitForSelector(page, '.editor-image img');

    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowLeft');
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

  test('Can add images and delete them correctly', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertSampleImage(page);

    await insertSampleImage(page);

    await focusEditor(page);
    await moveLeft(page, 2);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

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

    await page.keyboard.type('Test');
    await insertSampleImage(page);
    await insertSampleImage(page);

    await focusEditor(page);
    await moveLeft(page, 2);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Test</span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Test</span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="${IMAGE_URL}"
              alt="Yellow flower in tilt shift lens"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });
  });
});
