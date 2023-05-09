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
  toggleBold,
  toggleUnderline,
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
      'Hello http://example.com and https://example.com/path?with=query#and-hash and www.example.com and https://www.test.example/avatar.png',
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
          <span data-lexical-text="true">and</span>
          <a href="https://www.test.example/avatar.png" dir="ltr">
            <span data-lexical-text="true">
              https://www.test.example/avatar.png
            </span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can convert url-like text composed of multiple text nodes into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('https://');
    await toggleUnderline(page);
    await page.keyboard.type('www');
    await toggleUnderline(page);
    await page.keyboard.type('.');
    await toggleBold(page);
    await page.keyboard.type('example');
    await toggleBold(page);
    await page.keyboard.type('.com');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a dir="ltr" href="https://www.example.com">
            <span data-lexical-text="true">https://</span>
            <span data-lexical-text="true">www</span>
            <span data-lexical-text="true">.</span>
            <strong data-lexical-text="true">example</strong>
            <span data-lexical-text="true">.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Auto-link remains unchanged when non-url-forming text is added front or after', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    const htmlWithLink = html`
      <p>
        <a href="http://example.com" dir="ltr">
          <span data-lexical-text="true">http://example.com</span>
        </a>
      </p>
    `;

    await focusEditor(page);
    await page.keyboard.type('http://example.com');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a href="http://example.com" dir="ltr">
            <span data-lexical-text="true">http://example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );

    // Add non-url text after the link
    await page.keyboard.type('!');
    await assertHTML(
      page,
      html`
        <p>
          <a dir="ltr" href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">!</span>
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
        <p>
          <span data-lexical-text="true">!</span>
          <a dir="ltr" href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
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

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a href="https://" dir="ltr" rel="noopener">
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
          <a href="https://" dir="ltr" rel="noopener">
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

  test('Can destruct link when changed to non-url-forming text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('http://example.com');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a href="http://example.com" dir="ltr">
            <span data-lexical-text="true">http://example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await moveLeft(page, 3);
    await page.keyboard.type('.');
    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <span data-lexical-text="true">http://example..com</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can create links if the text resulting from splitting the text of the AutoLinkNode url-like', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain': 'www.exampletest.example',
    });
    await assertHTML(
      page,
      html`
        <p>
          <a dir="ltr" href="https://www.exampletest.example">
            <span data-lexical-text="true">www.exampletest.example</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await moveLeft(page, 12);
    await page.keyboard.type(' ');
    await assertHTML(
      page,
      html`
        <p>
          <a dir="ltr" href="https://www.example">
            <span data-lexical-text="true">www.example</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="https://test.example">
            <span data-lexical-text="true">test.example</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
