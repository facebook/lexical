/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  click,
  expect,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Shadow root quotes in Markdown', () => {
  test.describe('setting off', () => {
    test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

    test('the heading shortcut is declined inside a quote', async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      await assertHTML(
        page,
        html`
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <span data-lexical-text="true"># Heading</span>
          </blockquote>
        `,
      );
    });
  });

  test.describe('setting on', () => {
    test.beforeEach(({isCollab, page}) =>
      initialize({isCollab, page, shadowRootQuotes: true}),
    );

    test('the heading shortcut nests the heading inside the quote', async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      await assertHTML(
        page,
        html`
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <h1 class="PlaygroundEditorTheme__h1" dir="auto">
              <span data-lexical-text="true">Heading</span>
            </h1>
          </blockquote>
        `,
      );
    });

    test('the quote round trips through the markdown toggle', async ({
      page,
      isPlainText,
      isCollab,
    }) => {
      test.skip(isPlainText || isCollab);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      // To markdown: the nested heading keeps its `#` inside the quote.
      await click(page, '.action-button .markdown');
      await expect(page.locator('.PlaygroundEditorTheme__code')).toHaveText(
        '> # Heading',
      );
      // ...and back.
      await click(page, '.action-button .markdown');
      await assertHTML(
        page,
        html`
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <h1 class="PlaygroundEditorTheme__h1" dir="auto">
              <span data-lexical-text="true">Heading</span>
            </h1>
          </blockquote>
        `,
      );
    });

    test('ArrowDown adds a paragraph after the quote', async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.type('after');
      await assertHTML(
        page,
        html`
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <h1 class="PlaygroundEditorTheme__h1" dir="auto">
              <span data-lexical-text="true">Heading</span>
            </h1>
          </blockquote>
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">after</span>
          </p>
        `,
      );
    });

    test('ArrowUp adds a paragraph before the quote', async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      // The first press moves to the start of the heading, the second escapes.
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.type('before');
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">before</span>
          </p>
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <h1 class="PlaygroundEditorTheme__h1" dir="auto">
              <span data-lexical-text="true">Heading</span>
            </h1>
          </blockquote>
        `,
      );
    });

    test('text typed after the nested heading stays inside the quote', async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await page.keyboard.type('> ');
      await page.keyboard.type('# Heading');
      await page.keyboard.press('Enter');
      await page.keyboard.type('body text');
      await assertHTML(
        page,
        html`
          <blockquote class="PlaygroundEditorTheme__quote" dir="auto">
            <h1 class="PlaygroundEditorTheme__h1" dir="auto">
              <span data-lexical-text="true">Heading</span>
            </h1>
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">body text</span>
            </p>
          </blockquote>
        `,
      );
    });
  });
});
