/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  deleteNextWord,
  moveLeft,
  moveToEditorBeginning,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  pressToggleBold,
  repeat,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Hashtags', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can handle a single hashtag`, async ({page}) => {
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

    await page.keyboard.press('Backspace');
    await page.keyboard.type('once');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #yolonce
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 8,
      anchorPath: [0, 0, 0],
      focusOffset: 8,
      focusPath: [0, 0, 0],
    });

    await moveLeft(page, 10);
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">yolonce</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can handle adjacent hashtags`, async ({page, browserName}) => {
    await focusEditor(page);
    await page.keyboard.type('#hello world');

    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #hello
          </span>
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0],
    });

    await moveLeft(page, 5);
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 1,
      focusPath: [0, 1, 0],
    });

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #helloworld
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('Space');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #hello
          </span>
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 1, 0],
      focusOffset: 1,
      focusPath: [0, 1, 0],
    });

    await moveLeft(page);
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 6,
        anchorPath: [0, 0, 0],
        focusOffset: 6,
        focusPath: [0, 0, 0],
      });
    }

    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #helloworld
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can insert many hashtags mixed with text and delete them all correctly`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(
      '#hello world foo #lol #lol asdasd #lol test this #asdas #asdas lasdasd asdasd',
    );

    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #hello
          </span>
          <span data-lexical-text="true">world foo</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #lol
          </span>
          <span data-lexical-text="true"></span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #lol
          </span>
          <span data-lexical-text="true">asdasd</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #lol
          </span>
          <span data-lexical-text="true">test this</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #asdas
          </span>
          <span data-lexical-text="true"></span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #asdas
          </span>
          <span data-lexical-text="true">lasdasd asdasd</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 15,
      anchorPath: [0, 11, 0],
      focusOffset: 15,
      focusPath: [0, 11, 0],
    });

    await moveToEditorBeginning(page);

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await repeat(20, async () => {
      await deleteNextWord(page);
    });
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });
  });

  test('Hashtag inherits format', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hello ');
    await pressToggleBold(page);
    await page.keyboard.type('#world');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__hashtag"
            data-lexical-text="true">
            #world
          </strong>
        </p>
      `,
    );
  });

  test('Should not break with multiple leading "#" #5636', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('#hello');

    await waitForSelector(page, '.PlaygroundEditorTheme__hashtag');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #hello
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    await moveToEditorBeginning(page);
    await page.keyboard.type('#');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">#</span>
          <span class="PlaygroundEditorTheme__hashtag" data-lexical-text="true">
            #hello
          </span>
        </p>
      `,
    );
  });
});
