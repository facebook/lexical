/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {redo, toggleBold, undo} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  sleep,
  IS_COLLAB,
  focusEditor,
} from '../utils';

describe('History', () => {
  initializeE2E((e2e) => {
    it(`Can type two paragraphs of text and correctly undo and redo`, async () => {
      if (IS_COLLAB) {
        return;
      }
      const {isRichText, page} = e2e;

      await page.focus('div[contenteditable="true"]');

      await page.keyboard.type('hello');
      await sleep(1001); // default merge interval is 1000
      await page.keyboard.type(' world');
      await page.keyboard.press('Enter');
      await page.keyboard.type('hello world again');
      await repeat(6, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      await page.keyboard.type(', again and');

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 22,
          focusPath: [1, 0, 0],
          focusOffset: 22,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 22,
          focusPath: [0, 2, 0],
          focusOffset: 22,
        });
      }

      await undo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 11,
          focusPath: [1, 0, 0],
          focusOffset: 11,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 11,
          focusPath: [0, 2, 0],
          focusOffset: 11,
        });
      }

      await undo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><br></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 2,
          focusPath: [0],
          focusOffset: 2,
        });
      }

      await undo(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 11,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });

      await undo(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });

      await undo(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });

      await redo(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });

      await redo(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 11,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });

      await redo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 2,
          focusPath: [0],
          focusOffset: 2,
        });
      }

      await redo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 17,
          focusPath: [1, 0, 0],
          focusOffset: 17,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 17,
          focusPath: [0, 2, 0],
          focusOffset: 17,
        });
      }

      await redo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 22,
          focusPath: [1, 0, 0],
          focusOffset: 22,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 22,
          focusPath: [0, 2, 0],
          focusOffset: 22,
        });
      }

      await repeat(4, async () => {
        await page.keyboard.press('Backspace');
      });

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world, again again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 18,
          focusPath: [1, 0, 0],
          focusOffset: 18,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world, again again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 18,
          focusPath: [0, 2, 0],
          focusOffset: 18,
        });
      }

      await undo(page);

      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [1, 0, 0],
          anchorOffset: 22,
          focusPath: [1, 0, 0],
          focusOffset: 22,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">hello world</span><br><span data-lexical-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 22,
          focusPath: [0, 2, 0],
          focusOffset: 22,
        });
      }
    });

    it('Can coalesce when switching inline styles (#1151)', async () => {
      const {isRichText, page} = e2e;

      // Collab has own undo/redo, and plain text does not have inline styles
      if (IS_COLLAB || !isRichText) {
        return;
      }

      await focusEditor(page);
      await toggleBold(page);
      await page.keyboard.type('foo');
      await toggleBold(page);
      await page.keyboard.type('bar');
      await toggleBold(page);
      await page.keyboard.type('baz');

      const step1HTML =
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">foo</strong><span data-lexical-text="true">bar</span><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">baz</strong></p>';
      const step2HTML =
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">foo</strong><span data-lexical-text="true">bar</span></p>';
      const step3HTML =
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c" data-lexical-text="true">foo</strong></p>';
      const step4HTML =
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br /></p>';

      await assertHTML(page, step1HTML);
      await undo(page);
      await assertHTML(page, step2HTML);
      await undo(page);
      await assertHTML(page, step3HTML);
      await undo(page);
      await assertHTML(page, step4HTML);
      await redo(page);
      await assertHTML(page, step3HTML);
      await redo(page);
      await assertHTML(page, step2HTML);
      await redo(page);
      await assertHTML(page, step1HTML);
    });
  });
});
