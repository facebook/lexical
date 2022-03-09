/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {undo, redo} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  focusEditor,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  repeat,
  IS_COLLAB,
} from '../utils';

describe('Markdown', () => {
  async function checkHTMLExpectationsIncludingUndoRedo(
    page: any,
    forwardHTML: String,
    undoHTML: string,
  ) {
    await assertHTML(page, forwardHTML);
    if (IS_COLLAB) {
      // Collab uses its own undo/redo
      return;
    }
    await undo(page);
    await assertHTML(page, undoHTML);
    await redo(page);
    await assertHTML(page, forwardHTML);
  }

  const triggersAndExpectations = [
    {
      isBlockTest: false,
      undoHTML:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">x__hello__ y</span></p>',
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">x</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">hello</strong><span data-lexical-text="true"> y</span></p>',
      markdownText: '__hello__', // bold.
      stylizedUndoHTML:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline">x_</span><span data-lexical-text="true">_hello_</span><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true">_ y</span></p>',
      stylizedExpectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline">x</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">hello</strong><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true"> y</span></p>',
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation: '<h1 class="PlaygroundEditorTheme__h1"><br></h1>',

      markdownText: '# ', // H1.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation: '<h2 class="PlaygroundEditorTheme__h2"><br></h2>',

      markdownText: '## ', // H2.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<code class="PlaygroundEditorTheme__code" spellcheck="false"><br></code>',

      markdownText: '``` ', // Code block.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<blockquote class="PlaygroundEditorTheme__quote"><br></blockquote>',

      markdownText: '> ', // Block quote.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',

      markdownText: '* ', // Unordered.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',

      markdownText: '- ', // Unordered.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ol start="321" class="PlaygroundEditorTheme__ol1"><li value="321" class="PlaygroundEditorTheme__listItem"><br></li></ol>',

      markdownText: '321. ', // Ordered.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',

      markdownText: '*** ', // HR rule.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',

      markdownText: '--- ', // HR Rule.
    },
  ];

  initializeE2E((e2e) => {
    // forward case is the normal case.
    // undo case is when the user presses undo.

    const count = triggersAndExpectations.length;
    for (let i = 0; i < count; ++i) {
      const markdownText = triggersAndExpectations[i].markdownText;

      if (triggersAndExpectations[i].isBlockTest === false) {
        it.skipIf(
          e2e.isPlainText,
          `Should create stylized (e.g. BIUS) text from plain text using a markdown shortcut e.g. ${markdownText}`,
          async () => {
            const {page} = e2e;

            const text = 'x' + markdownText + 'y';

            await focusEditor(page);
            await page.keyboard.type(text);
            await repeat(text.length, async () => {
              await page.keyboard.press('ArrowLeft');
            });
            await assertSelection(page, {
              anchorPath: [0, 0, 0],
              anchorOffset: 0,
              focusPath: [0, 0, 0],
              focusOffset: 0,
            });

            await repeat(1 + markdownText.length, async () => {
              await page.keyboard.press('ArrowRight');
            });

            // Trigger markdown.
            await page.keyboard.type(' ');

            await checkHTMLExpectationsIncludingUndoRedo(
              page,
              triggersAndExpectations[i].expectation,
              triggersAndExpectations[i].undoHTML,
            );
          },
        );

        it.skipIf(
          e2e.isPlainText,
          `Should create stylized (e.g. BIUS) text from already stylized text using a markdown shortcut e.g. ${markdownText}`,
          async () => {
            const {page} = e2e;

            const text = 'x' + markdownText + 'y';

            await focusEditor(page);
            await page.keyboard.type(text);
            await repeat(text.length, async () => {
              await page.keyboard.press('ArrowLeft');
            });
            await assertSelection(page, {
              anchorPath: [0, 0, 0],
              anchorOffset: 0,
              focusPath: [0, 0, 0],
              focusOffset: 0,
            });

            // Select first 2 characters.
            await page.keyboard.down('Shift');
            await repeat(2, async () => {
              await page.keyboard.press('ArrowRight');
            });
            await page.keyboard.up('Shift');

            // Make underline.
            await keyDownCtrlOrMeta(page);
            await page.keyboard.press('u');
            await keyUpCtrlOrMeta(page);

            // Back to beginning.
            await repeat(2, async () => {
              await page.keyboard.press('ArrowLeft');
            });

            // Move to end.
            await repeat(text.length, async () => {
              await page.keyboard.press('ArrowRight');
            });

            // Select last two characters.
            await page.keyboard.down('Shift');
            await repeat(2, async () => {
              await page.keyboard.press('ArrowLeft');
            });
            await page.keyboard.up('Shift');

            // Make underline.
            await keyDownCtrlOrMeta(page);
            await page.keyboard.press('u');
            await keyUpCtrlOrMeta(page);

            // Back to beginning of text.
            await repeat(text.length, async () => {
              await page.keyboard.press('ArrowLeft');
            });

            // Move after markdown text.
            await repeat(1 + markdownText.length, async () => {
              await page.keyboard.press('ArrowRight');
            });

            // Trigger markdown.
            await page.keyboard.type(' ');

            await assertHTML(
              page,
              triggersAndExpectations[i].stylizedExpectation,
            );

            await checkHTMLExpectationsIncludingUndoRedo(
              page,
              triggersAndExpectations[i].stylizedExpectation,
              triggersAndExpectations[i].stylizedUndoHTML,
            );
          },
        );
      }

      if (triggersAndExpectations[i].isBlockTest === true) {
        it.skipIf(
          e2e.isPlainText,
          `Should test markdown with the (${markdownText}) trigger. Should include undo and redo.`,
          async () => {
            const {page} = e2e;

            await focusEditor(page);

            await page.keyboard.type(markdownText);

            const forwardHTML = triggersAndExpectations[i].expectation;

            const undoHTML = `<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">${markdownText}</span></p>`;

            await checkHTMLExpectationsIncludingUndoRedo(
              page,
              forwardHTML,
              undoHTML,
            );
          },
        );
      }
    }
  });
});
