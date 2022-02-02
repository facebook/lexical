/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
  focusEditor,
  insertImage,
  E2E_BROWSER,
  click,
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

    it('Can undo and redo with root and nested editors', async () => {
      const {isRichText, page} = e2e;
      if (IS_COLLAB || !isRichText) {
        return;
      }

      await focusEditor(page);
      await insertImage(page, 'Hello');

      // Move to into root editor
      // Back to root editor
      if (E2E_BROWSER === 'firefox') {
        // TODO:
        // In Firefox pressing right arrow does not move caret into the root editor and it remains within nested one
        // so explicitly clicking into it to move cursor
        await click(page, '.editor-shell', {position: {x: 600, y: 150}});
      } else {
        await page.keyboard.press('ArrowRight');
      }
      await page.keyboard.type('world');
      const htmlWithNestedEditorText =
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" tabindex="0" style="width: inherit; height: inherit; max-width: 500px;"><div class="image-caption-container"><div class="ImageNode__contentEditable dnr7xe2t n3hqoq4p r86q59rh b3qcqh3k fq87ekyn f3mgz9a2 awmj90u6 nxhhwgj7 b6ax4al1 om3e55n1 mn3blgpi blo597vh pvreidsc ejhi0i36 n68fow1o qbvjirod rhtn53u1 glosn74e i04st1bw n3t5jt4f l4uc2m3f" contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">Hello</span></p></div></div></span><span data-lexical-text="true">world</span></p>';

      await assertHTML(page, htmlWithNestedEditorText);

      // Undo up to an empty editor and redo to latest state
      await repeat(5, async () => {
        await undo(page);
      });
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );

      // Redo back both nested and root level editor changes
      await repeat(5, async () => {
        await redo(page);
      });
      await assertHTML(page, htmlWithNestedEditorText);
    });
  });
});
