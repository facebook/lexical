/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection} from '../utils';

describe('Images', () => {
  initializeE2E((e2e) => {
    it(`Can create a decorator and move selection around it`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');

      await page.waitForSelector('.action-button');

      await page.click('.action-button');

      await page.waitForSelector('.editor-image img');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠</span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><span data-outline-text="true">⁠</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠<br></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.click('.action-button');

      await page.waitForSelector('.editor-image img');

      await page.click('.editor-image img');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠</span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;" class="focused"><div class="image-resizer-s"></div><div class="image-resizer-e"></div><div class="image-resizer-se"></div></span><span data-outline-text="true">⁠</span></p>',
      );

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠<br></span></p>',
      );

      await page.click('.action-button');

      await page.waitForSelector('.editor-image img');

      await page.keyboard.press('ArrowLeft');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠</span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><span data-outline-text="true">⁠</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true">⁠<br></span></p>',
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
