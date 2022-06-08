/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveRight,
  redo,
  selectCharacters,
  toggleUnderline,
  undo,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  initialize,
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
      expectation: '<h1 class="PlaygroundEditorTheme__h1"><br></h1>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '# ',
      undoHTML: '', // H1.
    },
    {
      expectation: '<h2 class="PlaygroundEditorTheme__h2"><br></h2>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '## ',
      undoHTML: '', // H2.
    },
    {
      expectation: '<h3 class="PlaygroundEditorTheme__h3"><br></h3>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '### ',
      undoHTML: '', // H3.
    },
    {
      expectation: '<h4 class="PlaygroundEditorTheme__h4"><br></h4>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '#### ',
      undoHTML: '', // H4.
    },
    {
      expectation: '<h5 class="PlaygroundEditorTheme__h5"><br></h5>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '##### ',
      undoHTML: '', // H5.
    },
    {
      expectation: '<h6 class="PlaygroundEditorTheme__h6"><br></h6>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '###### ',
      undoHTML: '', // H6.
    },
    {
      expectation:
        '<code class="PlaygroundEditorTheme__code" spellcheck="false" data-gutter="1" data-highlight-language="javascript"><br></code>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '``` ',
      undoHTML: '', // Code block.
    },
    {
      expectation:
        '<blockquote class="PlaygroundEditorTheme__quote"><br></blockquote>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '> ',
      undoHTML:
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">&gt;</span></p>', // Block quote.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '* ',
      undoHTML: '', // Unordered.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><br></li></ul>',
      importExpectation:
        '<ul class="PlaygroundEditorTheme__ul"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="1"><span data-lexical-text="true">hello</span></li></ul>',
      isBlockTest: true,
      markdownImport: '- hello',
      markdownText: '- ',
      undoHTML: '', // Unordered.
    },
    {
      expectation:
        '<ol start="321" class="PlaygroundEditorTheme__ol1"><li value="321" class="PlaygroundEditorTheme__listItem"><br></li></ol>',
      importExpectation:
        '<ol class="PlaygroundEditorTheme__ol1" start="321"><li class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr" dir="ltr" value="321"><span data-lexical-text="true">hello</span></li></ol>',
      isBlockTest: true,
      markdownImport: '', // '321. hello', Need to merge w/ Maksims changes first to get correct start number.
      markdownText: '321. ',
      undoHTML: '', // Ordered.
    },
    {
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '*** ',
      undoHTML: '', // HR rule.
    },
    {
      expectation:
        '<div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><hr></div><p class="PlaygroundEditorTheme__paragraph"><br></p>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '--- ',
      undoHTML: '', // HR Rule.
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '~~_**test**_~~ ',
      undoHTML: 'none', // strikethru, italic, bold
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><em class="PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</em><span data-lexical-text="true"></span></p>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '~~_test_~~ ',
      undoHTML: 'none', // strikethru, italic
    },
    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textStrikethrough" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      importExpectation: '',
      isBlockTest: true,
      markdownImport: '',
      markdownText: '~~**test**~~ ',
      undoHTML: 'none', // strikethru, bold
    },

    {
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic" data-lexical-text="true">test</strong><span data-lexical-text="true"></span></p>',
      importExpectation:
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"> <strong class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic" data-lexical-text="true">test</strong></p>',
      isBlockTest: true,
      markdownImport: '_**test**_',
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
        await moveLeft(page, text.length);
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        });

        await moveRight(page, 1 + markdownText.length);

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
        await moveLeft(page, text.length);
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        });

        // Select first 2 characters.
        await selectCharacters(page, 'right', 2);

        // Make underline.
        await toggleUnderline(page);

        // Back to beginning.
        await moveLeft(page, 2);

        // Move to end.
        await moveRight(page, text.length);

        // Select last two characters.
        await selectCharacters(page, 'left', 2);

        // Make underline.
        await toggleUnderline(page);

        // Back to beginning of text.
        await moveLeft(page, text.length);

        // Move after markdown text.
        await moveRight(page, 1 + markdownText.length);

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

    if (triggersAndExpectations[i].markdownImport.length > 0) {
      test(`Should test importing markdown (${markdownText}) trigger.`, async ({
        page,
        isPlainText,
        isCollab,
      }) => {
        test.skip(isPlainText);
        await focusEditor(page);

        await page.keyboard.type(
          '```markdown ' + triggersAndExpectations[i].markdownImport,
        );
        await click(page, 'i.markdown');

        const html = triggersAndExpectations[i].importExpectation;
        await assertHTML(page, html);

        // Click on markdow toggle twice to run import -> export loop and then
        // validate that it's the same rich text after full cycle
        await click(page, 'i.markdown');
        await click(page, 'i.markdown');
        await assertHTML(page, html);
      });
    }
  }
});
