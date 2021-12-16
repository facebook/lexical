/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {redo, undo} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  sleep,
  IS_COLLAB,
} from '../utils';

describe('History', () => {
  initializeE2E((e2e) => {
    it(`Can type two paragraphs of text and correctly undo and redo`, async () => {
      if (IS_COLLAB) {
        return;
      }
      const {isRichText, page} = e2e;

      await page.focus('div.editor');

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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world, again and again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world, again and again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><br></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><br></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><br></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello</span></p>',
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
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1"><br></p',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><br></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world, again and again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world, again and again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world, again again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world, again again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span></p><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world, again and again</span></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">hello world</span><br><span data-outline-text="true">hello world, again and again</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 22,
          focusPath: [0, 2, 0],
          focusOffset: 22,
        });
      }
    });
  });
});
