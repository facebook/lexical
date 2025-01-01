/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  deleteBackward,
  moveToLineBeginning,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Regression tests for #6974', () => {
  test.beforeEach(({isPlainText, isCollab, page}) =>
    initialize({isCollab, isPlainText, page}),
  );

  test(`deleteCharacter merges children from adjacent blocks even if the previous leaf is an inline decorator`, async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.skip(isCollab || isPlainText);
    await focusEditor(page);
    const testEquation = '$x$';
    const testString = 'test';
    await page.keyboard.type(testEquation);
    await page.keyboard.press('Enter');
    await page.keyboard.type(testString);
    const beforeHtml = html`
      <p>
        <span contenteditable="false" data-lexical-decorator="true">
          <img alt="" src="#" />
          <span role="button" tabindex="-1">
            <span>
              <span aria-hidden="true">
                <span>
                  <span></span>
                  <span>x</span>
                </span>
              </span>
            </span>
          </span>
          <img alt="" src="#" />
        </span>
        <br />
      </p>
      <p dir="ltr"><span data-lexical-text="true">test</span></p>
    `;
    await assertHTML(page, beforeHtml, beforeHtml, {
      ignoreClasses: true,
      ignoreInlineStyles: true,
    });
    await moveToLineBeginning(page);
    await deleteBackward(page);
    const afterHtml = html`
      <p dir="ltr">
        <span contenteditable="false" data-lexical-decorator="true">
          <img alt="" src="#" />
          <span role="button" tabindex="-1">
            <span>
              <span aria-hidden="true">
                <span>
                  <span></span>
                  <span>x</span>
                </span>
              </span>
            </span>
          </span>
          <img alt="" src="#" />
        </span>
        <span data-lexical-text="true">test</span>
      </p>
    `;
    await assertHTML(page, afterHtml, afterHtml, {
      ignoreClasses: true,
      ignoreInlineStyles: true,
    });
  });
});
