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
  insertUploadImage,
  insertUrlImage,
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
    isCollab,
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
    // The focus on the decorator doesn't seem to work in the right frame?
    if (!isCollab) {
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
              <div class="image-resizer image-resizer-n"></div>
              <div class="image-resizer image-resizer-ne"></div>
              <div class="image-resizer image-resizer-e"></div>
              <div class="image-resizer image-resizer-se"></div>
              <div class="image-resizer image-resizer-s"></div>
              <div class="image-resizer image-resizer-sw"></div>
              <div class="image-resizer image-resizer-w"></div>
              <div class="image-resizer image-resizer-nw"></div>
            </span>
            <br />
          </p>
        `,
        true,
      );
    }

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

  test('Can add images by arbitrary URL', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertUrlImage(
      page,
      'https://lexical.dev/img/logo.svg',
      'lexical logo',
    );

    await insertUploadImage(
      page,
      'packages/lexical-playground/src/images/yellow-flower-small.jpg',
      'a pretty yellow flower :)',
    );

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="https://lexical.dev/img/logo.svg"
              alt="lexical logo"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAAagAwAEAAAAAQAAAAcAAAAA/8IAEQgABwAGAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAMCBAEFAAYHCAkKC//EAMMQAAEDAwIEAwQGBAcGBAgGcwECAAMRBBIhBTETIhAGQVEyFGFxIweBIJFCFaFSM7EkYjAWwXLRQ5I0ggjhU0AlYxc18JNzolBEsoPxJlQ2ZJR0wmDShKMYcOInRTdls1V1pJXDhfLTRnaA40dWZrQJChkaKCkqODk6SElKV1hZWmdoaWp3eHl6hoeIiYqQlpeYmZqgpaanqKmqsLW2t7i5usDExcbHyMnK0NTV1tfY2drg5OXm5+jp6vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAQIAAwQFBgcICQoL/8QAwxEAAgIBAwMDAgMFAgUCBASHAQACEQMQEiEEIDFBEwUwIjJRFEAGMyNhQhVxUjSBUCSRoUOxFgdiNVPw0SVgwUThcvEXgmM2cCZFVJInotIICQoYGRooKSo3ODk6RkdISUpVVldYWVpkZWZnaGlqc3R1dnd4eXqAg4SFhoeIiYqQk5SVlpeYmZqgo6SlpqeoqaqwsrO0tba3uLm6wMLDxMXGx8jJytDT1NXW19jZ2uDi4+Tl5ufo6ery8/T19vf4+fr/2wBDAAIDAwMEAwQFBQQGBgYGBggIBwcICA0JCgkKCQ0TDA4MDA4MExEUEQ8RFBEeGBUVGB4jHRwdIyolJSo1MjVFRVz/2wBDAQIDAwMEAwQFBQQGBgYGBggIBwcICA0JCgkKCQ0TDA4MDA4MExEUEQ8RFBEeGBUVGB4jHRwdIyolJSo1MjVFRVz/2gAMAwEAAhEDEQAAAfBeXfV/i9n/2gAIAQEAAQUCmlT7p//aAAgBAxEBPwGWbIKo/wBmP+0f/9oACAECEQE/AYYoHddn7pf7V//aAAgBAQAGPwKFaUpWtZJJVUl//8QAMxABAAMAAgICAgIDAQEAAAILAREAITFBUWFxgZGhscHw0RDh8SAwQFBgcICQoLDA0OD/2gAIAQEAAT8hFyPFTveHPBl//9oADAMBAAIRAxEAABCL/8QAMxEBAQEAAwABAgUFAQEAAQEJAQARITEQQVFhIHHwkYGhsdHB4fEwQFBgcICQoLDA0OD/2gAIAQMRAT8QYOAdB9nP5t//2gAIAQIRAT8QEWh51X58fxf/2gAIAQEAAT8QJfU4BLBcKyeUzf/Z"
              alt="a pretty yellow flower :)"
              style="height: inherit; max-width: 500px; width: inherit;" />
          </span>
          <br />
        </p>
      `,
    );
  });
});
