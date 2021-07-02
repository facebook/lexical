/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineEnd} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  E2E_BROWSER,
} from '../utils';

describe('Hashtags', () => {
  initializeE2E((e2e) => {
    it(`Can create a decorator and move selection through it`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('congrats');

      await page.waitForSelector('.keyword');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 1, 0, 0],
        focusOffset: 6,
      });

      await repeat(7, async () => {
        await page.keyboard.press('ArrowLeft');
      });

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0, 0],
        focusOffset: 0,
      });

      await moveToLineEnd(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​<br></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });

    it(`Can create a decorator and handle text input correctly`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('congrats');

      await page.waitForSelector('.keyword');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 1, 0, 0],
        focusOffset: 5,
      });

      // Input should be blocked
      await page.keyboard.type('a');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 1, 0, 0],
        focusOffset: 5,
      });

      // Composition input should be blocked
      await page.keyboard.type('è');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
      );
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });
        // Return to the same location
        await page.keyboard.press('Backspace');
        await moveToLineEnd(page);
        await page.keyboard.press('ArrowLeft');
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      }
      // Diacritics input should be blocked
      await page.keyboard.type('هَ');

      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });
        // Return to the same location
        await page.keyboard.press('Backspace');
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
        );
        await moveToLineEnd(page);
        await page.keyboard.press('ArrowLeft');
      } else {
        await assertHTML(
          page,
          '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>​</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      }

      // Text should get inserted after
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('a');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>​</span><span style="cursor: default;"><span class="keyword">congrats</span></span><span>⁠a</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
    });
  });
});
