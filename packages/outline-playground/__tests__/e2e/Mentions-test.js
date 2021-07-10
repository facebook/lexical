/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTML, assertSelection} from '../utils';

describe('Mentions', () => {
  initializeE2E((e2e) => {
    it(`Can enter the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span aria-controls="mentions-typeahead" data-outline-text="true">Luke</span></p>',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-outline-text="true"></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 13,
        focusPath: [0, 1, 0],
        focusOffset: 13,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 14,
        focusPath: [0, 1, 0],
        focusOffset: 14,
      });

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });
    });

    it(`Can enter and delete part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span aria-controls="mentions-typeahead" data-outline-text="true">Luke</span></p',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-outline-text="true"></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 13,
        focusPath: [0, 1, 0],
        focusOffset: 13,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Skywalker</span><span data-outline-text="true"></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true"><br></span></p><div contenteditable="false" class="editor-placeholder">Enter some rich text...</div>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });

    it(`Can enter and backspace part of the Luke Skywalker mention`, async () => {
      const {page} = e2e;

      await page.focus('div.editor');
      await page.keyboard.type('Luke');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      });

      await page.waitForSelector('#mentions-typeahead ul li');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span aria-controls="mentions-typeahead" data-outline-text="true">Luke</span></p>',
      );

      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<p class="editor-paragraph"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke Skywalker</span><span data-outline-text="true"></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.waitForSelector('.mention');

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true"></span><span class="mention" data-outline-text="true" style="background-color: rgba(24, 119, 232, 0.2);">Luke</span><span data-outline-text="true"></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true"><br></span></p><div contenteditable="false" class="editor-placeholder">Enter some rich text...</div>',
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
