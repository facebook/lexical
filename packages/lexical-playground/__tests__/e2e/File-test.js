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
    it.skipIf(e2e.isPlainText, `Can import/export`, async () => {
      const {page} = e2e;

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
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">World</strong></p><ol class="PlaygroundEditorTheme__ol1"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">one</strong></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">two</strong></li></ol>',
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
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );

      page.on('filechooser', (fileChooser: FileChooser) => {
        fileChooser.setFiles([filePath]);
      });
      await click(page, '.action-button.import');
      await sleep(200);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">World</strong></p><ol class="PlaygroundEditorTheme__ol1"><li value="1" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">one</strong></li><li value="2" class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">two</strong></li></ol>',
      );
    });
  });
});
