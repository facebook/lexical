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
  waitForSelector,
  click,
  repeat,
} from '../utils';
import {moveToLineEnd, selectAll} from '../keyboardShortcuts';

describe('Regression test #1083', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      `Backspace with ElementNode at the front of the paragraph`,
      async () => {
        const {page} = e2e;
        await focusEditor(page);

        await page.keyboard.type('Hello');
        await selectAll(page);
        await waitForSelector(page, '.link');
        await click(page, '.link');

        await moveToLineEnd(page);
        await page.keyboard.type('World');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><a href="https://" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true">World</span></p>',
        );

        await selectAll(page);
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Backspace with ElementNode at the front of the selection`,
      async () => {
        const {page} = e2e;
        await focusEditor(page);

        await page.keyboard.type('Say');

        await page.keyboard.type('Hello');
        await page.keyboard.down('Shift');
        await repeat('Hello'.length, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await page.keyboard.up('Shift');
        await waitForSelector(page, '.link');
        await click(page, '.link');

        await moveToLineEnd(page);
        await page.keyboard.type('World');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Say</span><a href="https://" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hello</span></a><span data-lexical-text="true">World</span></p>',
        );

        await page.keyboard.down('Shift');
        await repeat('HelloWorld'.length, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await page.keyboard.up('Shift');
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Say</span></p>',
        );
      },
    );
  });
});
