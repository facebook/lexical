/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  assertSelection,
  evaluate,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Extensions', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`document.execCommand("insertText")`, async ({page}) => {
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
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">foo</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });
  });

  test(`ClipboardEvent("paste")`, async ({page, browserName}) => {
    // Pasting this way doesn't work in FF due to content
    // privacy reasons.
    if (browserName === 'firefox') {
      return;
    }
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
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer,
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
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">foo</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });

    await evaluate(page, () => {
      function paste() {
        const dataTransfer = new DataTransfer();
        function dispatchPaste(target, text) {
          dataTransfer.setData('text/plain', text);
          target.dispatchEvent(
            new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer,
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
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">foobar</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test(`ClipboardEvent("paste") + document.execCommand("insertText")`, async ({
    page,
    browserName,
  }) => {
    await focusEditor(page);

    await evaluate(page, () => {
      const editor = document.querySelector('div[contenteditable="true"]');
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', 'foo');
      editor.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        }),
      );
      document.execCommand('InsertText', false, 'bar');
    });

    // Pasting this way doesn't work in FF due to content
    // privacy reasons. So we only look for the execCommand output.
    if (browserName === 'firefox') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 3,
        anchorPath: [0, 0, 0],
        focusOffset: 3,
        focusPath: [0, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">foobar</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 6,
        anchorPath: [0, 0, 0],
        focusOffset: 6,
        focusPath: [0, 0, 0],
      });
    }
  });

  test(`document.execCommand("insertText") with selection`, async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    // This test is flaky in collab #3915
    test.fixme(isCollab);
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('hello world');
    await page.keyboard.press('Enter');
    await page.keyboard.type('asd t');
    await page.keyboard.press('ArrowUp');

    // Selection is on the last paragraph
    await evaluate(
      page,
      async () => {
        const editor = document.querySelector('div[contenteditable="true"]');
        const selection = window.getSelection();
        const secondParagraphTextNode =
          editor.firstChild.nextSibling.firstChild.firstChild;
        selection.setBaseAndExtent(
          secondParagraphTextNode,
          0,
          secondParagraphTextNode,
          3,
        );

        await new Promise((resolve) => {
          setTimeout(() => {
            document.execCommand('insertText', false, 'and');
            resolve();
          }, 50);
        });
      },
      [],
    );
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello world</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">and t</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [1, 0, 0],
      focusOffset: 3,
      focusPath: [1, 0, 0],
    });
  });
});
