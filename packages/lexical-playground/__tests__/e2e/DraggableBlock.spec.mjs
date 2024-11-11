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
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Paragraph 2</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
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
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
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
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Paragraph 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
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
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Paragraph 2</span>
      </p>
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr"
        style="">
        <span data-lexical-text="true">Paragraph 1</span>
      </p>
    `,
    );
  });
});
