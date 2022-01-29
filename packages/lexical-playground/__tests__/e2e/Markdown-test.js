/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {undo, redo} from '../keyboardShortcuts';
import {initializeE2E, assertHTML, focusEditor, IS_COLLAB} from '../utils';

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
      expectation:
        '<h1 class="PlaygroundEditorTheme__h1 qntmu8s7 ftqqwnbv tes86rjd m8h3af8h l7ghb35v kmwttqpk qjfq86k5 srn514ro oxkhqvkx rl78xhln nch0832m"><br></h1>',

      trigger: '# ', // H1.
    },
    {
      expectation:
        '<h2 class="PlaygroundEditorTheme__h2 k1z55t6l cu002yh1 o48pnaf2 l7ghb35v kjdc1dyq kmwttqpk jenc4j3g srn514ro oxkhqvkx rl78xhln nch0832m sxswz4zx"><br></h2>',

      trigger: '## ', // H2.
    },
    {
      expectation:
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp" spellcheck="false"><br></code>',

      trigger: '``` ', // Code block.
    },
    {
      expectation:
        '<blockquote class="PlaygroundEditorTheme__quote m8h3af8h l7ghb35v kjdc1dyq kmwttqpk ilmd4f5g k1z55t6l cu002yh1 e9731kn7 jf6b6iuc tcghtb95 q5qw6xdq"><br></blockquote>',

      trigger: '> ', // Block quote.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq kmwttqpk i2mu9gw5"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul>',

      trigger: '* ', // Unordered.
    },
    {
      expectation:
        '<ul class="PlaygroundEditorTheme__ul srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq kmwttqpk i2mu9gw5"><li value="1" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ul>',

      trigger: '- ', // Unordered.
    },
    {
      expectation:
        '<ol start="321" class="PlaygroundEditorTheme__ol1 srn514ro oxkhqvkx rl78xhln nch0832m m8h3af8h l7ghb35v kjdc1dyq kmwttqpk i2mu9gw5"><li value="321" class="PlaygroundEditorTheme__listItem th51lws0 r26s8xbz mfn553m3 gug11x0k"><br></li></ol>',

      trigger: '321. ', // Ordered.
    },
  ];

  initializeE2E((e2e) => {
    // forward case is the normal case.
    // undo case is when the user presses undo.

    const count = triggersAndExpectations.length;
    for (let i = 0; i < count; ++i) {
      const trigger = triggersAndExpectations[i].trigger;

      it(`Should test markdown with the (${trigger}) trigger. Should include undo and redo.`, async () => {
        const {isRichText, page} = e2e;

        if (!isRichText) {
          return;
        }

        await focusEditor(page);

        await page.keyboard.type(trigger);

        const forwardHTML = triggersAndExpectations[i].expectation;

        const undoHTML = `<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><span data-lexical-text="true">${trigger}</span></p>`;

        await checkHTMLExpectationsIncludingUndoRedo(
          page,
          forwardHTML,
          undoHTML,
        );
      });
    }
  });
});
