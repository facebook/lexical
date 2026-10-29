/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {pressBackspace} from '../keyboardShortcuts/index.mjs';
import {assertHTML, html, initialize, test} from '../utils/index.mjs';

function testSuite() {
  test('handles auto link nodes', async ({page}) => {
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('1234:)56 www.example.com');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">1234</span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true">56</span>
            <a
              class="PlaygroundEditorTheme__link"
              href="https://www.example.com">
              <span data-lexical-text="true">www.example.com</span>
            </a>
          </span>
        </p>
      `,
    );

    await pressBackspace(page, 3);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">1234</span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true">56 www.example.</span>
          </span>
        </p>
      `,
    );
  });
}

test.skip(({isCollab}) => isCollab, 'Requires non-collaborative editing');

test.describe('CharacterLimit', () => {
  test.describe('UTF-16', () => {
    test.use({isCharLimit: true});
    test.beforeEach(({isCollab, page, isCharLimit, isCharLimitUtf8}) =>
      initialize({isCharLimit, isCharLimitUtf8, isCollab, page}),
    );
    testSuite();
  });

  test.describe('UTF-8', () => {
    test.use({isCharLimitUtf8: true});
    test.beforeEach(({isCollab, page, isCharLimit, isCharLimitUtf8}) =>
      initialize({isCharLimit, isCharLimitUtf8, isCollab, page}),
    );
    testSuite();
  });
});
