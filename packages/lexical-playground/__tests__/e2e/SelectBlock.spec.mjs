/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  selectAll,
  selectCharacters,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  html,
  initialize,
  insertCollapsible,
  insertDateTime,
  insertSampleImage,
  pressInsertLinkButton,
  test,
} from '../utils/index.mjs';

async function setupMultiContent(page) {
  await focusEditor(page);
  await page.keyboard.type('Lorem ipsum dolor ');
  await toggleBold(page);
  await page.keyboard.type('sit amet');
  await toggleBold(page);
  await page.keyboard.type(', consectetur adipiscing elit.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Link text');
  await pressInsertLinkButton(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await insertSampleImage(page);
  await page.keyboard.press('Enter');
}

test.describe('SelectBlock', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isCollab, page, selectBlock: true}),
  );

  test('Select paragraph with simple text only', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('Simple text');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 1,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 11,
      focusPath: [3, 0, 0],
    });
  });

  test('Select paragraph with formatted text', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('Formatted ');
    await toggleBold(page);
    await page.keyboard.type('text');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 2,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [3, 1, 0],
    });
  });

  test('Select paragraph with inline element', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('link');
    await pressInsertLinkButton(page);
    await page.keyboard.press('Enter');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 1,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [3, 0, 0, 0],
    });
  });

  test('Select paragraph with [inline decorator, text]', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await insertDateTime(page);
    await page.keyboard.type(' text');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 2,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [3, 1, 0],
    });
  });

  test('Select paragraph with [text, inline decorator]', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('text ');
    await insertDateTime(page);
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 2,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 2,
      focusPath: [3],
    });
  });

  test('Select paragraph with [text, inline decorator, text]', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('text ');
    await insertDateTime(page);
    await page.keyboard.type(' text');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 3,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [3, 2, 0],
    });
  });

  test('Select paragraph with [element, inline decorator]', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await page.keyboard.type('link');
    await pressInsertLinkButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type(' ');
    await insertDateTime(page);
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 3,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [3],
    });
  });

  test('Select paragraph with [inline decorator, element]', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);

    await insertDateTime(page);
    await page.keyboard.type(' link');
    await pressInsertLinkButton(page);
    await page.keyboard.press('Enter');
    await selectAll(page);
    // select only current block
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 2,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [3, 1, 0, 0],
    });
  });

  test('Select empty paragraph should trigger selectAll', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    // selection on empty paragraph
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 0,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [3],
    });
  });

  test('Repeated selectAll should not change the current selection', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    // selection on empty paragraph
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 0,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [3],
    });

    // once again
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [3],
    });
  });

  test('The block is selected if part of the text is already selected', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    await page.keyboard.type('my text');
    await selectCharacters(page, 'left', 4);
    // current selection on 'text'
    await assertSelection(page, {
      anchorOffset: 7,
      anchorPath: [3, 0, 0],
      focusOffset: 3,
      focusPath: [3, 0, 0],
    });

    // select block
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 1,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 7,
      focusPath: [3, 0, 0],
    });
  });

  test('Select paragraph with focus on decorator', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    await page.keyboard.type('my text');
    await insertSampleImage(page);
    await insertSampleImage(page);
    await selectCharacters(page, 'left', 1);
    // current selection on image
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [3],
      focusOffset: 2,
      focusPath: [3],
    });
    // check focused last image
    if (!isCollab) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">Lorem ipsum dolor</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              sit amet
            </strong>
            <span data-lexical-text="true">, consectetur adipiscing elit.</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <a
              class="PlaygroundEditorTheme__link"
              href="https://"
              rel="noreferrer">
              <span data-lexical-text="true">Link text</span>
            </a>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
              </div>
            </span>
            <br />
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">my text</span>
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
              </div>
            </span>
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  class="focused"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
              </div>
            </span>
            <br />
          </p>
        `,
        true,
        {ignoreInlineStyles: true},
      );
    }

    // select block
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 3,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [3],
    });
  });

  test('Select with node selection on multiple decorators within one parent', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    await page.keyboard.type('my text');
    await insertSampleImage(page);
    await insertSampleImage(page);

    await click(page, 'p:last-of-type .editor-image:nth-of-type(2) img');
    await click(page, 'p:last-of-type .editor-image:nth-of-type(3) img', {
      modifiers: ['Shift'],
    });

    // node selection does not have native window selection
    if (browserName === 'webkit' || browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [],
        focusOffset: 0,
        focusPath: [],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 0, 0],
        focusOffset: 0,
        focusPath: [0, 0, 0],
      });
    }
    // check focused both images
    if (!isCollab) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">Lorem ipsum dolor</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              sit amet
            </strong>
            <span data-lexical-text="true">, consectetur adipiscing elit.</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <a
              class="PlaygroundEditorTheme__link"
              href="https://"
              rel="noreferrer">
              <span data-lexical-text="true">Link text</span>
            </a>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
              </div>
            </span>
            <br />
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">my text</span>
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="true">
                <img
                  class="focused draggable"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
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
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="true">
                <img
                  class="focused draggable"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
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
        {ignoreInlineStyles: true},
      );
    }

    // select block
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [3],
      focusOffset: 3,
      focusPath: [3],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [3],
    });
  });

  test('Select with node selection on multiple decorators from different parent elements', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
  }) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    await page.keyboard.type('my text');
    await insertSampleImage(page);
    await insertSampleImage(page);

    await click(page, 'p .editor-image:nth-of-type(1) img');
    await click(page, 'p:last-of-type .editor-image:nth-of-type(2) img', {
      modifiers: ['Shift'],
    });

    // node selection does not have native window selection
    if (browserName === 'webkit' || browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [],
        focusOffset: 0,
        focusPath: [],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 0, 0],
        focusOffset: 0,
        focusPath: [0, 0, 0],
      });
    }
    // check focused both images
    if (!isCollab) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">Lorem ipsum dolor</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              sit amet
            </strong>
            <span data-lexical-text="true">, consectetur adipiscing elit.</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <a
              class="PlaygroundEditorTheme__link"
              href="https://"
              rel="noreferrer">
              <span data-lexical-text="true">Link text</span>
            </a>
          </p>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="true">
                <img
                  class="focused draggable"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
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
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">my text</span>
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="true">
                <img
                  class="focused draggable"
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
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
            <span
              class="editor-image"
              contenteditable="false"
              data-lexical-decorator="true">
              <div draggable="false">
                <img
                  alt="Yellow flower in tilt shift lens"
                  draggable="false"
                  src="/src/images/yellow-flower.jpg" />
              </div>
            </span>
            <br />
          </p>
        `,
        true,
        {ignoreInlineStyles: true},
      );
    }

    // select all content at once
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [3],
    });
  });

  test('Select within shadow root', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await setupMultiContent(page);
    await insertCollapsible(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('my text');
    // current selection
    await assertSelection(page, {
      anchorOffset: 7,
      anchorPath: [4, 1, 0, 0, 0],
      focusOffset: 7,
      focusPath: [4, 1, 0, 0, 0],
    });

    // select block (paragraph) within container
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [4, 1, 0],
      focusOffset: 1,
      focusPath: [4, 1, 0],
    });

    // select all content
    await selectAll(page);
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [5],
    });
  });
});
