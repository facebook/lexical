/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #2648', () => {
  test.beforeEach(({isCollab, page, isPlainText}) => {
    test.skip(isPlainText);

    initialize({isCollab, page});
  });

  // some distinct formats
  const blockFormats = [
    {
      dropDown: 'style',
      expected: html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">line of text</span>
        </h1>
      `,
      name: 'Heading 1',
    },
    {
      dropDown: 'style',
      expected: html`
        <blockquote
          class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">line of text</span>
        </blockquote>
      `,
      name: 'Quote',
    },
    {
      dropDown: 'style',
      expected: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <code spellcheck="false" data-lexical-text="true">
            <span class="PlaygroundEditorTheme__textCode">line of text</span>
          </code>
        </p>
      `,
      name: 'Code Block',
    },
    {
      dropDown: 'alignment',
      expected: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="text-align: right">
          <span data-lexical-text="true">line of text</span>
        </p>
      `,
      name: 'Right Align',
    },
    {
      dropDown: 'alignment',
      expected: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">line of text</span>
        </p>
      `,
      name: 'Indent',
    },
  ];

  test.describe
    .parallel('Block formatting after selecting the entire line', () => {
    blockFormats.forEach(({name, dropDown, expected}) => {
      test(`when ${name} format is applied`, async ({page}) => {
        await focusEditor(page);
        await page.keyboard.type('line of text');
        await page.keyboard.press('Enter');
        await page.keyboard.type('line of text');
        await page.keyboard.press('Enter');
        await page.keyboard.type('line of text');

        const firstLine = await page.getByText('line of text').nth(0);
        const secondLine = await page.getByText('line of text').nth(1);
        const dropDownButton = await page
          .getByRole('button', {
            name: 'Formatting options for text ' + dropDown,
          })
          .first();
        const unFormattedLine = html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">line of text</span>
          </p>
        `;

        //format and check the first line
        await firstLine.click({clickCount: 4}); // Note: the issue sometimes shows up on  triple click but the 4th click seems to be a more reliable way to replicate it
        await dropDownButton.click();
        await page.getByRole('button', {name}).first().click();
        await assertHTML(
          page,
          html`
            ${expected} ${unFormattedLine} ${unFormattedLine}
          `,
        );

        await page.keyboard.press('Escape');

        // format and test the middle line
        await secondLine.click({clickCount: 4});
        await dropDownButton.click();
        await page.getByRole('button', {name}).first().click();
        await assertHTML(
          page,
          html`
            ${expected} ${expected} ${unFormattedLine}
          `,
        );
      });
    });
  });
});
