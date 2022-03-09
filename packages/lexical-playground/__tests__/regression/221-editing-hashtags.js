/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
} from '../utils';

describe('Regression test #221', () => {
  initializeE2E((e2e) => {
    it(`Can handle space in hashtag`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('#yolo');
      await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yolo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yo</span><span data-lexical-text="true"> lo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });
    });

    it(`Can handle delete in hashtag`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('#yolo ');
      await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yolo</span><span data-lexical-text="true"> </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yolo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });

    it(`Can handle backspace into hashtag`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('#yolo ');
      await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yolo</span><span data-lexical-text="true"> </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">#yol</span></p>',
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
