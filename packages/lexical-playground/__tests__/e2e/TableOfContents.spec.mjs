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
  html,
  initialize,
  //   repeat,
  selectFromFormatDropdown,
  test,
  //   waitForSelector,
} from '../utils/index.mjs';

test.describe('Hashtags', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can handle a single hashtag`, async ({page}) => {
    await focusEditor(page);
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('Hello');
    await page.keyboard.type('\n');
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type(' World');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolo
          </span>
        </p>
      `,
    );
  });
});
