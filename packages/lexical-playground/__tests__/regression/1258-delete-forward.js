/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, focusEditor, IS_MAC} from '../utils';
import {moveToLineBeginning, deleteForward} from '../keyboardShortcuts';

describe('Regression test #1258', () => {
  initializeE2E((e2e) => {
    it(`Can delete forward with keyboard`, async () => {
      if (!IS_MAC) {
        // Do Windows/Linux have equivalent shortcuts?
        return;
      }
      const {page} = e2e;
      await focusEditor(page);

      await page.keyboard.type('hello world');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p>',
      );

      await moveToLineBeginning(page);
      await deleteForward(page);
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">ello world</span></p>',
      );
    });
  });
});
