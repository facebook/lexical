/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineBeginning, selectAll} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  focusEditor,
  waitForSelector,
  click,
  E2E_BROWSER,
  repeat,
  copyToClipboard,
  pasteFromClipboard,
} from '../utils';

describe('HorizontalRule', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      'Can create a horizontal rule and move selection around it',
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await waitForSelector(page, 'button .horizontal-rule');

        await click(page, 'button .horizontal-rule');

        await waitForSelector(page, 'hr');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowUp');

        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowRight');

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowLeft');

        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.type('Some text');

        await page.keyboard.press('ArrowRight');

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });

        await page.keyboard.type('Some more text');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some text</span></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some more text</span></p>',
        );

        await moveToLineBeginning(page);

        await page.keyboard.press('ArrowLeft');

        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorPath: [0, 0, 0],
            anchorOffset: 9,
            focusPath: [0, 0, 0],
            focusOffset: 9,
          });
        } else {
          await assertSelection(page, {
            anchorPath: [0],
            anchorOffset: 1,
            focusPath: [0],
            focusOffset: 1,
          });
        }

        await repeat(10, async () => {
          await page.keyboard.press('Backspace');
        });

        await assertHTML(
          page,
          '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some more text</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [],
          anchorOffset: 0,
          focusPath: [],
          focusOffset: 0,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Will add a horizontal rule at the end of a current TextNode and move selection to the new ParagraphNode.',
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await page.keyboard.type('Test');

        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 4,
          focusPath: [0, 0, 0],
          focusOffset: 4,
        });

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span></p>',
        );

        await waitForSelector(page, 'button .horizontal-rule');

        await click(page, 'button .horizontal-rule');

        await waitForSelector(page, 'hr');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Will add a horizontal rule and split a TextNode across 2 paragraphs if the carat is in the middle of the TextNode, moving selection to the start of the new ParagraphNode.',
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await page.keyboard.type('Test');

        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 4,
          focusPath: [0, 0, 0],
          focusOffset: 4,
        });

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span></p>',
        );

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0],
          focusOffset: 2,
        });

        await waitForSelector(page, 'button .horizontal-rule');

        await click(page, 'button .horizontal-rule');

        await waitForSelector(page, 'hr');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Te</span></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">st</span></p>',
        );

        await assertSelection(page, {
          anchorPath: [2, 0, 0],
          anchorOffset: 0,
          focusPath: [2, 0, 0],
          focusOffset: 0,
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Can copy and paste a horizontal rule',
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await waitForSelector(page, 'button .horizontal-rule');

        await click(page, 'button .horizontal-rule');

        await waitForSelector(page, 'hr');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });

        // Select all the text
        await selectAll(page);

        // Copy all the text
        const clipboard = await copyToClipboard(page);

        // Delete content
        await page.keyboard.press('Backspace');

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Backspace');

        await pasteFromClipboard(page, clipboard);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p><div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [2],
          anchorOffset: 0,
          focusPath: [2],
          focusOffset: 0,
        });
      },
    );
  });
});
