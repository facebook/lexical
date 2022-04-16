/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  click,
  E2E_PORT,
  focusEditor,
  html,
  initialize,
  selectFromInsertDropdown,
  test,
} from '../utils/index.mjs';

const IMAGE_URL =
  E2E_PORT === 3000
    ? '/src/images/yellow-flower.jpg'
    : '/assets/yellow-flower.bf6d0400.jpg';

test.describe('Toolbar', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isCollab, page, showNestedEditorTreeView: false}),
  );

  test('Insert image caption + table', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Add caption
    await selectFromInsertDropdown(page, '.image');
    await click(page, '.editor-image img');
    await click(page, '.image-caption-button');
    await page.focus('.ImageNode__contentEditable');
    await page.keyboard.type('Yellow flower in tilt shift lens');
    await assertHTML(
      page,
      html`
        <p>
          <span contenteditable="false" data-lexical-decorator="true">
            <img alt="Yellow flower in tilt shift lens" src="${IMAGE_URL}" />
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
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );

    // Delete image
    await click(page, '.editor-image img');
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p><br /></p>
      `,
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
      {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      },
    );
  });
});
