/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {assertHTML, click, focusEditor, initialize,test} from '../utils/index.mjs';

test.describe('Clear', () => {
  test.beforeEach(({ isCollab, page }) => initialize({ isCollab, page }));
  test(`can clear the editor`, async ({page}) => {
    await focusEditor(page);

    await page.keyboard.type('foo');
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foo</span></p>',
    );

    await click(page, '.action-button.clear');
    await page.keyboard.type('bar');
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">bar</span></p>',
    );
  });
});
