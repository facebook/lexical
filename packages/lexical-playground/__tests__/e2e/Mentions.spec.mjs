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
  IS_WINDOWS,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Mentions', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test(`Can enter the Luke Skywalker mention`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '.mention');

    await page.keyboard.press('ArrowLeft');
    await assertSelection(page, {
      anchorOffset: 13,
      anchorPath: [0, 0, 0],
      focusOffset: 13,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('ArrowRight');
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('ArrowRight');
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can enter and delete part of the Luke Skywalker mention`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '.mention');

    await page.keyboard.press('ArrowLeft');
    await assertSelection(page, {
      anchorOffset: 13,
      anchorPath: [0, 0, 0],
      focusOffset: 13,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke
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

    await page.keyboard.press('Backspace');
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

  test(`Can enter and backspace part of the Luke Skywalker mention in the middle`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '.mention');

    await moveLeft(page, 10);

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Skywalker
          </span>
        </p>
      `,
    );
  });

  test(`Can enter and delete part of the Luke Skywalker mention in the middle`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '.mention');

    await moveLeft(page, 10);

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke
          </span>
        </p>
      `,
    );
  });

  test(`Can enter and backspace part of the Luke Skywalker mention`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Luke</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 0, 0],
      focusOffset: 14,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '.mention');

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke
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

    await page.keyboard.press('Backspace');
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

    await page.keyboard.type('abc  def');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc def</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.type('Luke');

    await waitForSelector(page, '#typeahead-menu ul li');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc Luke def</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true">def</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 1, 0],
      focusOffset: 14,
      focusPath: [0, 1, 0],
    });

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke
          </span>
          <span data-lexical-text="true">def</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 1, 0],
      focusOffset: 4,
      focusPath: [0, 1, 0],
    });
  });

  test(`Can enter multiple Luke Skywalker mentions and then delete them from start`, async ({
    page,
    browserName,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');

    await waitForSelector(page, '.mention');

    await page.keyboard.type(' ');

    await page.keyboard.type('Luke');

    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');

    await waitForSelector(page, '.mention:nth-child(1)');

    await page.keyboard.type(' ');

    await page.keyboard.type('Luke');

    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');

    await waitForSelector(page, '.mention:nth-child(3)');

    await page.keyboard.type(' ');

    await page.keyboard.type('Luke');

    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');

    await waitForSelector(page, '.mention:nth-child(5)');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 14,
      anchorPath: [0, 6, 0],
      focusOffset: 14,
      focusPath: [0, 6, 0],
    });

    await moveToEditorBeginning(page);

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await deleteNextWord(page);

    if (IS_WINDOWS && browserName === 'chromium') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Skywalker</span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Skywalker</span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    }
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await deleteNextWord(page);
    if (IS_WINDOWS && browserName === 'chromium') {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    }
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await deleteNextWord(page);
    if (IS_WINDOWS && browserName === 'chromium') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Skywalker</span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Skywalker</span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="mention"
              style="background-color: rgba(24, 119, 232, 0.2);"
              data-lexical-text="true">
              Luke Skywalker
            </span>
          </p>
        `,
      );
    }
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await deleteNextWord(page);
    await deleteNextWord(page);
    await deleteNextWord(page);
    await deleteNextWord(page);
    await deleteNextWord(page);

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

  test(`Can enter a mention then delete it and partially remove text after`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Luke');
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await waitForSelector(page, '#typeahead-menu ul li');
    await page.keyboard.press('Enter');

    await waitForSelector(page, '.mention');

    await page.keyboard.type(' foo bar');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="mention"
            style="background-color: rgba(24, 119, 232, 0.2);"
            data-lexical-text="true">
            Luke Skywalker
          </span>
          <span data-lexical-text="true">foo bar</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 8,
      anchorPath: [0, 1, 0],
      focusOffset: 8,
      focusPath: [0, 1, 0],
    });

    await moveLeft(page, 4);

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 1, 0],
      focusOffset: 4,
      focusPath: [0, 1, 0],
    });

    await page.keyboard.down('Shift');
    await moveLeft(page, 18);
    await page.keyboard.up('Shift');

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 1, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">bar</span>
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
});
