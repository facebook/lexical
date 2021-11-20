/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts';
import {initializeE2E, assertHTML, assertSelection} from '../utils';

describe('Links', () => {
  initializeE2E((e2e) => {
    it(`Can convert a text node into a link`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');
      await page.keyboard.type('Hello');
      await selectAll(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      // link
      await page.waitForSelector('.link');
      await page.click('.link');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><a href="http://" class="editor-text-link"><span data-outline-text="true">Hello</span></a></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 5,
      });

      // set url
      await page.waitForSelector('.link-input');
      await page.focus('.link-input');
      await page.keyboard.type('facebook.com');
      await page.keyboard.press('Enter');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><a href="http://facebook.com" class="editor-text-link"><span data-outline-text="true">Hello</span></a></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 5,
      });

      // unlink
      await page.waitForSelector('.link');
      await page.click('.link');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });
  });
});
