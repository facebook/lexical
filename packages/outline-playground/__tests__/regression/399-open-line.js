/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection, repeat} from '../utils';

describe('Regression test #399', () => {
  initializeE2E((e2e) => {
    it(`Supports Ctrl-O as an open line command`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('foo');
      await page.keyboard.press('Enter');
      await page.keyboard.type('bar');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>foo</span></p><p class="editor-paragraph" dir="ltr"><span>bar</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 3,
        focusPath: [1, 0, 0],
        focusOffset: 3,
      });

      await repeat(3, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.press('Control+KeyO');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>foo</span></p><p class="editor-paragraph" dir="ltr"><span></span><br><span>bar</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
