/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  assertSelection,
  clearEditor,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  selectFromAlignDropdown,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML Lists CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste a list element', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {'text/html': '<ul><li>Hello</li><li>world!</li></ul>'};

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
    );

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0, 0],
    });

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul></li></ul>',
    );

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
    );
  });

  test('Copy + paste a Lexical nested list', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html':
        '<ul><li>Hello</li><li><ul><li>awesome</li></ul></li><li>world!</li></ul>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">awesome</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">world!</span></li></ul>',
    );
  });

  test('Copy + paste (Nested List - directly nested ul)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<ul><ul><li>Hello</li></ul><li>world!</li></ul>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
            </ul>
          </li>
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0, 0],
    });

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
              <li
                value="2"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );

    await page.keyboard.press('ArrowUp');

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
  });

  test('Copy + paste (Nested List - li with non-list content plus ul child)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<ul><li>Hello<ul><li>world!</li></ul></li></ul>',
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">world!</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 1, 0, 0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 1, 0, 0, 0, 0],
    });

    await selectFromAlignDropdown(page, '.outdent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );

    await page.keyboard.press('ArrowUp');

    await selectFromAlignDropdown(page, '.indent');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                value="1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">Hello</span>
              </li>
            </ul>
          </li>
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world!</span>
          </li>
        </ul>
      `,
    );
  });

  test('Copy + paste a checklist', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><ul __lexicallisttype="check"><li role="checkbox" tabindex="-1" aria-checked="false" value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked"><span>Hello</span></li><li role="checkbox" tabindex="-1" aria-checked="false" value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked"><span>world</span></li></ul>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            role="checkbox"
            tabindex="-1"
            aria-checked="false"
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            role="checkbox"
            tabindex="-1"
            aria-checked="false"
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </li>
        </ul>
      `,
    );

    await clearEditor(page);
    await focusEditor(page);

    // Ensure we preserve checked status.
    clipboard[
      'text/html'
    ] = `<meta charset='utf-8'><ul __lexicallisttype="check"><li role="checkbox" tabindex="-1" aria-checked="true" value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemChecked"><span>Hello</span></li><li role="checkbox" tabindex="-1" aria-checked="false" value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked"><span>world</span></li></ul>`;

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            role="checkbox"
            tabindex="-1"
            aria-checked="true"
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemChecked PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </li>
          <li
            role="checkbox"
            tabindex="-1"
            aria-checked="false"
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </li>
        </ul>
      `,
    );
  });

  test('Paste top level element in the middle of list', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    // Add three list items
    await page.keyboard.type('- one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await page.keyboard.press('Enter');
    await page.keyboard.type('three');
    await page.keyboard.press('Enter');
    await page.keyboard.type('four');

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await pasteFromClipboard(page, {
      'text/html': `<hr />`,
    });

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
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
        </ul>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <div
          class="PlaygroundEditorTheme__blockCursor"
          contenteditable="false"
          data-lexical-cursor="true"></div>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">three</span>
          </li>
          <li
            value="2"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">four</span>
          </li>
        </ul>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });
});
