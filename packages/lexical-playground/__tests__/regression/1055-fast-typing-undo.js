/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, focusEditor, IS_COLLAB} from '../utils';

import {undo} from '../keyboardShortcuts';

describe('Regression test #1055', () => {
  initializeE2E((e2e) => {
    it(`Adds new editor state into undo stack right after undo was done`, async () => {
      if (IS_COLLAB) {
        // Collab uses its own undo/redo
        return;
      }

      const {page} = e2e;
      await focusEditor(page);
      await page.keyboard.type('hello');
      await undo(page);
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><br /></p>',
      );
      await page.keyboard.type('hello');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello</span></p>',
      );
      await undo(page);
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><br /></p>',
      );
    });
  });
});
