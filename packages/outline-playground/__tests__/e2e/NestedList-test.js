/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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

describe('Nested List', () => {
  initializeE2E((e2e) => {
    it(`Can create a list and indent/outdent it`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '#block-controls button');

      await click(page, '#block-controls button');

      await waitForSelector(page, '.dropdown .icon.bullet-list');

      await click(page, '.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      );

      // Should allow indenting an empty list item
      await waitForSelector(page, 'button.action-button.indent');
      await click(page, 'button.action-button.indent');
      await click(page, 'button.action-button.indent');

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
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );

      await selectAll(page);

      await waitForSelector(page, 'button.action-button.indent');
      await click(page, 'button.action-button.indent');
      await click(page, 'button.action-button.indent');
      await click(page, 'button.action-button.indent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul editor-nested-list-list"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul></li></ul></li></ul></li></ul',
      );

      await waitForSelector(page, 'button.action-button.outdent');
      await click(page, 'button.action-button.outdent');
      await click(page, 'button.action-button.outdent');
      await click(page, 'button.action-button.outdent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">Hello</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">from</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">the</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">other</span></li><li class="editor-listitem ltr" dir="ltr"><span data-outline-text="true">side</span></li></ul>',
      );
    });

    it(`Can create an unordered list and convert it to an ordered list `, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);

      await waitForSelector(page, '#block-controls button');

      await click(page, '#block-controls button');
      await waitForSelector(page, '.dropdown .icon.bullet-list');
      await click(page, '.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      );

      await click(page, '#block-controls button');
      await waitForSelector(page, '.dropdown .icon.numbered-list');
      await click(page, '.dropdown .icon.numbered-list');

      await assertHTML(
        page,
        '<ol class="editor-list-ol"><li class="editor-listitem"><br></li></ol>',
      );

      // Issue #904 Converting back to a ul from ol doesn't work properly.

      // await click(page, '#block-controls button');
      // await waitForSelector(page, '.dropdown .icon.bullet-list');
      // await click(page, '.dropdown .icon.bullet-list');

      // await assertHTML(
      //   page,
      //   '<ul class="editor-list-ul"><li class="editor-listitem"><br></li></ul>',
      // );
    });
  });
});
