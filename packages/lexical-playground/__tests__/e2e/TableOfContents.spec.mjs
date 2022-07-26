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
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Adding headigns to editor adds them to table of contents`, async ({
    page,
  }) => {
    await focusEditor(page);
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('Hello');
    await page.keyboard.type('\n');
    await selectFromFormatDropdown(page, '.h1');
    await page.keyboard.type('World!');
    const tableOfContents = await getElement(page, 'ul.table-of-contents');
    await assertHTML(
      tableOfContents,
      html`
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>Hello</li>
        </div>
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>World!</li>
        </div>
      `,
    );
  });
  test(`Scrolling through headigns in the editor makes them scroll inside the table of contents`, async ({
    page,
  }) => {
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
    const tableOfContents = await getElement(page, 'ul.table-of-contents');
    await assertHTML(
      tableOfContents,
      html`
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>Hello</li>
        </div>
        <div class="selectedHeading" role="button" tabindex="0">
          <div class="circle"></div>
          <li class="heading2">World</li>
        </div>
      `,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(50);
    await assertHTML(
      tableOfContents,
      html`
        <div class="selectedHeading" role="button" tabindex="0">
          <div class="circle"></div>
          <li>Hello</li>
        </div>
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li class="heading2">World</li>
        </div>
      `,
    );

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(50);
    await assertHTML(
      tableOfContents,
      html`
        <div class="heading" role="button" tabindex="0">
          <div class="bar"></div>
          <li>Hello</li>
        </div>
        <div class="selectedHeading" role="button" tabindex="0">
          <div class="circle"></div>
          <li class="heading2">World</li>
        </div>
      `,
    );
  });
});
