/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveRight,
  selectAll,
  selectCharacters,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  sleep,
  test,
} from '../utils/index.mjs';

test.use({acceptDownloads: true});
test.describe('File', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test(`Can import/export`, async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hello World');
    await selectCharacters(page, 'left', 'World'.length);
    await toggleBold(page);
    await moveRight(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('1. one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            World
          </strong>
        </p>
        <ol class="PlaygroundEditorTheme__ol1">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">one</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">two</span>
          </li>
        </ol>
      `,
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      click(page, '.action-button.export'),
    ]);
    const filePath = await download.path();

    await focusEditor(page);
    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    page.on('filechooser', (fileChooser) => {
      fileChooser.setFiles([filePath]);
    });
    await click(page, '.action-button.import');
    await sleep(200);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            World
          </strong>
        </p>
        <ol class="PlaygroundEditorTheme__ol1">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">one</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">two</span>
          </li>
        </ol>
      `,
    );
  });
});
