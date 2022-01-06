/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, focusEditor} from '../utils';

describe('Focus', () => {
  initializeE2E((e2e) => {
    it(`can tab out of the editor`, async () => {
      const {page, isRichText} = e2e;
      if (isRichText) {
        return;
      }
      await focusEditor(page);

      await page.keyboard.press('Tab');
      const isEditorFocused = await page.evaluate(() => {
        const editor = document.querySelector('div.editor');
        return editor === document.activeElement;
      });

      expect(isEditorFocused).toBe(false);
    });
  });
});
