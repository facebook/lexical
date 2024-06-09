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
  moveToLineBeginning,
  moveToLineEnd,
  selectAll,
  selectCharacters,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../utils/index.mjs';

test.describe('Auto Links', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can convert url-like text into links', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hello http://example.com and https://example.com/path?with=query#and-hash and www.example.com',
    );
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com" dir="ltr">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://example.com/path?with=query#and-hash" dir="ltr">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://www.example.com" dir="ltr">
            <span data-lexical-text="true">www.example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can destruct links if add non-spacing text in front or right after it', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    const htmlWithLink = html`
      <p dir="ltr">
        <a href="http://example.com" dir="ltr">
          <span data-lexical-text="true">http://example.com</span>
        </a>
      </p>
    `;

    await focusEditor(page);
    await page.keyboard.type('http://example.com');
    await assertHTML(page, htmlWithLink, undefined, {ignoreClasses: true});

    // Add non-url text after the link
    await page.keyboard.type('!');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">http://example.com!</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await page.keyboard.press('Backspace');
    await assertHTML(page, htmlWithLink, undefined, {ignoreClasses: true});

    // Add non-url text before the link
    await moveToLineBeginning(page);
    await page.keyboard.type('!');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">!http://example.com</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await page.keyboard.press('Backspace');
    await assertHTML(page, htmlWithLink, undefined, {ignoreClasses: true});

    // Add newline after link
    await moveToLineEnd(page);
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      htmlWithLink +
        html`
          <p><br /></p>
        `,
      undefined,
      {ignoreClasses: true},
    );
    await page.keyboard.press('Backspace');
    await assertHTML(page, htmlWithLink, undefined, {ignoreClasses: true});
  });

  test('Can create link when pasting text with urls', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain':
        'Hello http://example.com and https://example.com/path?with=query#and-hash and www.example.com',
    });
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com" dir="ltr">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://example.com/path?with=query#and-hash" dir="ltr">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://www.example.com" dir="ltr">
            <span data-lexical-text="true">www.example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Does not create redundant auto-link', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('hm');

    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a href="https://" dir="ltr" rel="noreferrer">
            <span data-lexical-text="true">hm</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await moveLeft(page, 1);
    await moveRight(page, 1);
    await page.keyboard.type('ttps://facebook.co');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a href="https://" dir="ltr" rel="noreferrer">
            <span data-lexical-text="true">https://facebook.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can create links when pasting text with multiple autolinks in a row separated by non-alphanumeric characters, but not whitespaces', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain': 'https://1.com/,https://2.com/;;;https://3.com',
    });
    await assertHTML(
      page,
      html`
        <p>
          <a href="https://1.com/" dir="ltr">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true">,</span>
          <a href="https://2.com/" dir="ltr">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true">;;;</span>
          <a href="https://3.com" dir="ltr">
            <span data-lexical-text="true">https://3.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Handles multiple autolinks in a row', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain':
        'https://1.com/ https://2.com/ https://3.com/ https://4.com/',
    });
    await assertHTML(
      page,
      html`
        <p>
          <a href="https://1.com/" dir="ltr">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://2.com/" dir="ltr">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://3.com/" dir="ltr">
            <span data-lexical-text="true">https://3.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://4.com/" dir="ltr">
            <span data-lexical-text="true">https://4.com/</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Handles autolink following an invalid autolink', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hellohttps://example.com https://example.com');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">Hellohttps://example.com</span>
          <a href="https://example.com" dir="ltr">
            <span data-lexical-text="true">https://example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can convert url-like text with formatting into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hellohttp://example.com and more');

    // Add bold formatting to com
    await moveToLineBeginning(page);
    await moveRight(page, 20);
    await selectCharacters(page, 'right', 3);
    await toggleBold(page);

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">Hellohttp://example.</span>
          <strong data-lexical-text="true">com</strong>
          <span data-lexical-text="true">and more</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );

    // Add space before formatted link text
    await moveToLineBeginning(page);
    await moveRight(page, 5);
    await page.keyboard.type(' ');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com" dir="ltr">
            <span data-lexical-text="true">http://example.</span>
            <strong data-lexical-text="true">com</strong>
          </a>
          <span data-lexical-text="true">and more</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can convert url-like text with styles into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    //increase font size
    await click(page, '.font-increment');
    await click(page, '.font-increment');

    await page.keyboard.type('Hellohttp://example.com and more');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span style="font-size: 19px;" data-lexical-text="true">
            Hellohttp://example.com and more
          </span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );

    // Add space before link text
    await moveToLineBeginning(page);
    await moveRight(page, 5);
    await page.keyboard.type(' ');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span style="font-size: 19px;" data-lexical-text="true">Hello</span>
          <a href="http://example.com" dir="ltr">
            <span style="font-size: 19px;" data-lexical-text="true">
              http://example.com
            </span>
          </a>
          <span style="font-size: 19px;" data-lexical-text="true">
            and more
          </span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
