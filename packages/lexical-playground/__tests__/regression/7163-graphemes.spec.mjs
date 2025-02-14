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
  pressBackspace,
  selectAll,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Regression tests for #7163 - grapheme deleteCharacter', () => {
  test.beforeEach(({isPlainText, isCollab, page}) =>
    initialize({isCollab, isPlainText, page}),
  );

  test(`Grapheme character deletion tests`, async ({page, isCollab}) => {
    // We are only concerned about input here, not collab
    test.skip(isCollab);

    const GRAPHEME_SCENARIOS = [
      // Original scenarios
      {
        backspaceCount: 3,
        caretDistance: 1,
        description: 'grapheme cluster',
        // Hangul grapheme cluster.
        // https://www.compart.com/en/unicode/U+AC01
        grapheme: '\u1100\u1161\u11A8',
      },
      {
        backspaceCount: 2,
        caretDistance: 1,
        description: 'extended grapheme cluster',
        // Tamil 'ni' grapheme cluster.
        // http://unicode.org/reports/tr29/#Table_Sample_Grapheme_Clusters
        grapheme: '\u0BA8\u0BBF',
      },
      {
        backspaceCount: 4,
        caretDistance: 1,
        description: 'tailored grapheme cluster',
        // Devangari 'kshi' tailored grapheme cluster.
        // http://unicode.org/reports/tr29/#Table_Sample_Grapheme_Clusters
        grapheme: '\u0915\u094D\u0937\u093F',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description: 'Emoji sequence combined using zero-width joiners',
        // https://emojipedia.org/family-woman-woman-girl-boy/
        grapheme:
          '\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description: 'Emoji sequence with skin-tone modifier',
        // https://emojipedia.org/clapping-hands-medium-skin-tone/
        grapheme: '\uD83D\uDC4F\uD83C\uDFFD',
      },
      // New ones
      {
        backspaceCount: 2,
        caretDistance: 1,
        description: 'Arabic text with accent',
        dir: 'rtl',
        grapheme: '\u0647\u064e',
      },
      {
        // Editors that do normalization would do this in 1 backspace
        backspaceCount: 2,
        caretDistance: 1,
        description: 'Latin with decomposed combining character',
        grapheme: 'n\u0303',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description:
          'Multiple codepoint Emoji with variation selector entirely in the BMP',
        grapheme: '\u2764\ufe0f',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description: 'Multiple codepoint keycap Emoji',
        grapheme: '#\ufe0f\u20e3',
      },
      {
        backspaceCount: 8,
        caretDistance: 4,
        description: 'Hindi',
        grapheme: '\u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926',
      },
      {
        backspaceCount: 4,
        caretDistance: 2,
        description: 'Korean',
        grapheme: '\u1103\u1167\u1109\u1170',
      },
      {
        backspaceCount: 5,
        caretDistance: 5,
        description: 'Emojis outside the BMP',
        grapheme:
          '\ud83c\udf37\ud83c\udf81\ud83d\udca9\ud83d\ude1c\ud83d\udc4d',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description:
          'ZWJ emoji cluster with variation selection that looks like 4 characters but treated as one',
        grapheme:
          '\ud83d\udc69\ud83c\udffd\u200d\ud83d\udc68\ud83c\udffd\u200d\ud83d\udc76\ud83c\udffd\u200d\ud83d\udc66\ud83c\udffd',
      },
      {
        backspaceCount: 1,
        caretDistance: 1,
        description: 'Flag emoji with ZWJ and variation selector',
        grapheme: '\ud83c\udff3\ufe0f\u200d\ud83c\udf08',
      },
    ];
    await focusEditor(page);
    for (const {
      backspaceCount,
      caretDistance,
      description,
      grapheme,
      dir = 'ltr',
    } of GRAPHEME_SCENARIOS) {
      const codeUnits = grapheme.length;
      await page.keyboard.type(description);
      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        html`
          <p dir="ltr"><span data-lexical-text="true">${description}</span></p>
          <p><br /></p>
        `,
        undefined,
        {ignoreClasses: true, ignoreInlineStyles: true},
      );
      await page.keyboard.type(grapheme);
      await assertHTML(
        page,
        html`
          <p dir="ltr"><span data-lexical-text="true">${description}</span></p>
          <p dir="${dir}"><span data-lexical-text="true">${grapheme}</span></p>
        `,
        undefined,
        {ignoreClasses: true, ignoreInlineStyles: true},
      );
      const selectionFromOffset = (offset, path = [1, 0, 0]) => ({
        anchorOffset: offset,
        anchorPath: path,
        focusOffset: offset,
        focusPath: path,
      });
      await assertSelection(page, selectionFromOffset(codeUnits));
      if (dir !== 'rtl') {
        await moveLeft(page, caretDistance);
        await assertSelection(page, selectionFromOffset(0));
        await moveRight(page, caretDistance);
      }
      await assertSelection(page, selectionFromOffset(codeUnits));
      await pressBackspace(page, backspaceCount);
      await assertSelection(page, selectionFromOffset(0, [1]));
      await assertHTML(
        page,
        html`
          <p dir="ltr"><span data-lexical-text="true">${description}</span></p>
          <p><br /></p>
        `,
        undefined,
        {ignoreClasses: true, ignoreInlineStyles: true},
      );
      await selectAll(page);
      await pressBackspace(page);
    }
  });
});
