/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToEditorBeginning} from '../keyboardShortcuts';
import {initializeE2E, assertHTML, assertSelection} from '../utils';

describe('Regression test #379', () => {
  initializeE2E((e2e) => {
    it(`Is able to correctly handle backspace press at the line boundary`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await page.waitForSelector('#mentions-typeahead ul li');
      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="editor-paragraph"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 14,
        focusPath: [0, 0, 0],
        focusOffset: 14,
      });
      await moveToEditorBeginning(page);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });
  });
});
