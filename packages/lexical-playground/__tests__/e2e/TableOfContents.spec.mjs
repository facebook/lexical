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
  getElement,
  html,
  initialize,
  repeat,
  selectFromFormatDropdown,
  sleep,
  test,
} from '../utils/index.mjs';

test.describe('Table of Contents', () => {
  test.use({showTableOfContents: true});
  test.beforeEach(({isCollab, showTableOfContents, page}) =>
    initialize({isCollab, page, showTableOfContents}),
  );

  test(`Adding headings to editor adds them to table of contents`, async ({
    page,
    isCollab,
  }) => {
    await test.skip(isCollab);
    await focusEditor(page);
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('Hello');
    await page.keyboard.type('\n');
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('World!');
    const tableOfContents = await getElement(page, '.table-of-contents');
    await assertHTML(
      tableOfContents,
      html`
        <ul class="headings">
          <div class="normal-heading-wrapper">
            <div role="button" tabindex="0">
              <li class="normal-heading">Hello</li>
            </div>
          </div>
          <div class="normal-heading-wrapper">
            <div role="button" tabindex="0">
              <li class="normal-heading">World!</li>
            </div>
          </div>
        </ul>
      `,
    );
  });

  test(`Scrolling through headings in the editor makes them scroll inside the table of contents`, async ({
    page,
    isCollab,
  }) => {
    await test.skip(isCollab);
    await focusEditor(page);
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('Hello');

    await repeat(20, () => {
      page.keyboard.type('\n');
    });
    await selectFromFormatDropdown(page, '.h2');
    await page.keyboard.type(' World');
    await repeat(400, () => {
      page.keyboard.type('\n');
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(50);
    const tableOfContents = await getElement(page, '.table-of-contents');
    await assertHTML(
      tableOfContents,
      html`
        <ul class="headings">
          <div class="normal-heading-wrapper">
            <div role="button" tabindex="0">
              <li class="normal-heading">Hello</li>
            </div>
          </div>
          <div class="normal-heading-wrapper">
            <div class="heading2" role="button" tabindex="0">
              <li class="normal-heading">World</li>
            </div>
          </div>
        </ul>
      `,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(50);
    await assertHTML(
      tableOfContents,
      html`
        <ul class="headings">
          <div class="normal-heading-wrapper">
            <div role="button" tabindex="0">
              <li class="normal-heading">Hello</li>
            </div>
          </div>
          <div class="normal-heading-wrapper">
            <div class="heading2" role="button" tabindex="0">
              <li class="normal-heading">World</li>
            </div>
          </div>
        </ul>
      `,
    );

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(50);
    await assertHTML(
      tableOfContents,
      html`
        <ul class="headings">
          <div class="normal-heading-wrapper">
            <div role="button" tabindex="0">
              <li class="normal-heading">Hello</li>
            </div>
          </div>
          <div class="normal-heading-wrapper">
            <div class="heading2" role="button" tabindex="0">
              <li class="normal-heading">World</li>
            </div>
          </div>
        </ul>
      `,
    );
  });
});
