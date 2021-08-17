/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
} from '../utils';

describe('Nested List', () => {
  initializeE2E((e2e) => {
    it(`Can create a list and indent/outdent it`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await page.focus('div.editor');

      await page.waitForSelector('#block-controls button');

      await page.click('#block-controls button');

      await page.waitForSelector('.dropdown .icon.bullet-list');

      await page.click('.dropdown .icon.bullet-list');

      await assertHTML(
        page,
        '<ul class="editor-list-ul"><li class="editor-listitem"><span data-outline-text="true">⁠<br></span></li></ul>',
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
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">Hello</span></li><li class="editor-listitem"><span data-outline-text="true">from</span></li><li class="editor-listitem"><span data-outline-text="true">the</span></li><li class="editor-listitem"><span data-outline-text="true">other</span></li><li class="editor-listitem"><span data-outline-text="true">side</span></li></ul>',
      );

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('a');
      await keyUpCtrlOrMeta(page);

      await page.waitForSelector('button.action-button.indent');
      await page.click('button.action-button.indent');
      await page.click('button.action-button.indent');
      await page.click('button.action-button.indent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul"><li class="editor-listitem editor-nested-list-listitem"><ul class="editor-list-ul"><li class="editor-listitem"><span data-outline-text="true">Hello</span></li><li class="editor-listitem"><span data-outline-text="true">from</span></li><li class="editor-listitem"><span data-outline-text="true">the</span></li><li class="editor-listitem"><span data-outline-text="true">other</span></li><li class="editor-listitem"><span data-outline-text="true">side</span></li></ul></li></ul></li></ul></li></ul>',
      );

      await page.waitForSelector('button.action-button.outdent');
      await page.click('button.action-button.outdent');
      await page.click('button.action-button.outdent');
      await page.click('button.action-button.outdent');

      await assertHTML(
        page,
        '<ul class="editor-list-ul" dir="ltr"><li class="editor-listitem"><span data-outline-text="true">Hello</span></li><li class="editor-listitem"><span data-outline-text="true">from</span></li><li class="editor-listitem"><span data-outline-text="true">the</span></li><li class="editor-listitem"><span data-outline-text="true">other</span></li><li class="editor-listitem"><span data-outline-text="true">side</span></li></ul>',
      );
    });
  });
});
