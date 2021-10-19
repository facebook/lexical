/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertSelection, assertHTML} from '../utils';

describe('Extensions', () => {
  initializeE2E((e2e) => {
    it(`document.execCommand("insertText")`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');

      await page.evaluate(() => {
        document.execCommand('insertText', false, 'foo');
      }, []);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
    });

    it(`ClipboardEvent("paste")`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');

      await page.evaluate(() => {
        function paste() {
          const dataTransfer = new DataTransfer();
          function dispatchPaste(target, text) {
            dataTransfer.setData('text/plain', text);
            target.dispatchEvent(
              new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
              }),
            );
            dataTransfer.clearData();
          }
          return dispatchPaste;
        }

        const editor = document.querySelector('div.editor');
        const dispatchPaste = paste();
        dispatchPaste(editor, 'foo');
      }, []);
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });

      await page.evaluate(() => {
        function paste() {
          const dataTransfer = new DataTransfer();
          function dispatchPaste(target, text) {
            dataTransfer.setData('text/plain', text);
            target.dispatchEvent(
              new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
              }),
            );
            dataTransfer.clearData();
          }
          return dispatchPaste;
        }

        const editor = document.querySelector('div.editor');
        const dispatchPaste = paste();
        dispatchPaste(editor, 'bar');
      });
      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">foobar</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
    });

    it(`ClipboardEvent("paste") + document.execCommand("insertText")`, async () => {
      const {page} = e2e;
      await page.focus('div.editor');

      await page.evaluate(() => {
        const editor = document.querySelector('.editor');
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', 'foo');
        editor.dispatchEvent(
          new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true,
          }),
        );
        document.execCommand('InsertText', false, 'bar');
      });

      await assertHTML(
        page,
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">foobar</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
    });
  });
});
