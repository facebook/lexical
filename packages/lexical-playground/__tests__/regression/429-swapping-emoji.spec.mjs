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
} from '../utils/index.mjs';

test.describe('Regression test #429', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can add new lines before the line with emoji`, async ({
    isRichText,
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(':) or :(');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true">or</span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 2, 0, 0],
      focusOffset: 2,
      focusPath: [0, 2, 0, 0],
    });

    await moveLeft(page, 6);
    await page.keyboard.press('Enter');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true">or</span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [1, 0, 0, 0],
        focusOffset: 0,
        focusPath: [1, 0, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true">or</span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0, 0],
      });
    }

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true">or</span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0, 0],
    });
  });
});
