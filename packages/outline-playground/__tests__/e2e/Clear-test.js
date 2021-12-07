/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, focusEditor, click} from '../utils';

describe('Clear', () => {
  initializeE2E((e2e) => {
    it(`can clear the editor`, async () => {
      const {page} = e2e;
      await focusEditor(page);

      await page.keyboard.type('foo');
      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">foo</span></p>',
      );

      await click(page, '.action-button.clear');
      await page.keyboard.type('bar');
      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">bar</span></p>',
      );
    });
  });
});
