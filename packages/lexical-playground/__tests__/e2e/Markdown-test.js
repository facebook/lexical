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
  focusEditor,
  getCurrentHTML,
  IS_COLLAB,
} from '../utils';

describe('Markdown', () => {
  async function checkHTMLExpectationsIncludingUndoRedo(
    page: any,
    forwardHTML: String,
    undoHTML: null | string,
  ) {
    await assertHTML(page, forwardHTML);

    if (IS_COLLAB) {
      // Collab uses its own undo/redo
      return;
    }

    if (undoHTML != null) {
      await undo(page);
      await assertHTML(page, undoHTML);
      await redo(page);
      await assertHTML(page, forwardHTML);
    }
  }

  type TriggersAndExpectation = {
    expectation: RegExp,
    trigger: string,
  };
  type TriggersAndExpectations = Array<TriggersAndExpectation>;

  const triggersAndExpectations: TriggersAndExpectations = [
    {
      expectation: /<\s*h1[^>]*>(.*?)<\s*\/\s*h1>/,
      trigger: '# ', // H1.
    },
    {
      expectation: /<\s*h2[^>]*>(.*?)<\s*\/\s*h2>/,
      trigger: '## ', // H2.
    },
    {
      expectation: /<\s*code[^>]*>(.*?)<\s*\/\s*code>/,
      trigger: '``` ', // Code block.
    },
    {
      expectation: /<\s*blockquote[^>]*>(.*?)<\s*\/\s*blockquote>/,
      trigger: '> ', // Block quote.
    },
    {
      expectation: /<\s*ul[^>]*>(.*?)<\s*\/\s*ul>/,
      trigger: '* ', // Unordered.
    },
    {
      expectation: /<\s*ul[^>]*>(.*?)<\s*\/\s*ul>/,
      trigger: '- ', // Unordered.
    },
    {
      expectation: /(start="321")/,
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

        const undoHTML = `<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><span data-lexical-text="true">${trigger}</span></p>`;

        await checkHTMLExpectationsIncludingUndoRedo(
          page,
          forwardHTML,
          undoHTML,
        );
      });
    }
  });
});
