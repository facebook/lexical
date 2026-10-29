/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {describe, test} from 'vitest';
import {server} from 'vitest/browser';

import {assertHTML, assertSelection, html, setupEditor} from './utils';

describe.each([true, false])('extension input (rich text: %s)', isRichText => {
  test(`ClipboardEvent("paste") + document.execCommand("insertText")`, async () => {
    const {root} = setupEditor([
      isRichText ? RichTextExtension : PlainTextExtension,
    ]);

    {
      const editor = root;
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
    }

    // Pasting this way doesn't work in FF due to content
    // privacy reasons. So we only look for the execCommand output.
    if (server.browser === 'firefox') {
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">bar</span>
          </p>
        `,
      );
      await assertSelection(root, {
        anchorOffset: 3,
        anchorPath: [0, 0, 0],
        focusOffset: 3,
        focusPath: [0, 0, 0],
      });
    } else {
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">foobar</span>
          </p>
        `,
      );
      await assertSelection(root, {
        anchorOffset: 6,
        anchorPath: [0, 0, 0],
        focusOffset: 6,
        focusPath: [0, 0, 0],
      });
    }
  });
});
