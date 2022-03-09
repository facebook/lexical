/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, focusEditor} from '../utils';

import {undo} from '../keyboardShortcuts';

describe('Regression test #1055', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isCollab,
      `Adds new editor state into undo stack right after undo was done`,
      async () => {
        const {page} = e2e;
        await focusEditor(page);
        await page.keyboard.type('hello');
        await undo(page);
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br /></p>',
        );
        await page.keyboard.type('hello');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">hello</span></p>',
        );
        await undo(page);
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br /></p>',
        );
      },
    );
  });
});
