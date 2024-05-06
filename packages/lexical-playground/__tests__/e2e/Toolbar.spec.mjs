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
  toggleItalic,
  toggleUnderline,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  evaluate,
  expect,
  focus,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
  SAMPLE_IMAGE_URL,
  selectFromAlignDropdown,
  selectFromInsertDropdown,
  test,
} from '../utils/index.mjs';

test.describe('Toolbar', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isCollab, page, showNestedEditorTreeView: false}),
  );

  test('Insert image caption + table', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Add caption
    await insertSampleImage(page);
    // Catch flakiness earlier
    await assertHTML(
      page,
      html`
        <p>
          <span contenteditable="false" data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}" />
            </div>
          </span>
          <br />
        </p>
      `,
      undefined,
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );
    await click(page, '.editor-image img');
    await click(page, '.image-caption-button');
    await focus(page, '.ImageNode__contentEditable');
    await page.keyboard.type('Yellow flower in tilt shift lens');
    await assertHTML(
      page,
      html`
        <p>
          <span contenteditable="false" data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Yellow flower in tilt shift lens"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}" />
            </div>
            <div>
              <div
                contenteditable="true"
                role="textbox"
                spellcheck="true"
                data-lexical-editor="true">
                <p dir="ltr">
                  <span data-lexical-text="true">
                    Yellow flower in tilt shift lens
                  </span>
                </p>
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
      undefined,
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );

    // Delete image
    // TODO Revisit the a11y side of NestedEditors
    await evaluate(page, () => {
      const p = document.querySelector('[contenteditable="true"] p');
      document.getSelection().setBaseAndExtent(p, 0, p, 0);
    });
    await selectAll(page);
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p><br /></p>
      `,
      undefined,
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );

    // Add table
    await selectFromInsertDropdown(page, '.table');
    await click(page, '[data-test-id="table-model-confirm-insert"] button');

    await assertHTML(
      page,
      html`
        <p>
          <br />
        </p>
        <table>
          <tr>
            <th>
              <p><br /></p>
            </th>
            <th>
              <p><br /></p>
            </th>
            <th>
              <p><br /></p>
            </th>
            <th>
              <p><br /></p>
            </th>
            <th>
              <p><br /></p>
            </th>
          </tr>
          <tr>
            <th>
              <p><br /></p>
            </th>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
          </tr>
          <tr>
            <th>
              <p><br /></p>
            </th>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
          </tr>
          <tr>
            <th>
              <p><br /></p>
            </th>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
          </tr>
          <tr>
            <th>
              <p><br /></p>
            </th>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
            <td>
              <p><br /></p>
            </td>
          </tr>
        </table>
        <p><br /></p>
      `,
      undefined,
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );
  });

  test('Center align image', async ({page, isPlainText, isCollab}) => {
    // Image selection can't be synced in collab
    test.skip(isPlainText || isCollab);
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
                alt="Yellow flower in tilt shift lens"
                class="focused draggable"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit" />
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

    await focus(page, '.editor-image');
    await page.pause();
    await selectFromAlignDropdown(page, '.center-align');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" style="text-align: center">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="true">
              <img
                alt="Yellow flower in tilt shift lens"
                class="focused draggable"
                draggable="false"
                src="${SAMPLE_IMAGE_URL}"
                style="height: inherit; max-width: 500px; width: inherit" />
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
  });

  test('When we select three textNodes with different formatting at the same time, the selection formatting should show no formatting at all', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);

    await toggleBold(page);
    await page.keyboard.type('A ');
    await toggleBold(page);
    await toggleItalic(page);
    await page.keyboard.type('B ');
    await toggleItalic(page);
    await toggleUnderline(page);
    await page.keyboard.type('C');
    await selectCharacters(page, 'left', 5);

    const actives = await page.$$('div.toolbar button.toolbar-item.active');
    expect(actives.length).toEqual(0);
  });

  test('Selecting empty paragraphs has empty selection format', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.press('Enter');
    await selectAll(page);
    const actives = await page.$$('div.toolbar button.toolbar-item.active');
    expect(actives.length).toEqual(0);
  });
});
