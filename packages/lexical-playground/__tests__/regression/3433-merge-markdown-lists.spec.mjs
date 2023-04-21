/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #3433', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('can merge markdown lists created immediately before existing lists', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('- one');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('- two');
    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">two</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">one</span>
          </li>
        </ul>
      `,
    );
  });
});
