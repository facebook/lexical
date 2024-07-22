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
          <a dir="ltr" href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="https://example.com/path?with=query#and-hash">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="https://www.example.com">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a dir="ltr" href="mailto:name@example.com">
            <span data-lexical-text="true">name@example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="mailto:anothername@test.example.uk">
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
      <p dir="ltr">
        <a dir="ltr" href="http://example.com">
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
          <a dir="ltr" href="http://example.com">
            <span data-lexical-text="true">http://example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="https://example.com/path?with=query#and-hash">
            <span data-lexical-text="true">
              https://example.com/path?with=query#and-hash
            </span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="https://www.example.com">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a dir="ltr" href="mailto:name@example.com">
            <span data-lexical-text="true">name@example.com</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="mailto:anothername@test.example.uk">
            <span data-lexical-text="true">anothername@test.example.uk</span>
          </a>
          <span data-lexical-text="true">and</span>
          <a dir="ltr" href="https://www.example.com">
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
        <p dir="ltr">
          <a dir="ltr" href="https://" rel="noreferrer">
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
          <a dir="ltr" href="https://" rel="noreferrer">
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
        <p>
          <a dir="ltr" href="https://1.com/">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true">,</span>
          <a dir="ltr" href="https://2.com/">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true">;;;</span>
          <a dir="ltr" href="https://3.com">
            <span data-lexical-text="true">https://3.com</span>
          </a>
          <span data-lexical-text="true">;</span>
          <a dir="ltr" href="mailto:name@domain.uk">
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
        <p>
          <a dir="ltr" href="https://1.com/">
            <span data-lexical-text="true">https://1.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="https://2.com/">
            <span data-lexical-text="true">https://2.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="https://3.com/">
            <span data-lexical-text="true">https://3.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="https://4.com/">
            <span data-lexical-text="true">https://4.com/</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="mailto:name-lastname@meta.com">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hellohttps://example.com</span>
          <a dir="ltr" href="https://example.com">
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
        <p dir="ltr">
          <span data-lexical-text="true">
            Hello name@example.c name@example.1
          </span>
          <a dir="ltr" href="mailto:name-lastname@example.com">
            <span data-lexical-text="true">name-lastname@example.com</span>
          </a>
          <span data-lexical-text="true"></span>
          <a dir="ltr" href="mailto:name.lastname@meta.com">
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
          <a dir="ltr" href="http://example.com">
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
          <a dir="ltr" href="http://example.com">
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

  test('Can convert URLs into links', async ({page, isPlainText}) => {
    const testUrls = [
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
    ];

    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(testUrls.join(' ') + ' ');

    let expectedHTML = '';
    for (let url of testUrls) {
      url = url.replaceAll(/&/g, '&amp;');
      const rawUrl = url;

      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }

      expectedHTML += `
          <a href="${url}" dir="ltr">
            <span data-lexical-text="true">${rawUrl}</span>
          </a>
          <span data-lexical-text="true"></span>
      `;
    }

    await assertHTML(
      page,
      html`
        <p dir="ltr">${expectedHTML}</p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can convert URLs into email links', async ({page, isPlainText}) => {
    const testUrls = [
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
    ];

    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type(testUrls.join(' ') + ' ');

    let expectedHTML = '';
    for (const url of testUrls) {
      expectedHTML += `
          <a href='mailto:${url}' dir="ltr">
            <span data-lexical-text="true">${url}</span>
          </a>
          <span data-lexical-text="true"></span>
      `;
    }

    await assertHTML(
      page,
      html`
        <p dir="ltr">${expectedHTML}</p>
      `,
      undefined,
      {ignoreClasses: true},
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
        <p dir="ltr">
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
        <p dir="ltr">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a dir="ltr" href="http://www.example.com">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <span class="PlaygroundEditorTheme__ltr" dir="ltr">
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
        <p dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a dir="ltr" href="http://www.example.com">
            <span data-lexical-text="true">http://www.example.com</span>
          </a>
          <span data-lexical-text="true">test</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
