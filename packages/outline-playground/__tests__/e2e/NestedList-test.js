/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll, moveLeft, selectCharacters} from '../keyboardShortcuts';
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

describe('Nested List', () => {
  initializeE2E((e2e) => {
    it(`Can create a list and indent/outdent it`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '.block-controls');

      await click(page, '.block-controls');

      await waitForSelector(page, '.dropdown .icon.bullet-list');

      await click(page, '.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      );

      // Should allow indenting an empty list item
      await waitForSelector(page, 'button .indent');
      await click(page, 'button .indent');
      await click(page, 'button .indent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem"><br></li></ul></li></ul></li></ul>',
      );

      // Backspace should "unindent" the first list item.
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
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
        '<ul class="editor-list-ul"><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );

      await selectAll(page);

      await waitForSelector(page, 'button .indent');
      await click(page, 'button .indent');
      await click(page, 'button .indent');
      await click(page, 'button .indent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">side</span></li></ul></li></ul></li></ul></li></ul',
      );

      await waitForSelector(page, 'button .outdent');
      await click(page, 'button .outdent');
      await click(page, 'button .outdent');
      await click(page, 'button .outdent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );
    });

    it(`Can create a list and then toggle it back to original state.`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await assertHTML(page, '<p class="editor-paragraph"><br/></p>');

      await page.keyboard.type('Hello');

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li></ul>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Hello</span></p>',
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
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Hello</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">from</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">the</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">other</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">side</span></p>',
      );

      await selectAll(page);

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Hello</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">from</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">the</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">other</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">side</span></p>',
      );

      // works for an indented list

      await toggleBulletList(page);

      await waitForSelector(page, 'button .indent');
      await click(page, 'button .indent');
      await click(page, 'button .indent');
      await click(page, 'button .indent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul></li></ul></li></ul></li></ul',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Hello</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">from</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">the</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">other</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">side</span></p>',
      );
    });

    it(`Can create a list containing inline blocks and then toggle it back to original state.`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await assertHTML(page, '<p class="editor-paragraph"><br/></p>');

      await page.keyboard.type('One two three');

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">One two three</span></p>',
      );

      await moveLeft(page, 6);
      await selectCharacters(page, 'left', 3);

      // link
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">One </span><a href="http://" class="editor-text-link ltr" dir="ltr"><span data-outline-text="true">two</span></a><span data-outline-text="true"> three</span></p>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">One </span><a href="http://" class="editor-text-link ltr" dir="ltr"><span data-outline-text="true">two</span></a><span data-outline-text="true"> three</span></li></ul>',
      );

      // click to close the floating link bar
      await page.click('div.editor');

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">One </span><a href="http://" class="editor-text-link ltr" dir="ltr"><span data-outline-text="true">two</span></a><span data-outline-text="true"> three</span></p>',
      );
    });

    it(`Can create mutliple bullet lists and then toggle off the list.`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await assertHTML(page, '<p class="editor-paragraph"><br/></p>');

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
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li></ul><p class="editor-paragraph"><br></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">the</span></p><p class="editor-paragraph"><br></p><ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );

      await selectAll(page);

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">Hello</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">from</span></p><p class="editor-paragraph"><br></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">the</span></p><p class="editor-paragraph"><br></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">other</span></p><p class="editor-paragraph ltr" dir="ltr"><span data-outline-text="true">side</span></p>',
      );

      await toggleBulletList(page);

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem"><br></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem"><br></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );
    });

    it(`Can create an unordered list and convert it to an ordered list `, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '.block-controls');

      await click(page, '.block-controls');
      await waitForSelector(page, '.dropdown .icon.bullet-list');
      await click(page, '.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      );

      await click(page, '.block-controls');
      await waitForSelector(page, '.dropdown .icon.numbered-list');
      await click(page, '.dropdown .icon.numbered-list');

      await assertHTML(
        page,
        '<ol class="editor-list-ol"><li class="editor-listitem"><br></li></ol>',
      );

      await click(page, '.block-controls');
      await waitForSelector(page, '.dropdown .icon.bullet-list');
      await click(page, '.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      );
    });
  });
});
