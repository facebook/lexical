/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  focusEditor,
  waitForSelector,
  click,
} from '../utils';

async function toggleBulletList(page) {
  await waitForSelector(page, '.block-controls');
  await click(page, '.block-controls');
  await waitForSelector(page, '.dropdown .icon.bullet-list');
  await click(page, '.dropdown .icon.bullet-list');
}

async function clickIndentButton(page, times = 1) {
  await waitForSelector(page, 'button .indent');
  for (let i = 0; i < times; i++) {
    await click(page, 'button .indent');
  }
}

const MAX_INDENT_LEVEL = 6;

describe('Nested List', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      `Can only indent until the max depth when list is empty`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await toggleBulletList(page);

        await clickIndentButton(page, MAX_INDENT_LEVEL);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br /></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );

        await clickIndentButton(page, MAX_INDENT_LEVEL);

        // should stay the same
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k" value="1"><br /></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can only indent until the max depth when list has content`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await toggleBulletList(page);
        await page.keyboard.type('World');

        await clickIndentButton(page, MAX_INDENT_LEVEL);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">World</span></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );

        await clickIndentButton(page, MAX_INDENT_LEVEL);

        // should stay the same
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp" value="1"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr" value="1"><span data-lexical-text="true">World</span></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can only indent until the max depth a list with nested lists`,
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
        await clickIndentButton(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('side');
        await clickIndentButton(page);
        await page.keyboard.press('Enter');

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );

        await selectAll(page);

        await clickIndentButton(page, 3);

        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );

        await clickIndentButton(page, MAX_INDENT_LEVEL);

        // should stay the same
        await assertHTML(
          page,
          '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__nestedListItem a75w6hnp"><ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
        );
      },
    );
  });
});
