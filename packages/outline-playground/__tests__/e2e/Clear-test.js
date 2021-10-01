/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML} from '../utils';

describe('Clear', () => {
  initializeE2E((e2e) => {
    it(`can clear the editor`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');

      await page.keyboard.type('foo');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">foo</span></p>',
      );

      await page.click('.action-button.clear');
      await page.keyboard.type('bar');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">bar</span></p>',
      );
    });
  });
});
