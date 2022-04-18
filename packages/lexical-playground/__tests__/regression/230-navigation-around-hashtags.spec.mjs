/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveLeft} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Regression test #230', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Is able to right arrow before hashtag after inserting text node`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('#foo');
    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
    await moveLeft(page, 4);
    await page.keyboard.type('a');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ArrowRight');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #foo
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 0, 0],
      focusOffset: 1,
      focusPath: [0, 0, 0],
    });
  });
});
