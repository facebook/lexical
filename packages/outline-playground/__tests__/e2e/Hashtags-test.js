/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection, repeat} from '../utils';
import {deleteNextWord, moveToEditorBeginning} from '../keyboardShortcuts';

describe('Hashtags', () => {
  initializeE2E((e2e) => {
    it(`Can handle a single hashtag`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('#yolo');

      await page.waitForSelector('.editor-text-hashtag');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#yolo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });

      await page.keyboard.press('Backspace');
      await page.keyboard.type('once');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#yolonce</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await repeat(10, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span>yolonce</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });

    it(`Can handle adjacent hashtags`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('#hello world');

      await page.waitForSelector('.editor-text-hashtag');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#hello</span><span> world</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 6,
        focusPath: [0, 1, 0],
        focusOffset: 6,
      });

      await repeat(5, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#helloworld</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });

      await page.keyboard.press('Space');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#hello</span><span> world</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#helloworld</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
    });

    it(`Can insert many hashtags mixed with text and delete them all correctly`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type(
        '#hello world foo #lol #lol asdasd #lol test this #asdas #asdas lasdasd asdasd',
      );

      await page.waitForSelector('.editor-text-hashtag');

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span class="editor-text-hashtag">#hello</span><span> world foo </span><span class="editor-text-hashtag">#lol</span><span> </span><span class="editor-text-hashtag">#lol</span><span> asdasd </span><span class="editor-text-hashtag">#lol</span><span> test this </span><span class="editor-text-hashtag">#asdas</span><span> </span><span class="editor-text-hashtag">#asdas</span><span> lasdasd asdasd</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 11, 0],
        anchorOffset: 15,
        focusPath: [0, 11, 0],
        focusOffset: 15,
      });

      await moveToEditorBeginning(page);

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await repeat(20, async () => {
        await deleteNextWord(page);
      });
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span>⁠<br></span></p>',
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
