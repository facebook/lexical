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
  pressInsertLinkButton,
  test,
} from '../utils/index.mjs';

test.describe.parallel('Auto Links', () => {
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
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://example.com/path?with=query#and-hash">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://www.example.com">
            <span data-lexical-text="true">www.example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can convert url-like text into links for email', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hello name@example.com and anothername@test.example.uk !',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="mailto:name@example.com">
            <span data-lexical-text="true">name@example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="mailto:anothername@test.example.uk">
            <span data-lexical-text="true">anothername@test.example.uk</span>
          </a>
          <span data-lexical-text="true">!</span>
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
      <p dir="auto">
        <a href="http://example.com">
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
        <p dir="auto">
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
        <p dir="auto">
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
          <p dir="auto"><br /></p>
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
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://example.com/path?with=query#and-hash">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://www.example.com">
            <span data-lexical-text="true">www.example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can create link for email when pasting text with urls', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain':
        'Hello name@example.com and anothername@test.example.uk and www.example.com !',
    });
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="mailto:name@example.com">
            <span data-lexical-text="true">name@example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="mailto:anothername@test.example.uk">
            <span data-lexical-text="true">anothername@test.example.uk</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a href="https://www.example.com">
            <span data-lexical-text="true">www.example.com</span>
          </a>
          <span data-lexical-text="true">!</span>
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
        <p dir="auto">
          <a href="https://" rel="noreferrer">
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
        <p dir="auto">
          <a href="https://" rel="noreferrer">
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
      'text/plain':
        'https://1.com/,https://2.com/;;;https://3.com;name@domain.uk;',
    });
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <a href="https://1.com/">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true">,</span>
          <a href="https://2.com/">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true">;;;</span>
          <a href="https://3.com">
            <span data-lexical-text="true">https://3.com</span>
          </a>
          <span data-lexical-text="true">;</span>
          <a href="mailto:name@domain.uk">
            <span data-lexical-text="true">name@domain.uk</span>
          </a>
          <span data-lexical-text="true">;</span>
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
        'https://1.com/ https://2.com/ https://3.com/ https://4.com/ name-lastname@meta.com',
    });
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <a href="https://1.com/">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://2.com/">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://3.com/">
            <span data-lexical-text="true">https://3.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="https://4.com/">
            <span data-lexical-text="true">https://4.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="mailto:name-lastname@meta.com">
            <span data-lexical-text="true">name-lastname@meta.com</span>
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
        <p dir="auto">
          <span data-lexical-text="true">Hellohttps://example.com</span>
          <a href="https://example.com">
            <span data-lexical-text="true">https://example.com</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Handles autolink following an invalid autolink to email', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hello name@example.c name@example.1 name-lastname@example.com name.lastname@meta.com',
    );

    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">
            Hello name@example.c name@example.1
          </span>
          <a href="mailto:name-lastname@example.com">
            <span data-lexical-text="true">name-lastname@example.com</span>
          </a>
          <span data-lexical-text="true"></span>
          <a href="mailto:name.lastname@meta.com">
            <span data-lexical-text="true">name.lastname@meta.com</span>
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
        <p dir="auto">
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
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="http://example.com">
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
        <p dir="auto">
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
        <p dir="auto">
          <span style="font-size: 19px;" data-lexical-text="true">Hello</span>
          <a href="http://example.com">
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

  test.describe('Can convert URL into an autolink', () => {
    [
      // Basic URLs
      'http://example.com', // Standard HTTP URL
      'https://example.com', // Standard HTTPS URL
      'http://www.example.com', // HTTP URL with www
      'https://www.example.com', // HTTPS URL with www
      'www.example.com', // Missing HTTPS Protocol

      // With Different TLDs
      'http://example.org', // URL with .org TLD
      'https://example.net', // URL with .net TLD
      'http://example.co.uk', // URL with country code TLD
      'https://example.xyz', // URL with generic TLD

      // With Paths
      'http://example.com/path/to/resource', // URL with path
      'https://www.example.com/path/to/resource', // URL with www and path

      // With Query Parameters
      'http://example.com/path?name=value', // URL with query parameters
      'https://www.example.com/path?name=value&another=value2', // URL with multiple query parameters

      // With Fragments
      'http://example.com/path#section', // URL with fragment
      'https://www.example.com/path/to/resource#fragment', // URL with path and fragment

      // With Port Numbers
      'http://example.com:8080', // URL with port number
      'https://www.example.com:443/path', // URL with port number and path

      // IP Addresses
      'http://192.168.0.1', // URL with IPv4 address
      'https://127.0.0.1', // URL with localhost IPv4 address

      // With Special Characters in Path and Query
      'http://example.com/path/to/res+ource', // URL with plus in path
      'https://example.com/path/to/res%20ource', // URL with encoded space in path
      'http://example.com/path?name=va@lue', // URL with special character in query
      'https://example.com/path?name=value&another=val%20ue', // URL with encoded space in query

      // Subdomains and Uncommon TLDs
      'http://subdomain.example.com', // URL with subdomain
      'https://sub.subdomain.example.com', // URL with multiple subdomains
      'http://example.museum', // URL with uncommon TLD
      'https://example.travel', // URL with uncommon TLD

      // Edge Cases
      'http://foo.bar', // Minimal URL with uncommon TLD
      'https://foo.bar', // HTTPS minimal URL with uncommon TLD
    ].forEach((testUrl) =>
      test(testUrl, async ({page, isPlainText}) => {
        test.skip(isPlainText);
        await focusEditor(page);
        await page.keyboard.type(`${testUrl} ltr`);

        const rawUrl = testUrl.replaceAll(/&/g, '&amp;');
        const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

        await assertHTML(
          page,
          html`
            <p dir="auto">
              <a href="${url}">
                <span data-lexical-text="true">${rawUrl}</span>
              </a>
              <span data-lexical-text="true">ltr</span>
            </p>
          `,
          undefined,
          {ignoreClasses: true},
        );
      }),
    );
  });

  test.describe('Can convert URL into an email autolink', () => {
    [
      // Email usecases
      'email@domain.com',
      'firstname.lastname@domain.com',
      'email@subdomain.domain.com',
      'firstname+lastname@domain.com',
      'email@[123.123.123.123]',
      '"email"@domain.com',
      '1234567890@domain.com',
      'email@domain-one.com',
      '_______@domain.com',
      'email@domain.name',
      'email@domain.co.uk',
      'firstname-lastname@domain.com',
    ].forEach((testUrl) =>
      test(testUrl, async ({page, isPlainText}) => {
        test.skip(isPlainText);
        await focusEditor(page);
        await page.keyboard.type(`${testUrl} ltr`);
        const url = testUrl;
        // prevent linter from rewriting this to use double quotes
        const href = `href='mailto:${url}'`;
        await assertHTML(
          page,
          html`
            <p dir="auto">
              <a ${href}>
                <span data-lexical-text="true">${url}</span>
              </a>
              <span data-lexical-text="true">ltr</span>
            </p>
          `,
          undefined,
          {ignoreClasses: true},
        );
      }),
    );
  });

  test(`Can not convert bad URLs into links`, async ({page, isPlainText}) => {
    const testUrls = [
      // Missing Protocol
      'example.com', // Missing HTTPS and www

      // Invalid Protocol
      'htp://example.com', // Typo in protocol
      'htps://example.com', // Typo in protocol

      // Invalid TLDs
      'http://example.abcdefg', // TLD too long

      // Spaces and Invalid Characters
      'http://exa mple.com', // Space in domain
      'https://example .com', // Space in domain
      'http://example!.com', // Invalid character in domain

      // Missing Domain
      'http://.com', // Missing domain name
      'https://.org', // Missing domain name

      // Incomplete URLs
      'http://', // Incomplete URL
      'https://', // Incomplete URL

      // Just Text
      'not_a_url', // Plain text
      'this is not a url', // Sentence
      'example', // Single word
      'ftp://example.com', // Unsupported protocol (assuming only HTTP/HTTPS is supported)
    ];

    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(testUrls.join(' '));

    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">${testUrls.join(' ')}</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test(`Can not convert bad URLs into email links`, async ({
    page,
    isPlainText,
  }) => {
    const testUrls = [
      '@domain.com',
      '@subdomain.domain.com',

      // Invalid Characters
      'email@domain!.com', // Invalid character in domain
      'email@domain.c', // Invalid top level domain

      // Missing Domain
      'email@.com',
      'email@.org',

      // Incomplete URLs
      'email@', // Incomplete URL

      // Just Text
      'not_an_email', // Plain text
    ];

    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(testUrls.join(' '));

    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">${testUrls.join(' ')}</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can unlink the autolink and then make it link again', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Hello http://www.example.com test');
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="http://www.example.com">
            <span data-lexical-text="true">http://www.example.com</span>
          </a>
          <span data-lexical-text="true">test</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );

    await focusEditor(page);
    await click(page, 'a[href="http://www.example.com"]');
    await click(page, 'div.link-editor div.link-trash');

    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <span>
            <span data-lexical-text="true">http://www.example.com</span>
          </span>
          <span data-lexical-text="true">test</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );

    await click(page, 'span:has-text("http://www.example.com")');

    pressInsertLinkButton(page);

    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hello</span>
          <a href="http://www.example.com">
            <span data-lexical-text="true">http://www.example.com</span>
          </a>
          <span data-lexical-text="true">test</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  //Hindi
  test('Can convert Hindi (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'नमस्ते https://उदाहरण.भारत और http://उदाहरण.भारत/पथ?कुंजी=मान#खंड और www.उदाहरण.भारत',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">नमस्ते</span>
          <a href="https://उदाहरण.भारत">
            <span data-lexical-text="true">https://उदाहरण.भारत</span>
          </a>
          <span data-lexical-text="true">और</span>
          <a href="http://उदाहरण.भारत/पथ?कुंजी=मान#खंड">
            <span data-lexical-text="true">
              http://उदाहरण.भारत/पथ?कुंजी=मान#खंड
            </span>
          </a>
          <span data-lexical-text="true">और</span>
          <a href="https://www.उदाहरण.भारत">
            <span data-lexical-text="true">www.उदाहरण.भारत</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Chinese
  test('Can convert Chinese (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      '你好 https://例子.中国 和 http://例子.中国/路径?键=值#部分 和 www.例子.中国',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">你好</span>
          <a href="https://例子.中国">
            <span data-lexical-text="true">https://例子.中国</span>
          </a>
          <span data-lexical-text="true">和</span>
          <a href="http://例子.中国/路径?键=值#部分">
            <span data-lexical-text="true">
              http://例子.中国/路径?键=值#部分
            </span>
          </a>
          <span data-lexical-text="true">和</span>
          <a href="https://www.例子.中国">
            <span data-lexical-text="true">www.例子.中国</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Arabic
  test('Can convert Arabic (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'مرحبا https://مثال.موقع و http://مثال.موقع/مسار?مفتاح=قيمة#قسم و www.مثال.موقع',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">مرحبا</span>
          <a href="https://مثال.موقع">
            <span data-lexical-text="true">https://مثال.موقع</span>
          </a>
          <span data-lexical-text="true">و</span>
          <a href="http://مثال.موقع/مسار?مفتاح=قيمة#قسم">
            <span data-lexical-text="true">
              http://مثال.موقع/مسار?مفتاح=قيمة#قسم
            </span>
          </a>
          <span data-lexical-text="true">و</span>
          <a href="https://www.مثال.موقع">
            <span data-lexical-text="true">www.مثال.موقع</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Russian
  test('Can convert Russian (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Привет https://пример.рф и http://пример.рф/путь?ключ=значение#раздел и www.пример.рф',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Привет</span>
          <a href="https://пример.рф">
            <span data-lexical-text="true">https://пример.рф</span>
          </a>
          <span data-lexical-text="true">и</span>
          <a href="http://пример.рф/путь?ключ=значение#раздел">
            <span data-lexical-text="true">
              http://пример.рф/путь?ключ=значение#раздел
            </span>
          </a>
          <span data-lexical-text="true">и</span>
          <a href="https://www.пример.рф">
            <span data-lexical-text="true">www.пример.рф</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Japanese
  test('Can convert Japanese (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'こんにちは https://例え.日本 と http://例え.日本/パス?キー=値#部分 と www.例え.日本',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">こんにちは</span>
          <a href="https://例え.日本">
            <span data-lexical-text="true">https://例え.日本</span>
          </a>
          <span data-lexical-text="true">と</span>
          <a href="http://例え.日本/パス?キー=値#部分">
            <span data-lexical-text="true">
              http://例え.日本/パス?キー=値#部分
            </span>
          </a>
          <span data-lexical-text="true">と</span>
          <a href="https://www.例え.日本">
            <span data-lexical-text="true">www.例え.日本</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Korean
  test('Can convert Korean (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      '안녕하세요 https://예시.한국 그리고 http://예시.한국/경로?키=값#부분 그리고 www.예시.한국',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">안녕하세요</span>
          <a href="https://예시.한국">
            <span data-lexical-text="true">https://예시.한국</span>
          </a>
          <span data-lexical-text="true">그리고</span>
          <a href="http://예시.한국/경로?키=값#부분">
            <span data-lexical-text="true">
              http://예시.한국/경로?키=값#부분
            </span>
          </a>
          <span data-lexical-text="true">그리고</span>
          <a href="https://www.예시.한국">
            <span data-lexical-text="true">www.예시.한국</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Spanish
  test('Can convert Spanish (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hola https://ejemplo.es y http://ejemplo.es/camino?clave=valor#seccion y www.ejemplo.es',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hola</span>
          <a href="https://ejemplo.es">
            <span data-lexical-text="true">https://ejemplo.es</span>
          </a>
          <span data-lexical-text="true">y</span>
          <a href="http://ejemplo.es/camino?clave=valor#seccion">
            <span data-lexical-text="true">
              http://ejemplo.es/camino?clave=valor#seccion
            </span>
          </a>
          <span data-lexical-text="true">y</span>
          <a href="https://www.ejemplo.es">
            <span data-lexical-text="true">www.ejemplo.es</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  //French
  test('Can convert French (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Bonjour https://exemple.fr et http://exemple.fr/chemin?clé=valeur#section et www.exemple.fr',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Bonjour</span>
          <a href="https://exemple.fr">
            <span data-lexical-text="true">https://exemple.fr</span>
          </a>
          <span data-lexical-text="true">et</span>
          <a href="http://exemple.fr/chemin?clé=valeur#section">
            <span data-lexical-text="true">
              http://exemple.fr/chemin?clé=valeur#section
            </span>
          </a>
          <span data-lexical-text="true">et</span>
          <a href="https://www.exemple.fr">
            <span data-lexical-text="true">www.exemple.fr</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Bengali
  test('Can convert Bengali (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'হ্যালো https://উদাহরণ.ভারত এবং http://উদাহরণ.ভারত/পথ?চাবি=মান#অংশ এবং www.উদাহরণ.ভারত',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">হ্যালো</span>
          <a href="https://উদাহরণ.ভারত">
            <span data-lexical-text="true">https://উদাহরণ.ভারত</span>
          </a>
          <span data-lexical-text="true">এবং</span>
          <a href="http://উদাহরণ.ভারত/পথ?চাবি=মান#অংশ">
            <span data-lexical-text="true">
              http://উদাহরণ.ভারত/পথ?চাবি=মান#অংশ
            </span>
          </a>
          <span data-lexical-text="true">এবং</span>
          <a href="https://www.উদাহরণ.ভারত">
            <span data-lexical-text="true">www.উদাহরণ.ভারত</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  //German
  test('Can convert German (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hallo https://beispiel.de und http://beispiel.de/pfad?schlüssel=wert#abschnitt und www.beispiel.de',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hallo</span>
          <a href="https://beispiel.de">
            <span data-lexical-text="true">https://beispiel.de</span>
          </a>
          <span data-lexical-text="true">und</span>
          <a href="http://beispiel.de/pfad?schlüssel=wert#abschnitt">
            <span data-lexical-text="true">
              http://beispiel.de/pfad?schlüssel=wert#abschnitt
            </span>
          </a>
          <span data-lexical-text="true">und</span>
          <a href="https://www.beispiel.de">
            <span data-lexical-text="true">www.beispiel.de</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Italian
  test('Can convert Italian (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Ciao https://esempio.it e http://esempio.it/percorso?chiave=valore#sezione e www.esempio.it',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Ciao</span>
          <a href="https://esempio.it">
            <span data-lexical-text="true">https://esempio.it</span>
          </a>
          <span data-lexical-text="true">e</span>
          <a href="http://esempio.it/percorso?chiave=valore#sezione">
            <span data-lexical-text="true">
              http://esempio.it/percorso?chiave=valore#sezione
            </span>
          </a>
          <span data-lexical-text="true">e</span>
          <a href="https://www.esempio.it">
            <span data-lexical-text="true">www.esempio.it</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Portuguese
  test('Can convert Portuguese (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Olá https://exemplo.pt e http://exemplo.pt/caminho?chave=valor#secao e www.exemplo.pt',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Olá</span>
          <a href="https://exemplo.pt">
            <span data-lexical-text="true">https://exemplo.pt</span>
          </a>
          <span data-lexical-text="true">e</span>
          <a href="http://exemplo.pt/caminho?chave=valor#secao">
            <span data-lexical-text="true">
              http://exemplo.pt/caminho?chave=valor#secao
            </span>
          </a>
          <span data-lexical-text="true">e</span>
          <a href="https://www.exemplo.pt">
            <span data-lexical-text="true">www.exemplo.pt</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Turkish
  test('Can convert Turkish (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Merhaba https://örnek.tr ve http://örnek.tr/yol?anahtar=değer#bölüm ve www.örnek.tr',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Merhaba</span>
          <a href="https://örnek.tr">
            <span data-lexical-text="true">https://örnek.tr</span>
          </a>
          <span data-lexical-text="true">ve</span>
          <a href="http://örnek.tr/yol?anahtar=değer#bölüm">
            <span data-lexical-text="true">
              http://örnek.tr/yol?anahtar=değer#bölüm
            </span>
          </a>
          <span data-lexical-text="true">ve</span>
          <a href="https://www.örnek.tr">
            <span data-lexical-text="true">www.örnek.tr</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Indonesian
  test('Can convert Indonesian (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Halo https://contoh.id dan http://contoh.id/jalur?kunci=nilai#bagian dan www.contoh.id',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Halo</span>
          <a href="https://contoh.id">
            <span data-lexical-text="true">https://contoh.id</span>
          </a>
          <span data-lexical-text="true">dan</span>
          <a href="http://contoh.id/jalur?kunci=nilai#bagian">
            <span data-lexical-text="true">
              http://contoh.id/jalur?kunci=nilai#bagian
            </span>
          </a>
          <span data-lexical-text="true">dan</span>
          <a href="https://www.contoh.id">
            <span data-lexical-text="true">www.contoh.id</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Vietnamese
  test('Can convert Vietnamese (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Xin chào https://vídụ.vn và http://vídụ.vn/đường?khóa=giátrị#phần và www.vídụ.vn',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Xin chào</span>
          <a href="https://vídụ.vn">
            <span data-lexical-text="true">https://vídụ.vn</span>
          </a>
          <span data-lexical-text="true">và</span>
          <a href="http://vídụ.vn/đường?khóa=giátrị#phần">
            <span data-lexical-text="true">
              http://vídụ.vn/đường?khóa=giátrị#phần
            </span>
          </a>
          <span data-lexical-text="true">và</span>
          <a href="https://www.vídụ.vn">
            <span data-lexical-text="true">www.vídụ.vn</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Polish
  test('Can convert Polish (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Cześć https://przykład.pl i http://przykład.pl/ścieżka?klucz=wartość#sekcja i www.przykład.pl',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Cześć</span>
          <a href="https://przykład.pl">
            <span data-lexical-text="true">https://przykład.pl</span>
          </a>
          <span data-lexical-text="true">i</span>
          <a href="http://przykład.pl/ścieżka?klucz=wartość#sekcja">
            <span data-lexical-text="true">
              http://przykład.pl/ścieżka?klucz=wartość#sekcja
            </span>
          </a>
          <span data-lexical-text="true">i</span>
          <a href="https://www.przykład.pl">
            <span data-lexical-text="true">www.przykład.pl</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Swedish
  test('Can convert Swedish (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hej https://exempel.se och http://exempel.se/väg?nyckel=värde#sektion och www.exempel.se',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hej</span>
          <a href="https://exempel.se">
            <span data-lexical-text="true">https://exempel.se</span>
          </a>
          <span data-lexical-text="true">och</span>
          <a href="http://exempel.se/väg?nyckel=värde#sektion">
            <span data-lexical-text="true">
              http://exempel.se/väg?nyckel=värde#sektion
            </span>
          </a>
          <span data-lexical-text="true">och</span>
          <a href="https://www.exempel.se">
            <span data-lexical-text="true">www.exempel.se</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Dutch
  test('Can convert Dutch (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Hallo https://voorbeeld.nl en http://voorbeeld.nl/pad?sleutel=waarde#sectie en www.voorbeeld.nl',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Hallo</span>
          <a href="https://voorbeeld.nl">
            <span data-lexical-text="true">https://voorbeeld.nl</span>
          </a>
          <span data-lexical-text="true">en</span>
          <a href="http://voorbeeld.nl/pad?sleutel=waarde#sectie">
            <span data-lexical-text="true">
              http://voorbeeld.nl/pad?sleutel=waarde#sectie
            </span>
          </a>
          <span data-lexical-text="true">en</span>
          <a href="https://www.voorbeeld.nl">
            <span data-lexical-text="true">www.voorbeeld.nl</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  // Greek
  test('Can convert Greek (Unicode) url-like text into links', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(
      'Γειά σου https://παράδειγμα.ελ και http://παράδειγμα.ελ/διαδρομή?κλειδί=τιμή#ενότητα και www.παράδειγμα.ελ',
    );
    await assertHTML(
      page,
      html`
        <p dir="auto">
          <span data-lexical-text="true">Γειά σου</span>
          <a href="https://παράδειγμα.ελ">
            <span data-lexical-text="true">https://παράδειγμα.ελ</span>
          </a>
          <span data-lexical-text="true">και</span>
          <a href="http://παράδειγμα.ελ/διαδρομή?κλειδί=τιμή#ενότητα">
            <span data-lexical-text="true">
              http://παράδειγμα.ελ/διαδρομή?κλειδί=τιμή#ενότητα
            </span>
          </a>
          <span data-lexical-text="true">και</span>
          <a href="https://www.παράδειγμα.ελ">
            <span data-lexical-text="true">www.παράδειγμα.ελ</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
