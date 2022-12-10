/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';

import {
  moveLeft,
  moveRight,
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToParagraphEnd,
  redo,
  selectAll,
  selectCharacters,
  undo,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  clearEditor,
  click,
  copyToClipboard,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  repeat,
  selectFromAlignDropdown,
  selectFromFormatDropdown,
  test,
  waitForSelector,
} from '../utils/index.mjs';

async function toggleBulletList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.bullet-list');
}

async function toggleNumberedList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.numbered-list');
}

async function toggleCheckList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.check-list');
}

async function clickIndentButton(page, times = 1) {
  for (let i = 0; i < times; i++) {
    await selectFromAlignDropdown(page, '.indent');
  }
}

async function clickOutdentButton(page, times = 1) {
  for (let i = 0; i < times; i++) {
    await selectFromAlignDropdown(page, '.outdent');
  }
}

test.beforeEach(({isPlainText}) => {
  test.skip(isPlainText);
});

test.describe('Nested List', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can toggle an empty list on/off`, async ({page}) => {
    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test(`Can create a list and indent/outdent it`, async ({page}) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul>',
    );

    // Should allow indenting an empty list item
    await clickIndentButton(page, 2);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul></li></ul></li></ul>',
    );

    // Backspace should "unindent" the first list item.
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul>',
    );

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );

    await selectAll(page);

    await clickIndentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul></li></ul></li></ul></li></ul>',
    );

    await clickOutdentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Can create a list and partially copy some content out of it`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam venenatis risus ac cursus efficitur. Cras efficitur magna odio, lacinia posuere mauris placerat in. Etiam eu congue nisl. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nulla vulputate justo id eros convallis, vel pellentesque orci hendrerit. Pellentesque accumsan molestie eros, vitae tempor nisl semper sit amet. Sed vulputate leo dolor, et bibendum quam feugiat eget. Praesent vestibulum libero sed enim ornare, in consequat dui posuere. Maecenas ornare vestibulum felis, non elementum urna imperdiet sit amet.',
    );
    await toggleBulletList(page);
    await moveToEditorBeginning(page);
    await moveRight(page, 6);
    await selectCharacters(page, 'right', 11);

    const clipboard = await copyToClipboard(page);

    await moveToEditorEnd(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            value="1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam
              venenatis risus ac cursus efficitur. Cras efficitur magna odio,
              lacinia posuere mauris placerat in. Etiam eu congue nisl.
              Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
              posuere cubilia curae; Nulla vulputate justo id eros convallis,
              vel pellentesque orci hendrerit. Pellentesque accumsan molestie
              eros, vitae tempor nisl semper sit amet. Sed vulputate leo dolor,
              et bibendum quam feugiat eget. Praesent vestibulum libero sed enim
              ornare, in consequat dui posuere. Maecenas ornare vestibulum
              felis, non elementum urna imperdiet sit amet.
            </span>
          </li>
        </ul>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">ipsum dolor</span>
        </p>
      `,
    );
  });

  test('Should outdent if indented when the backspace key is pressed', async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');

    await clickIndentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul></li></ul></li></ul>',
    );

    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul></li></ul>',
    );

    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul>',
    );
  });

  test(`Can indent/outdent mutliple list nodes in a list with multiple levels of indentation`, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
    );

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');

    await clickIndentButton(page);

    // - Hello
    //    - from
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul>',
    );

    await selectAll(page);

    await clickIndentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );

    await clickOutdentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul>',
    );

    await page.keyboard.press('ArrowRight');

    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await clickOutdentButton(page);

    // - Hello
    //    - from
    //    - the
    //    - other
    // - side
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li></ul>',
    );

    await selectAll(page);

    await clickIndentButton(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li></ul></li></ul>',
    );

    await clickOutdentButton(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Can indent a list with a list item in between nested lists`, async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('foo');
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('bar');
    await clickOutdentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('baz');
    await clickIndentButton(page);

    await selectAll(page);
    await clickIndentButton(page);
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1">
            <ul>
              <li value="1">
                <ul>
                  <li value="1" dir="ltr">
                    <span data-lexical-text="true">foo</span>
                  </li>
                </ul>
              </li>
              <li value="1" dir="ltr">
                <span data-lexical-text="true">bar</span>
              </li>
              <li value="2">
                <ul>
                  <li value="1" dir="ltr">
                    <span data-lexical-text="true">baz</span>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test(`Can create a list and then toggle it back to original state.`, async ({
    page,
  }) => {
    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await page.keyboard.type('Hello');

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );

    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">from</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">the</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">other</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">side</span>
        </p>
      `,
    );

    await selectAll(page);

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">from</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">the</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">other</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">side</span>
        </p>
      `,
    );

    // works for an indented list

    await toggleBulletList(page);

    await clickIndentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul></li></ul></li></ul></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">from</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">the</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">other</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">side</span>
        </p>
      `,
    );
  });

  test(`Can create a list containing inline blocks and then toggle it back to original state.`, async ({
    page,
  }) => {
    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await page.keyboard.type('One two three');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">One two three</span>
        </p>
      `,
    );

    await moveLeft(page, 6);
    await selectCharacters(page, 'left', 3);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">One</span>
          <a
            href="https://"
            rel="noopener"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">two</span>
          </a>
          <span data-lexical-text="true">three</span>
        </p>
      `,
    );

    // move to end of paragraph to close the floating link bar
    await moveToParagraphEnd(page);

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">One </span><a href="https://" rel="noopener" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">two</span></a><span data-lexical-text="true"> three</span></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">One</span>
          <a
            href="https://"
            rel="noopener"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">two</span>
          </a>
          <span data-lexical-text="true">three</span>
        </p>
      `,
    );
  });

  test(`Can create mutliple bullet lists and then toggle off the list.`, async ({
    page,
  }) => {
    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await page.keyboard.type('Hello');

    await toggleBulletList(page);

    await page.keyboard.press('Enter');
    await page.keyboard.type('from');

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.keyboard.type('the');

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.keyboard.type('other');

    await toggleBulletList(page);

    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li></ul><p class="PlaygroundEditorTheme__paragraph"><br></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph"><br></p><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    await selectAll(page);

    await toggleBulletList(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">from</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">the</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">other</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">side</span>
        </p>
      `,
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem" value="3"><br></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem" value="5"><br></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="6"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="7"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Can create an unordered list and convert it to an ordered list `, async ({
    page,
  }) => {
    await focusEditor(page);

    await waitForSelector(page, '.block-controls');

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul>',
    );

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br></li></ul>',
    );
  });

  test(`Can create a single item unordered list with text and convert it to an ordered list `, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await page.keyboard.type('Hello');

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ul>',
    );
  });

  test(`Can create a multi-line unordered list and convert it to an ordered list `, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Can create a multi-line unordered list and convert it to an ordered list when no nodes are in the selection`, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem" value="5"><br/></li></ul>',
    );

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem" value="5"><br/></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem" value="5"><br/></li></ul>',
    );
  });

  test(`Can create an indented multi-line unordered list and convert it to an ordered list `, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await clickOutdentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');
    await clickOutdentButton(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    await selectAll(page);

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ol class="PlaygroundEditorTheme__ol2"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ol class="PlaygroundEditorTheme__ol3"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ol></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ol></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Can create an indented multi-line unordered list and convert individual lists in the nested structure to a numbered list. `, async ({
    page,
  }) => {
    await focusEditor(page);

    await toggleBulletList(page);

    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await clickOutdentButton(page);

    await page.keyboard.press('Enter');
    await page.keyboard.type('side');
    await clickOutdentButton(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ol>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    // move to next item up in list
    await page.keyboard.press('ArrowUp');

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ol class="PlaygroundEditorTheme__ol2"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ol></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    // move to next item up in list
    await page.keyboard.press('ArrowUp');

    await toggleNumberedList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ol class="PlaygroundEditorTheme__ol3"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ol></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="2"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Should merge selected nodes into existing list siblings of the same type when formatting to a list`, async ({
    page,
  }) => {
    await focusEditor(page);

    // Hello
    // - from
    // the
    // - other
    // side
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await toggleBulletList(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('Enter');
    await page.keyboard.type('other');
    await toggleBulletList(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('side');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">from</span>
          </li>
        </ul>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">the</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">other</span>
          </li>
        </ul>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">side</span>
        </p>
      `,
    );

    await selectAll(page);

    await toggleBulletList(page);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
    );
  });

  test(`Should NOT merge selected nodes into existing list siblings of a different type when formatting to a list`, async ({
    page,
    isCollab,
  }) => {
    await focusEditor(page);

    // - Hello
    // - from
    // the
    await toggleBulletList(page);
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await toggleNumberedList(page);

    // - Hello
    // - from
    // 1. the
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li></ul><ol class="PlaygroundEditorTheme__ol1"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li></ol>',
    );

    await clearEditor(page);

    // Hello
    // 1. from
    // 2. the
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await toggleNumberedList(page);
    await page.keyboard.type('from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('the');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await toggleNumberedList(page);

    // 1. Hello
    // 2. from
    // 3. the
    await assertHTML(
      page,
      '<ol class="PlaygroundEditorTheme__ol1"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="3" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li></ol>',
    );
  });

  test(`Should create list with start number markdown`, async ({
    page,
    isCollab,
  }) => {
    await focusEditor(page);
    // Trigger markdown using 321 digits followed by "." and a trigger of " ".
    await page.keyboard.type('321. ');

    // forward case is the normal case.
    // undo case is when the user presses undo.

    const forwardHTML =
      '<ol start="321" class="PlaygroundEditorTheme__ol1"><li value="321" class="PlaygroundEditorTheme__listItem"><br></li></ol>';

    const undoHTML = html`
      <p class="PlaygroundEditorTheme__paragraph">
        <span data-lexical-text="true">321.</span>
      </p>
    `;

    await assertHTML(page, forwardHTML);
    if (isCollab) {
      // Collab uses its own undo/redo
      return;
    }
    await undo(page);
    await assertHTML(page, undoHTML);
    await redo(page);
    await assertHTML(page, forwardHTML);
  });

  test(`Should not process paragraph markdown inside list.`, async ({page}) => {
    await focusEditor(page);

    await toggleBulletList(page);
    await page.keyboard.type('# ');
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true"># </span></li></ul>',
    );
  });

  test(`Un-indents list empty list items when the user presses enter`, async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await clickIndentButton(page);
    await clickIndentButton(page);
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">a</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul>',
    );
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">a</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
    );
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">a</span></li></ul><p class="PlaygroundEditorTheme__paragraph"><br></p>',
    );
  });

  test(`Converts a List with one ListItem to a Paragraph when Normal is selected in the format menu`, async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('a');
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">a</span>
          </li>
        </ul>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await selectFromFormatDropdown(page, '.paragraph');
    await assertHTML(
      page,
      html`
        <p dir="ltr"><span data-lexical-text="true">a</span></p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test(`Converts the last ListItem in a List with multiple ListItem to a Paragraph when Normal is selected in the format menu`, async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">a</span>
          </li>
          <li value="2" dir="ltr">
            <span data-lexical-text="true">b</span>
          </li>
        </ul>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await selectFromFormatDropdown(page, '.paragraph');
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">a</span>
          </li>
        </ul>
        <p dir="ltr"><span data-lexical-text="true">b</span></p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test(`Converts the middle ListItem in a List with multiple ListItem to a Paragraph when Normal is selected in the format menu`, async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    await page.keyboard.type('c');
    await page.keyboard.press('ArrowUp');
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">a</span>
          </li>
          <li value="2" dir="ltr">
            <span data-lexical-text="true">b</span>
          </li>
          <li value="3" dir="ltr">
            <span data-lexical-text="true">c</span>
          </li>
        </ul>
      `,
      undefined,
      {ignoreClasses: true},
    );
    await selectFromFormatDropdown(page, '.paragraph');
    await assertHTML(
      page,
      html`
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">a</span>
          </li>
        </ul>
        <p dir="ltr"><span data-lexical-text="true">b</span></p>
        <ul>
          <li value="1" dir="ltr">
            <span data-lexical-text="true">c</span>
          </li>
        </ul>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can create check list, toggle it to bullet-list and back', async ({
    page,
  }) => {
    await focusEditor(page);
    await toggleCheckList(page);
    await page.keyboard.type('a');
    await click(page, '.PlaygroundEditorTheme__listItemUnchecked', {
      position: {x: 10, y: 10},
    });
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await page.keyboard.type('c');
    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            aria-checked="true"
            role="checkbox"
            tabindex="-1"
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr PlaygroundEditorTheme__listItemChecked"
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
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__nestedListItem"
            value="3">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                aria-checked="false"
                role="checkbox"
                tabindex="-1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">c</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
    await moveToEditorBeginning(page);
    await toggleBulletList(page);
    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">a</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="2">
            <span data-lexical-text="true">b</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"
            value="3">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                aria-checked="false"
                role="checkbox"
                tabindex="-1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">c</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
    await toggleCheckList(page);
    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
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
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__nestedListItem"
            value="3">
            <ul class="PlaygroundEditorTheme__ul">
              <li
                aria-checked="false"
                role="checkbox"
                tabindex="-1"
                class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__listItemUnchecked PlaygroundEditorTheme__ltr"
                dir="ltr"
                value="1">
                <span data-lexical-text="true">c</span>
              </li>
            </ul>
          </li>
        </ul>
      `,
    );
  });

  test('can navigate and check/uncheck with keyboard', async ({
    page,
    isCollab,
  }) => {
    await focusEditor(page);
    await toggleCheckList(page);
    //
    // [ ] a
    // [ ] b
    //     [ ] c
    //         [ ] d
    //         [ ] e
    // [ ] f
    await page.keyboard.type('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await page.keyboard.type('c');
    await page.keyboard.press('Enter');
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await page.keyboard.type('d');
    await page.keyboard.press('Enter');
    await page.keyboard.type('e');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('f');

    const assertCheckCount = async (checkCount, uncheckCount) => {
      const pageOrFrame = await (isCollab ? page.frame('left') : page);
      await expect(
        pageOrFrame.locator('li[role="checkbox"][aria-checked="true"]'),
      ).toHaveCount(checkCount);
      await expect(
        pageOrFrame.locator('li[role="checkbox"][aria-checked="false"]'),
      ).toHaveCount(uncheckCount);
    };

    await assertCheckCount(0, 6);

    // Go back to select checkbox
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');

    await repeat(5, async () => {
      await page.keyboard.press('ArrowUp', {delay: 50});
      await page.keyboard.press('Space');
    });

    await assertCheckCount(6, 0);

    await repeat(3, async () => {
      await page.keyboard.press('ArrowDown', {delay: 50});
      await page.keyboard.press('Space');
    });

    await assertCheckCount(3, 3);
  });

  test('replaces existing element node', async ({page}) => {
    // Create two quote blocks, select it and format to a list
    // should replace quotes (instead of moving quotes into the list items)
    await focusEditor(page);
    await page.keyboard.type('> Hello from');
    await page.keyboard.press('Enter');
    await page.keyboard.type('> the other side');
    await selectAll(page);
    await toggleBulletList(page);
    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <span data-lexical-text="true">Hello from</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="2">
            <span data-lexical-text="true">the other side</span>
          </li>
        </ul>
      `,
    );
  });

  test('remove list breaks when selection in empty nested list item', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Enter');
    await toggleBulletList(page);
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await toggleBulletList(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello World</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await page.pause();
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1],
      focusOffset: 0,
      focusPath: [1],
    });
  });

  test('remove list breaks when selection in empty nested list item 2', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Enter');
    await page.keyboard.type('a');
    await toggleBulletList(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await click(page, '.toolbar-item.alignment');
    await click(page, 'button:has-text("Indent")');
    await toggleBulletList(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello World</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">a</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">b</span>
        </p>
      `,
    );
    await page.pause();
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });
  });
});
