/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {expect} from '@playwright/test';

import {moveToPrevWord} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste a plain DOM text node', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {'text/html': 'Hello!'};

    // Paste "Hello!" into the editor
    await pasteFromClipboard(page, clipboard);

    // Expect the HTML structure to be a single paragraph with text "Hello!"
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello!</span>
        </p>
      `,
    );

    // Expect the selection to be at the end of the text
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test('Copy + paste a paragraph element', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {'text/html': '<p>Hello!<p>'};

    // Paste "<p>Hello!<p>" into the editor
    await pasteFromClipboard(page, clipboard);

    // Expect the HTML structure to be two paragraphs, the first with text "Hello!" and the second empty
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello!</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    // Expect the selection to be at the start of the second paragraph
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [1],
      focusOffset: 0,
      focusPath: [1],
    });
  });

  test('Copy + paste multi line html with extra newlines', async ({page, isPlainText, isCollab}) => {
    test.skip(isPlainText || isCollab);

    await focusEditor(page);
    
    const clipboard = {
      'text/html':
        '<p>Hello\n</p>\n\n<p>\n\nWorld\n\n</p>\n\n<p>Hello\n\n   World   \n\n!\n\n</p><p>Hello <b>World</b> <i>!</i></p>',
    };

    // Paste multi-line HTML with extra newlines into the editor
    await pasteFromClipboard(page, clipboard);

    const paragraphs = page.locator('div[contenteditable="true"] > p');
    await expect(paragraphs).toHaveCount(4);

    // Check the inner text of each paragraph to verify correct handling of newlines
    await expect(paragraphs.nth(0)).toHaveText('Hello', {useInnerText: true});
    await expect(paragraphs.nth(1)).toHaveText('World', {useInnerText: true});
    await expect(paragraphs.nth(2)).toHaveText('Hello   World   !', {useInnerText: true});
    await expect(paragraphs.nth(3)).toHaveText('Hello World !', {useInnerText: true});
  });

  test('Copy + paste a code block with BR', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `<meta charset='utf-8'><p class="x1f6kntn x1fcty0u x16h55sf x12nagc xdj266r" dir="ltr"><span>Code block</span></p><code class="x1f6kntn x1fcty0u x16h55sf x1xmf6yo x1e56ztr x1q8sqs3 xeq4nuv x1lliihq xz9dl7a xn6708d xsag5q8 x1ye3gou" spellcheck="false" data-highlight-language="javascript"><span class="xuc5kci">function</span><span> </span><span class="xu88d7e">foo</span><span class="x1noocy9">(</span><span class="x1noocy9">)</span><span> </span><span class="x1noocy9">{</span><br><span>  </span><span class="xuc5kci">return</span><span> </span><span class="x180nigk">'Hey there'</span><span class="x1noocy9">;</span><br><span class="x1noocy9">}</span></code><p class="x1f6kntn x1fcty0u x16h55sf x12nagc xdj266r" dir="ltr"><span>--end--</span></p>`,
    };

    // Paste code block with <br> tags into the editor
    await pasteFromClipboard(page, clipboard);

    // Expect the HTML structure to include a paragraph, a code block, and another paragraph
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Code block</span>
        </p>
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="123"
          data-highlight-language="javascript">
          <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">function</span>
          <span data-lexical-text="true"></span>
          <span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">foo</span>
          <span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span>
          <span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span>
          <span data-lexical-text="true"></span>
          <span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">{</span>
          <br />
          <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">return</span>
          <span data-lexical-text="true"></span>
          <span class="PlaygroundEditorTheme__tokenSelector" data-lexical-text="true">'Hey there'</span>
          <span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">;</span>
          <br />
          <span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">}</span>
        </code>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">--end--</span>
        </p>
      `,
    );
  });

  test('Copy + paste a paragraph element between horizontal rules', async ({page, isPlainText, isCollab}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    let clipboard = {'text/html': '<hr/><hr/>'};

    // Paste two horizontal rules into the editor
    await pasteFromClipboard(page, clipboard);

    if (!isCollab) {
      // Expect the HTML structure to include two horizontal rules
      await assertHTML(
        page,
        html`
          <hr
            class="PlaygroundEditorTheme__hr"
            contenteditable="false"
            data-lexical-decorator="true" />
          <hr
            class="PlaygroundEditorTheme__hr"
            contenteditable="false"
            data-lexical-decorator="true" />
          <div
            class="PlaygroundEditorTheme__blockCursor"
            contenteditable="false"
            data-lexical-cursor="true"></div>
        `,
      );

      // Expect the selection to be at the end of the content
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [2],
        focusOffset: 0,
        focusPath: [2],
      });
    }

    clipboard = {'text/html': '<p>Hello World</p>'};

    // Paste "<p>Hello World</p>" between the horizontal rules
    await pasteFromClipboard(page, clipboard);

    if (!isCollab) {
      // Expect the HTML structure to include two horizontal rules with a paragraph in between
      await assertHTML(
        page,
        html`
          <hr
            class="PlaygroundEditorTheme__hr"
            contenteditable="false"
            data-lexical-decorator="true" />
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello World</span>
          </p>
          <hr
            class="PlaygroundEditorTheme__hr"
            contenteditable="false"
            data-lexical-decorator="true" />
          <div
            class="PlaygroundEditorTheme__blockCursor"
            contenteditable="false"
            data-lexical-cursor="true"></div>
        `,
      );

      // Expect the selection to be at the end of the content
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [3],
        focusOffset: 0,
        focusPath: [3],
      });
    }
  });

  test('Copy + paste text with special characters', async ({page, isPlainText, isCollab}) => {
    test.skip(isPlainText || isCollab);

    await focusEditor(page);

    const clipboard = {
      'text/html':
        'I am a ninja :D in special ops <b class="playground-bold">:) * waves *</b> :(',
    };

    // Paste text with special characters and formatting into the editor
    await pasteFromClipboard(page, clipboard);

    // Expect the HTML structure to include a paragraph with the pasted text and formatting
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">I am a ninja :D in special ops </span>
          <strong class="playground-bold"
            ><span data-lexical-text="true">:) * waves *</span></strong
          >
          <span data-lexical-text="true"> :(</span>
        </p>
      `,
    );

    // Expect the selection to be at the end of the paragraph
    await assertSelection(page, {
      anchorOffset: 28,
      anchorPath: [0, 2],
      focusOffset: 28,
      focusPath: [0, 2],
    });
  });
});
