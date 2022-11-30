/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';

import {moveLeft} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  dragImage,
  dragMouse,
  evaluate,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
  insertUploadImage,
  insertUrlImage,
  IS_WINDOWS,
  SAMPLE_IMAGE_URL,
  SAMPLE_LANDSCAPE_IMAGE_URL,
  selectorBoundingBox,
  test,
  waitForSelector,
} from '../utils/index.mjs';

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
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
    await page.keyboard.press('ArrowLeft');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowRight');
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
              <div draggable="true">
                <img
                  src="${SAMPLE_IMAGE_URL}"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  style="height: inherit; max-width: 500px; width: inherit;"
                  class="focused draggable" />
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
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
    await moveLeft(page, 4);

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
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
    await moveLeft(page, 4);

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
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
            <div draggable="false">
              <img
                src="${SAMPLE_IMAGE_URL}"
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
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
            <div draggable="false">
              <img
                src="https://lexical.dev/img/logo.svg"
                alt="lexical logo"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAAagAwAEAAAAAQAAAAcAAAAA/8IAEQgABwAGAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAMCBAEFAAYHCAkKC//EAMMQAAEDAwIEAwQGBAcGBAgGcwECAAMRBBIhBTETIhAGQVEyFGFxIweBIJFCFaFSM7EkYjAWwXLRQ5I0ggjhU0AlYxc18JNzolBEsoPxJlQ2ZJR0wmDShKMYcOInRTdls1V1pJXDhfLTRnaA40dWZrQJChkaKCkqODk6SElKV1hZWmdoaWp3eHl6hoeIiYqQlpeYmZqgpaanqKmqsLW2t7i5usDExcbHyMnK0NTV1tfY2drg5OXm5+jp6vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAQIAAwQFBgcICQoL/8QAwxEAAgIBAwMDAgMFAgUCBASHAQACEQMQEiEEIDFBEwUwIjJRFEAGMyNhQhVxUjSBUCSRoUOxFgdiNVPw0SVgwUThcvEXgmM2cCZFVJInotIICQoYGRooKSo3ODk6RkdISUpVVldYWVpkZWZnaGlqc3R1dnd4eXqAg4SFhoeIiYqQk5SVlpeYmZqgo6SlpqeoqaqwsrO0tba3uLm6wMLDxMXGx8jJytDT1NXW19jZ2uDi4+Tl5ufo6ery8/T19vf4+fr/2wBDAAIDAwMEAwQFBQQGBgYGBggIBwcICA0JCgkKCQ0TDA4MDA4MExEUEQ8RFBEeGBUVGB4jHRwdIyolJSo1MjVFRVz/2wBDAQIDAwMEAwQFBQQGBgYGBggIBwcICA0JCgkKCQ0TDA4MDA4MExEUEQ8RFBEeGBUVGB4jHRwdIyolJSo1MjVFRVz/2gAMAwEAAhEDEQAAAfBeXfV/i9n/2gAIAQEAAQUCmlT7p//aAAgBAxEBPwGWbIKo/wBmP+0f/9oACAECEQE/AYYoHddn7pf7V//aAAgBAQAGPwKFaUpWtZJJVUl//8QAMxABAAMAAgICAgIDAQEAAAILAREAITFBUWFxgZGhscHw0RDh8SAwQFBgcICQoLDA0OD/2gAIAQEAAT8hFyPFTveHPBl//9oADAMBAAIRAxEAABCL/8QAMxEBAQEAAwABAgUFAQEAAQEJAQARITEQQVFhIHHwkYGhsdHB4fEwQFBgcICQoLDA0OD/2gAIAQMRAT8QYOAdB9nP5t//2gAIAQIRAT8QEWh51X58fxf/2gAIAQEAAT8QJfU4BLBcKyeUzf/Z"
                alt="a pretty yellow flower :)"
                draggable="false"
                style="height: inherit; max-width: 500px; width: inherit;" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Can be dragged and dropped correctly when the image is clicked', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isPlainText);
    test.skip(browserName === 'firefox' && isCollab);
    test.skip(browserName === 'firefox' && IS_WINDOWS);

    await focusEditor(page);

    await page.keyboard.type('HelloWorld');
    await page.keyboard.press('Enter');

    await insertSampleImage(page);

    await click(page, '.editor-image img');

    // When actually using firefox, we can drag the image to the middle of the text,
    // but when running the playwright test, we can't get the correct values from `event.rangeParent` and `event.rangeOffset`,
    // so for now we can only test the case of dragging the image to the end of the text
    if (browserName === 'firefox') {
      await dragImage(page, 'span[data-lexical-text="true"]', 'middle', 'end');

      await waitForSelector(page, '.editor-image img');

      await click(
        page,
        'div.ContentEditable__root > p:first-of-type > span:first-of-type',
      );

      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">HelloWorld</span>
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
            <br />
          </p>
          <p class="PlaygroundEditorTheme__paragraph">
            <br />
          </p>
        `,
      );
    } else {
      await dragImage(page, 'span[data-lexical-text="true"]');

      await waitForSelector(page, '.editor-image img');

      await click(
        page,
        'div.ContentEditable__root > p:first-of-type > span:first-of-type',
      );

      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
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
            <span data-lexical-text="true">World</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph">
            <br />
          </p>
        `,
      );
    }
  });

  test('Cannot be dragged without being clicked', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('HelloWorld');
    await page.keyboard.press('Enter');

    await insertSampleImage(page);

    await dragImage(page, 'span[data-lexical-text="true"]');

    await waitForSelector(page, '.editor-image img');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">HelloWorld</span>
        </p>
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
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Select image, then select text - EditorState._selection updates with mousedown #2901', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('HelloWorld');
    await page.keyboard.press('Enter');
    await insertSampleImage(page);
    await click(page, '.editor-image img');

    const textBoundingBox = await selectorBoundingBox(
      page,
      'span[data-lexical-text="true"]',
    );
    await dragMouse(page, textBoundingBox, textBoundingBox, 'start', 'middle');

    const lexicalSelection = await evaluate(page, (editor) => {
      return window.lexicalEditor._editorState._selection;
    });
    expect(lexicalSelection.anchor).toBeTruthy();
    expect(lexicalSelection.focus).toBeTruthy();
  });

  test('Node selection: can select multiple image nodes and replace them with a new image', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('text1');
    await page.keyboard.press('Enter');
    await insertSampleImage(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('text2');
    await page.keyboard.press('Enter');
    await insertSampleImage(page, 'alt');
    await page.keyboard.press('Enter');
    await page.keyboard.type('text3');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text1</span>
        </p>
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
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text2</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Daylight fir trees forest glacier green high ice landscape"
                draggable="false"
                src="${SAMPLE_LANDSCAPE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text3</span>
        </p>
      `,
    );

    await click(
      page,
      '.editor-image img[alt="Yellow flower in tilt shift lens"]',
    );
    await page.keyboard.down('Shift');
    await click(
      page,
      '.editor-image img[alt="Daylight fir trees forest glacier green high ice landscape"]',
    );
    await page.keyboard.up('Shift');

    await insertSampleImage(page);
    await page.keyboard.type(' <- it works!');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text1</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text2</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
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
          <span data-lexical-text="true">&lt;- it works!</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text3</span>
        </p>
      `,
    );
  });
});
