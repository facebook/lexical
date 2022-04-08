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
  initialize,
  selectFromAlignDropdown,
  test,
} from '../utils/index.mjs';

async function toggleBulletList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.bullet-list');
}

async function clickIndentButton(page, times = 1) {
  for (let i = 0; i < times; i++) {
    await selectFromAlignDropdown(page, '.indent');
  }
}

const MAX_INDENT_LEVEL = 6;

test.describe('Nested List', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can only indent until the max depth when list is empty`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await toggleBulletList(page);

    await clickIndentButton(page, MAX_INDENT_LEVEL);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br /></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );

    await clickIndentButton(page, MAX_INDENT_LEVEL);

    // should stay the same
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem" value="1"><br /></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );
  });

  test(`Can only indent until the max depth when list has content`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('World');

    await clickIndentButton(page, MAX_INDENT_LEVEL);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" value="1" dir="ltr"><span data-lexical-text="true">World</span></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );

    await clickIndentButton(page, MAX_INDENT_LEVEL);

    // should stay the same
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem" value="1"><ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" value="1" dir="ltr"><span data-lexical-text="true">World</span></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );
  });

  test(`Can only indent until the max depth a list with nested lists`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

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
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );

    await selectAll(page);

    await clickIndentButton(page, 3);

    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );

    await clickIndentButton(page, MAX_INDENT_LEVEL);

    // should stay the same
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">from</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">the</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">other</span></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem"><ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">side</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><br></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>',
    );
  });
});
