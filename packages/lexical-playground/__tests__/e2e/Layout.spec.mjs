/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  insertLayoutInFirstCell,
  test,
} from '../utils/index.mjs';

test.describe('Layout', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can delete layout with Backspace', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await insertLayoutInFirstCell(page, '1fr 1fr');
    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete layout with Delete', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await insertLayoutInFirstCell(page, '1fr 1fr');
    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await selectAll(page);
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete layout with word delete', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await insertLayoutInFirstCell(page, '1fr 1fr');
    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await selectAll(page);
    // Ctrl+Backspace for word delete
    await page.keyboard.down('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.up('Control');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete layout with line delete', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await insertLayoutInFirstCell(page, '1fr 1fr');
    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await selectAll(page);
    // Cmd+Backspace for line delete
    await page.keyboard.down('Meta');
    await page.keyboard.press('Backspace');
    await page.keyboard.up('Meta');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  // Reference: https://github.com/facebook/lexical/issues/6938
  test('Can delete layout when it is the first node', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    await insertLayoutInFirstCell(page, '1fr 1fr');

    // Remove the paragraph before the layout to make layout the first node
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Backspace');

    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');

    await assertHTML(
      page,
      html`
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await selectAll(page);
    await page.keyboard.press('Delete');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can delete layout with surrounding content', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);
    // Add content before layout
    await page.keyboard.type('Content before');
    await page.keyboard.press('Enter');

    // Insert and fill layout
    await insertLayoutInFirstCell(page, '1fr 1fr');
    await page.keyboard.type('Left column');
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await page.keyboard.type('Right column');

    // Add content after layout
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('Content after');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Content before</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div
          class="PlaygroundEditorTheme__layoutContainer"
          style="grid-template-columns: 1fr 1fr;">
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Left column</span>
            </p>
          </div>
          <div
            class="PlaygroundEditorTheme__layoutItem"
            data-lexical-layout-item="true">
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Right column</span>
            </p>
          </div>
        </div>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Content after</span>
        </p>
      `,
    );

    // Click second column before select all
    await click(page, '.PlaygroundEditorTheme__layoutItem:nth-child(2)');
    await selectAll(page);
    await page.keyboard.press('Delete');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });
});
