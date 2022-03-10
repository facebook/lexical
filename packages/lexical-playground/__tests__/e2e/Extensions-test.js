/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertSelection,
  assertHTML,
  E2E_BROWSER,
  focusEditor,
  evaluate,
} from '../utils';

describe('Extensions', () => {
  initializeE2E((e2e) => {
    it(`document.execCommand("insertText")`, async () => {
      const {page} = e2e;
      await focusEditor(page);

      await evaluate(
        page,
        () => {
          document.execCommand('insertText', false, 'foo');
        },
        [],
      );
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
    });

    it(`ClipboardEvent("paste")`, async () => {
      // Pasting this way doesn't work in FF due to content
      // privacy reasons.
      if (E2E_BROWSER === 'firefox') {
        return;
      }

      const {page} = e2e;
      await focusEditor(page);

      await evaluate(
        page,
        () => {
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

          const editor = document.querySelector('div[contenteditable="true"]');
          const dispatchPaste = paste();
          dispatchPaste(editor, 'foo');
        },
        [],
      );
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foo</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });

      await evaluate(page, () => {
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

        const editor = document.querySelector('div[contenteditable="true"]');
        const dispatchPaste = paste();
        dispatchPaste(editor, 'bar');
      });
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foobar</span></p>',
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
      await focusEditor(page);

      await evaluate(page, () => {
        const editor = document.querySelector('div[contenteditable="true"]');
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

      // Pasting this way doesn't work in FF due to content
      // privacy reasons. So we only look for the execCommand output.
      if (E2E_BROWSER === 'firefox') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">bar</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 3,
          focusPath: [0, 0, 0],
          focusOffset: 3,
        });
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">foobar</span></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });
      }
    });
  });
});
