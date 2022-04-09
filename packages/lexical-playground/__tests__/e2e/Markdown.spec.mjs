/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {redo, undo} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  initialize,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  repeat,
  test,
} from '../utils/index.mjs';

async function checkHTMLExpectationsIncludingUndoRedo(
  page,
  forwardHTML,
  undoHTML,
  isCollab,
) {
  await assertHTML(page, forwardHTML);
  if (isCollab || undoHTML === 'none') {
    // Collab uses its own undo/redo
    return;
  }
  await undo(page);
  await assertHTML(page, undoHTML);
  await redo(page);
  await assertHTML(page, forwardHTML);
}

test.describe('Markdown', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  const triggersAndExpectations = [
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph"><a href="http://www.test.com" class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">hello world</span></a><span data-lexical-text="true"> </span></p>',
      isBlockTest: true,
      markdownText: '[hello world](http://www.test.com) ', // Link
      undoHTML: `<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">[hello world](http://www.test.com) </span></p>`,
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">x</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">hello</strong><span data-lexical-text="true"> y</span></p>',
      isBlockTest: false,
      markdownText: '__hello__',
      stylizedExpectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline">x</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">hello</strong><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true"> y</span></p>',
      // bold.
      stylizedUndoHTML:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline">x_</span><span data-lexical-text="true">_hello_</span><span class="PlaygroundEditorTheme__textUnderline" data-lexical-text="true">_ y</span></p>',

      undoHTML:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">x__hello__ y</span></p>',
    },
    {
      expectation: '<h1 class="PlaygroundEditorTheme__h1"><br></h1>',
      isBlockTest: true,
      markdownText: '# ',

      undoHTML: '', // H1.
    },
    {
      expectation: '<h2 class="PlaygroundEditorTheme__h2"><br></h2>',
      isBlockTest: true,
      markdownText: '## ',

      undoHTML: '', // H2.
    },
    {
      expectation:
        '<code class="PlaygroundEditorTheme__code" spellcheck="false" data-gutter="1" data-highlight-language="javascript"><br></code>',
      isBlockTest: true,
      markdownText: '``` ',

      undoHTML: '', // Code block.
    },
    {
      expectation:
        '<blockquote class="PlaygroundEditorTheme__quote"><br></blockquote>',
      isBlockTest: true,
      markdownText: '> ',

      undoHTML:
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">&gt;</span></p>', // Block quote.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
      isBlockTest: true,
      markdownText: '* ',

      undoHTML: '', // Unordered.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
      isBlockTest: true,
      markdownText: '- ',

      undoHTML: '', // Unordered.
    },
    {
      expectation:
        '<ol start="321" class="PlaygroundEditorTheme__ol1"><li value="321" class="PlaygroundEditorTheme__listItem"><br></li></ol>',
      isBlockTest: true,
      markdownText: '321. ',

      undoHTML: '', // Ordered.
    },
    {
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
      isBlockTest: true,
      markdownText: '*** ',

      undoHTML: '', // HR rule.
    },
    {
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
      isBlockTest: true,
      markdownText: '--- ',

      undoHTML: '', // HR Rule.
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      isBlockTest: true,
      markdownText: '~~_**test**_~~ ',
      undoHTML: 'none', // strikethru, italic, bold
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><em class="PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</em><span data-lexical-text="true"></span></p>',
      isBlockTest: true,
      markdownText: '~~_test_~~ ',
      undoHTML: 'none', // strikethru, italic
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      isBlockTest: true,
      markdownText: '~~**test**~~ ',
      undoHTML: 'none', // strikethru, bold
    },

    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      isBlockTest: true,
      markdownText: '_**test**_ ',
      undoHTML: 'none', // italic, bold
    },
  ];
  // forward case is the normal case.
  // undo case is when the user presses undo.

  const count = triggersAndExpectations.length;
  for (let i = 0; i < count; ++i) {
    const markdownText = triggersAndExpectations[i].markdownText;

    if (triggersAndExpectations[i].isBlockTest === false) {
      test(`Should create stylized (e.g. BIUS) text from plain text using a markdown shortcut e.g. ${markdownText}`, async ({
        page,
        isPlainText,
        isCollab,
      }) => {
        test.skip(isPlainText);
        const text = 'x' + markdownText + 'y';

        await focusEditor(page);
        await page.keyboard.type(text);
        await repeat(text.length, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
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
          isCollab,
        );
      });

      test(`Should create stylized (e.g. BIUS) text from already stylized text using a markdown shortcut e.g. ${markdownText}`, async ({
        page,
        isPlainText,
        isCollab,
      }) => {
        test.skip(isPlainText);

        const text = 'x' + markdownText + 'y';

        await focusEditor(page);
        await page.keyboard.type(text);
        await repeat(text.length, async () => {
          await page.keyboard.press('ArrowLeft');
        });
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
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

        await assertHTML(page, triggersAndExpectations[i].stylizedExpectation);

        await checkHTMLExpectationsIncludingUndoRedo(
          page,
          triggersAndExpectations[i].stylizedExpectation,
          triggersAndExpectations[i].stylizedUndoHTML,
          isCollab,
        );
      });
    }

    if (triggersAndExpectations[i].isBlockTest === true) {
      test(`Should test markdown with the (${markdownText}) trigger. Should include undo and redo.`, async ({
        page,
        isPlainText,
        isCollab,
      }) => {
        test.skip(isPlainText);

        await focusEditor(page);

        await page.keyboard.type(markdownText);

        const forwardHTML = triggersAndExpectations[i].expectation;

        const undoHTML = `<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">${markdownText}</span></p>`;

        await checkHTMLExpectationsIncludingUndoRedo(
          page,
          forwardHTML,
          triggersAndExpectations[i].undoHTML || undoHTML,
          isCollab,
        );
      });
    }
  }
  test(`Should test markdown conversion from plain text to Lexical.`, async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('# Heading');
    await click(page, 'i.markdown');

    const html =
      '<h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Heading</span></h1>';
    await assertHTML(page, html);
  });
});
