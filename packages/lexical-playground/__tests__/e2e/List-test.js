/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  selectAll,
  moveLeft,
  selectCharacters,
  moveToParagraphEnd,
  undo,
  redo,
} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  focusEditor,
  waitForSelector,
  click,
  clearEditor,
  IS_COLLAB,
} from '../utils';

async function toggleBulletList(page) {
  await waitForSelector(page, '.block-controls');
  await click(page, '.block-controls');
  await waitForSelector(page, '.dropdown .icon.bullet-list');
  await click(page, '.dropdown .icon.bullet-list');
}

async function toggleNumberedList(page) {
  await waitForSelector(page, '.block-controls');
  await click(page, '.block-controls');
  await waitForSelector(page, '.dropdown .icon.numbered-list');
  await click(page, '.dropdown .icon.numbered-list');
}

async function clickIndentButton(page, times = 1) {
  await waitForSelector(page, 'button .indent');
  for (let i = 0; i < times; i++) {
    await click(page, 'button .indent');
  }
}

async function clickOutdentButton(page, times = 1) {
  await waitForSelector(page, 'button .outdent');
  for (let i = 0; i < times; i++) {
    await click(page, 'button .outdent');
  }
}

describe('Nested List', () => {
  initializeE2E((e2e) => {
    it.skipIf(e2e.isPlainText, `Can toggle an empty list on/off`, async () => {
      const {page} = e2e;

      await focusEditor(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );
    });
    it.skipIf(
      e2e.isPlainText,
      `Can create a list and indent/outdent it`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await toggleBulletList(page);
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul>',
        );

        // Should allow indenting an empty list item
        await clickIndentButton(page, 2);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul></li></ul></li></ul>',
        );

        // Backspace should "unindent" the first list item.
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul>',
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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );

        await selectAll(page);

        await clickIndentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul></li></ul></li></ul></li></ul',
        );

        await clickOutdentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Should outdent if indented when the backspace key is pressed',
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await toggleBulletList(page);

        await page.keyboard.type('Hello');
        await page.keyboard.press('Enter');

        await clickIndentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul></li></ul></li></ul>',
        );

        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul></li></ul>',
        );

        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can indent/outdent mutliple list nodes in a list with multiple levels of indentation`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul>',
        );

        await page.keyboard.type('Hello');
        await page.keyboard.press('Enter');
        await page.keyboard.type('from');

        await clickIndentButton(page);

        // - Hello
        //    - from
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul>',
        );

        await selectAll(page);

        await clickIndentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );

        await clickOutdentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li></ul></li></ul>',
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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li></ul>',
        );

        await selectAll(page);

        await clickIndentButton(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li></ul></li></ul>',
        );

        await clickOutdentButton(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="3" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li></ul></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create a list and then toggle it back to original state.`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br/></p>',
        );

        await page.keyboard.type('Hello');

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ul>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></p>',
        );

        await selectAll(page);

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></p>',
        );

        // works for an indented list

        await toggleBulletList(page);

        await clickIndentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul></li></ul></li></ul></li></ul',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create a list containing inline blocks and then toggle it back to original state.`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br/></p>',
        );

        await page.keyboard.type('One two three');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">One two three</span></p>',
        );

        await moveLeft(page, 6);
        await selectCharacters(page, 'left', 3);

        // link
        await waitForSelector(page, '.link');
        await click(page, '.link');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">One </span><a href="https://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">two</span></a><span data-lexical-text="true"> three</span></p>',
        );

        // move to end of paragraph to close the floating link bar
        await moveToParagraphEnd(page);

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">One </span><a href="https://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">two</span></a><span data-lexical-text="true"> three</span></li></ul>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">One </span><a href="https://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">two</span></a><span data-lexical-text="true"> three</span></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create mutliple bullet lists and then toggle off the list.`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br/></p>',
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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li></ul><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        await selectAll(page);

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></p>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="3"><br></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="5"><br></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="6"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="7"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create an unordered list and convert it to an ordered list `,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await waitForSelector(page, '.block-controls');

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul>',
        );

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create a single item unordered list with text and convert it to an ordered list `,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await toggleBulletList(page);

        await page.keyboard.type('Hello');

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create a multi-line unordered list and convert it to an ordered list `,
      async () => {
        const {page} = e2e;

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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create a multi-line unordered list and convert it to an ordered list when no nodes are in the selection`,
      async () => {
        const {page} = e2e;

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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="5"><br/></li></ul>',
        );

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="5"><br/></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="5"><br/></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create an indented multi-line unordered list and convert it to an ordered list `,
      async () => {
        const {page} = e2e;

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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        await selectAll(page);

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ol class="PlaygroundEditorTheme__ol2 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz lsbdvidr"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ol class="PlaygroundEditorTheme__ol3 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz l4ftupyc"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ol></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ol></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can create an indented multi-line unordered list and convert individual lists in the nested structure to a numbered list. `,
      async () => {
        const {page} = e2e;

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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ol>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        // move to next item up in list
        await page.keyboard.press('ArrowUp');

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ol class="PlaygroundEditorTheme__ol2 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz lsbdvidr"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ol></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        // move to next item up in list
        await page.keyboard.press('ArrowUp');

        await toggleNumberedList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ol class="PlaygroundEditorTheme__ol3 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz l4ftupyc"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ol></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="2"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">the</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">other</span></li></ul></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Should merge selected nodes into existing list siblings of the same type when formatting to a list`,
      async () => {
        const {page} = e2e;

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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">from</span></li></ul><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></p><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">other</span></li></ul><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></p>',
        );

        await selectAll(page);

        await toggleBulletList(page);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">Hello</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="2"><span data-lexical-text="true">from</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="3"><span data-lexical-text="true">the</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="4"><span data-lexical-text="true">other</span></li><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="5"><span data-lexical-text="true">side</span></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Should NOT merge selected nodes into existing list siblings of a different type when formatting to a list`,
      async () => {
        const {page} = e2e;

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
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li></ul><ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li></ol>',
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
          '<ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="3" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li></ol>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Should clear all indentation when pressing 'enter' on an empty indented bullet`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await page.keyboard.type('a');
        await toggleBulletList(page);
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">a</span></li></ul><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Should create list with start number markdown`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        // Trigger markdown using 321 digits followed by "." and a trigger of " ".
        await page.keyboard.type('321. ');

        // forward case is the normal case.
        // undo case is when the user presses undo.

        const forwardHTML =
          '<ol start="321" class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="321" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ol>';

        const undoHTML =
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><span data-lexical-text="true">321. </span></p>';

        await assertHTML(page, forwardHTML);
        if (IS_COLLAB) {
          // Collab uses its own undo/redo
          return;
        }
        await undo(page);
        await assertHTML(page, undoHTML);
        await redo(page);
        await assertHTML(page, forwardHTML);
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Should not process paragraph markdown inside list.`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await toggleBulletList(page);
        await page.keyboard.type('# ');
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><span data-lexical-text="true"># </span></li></ul>',
        );
      },
    );
  });
});
