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
  IS_MAC,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #399', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Supports Ctrl-O as an open line command`, async ({
    page,
    isRichText,
  }) => {
    // This is a Mac only command
    if (!IS_MAC) {
      return;
    }

    await focusEditor(page);
    await page.keyboard.type('foo');
    await page.keyboard.press('Enter');
    await page.keyboard.type('bar');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">foo</span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 3,
        anchorPath: [1, 0, 0],
        focusOffset: 3,
        focusPath: [1, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">foo</span>
            <br />
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 3,
        anchorPath: [0, 2, 0],
        focusOffset: 3,
        focusPath: [0, 2, 0],
      });
    }

    await moveLeft(page, 3);
    await page.keyboard.press('Control+KeyO');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">foo</span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <br />
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [1],
        focusOffset: 0,
        focusPath: [1],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">foo</span>
            <br />
            <br />
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0],
        focusOffset: 2,
        focusPath: [0],
      });
    }
  });
});
