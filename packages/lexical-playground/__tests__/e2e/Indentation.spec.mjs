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
  insertTable,
  test,
} from '../utils/index.mjs';

test.describe('Identation', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test(`Can create content and indent and outdent it all`, async ({
    page,
    browserName,
    isPlainText,
    isCollab,
  }) => {
    // We have to skip collab due to styling on the table for selected cells
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('foo');
    await page.keyboard.press('Enter');
    await page.keyboard.type('bar');
    await page.keyboard.press('Enter');
    await page.keyboard.type('yar');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- item');
    await page.keyboard.type('item 2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('item 3');
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('``` ');
    await page.keyboard.type('code');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await insertTable(page, 1, 1);

    await page.keyboard.type('foo');

    await selectAll(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">yar</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">itemitem 2</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="2">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">item 3</span>
              </li>
            </ul>
          </li>
        </ul>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true">code</span>
        </code>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <table
          class="PlaygroundEditorTheme__table PlaygroundEditorTheme__tableSelection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">foo</span>
              </p>
            </th>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">yar</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="1">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">itemitem 2</span>
              </li>
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
                value="2">
                <ul class="PlaygroundEditorTheme__ul">
                  <li
                    class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                    dir="ltr"
                    value="1">
                    <span data-lexical-text="true">item 3</span>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true">code</span>
        </code>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(40px)">
          <br />
        </p>
        <table
          class="PlaygroundEditorTheme__table PlaygroundEditorTheme__tableSelection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
                dir="ltr"
                style="padding-inline-start: calc(40px)">
                <span data-lexical-text="true">foo</span>
              </p>
            </th>
          </tr>
        </table>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(40px)">
          <br />
        </p>
      `,
    );

    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(80px)">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(80px)">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(80px)">
          <span data-lexical-text="true">yar</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="1">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
                value="1">
                <ul class="PlaygroundEditorTheme__ul">
                  <li
                    class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                    dir="ltr"
                    value="1">
                    <span data-lexical-text="true">itemitem 2</span>
                  </li>
                  <li
                    class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
                    value="2">
                    <ul class="PlaygroundEditorTheme__ul">
                      <li
                        class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                        dir="ltr"
                        value="1">
                        <span data-lexical-text="true">item 3</span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true">code</span>
        </code>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(80px)">
          <br />
        </p>
        <table
          class="PlaygroundEditorTheme__table PlaygroundEditorTheme__tableSelection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
                dir="ltr"
                style="padding-inline-start: calc(80px)">
                <span data-lexical-text="true">foo</span>
              </p>
            </th>
          </tr>
        </table>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(80px)">
          <br />
        </p>
      `,
    );

    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Outdent")');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">yar</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="1">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">itemitem 2</span>
              </li>
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
                value="2">
                <ul class="PlaygroundEditorTheme__ul">
                  <li
                    class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                    dir="ltr"
                    value="1">
                    <span data-lexical-text="true">item 3</span>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true">code</span>
        </code>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(40px)">
          <br />
        </p>
        <table
          class="PlaygroundEditorTheme__table PlaygroundEditorTheme__tableSelection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
                dir="ltr"
                style="padding-inline-start: calc(40px)">
                <span data-lexical-text="true">foo</span>
              </p>
            </th>
          </tr>
        </table>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent"
          style="padding-inline-start: calc(40px)">
          <br />
        </p>
      `,
    );

    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Outdent")');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">yar</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">itemitem 2</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="2">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">item 3</span>
              </li>
            </ul>
          </li>
        </ul>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true">code</span>
        </code>
        <p class="PlaygroundEditorTheme__paragraph" style=""><br /></p>
        <table
          class="PlaygroundEditorTheme__table PlaygroundEditorTheme__tableSelection">
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              style="background-color: rgb(172, 206, 247); caret-color: transparent">
              <p
                class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
                dir="ltr"
                style="">
                <span data-lexical-text="true">foo</span>
              </p>
            </th>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph" style=""><br /></p>
      `,
    );
  });
});
