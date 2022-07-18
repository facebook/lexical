/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToEditorBeginning} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Regression test #379', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Is able to correctly handle backspace press at the line boundary`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });
    await moveToEditorBeginning(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });
  });
});
