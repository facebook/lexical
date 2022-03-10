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
  assertSelection,
  repeat,
  E2E_BROWSER,
  focusEditor,
} from '../utils';
import {moveToLineBeginning, moveToLineEnd} from '../keyboardShortcuts';

describe('Emoticons', () => {
  initializeE2E((e2e) => {
    it(`Can handle a single emoticon`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('This is an emoji :)');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">This is an emoji </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 1, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">This is an emoji </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 17,
        focusPath: [0, 0, 0],
        focusOffset: 17,
      });

      await page.keyboard.type(':)');
      await page.keyboard.press('ArrowLeft');
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 17,
          focusPath: [0, 0, 0],
          focusOffset: 17,
        });
      }

      await page.keyboard.press('ArrowRight');
      await assertSelection(page, {
        anchorPath: [0, 1, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 1, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Delete');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">This is an emoji </span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 17,
        focusPath: [0, 0, 0],
        focusOffset: 17,
      });
    });

    it(`Can enter multiple emoticons`, async () => {
      const {isRichText, page} = e2e;

      await focusEditor(page);
      await page.keyboard.type(':) :) <3 :(');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 6, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 6, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 8,
        focusPath: [0],
        focusOffset: 8,
      });

      await page.keyboard.type(':) :) <3 :(');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 14, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 14, 0, 0],
        focusOffset: 2,
      });

      await page.keyboard.press('Enter');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p><p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [1],
          anchorOffset: 0,
          focusPath: [1],
          focusOffset: 0,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 16,
          focusPath: [0],
          focusOffset: 16,
        });
      }

      await page.keyboard.type(':) :) <3 :(');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 6, 0, 0],
          anchorOffset: 2,
          focusPath: [1, 6, 0, 0],
          focusOffset: 2,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span><br><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true"> </span><span class="emoji heart" data-lexical-text="true"><span class="emoji-inner">❤</span></span><span data-lexical-text="true"> </span><span class="emoji unhappysmile" data-lexical-text="true"><span class="emoji-inner">🙁</span></span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 22, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 22, 0, 0],
          focusOffset: 2,
        });
      }

      await moveToLineBeginning(page);
      // This should not crash on a deletion on an immutable node
      await page.keyboard.press('Backspace');
      await moveToLineEnd(page);

      await repeat(22, async () => await page.keyboard.press('Backspace'));
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await page.keyboard.type(':):):):):)');
      await page.keyboard.press('ArrowLeft');
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 4, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 4, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 3, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 3, 0, 0],
          focusOffset: 2,
        });
      }

      await page.keyboard.press('ArrowLeft');
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 3, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 3, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 2, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 2, 0, 0],
          focusOffset: 2,
        });
      }

      await page.keyboard.press('ArrowLeft');
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 2, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 1, 0, 0],
          focusOffset: 2,
        });
      }

      await page.keyboard.press('ArrowLeft');
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0, 0],
          focusOffset: 2,
        });
      }

      await page.keyboard.press('ArrowLeft');
      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 0,
      });

      await page.keyboard.type('Hey');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Hey</span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
    });
  });
});
