/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveLeft} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Regression test #221', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can handle space in hashtag`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('#yolo');
    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolo
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });

    await moveLeft(page, 2);
    await page.keyboard.press('Space');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yo
          </span>
          <span data-lexical-text="true">lo</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 1,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can handle delete in hashtag`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('#yolo ');
    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolo
          </span>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 1,
      focusPath: [0, 1, 0],
    });

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolo
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can handle backspace into hashtag`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('#yolo ');
    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolo
          </span>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 1,
      focusPath: [0, 1, 0],
    });

    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yol
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });
  });
});
