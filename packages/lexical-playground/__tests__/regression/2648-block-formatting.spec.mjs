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
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe.parallel('Regression test #2648', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  // some distinct formats
  const blockFormats = [
    {
      dropDownSelector: '.block-controls',
      expected: html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">line of text</span>
        </h1>
      `,
      formatSelector: '.dropdown .icon.h1',
      name: 'Heading 1',
    },
    {
      dropDownSelector: '.block-controls',
      expected: html`
        <blockquote
          class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">line of text</span>
        </blockquote>
      `,
      formatSelector: '.dropdown .icon.quote',
      name: 'Quote',
    },
    {
      dropDownSelector: '.block-controls',
      expected: html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript"
          data-language="javascript">
          <span data-lexical-text="true">line</span>
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            of
          </span>
          <span data-lexical-text="true">text</span>
        </code>
      `,
      formatSelector: '.dropdown .icon.code',
      name: 'Code Block',
    },
    {
      dropDownSelector: '.alignment',
      expected: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="text-align: right">
          <span data-lexical-text="true">line of text</span>
        </p>
      `,
      formatSelector: '.dropdown .icon.right-align',
      name: 'Text Align',
    },
    {
      dropDownSelector: '.alignment',
      expected: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">line of text</span>
        </p>
      `,
      formatSelector: '.dropdown .icon.indent',
      name: 'Indent',
    },
  ];

  test.describe
    .parallel('Block formatting after selecting the entire line', () => {
    blockFormats.forEach(
      ({name, dropDownSelector, formatSelector, expected}) => {
        test(`when ${name} format is applied`, async ({
          page,
          isPlainText,
          isCollab,
        }) => {
          test.skip(isPlainText);

          await focusEditor(page);
          await page.keyboard.type('line of text');
          await page.keyboard.press('Enter');
          await page.keyboard.type('line of text');
          await page.keyboard.press('Enter');
          await page.keyboard.type('line of text');

          const firstLine = '.PlaygroundEditorTheme__paragraph:nth-child(1)';
          const secondLine = '.PlaygroundEditorTheme__paragraph:nth-child(2)';
          const unFormattedLine = html`
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">line of text</span>
            </p>
          `;

          //format and check the first line
          await click(page, firstLine, {clickCount: 4}); // Note: the issue sometimes shows up on  triple click but the 4th click seems to be a more reliable way to replicate it
          await click(page, dropDownSelector);
          await click(page, formatSelector);
          await assertHTML(
            page,
            html`
              ${expected} ${unFormattedLine} ${unFormattedLine}
            `,
          );

          await page.keyboard.press('Escape');

          // format and test the middle line
          await click(page, secondLine, {clickCount: 4});
          await click(page, dropDownSelector);
          await click(page, formatSelector);
          await assertHTML(
            page,
            html`
              ${expected} ${expected} ${unFormattedLine}
            `,
          );
        });
      },
    );
  });
});
