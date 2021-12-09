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
  focusEditor,
  waitForSelector,
  click,
} from '../utils';

describe('Images', () => {
  initializeE2E((e2e) => {
    it(`Can create a decorator and move selection around it`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '.insert-image');

      await click(page, '.insert-image');

      await waitForSelector(page, '.editor-image img');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 1,
        focusPath: [0],
        focusOffset: 1,
      });

      await focusEditor(page);
      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 1,
        focusPath: [0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await click(page, '.insert-image');

      await waitForSelector(page, '.editor-image img');

      await click(page, '.editor-image img');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;" class="focused"><button class="image-caption-button">Add Caption</button><div class="image-resizer-ne"></div><div class="image-resizer-se"></div><div class="image-resizer-sw"></div><div class="image-resizer-nw"></div></span><br></p>',
        true,
      );

      await page.keyboard.press('Backspace');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');

      await click(page, '.insert-image');

      await waitForSelector(page, '.editor-image img');

      await focusEditor(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 1,
        focusPath: [0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');

      await assertHTML(page, '<p class="editor-paragraph"><br></p>');

      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });
    });

    it('Can add images and delete them correctly', async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '.insert-image');

      await click(page, '.insert-image');

      await waitForSelector(page, '.editor-image img');

      await click(page, '.insert-image');

      await focusEditor(page);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');

      await assertHTML(
        page,
        '<p class="editor-paragraph"><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTML(page, '<p class="editor-paragraph"><br></p>');
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.type('Test');
      await click(page, '.insert-image');
      await click(page, '.insert-image');

      await focusEditor(page);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Test</span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Test</span><span class="editor-image" data-outline-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit;"></span><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });
    });
  });
});
