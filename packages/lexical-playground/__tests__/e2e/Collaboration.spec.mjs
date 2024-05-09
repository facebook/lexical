/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  selectCharacters,
  toggleBold,
  undo,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  html,
  initialize,
  IS_MAC,
  sleep,
  test,
} from '../utils/index.mjs';

async function toggleCheckList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.check-list');
}

test.describe('Collaboration', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Undo with collaboration on', async ({
    isRichText,
    page,
    isCollab,
    browserName,
  }) => {
    test.skip(!isCollab || IS_MAC);

    await focusEditor(page);
    await page.keyboard.type('hello');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('world');
    await sleep(1050); // default merge interval is 1000, add 50ms as overhead due to CI latency.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('hello world again');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello world again</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 17,
      anchorPath: [1, 0, 0],
      focusOffset: 17,
      focusPath: [1, 0, 0],
    });

    await undo(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1],
      focusOffset: 0,
      focusPath: [1],
    });

    await toggleCheckList(page);
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul PlaygroundEditorTheme__checklist">
          <li
            aria-checked="false"
            role="checkbox"
            tabindex="-1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">a</span>
          </li>
          <li
            aria-checked="false"
            role="checkbox"
            tabindex="-1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="2">
            <span data-lexical-text="true">b</span>
          </li>
          <li
            aria-checked="false"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked"
            role="checkbox"
            tabindex="-1"
            value="3">
            <br />
          </li>
        </ul>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1, 2],
      focusOffset: 0,
      focusPath: [1, 2],
    });

    await undo(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('Some bold text');

    // Move caret to end of 'bold'
    await moveLeft(page, ' text'.length);

    // Select the word 'bold'
    await selectCharacters(page, 'left', 'bold'.length);

    await toggleBold(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            bold
          </strong>
          <span data-lexical-text="true">text</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [1, 1, 0],
      focusOffset: 0,
      focusPath: [1, 1, 0],
    });
  });
});
