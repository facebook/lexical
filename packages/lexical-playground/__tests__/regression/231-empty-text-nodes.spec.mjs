/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveRight,
  pressBackspace,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Regression test #231', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Does not generate segment error when editing empty text nodes`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('#foo');
    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
    await moveLeft(page, 4);
    await page.keyboard.type('a');
    await page.keyboard.press('Backspace');
    await moveRight(page, 5);
    await pressBackspace(page, 5);
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
});
