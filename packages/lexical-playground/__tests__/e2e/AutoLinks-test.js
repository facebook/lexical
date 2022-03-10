/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineBeginning, moveToLineEnd} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  focusEditor,
  pasteFromClipboard,
} from '../utils';

describe('Auto Links', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      'Can convert url-like text into links',
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type(
          'Hello http://example.com and https://example.com/path?with=query#and-hash and www.example.com',
        );
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><a href="http://example.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">http://example.com</span></a><span data-lexical-text="true"> and </span><a href="https://example.com/path?with=query#and-hash" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">https://example.com/path?with=query#and-hash</span></a><span data-lexical-text="true"> and </span><a href="www.example.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">www.example.com</span></a></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Can destruct links if add non-spacing text in front or right after it',
      async () => {
        const {page} = e2e;
        const htmlWithLink =
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><a href="http://example.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">http://example.com</span></a></p>';

        await focusEditor(page);
        await page.keyboard.type('http://example.com');
        await assertHTML(page, htmlWithLink);

        // Add non-url text after the link
        await page.keyboard.type('!');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">http://example.com!</span></p>',
        );
        await page.keyboard.press('Backspace');
        await assertHTML(page, htmlWithLink);

        // Add non-url text before the link
        await moveToLineBeginning(page);
        await page.keyboard.type('!');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">!http://example.com</span></p>',
        );
        await page.keyboard.press('Backspace');
        await assertHTML(page, htmlWithLink);

        // Add newline after link
        await moveToLineEnd(page);
        await page.keyboard.press('Enter');
        await assertHTML(
          page,
          htmlWithLink +
            '<p class="PlaygroundEditorTheme__paragraph"><br /></p>',
        );
        await page.keyboard.press('Backspace');
        await assertHTML(page, htmlWithLink);
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Can create link when pasting text with urls',
      async () => {
        const {page} = e2e;
        await focusEditor(page);
        await pasteFromClipboard(page, {
          'text/plain':
            'Hello http://example.com and https://example.com/path?with=query#and-hash and www.example.com',
        });
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><a href="http://example.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">http://example.com</span></a><span data-lexical-text="true"> and </span><a href="https://example.com/path?with=query#and-hash" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">https://example.com/path?with=query#and-hash</span></a><span data-lexical-text="true"> and </span><a href="www.example.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">www.example.com</span></a></p>',
        );
      },
    );
  });
});
