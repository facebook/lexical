/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  focusEditor,
  click,
  repeat,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  sleep,
} from '../utils';
import {selectAll} from '../keyboardShortcuts';

describe('File', () => {
  initializeE2E((e2e) => {
    it(`Can import/export`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('Hello World');
      await page.keyboard.down('Shift');
      await repeat('World'.length, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.up('Shift');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.keyboard.type('1. one');
      await page.keyboard.press('Enter');
      await page.keyboard.type('two');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">World</strong></p><ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq kmwttqpk i2mu9gw5"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">one</strong></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">two</strong></li></ol>',
      );

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        click(page, '.action-button.export'),
      ]);
      const filePath = await download.path();

      await focusEditor(page);
      await selectAll(page);
      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );

      page.on('filechooser', (fileChooser: FileChooser) => {
        fileChooser.setFiles([filePath]);
      });
      await click(page, '.action-button.import');
      await sleep(200);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">World</strong></p><ol class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq kmwttqpk i2mu9gw5"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">one</strong></li><li value="2" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">two</strong></li></ol>',
      );
    });
  });
});
