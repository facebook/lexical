/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste html with BIU formatting', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    const clipboardData = {
      'text/html': `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-d6ac4fde-7fff-3941-b4d9-3903abcccdcb"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Italic</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">underline</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:italic;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold Italic Underline</span></p></b><br class="Apple-interchange-newline">`,
    };
    await pasteFromClipboard(page, clipboardData);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            Bold
          </strong>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            Italic
          </em>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            underline
          </span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic
           PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            Bold Italic Underline
          </strong>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
      `,
    );
  });
});
