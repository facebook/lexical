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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">x*hello* y</span></p>',
      expectation:
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">x</span><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">hello</strong><span data-lexical-text="true"> y</span></p>',
      markdownText: '*hello*', // bold.
      stylizedUndoHTML:
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline o570zoyu">x*</span><span data-lexical-text="true">hello</span><span class="PlaygroundEditorTheme__textUnderline o570zoyu" data-lexical-text="true">* y</span></p>',
      stylizedExpectation:
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true" class="PlaygroundEditorTheme__textUnderline o570zoyu">x</span><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">hello</strong><span class="PlaygroundEditorTheme__textUnderline o570zoyu" data-lexical-text="true"> y</span></p>',
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<h1 class="PlaygroundEditorTheme__h1 qntmu8s7 ftqqwnbv tes86rjd m8h3af8h l7ghb35v kmwttqpk qjfq86k5 srn514ro oxkhqvkx rl78xhln nch0832m"><br></h1>',

      markdownText: '# ', // H1.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<h2 class="PlaygroundEditorTheme__h2 k1z55t6l cu002yh1 o48pnaf2 l7ghb35v kjdc1dyq kmwttqpk jenc4j3g srn514ro oxkhqvkx rl78xhln nch0832m sxswz4zx"><br></h2>',

      markdownText: '## ', // H2.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp" spellcheck="false"><br></code>',

      markdownText: '``` ', // Code block.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<blockquote class="PlaygroundEditorTheme__quote m8h3af8h l7ghb35v kjdc1dyq mswf2hbd k1z55t6l cu002yh1 nqdvql63 iv31pflw bf1zulr9 gt60zsk1"><br></blockquote>',

      markdownText: '> ', // Block quote.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul>',

      markdownText: '* ', // Unordered.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul>',

      markdownText: '- ', // Unordered.
    },
    {
      isBlockTest: true,
      undoHTML: '',
      expectation:
        '<ol start="321" class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq p9ctufpz"><li value="321" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ol>',

      markdownText: '321. ', // Ordered.
    },
  ];

  initializeE2E((e2e) => {
    // forward case is the normal case.
    // undo case is when the user presses undo.

    const count = triggersAndExpectations.length;
    for (let i = 0; i < count; ++i) {
      const markdownText = triggersAndExpectations[i].markdownText;

      if (triggersAndExpectations[i].isBlockTest === false) {
        it(`Should create stylized (e.g. BIUS) text from plain text using a markdown shortcut e.g. ${markdownText}`, async () => {
          const {isRichText, page} = e2e;

          if (!isRichText) {
            return;
          }

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
        });

        it(`Should create stylized (e.g. BIUS) text from already stylized text using a markdown shortcut e.g. ${markdownText}`, async () => {
          const {isRichText, page} = e2e;

          if (!isRichText) {
            return;
          }

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

          await checkHTMLExpectationsIncludingUndoRedo(
            page,
            triggersAndExpectations[i].stylizedExpectation,
            triggersAndExpectations[i].stylizedUndoHTML,
          );
        });
      }

      if (triggersAndExpectations[i].isBlockTest === true) {
        it(`Should test markdown with the (${markdownText}) trigger. Should include undo and redo.`, async () => {
          const {isRichText, page} = e2e;

          if (!isRichText) {
            return;
          }

          await focusEditor(page);

          await page.keyboard.type(markdownText);

          const forwardHTML = triggersAndExpectations[i].expectation;

          const undoHTML = `<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><span data-lexical-text="true">${markdownText}</span></p>`;

          await checkHTMLExpectationsIncludingUndoRedo(
            page,
            forwardHTML,
            undoHTML,
          );
        });
      }
    }
  });
});
