/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  dragDraggableMenuTo,
  focusEditor,
  initialize,
  mouseMoveToSelector,
  test,
} from '../utils/index.mjs';

test.describe('DraggableBlock', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Paragraph one can be successfully dragged below paragraph two', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);
    await page.keyboard.type('Paragraph 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 3');

    await mouseMoveToSelector(page, 'p:has-text("Paragraph 1")');
    await page.pause();
    await dragDraggableMenuTo(
      page,
      'p:has-text("Paragraph 2")',
      'middle',
      'end',
    );
    await page.pause();
    await assertHTML(
      page,
      `
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto">
          <span data-lexical-text="true">Paragraph 2</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto"
          style="">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto">
          <span data-lexical-text="true">Paragraph 3</span>
        </p>
      `,
    );
  });

  test('Dragging a paragraph to the end of itself does not change the content', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);
    await page.keyboard.type('Paragraph 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 2');

    await mouseMoveToSelector(page, 'p:has-text("Paragraph 1")');
    await page.pause();
    await dragDraggableMenuTo(
      page,
      'p:has-text("Paragraph 1")',
      'middle',
      'end',
    );

    await assertHTML(
      page,
      `
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto"
          style="">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto">
          <span data-lexical-text="true">Paragraph 2</span>
        </p>
      `,
    );
  });

  test('Drag a paragraph to the bottom of its previous paragraph and nothing happens', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);
    await page.keyboard.type('Paragraph 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 2');

    await mouseMoveToSelector(page, 'p:has-text("Paragraph 2")');
    await page.pause();
    await dragDraggableMenuTo(
      page,
      'p:has-text("Paragraph 1")',
      'middle',
      'end',
    );

    await assertHTML(
      page,
      `
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph"
          dir="auto"
          style="">
          <span data-lexical-text="true">Paragraph 2</span>
        </p>
      `,
    );
  });

  test('Dragging the first paragraph to an empty space in the middle of the editor works correctly', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);
    await page.keyboard.type('Paragraph 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Paragraph 2');

    await mouseMoveToSelector(page, 'p:has-text("Paragraph 1")');
    await page.pause();
    await dragDraggableMenuTo(page, '.ContentEditable__root');

    await assertHTML(
      page,
      `
      <p
        class="PlaygroundEditorTheme__paragraph"
        dir="auto">
        <span data-lexical-text="true">Paragraph 2</span>
      </p>
      <p
        class="PlaygroundEditorTheme__paragraph"
        dir="auto"
        style="">
        <span data-lexical-text="true">Paragraph 1</span>
      </p>
    `,
    );
  });

  test('List item one can be successfully dragged below list item two', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);

    // Create a bulleted list using markdown shortcuts
    await page.keyboard.type('- Item 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 3');

    // Hover over the first list item
    await mouseMoveToSelector(page, 'li:has-text("Item 1")');

    await page.waitForTimeout(200);
    // Drag the handle from Item 1 and drop it at the end of Item 2
    await dragDraggableMenuTo(page, 'li:has-text("Item 2")', 'middle', 'end');
    await page.pause();

    // Assert the new order: Item 2 -> Item 1 -> Item 3
    // Note: The classes might slightly differ based on the exact playground theme version,
    // but the failure will output the actual HTML if it differs!
    await assertHTML(
      page,
      `
        <ul class="PlaygroundEditorTheme__ul" dir="auto">
          <li class="PlaygroundEditorTheme__listItem" value="1">
            <span data-lexical-text="true">Item 2</span>
          </li>
          <li class="PlaygroundEditorTheme__listItem" style="" value="2">
            <span data-lexical-text="true">Item 1</span>
          </li>
          <li class="PlaygroundEditorTheme__listItem" value="3">
            <span data-lexical-text="true">Item 3</span>
          </li>
        </ul>
      `,
    );
  });

  test('List item can be dragged out of a list and dropped below a paragraph', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);

    // 1. Create the list
    await page.keyboard.type('- Item 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 3');
    await page.keyboard.press('Enter');

    // 2. Break out of the list and make a paragraph
    await page.keyboard.press('Enter');
    await page.keyboard.type('hello world');

    // 3. Hover and drag Item 1 below "hello world"
    await mouseMoveToSelector(page, 'li:has-text("Item 1")');
    await page.waitForTimeout(200);

    await dragDraggableMenuTo(
      page,
      'p:has-text("hello world")',
      'middle',
      'end',
    );

    // 4. The Expected Notion-like State
    await assertHTML(
      page,
      `
        <ul class="PlaygroundEditorTheme__ul" dir="auto">
          <li class="PlaygroundEditorTheme__listItem" value="1">
            <span data-lexical-text="true">Item 2</span>
          </li>
          <li class="PlaygroundEditorTheme__listItem" value="2">
            <span data-lexical-text="true">Item 3</span>
          </li>
        </ul>
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">hello world</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul" dir="auto">
          <li class="PlaygroundEditorTheme__listItem" value="1">
            <span data-lexical-text="true">Item 1</span>
          </li>
        </ul>
      `,
    );
  });

  test('Paragraph dragged over a list targets the entire list, not individual items', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);

    // Setup: Paragraph -> List
    await page.keyboard.type('Move Me');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- Item 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    // Hover over the paragraph
    await mouseMoveToSelector(page, 'p:has-text("Move Me")');
    await page.waitForTimeout(200);

    // Drag the paragraph and drop it on the bottom half of Item 2.
    await dragDraggableMenuTo(page, 'li:has-text("Item 2")', 'middle', 'end');

    // Expectation: The List is now ABOVE the Paragraph.
    await assertHTML(
      page,
      `
        <ul class="PlaygroundEditorTheme__ul" dir="auto">
          <li class="PlaygroundEditorTheme__listItem" value="1">
            <span data-lexical-text="true">Item 1</span>
          </li>
          <li class="PlaygroundEditorTheme__listItem" value="2">
            <span data-lexical-text="true">Item 2</span>
          </li>
        </ul>
        <p class="PlaygroundEditorTheme__paragraph" dir="auto" style="">
          <span data-lexical-text="true">Move Me</span>
        </p>
      `,
    );
  });

  test('Nested list items can be successfully dragged and reordered', async ({
    page,
    isPlainText,
    browserName,
    isCollab,
  }) => {
    test.skip(isCollab);
    test.skip(isPlainText);
    test.skip(browserName === 'firefox');

    await focusEditor(page);

    // Setup: Top Level -> Nested 1 -> Nested 2
    await page.keyboard.type('- Top Level');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab'); // Indent to nest
    await page.keyboard.type('Nested 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Nested 2');

    // Hover over Nested 1
    await mouseMoveToSelector(page, ':nth-match(li:has-text("Nested 1"), 2)');
    await page.waitForTimeout(200);

    //  Grab the 2nd match for the drop target
    await dragDraggableMenuTo(
      page,
      ':nth-match(li:has-text("Nested 2"), 2)',
      'middle',
      'end',
    );

    // Expectation: Nested 2 is now above Nested 1
    await assertHTML(
      page,
      `
        <ul class="PlaygroundEditorTheme__ul" dir="auto">
          <li class="PlaygroundEditorTheme__listItem" value="1">
            <span data-lexical-text="true">Top Level</span>
          </li>
          <li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2">
            <ul class="PlaygroundEditorTheme__ul">
              <li class="PlaygroundEditorTheme__listItem" value="1">
                <span data-lexical-text="true">Nested 2</span>
              </li>
              <li class="PlaygroundEditorTheme__listItem" style="" value="2">
                <span data-lexical-text="true">Nested 1</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
  });
});
