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
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr"
            role="checkbox"
            tabindex="-1"
            value="1"
            aria-checked="false">
            <span data-lexical-text="true">a</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr"
            role="checkbox"
            tabindex="-1"
            value="2"
            aria-checked="false">
            <span data-lexical-text="true">b</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked"
            role="checkbox"
            tabindex="-1"
            value="3"
            aria-checked="false">
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

  test('Remove dangling text from YJS when there is no preceding text node', async ({
    isRichText,
    page,
    isCollab,
    browserName,
  }) => {
    test.skip(!isCollab);

    // Left collaborator types two paragraphs of text
    await focusEditor(page);
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await sleep(1050); // default merge interval is 1000, add 50ms as overhead due to CI latency.
    await page.keyboard.type('This is a test. ');

    // Right collaborator types at the end of paragraph 2
    await sleep(1050);
    await page
      .frameLocator('iframe[name="right"]')
      .locator('[data-lexical-editor="true"]')
      .focus();
    await page.keyboard.press('ArrowDown'); // Move caret to end of paragraph 2
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('Word');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">This is a test. Word</span>
        </p>
      `,
    );

    // Left collaborator undoes their text in the second paragraph.
    await sleep(50);
    await page.frameLocator('iframe[name="left"]').getByLabel('Undo').click();

    // The undo also removed the text node from YJS.
    // Check that the dangling text from right user was also removed.
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line 1</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    // Left collaborator refreshes their page
    await page.evaluate(() => {
      document
        .querySelector('iframe[name="left"]')
        .contentDocument.location.reload();
    });

    // Page content should be the same as before the refresh
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Line 1</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Merge dangling text into preceding text node', async ({
    isRichText,
    page,
    isCollab,
    browserName,
  }) => {
    test.skip(!isCollab);

    // Left collaborator types two pieces of text in the same paragraph, but with different styling.
    await focusEditor(page);
    await page.keyboard.type('normal');
    await sleep(1050);
    await toggleBold(page);
    await page.keyboard.type('bold');

    // Right collaborator types at the end of the paragraph.
    await sleep(50);
    await page
      .frameLocator('iframe[name="right"]')
      .locator('[data-lexical-editor="true"]')
      .focus();
    await page.keyboard.press('ArrowDown'); // Move caret to end of paragraph
    await page.keyboard.type('BOLD');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">normal</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            boldBOLD
          </strong>
        </p>
      `,
    );

    // Left collaborator undoes their bold text.
    await sleep(50);
    await page.frameLocator('iframe[name="left"]').getByLabel('Undo').click();

    // The undo also removed bold the text node from YJS.
    // Check that the dangling text from right user was merged into the preceding text node.
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">normalBOLD</span>
        </p>
      `,
    );

    // Left collaborator refreshes their page
    await page.evaluate(() => {
      document
        .querySelector('iframe[name="left"]')
        .contentDocument.location.reload();
    });

    // Page content should be the same as before the refresh
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">normalBOLD</span>
        </p>
      `,
    );
  });
});
