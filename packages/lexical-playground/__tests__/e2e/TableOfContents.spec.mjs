/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Testing:
// A: Inserting headings adds them to the table of contents
// B: Scrolling in the page upates the selected class of the table of contents.

// import {
//   deleteNextWord,
//   moveLeft,
//   moveToEditorBeginning,
// } from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  getElement,
  html,
  initialize,
  selectFromFormatDropdown,
  test,
  //   waitForSelector,
} from '../utils/index.mjs';

test.describe('Hashtags', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Adding headigns to editor adds them to table of contents`, async ({
    page,
  }) => {
    await focusEditor(page);
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('Hello');
    await page.keyboard.type('\n');
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('World!');
    const tableOfContents = await getElement(page, 'ul.table-of-contents');
    await assertHTML(
      tableOfContents,
      html`
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>Hello</li>
        </div>
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>World!</li>
        </div>
      `,
    );
  });
});
