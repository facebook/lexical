/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  E2E_BROWSER,
} from '../utils';

describe('Keywords', () => {
  initializeE2E((e2e) => {
    it(`Can create a decorator and move selection around it`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('congrats');

      await page.waitForSelector('.keyword');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await page.keyboard.type('c');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">congratsc</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span><span data-outline-text="true"> c</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('ongrats');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span><span data-outline-text="true"> </span><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 8,
        focusPath: [0, 2, 0],
        focusOffset: 8,
      });

      await repeat(8, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 1,
          focusPath: [0, 1, 0],
          focusOffset: 1,
        });
      }

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">congratscongrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await page.keyboard.press('Space');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span><span data-outline-text="true"> </span><span class="keyword" data-outline-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });
    });
  });
});
