/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveLeft, redo, undo} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  clearEditor,
  click,
  focusEditor,
  getHTML,
  html,
  initialize,
  LEGACY_EVENTS,
  pasteFromClipboard,
  pressToggleBold,
  pressToggleUnderline,
  test,
} from '../utils/index.mjs';

async function assertMarkdownImportExport(
  page,
  textToImport,
  expectedHTML,
  ignoreClasses,
) {
  // Clear the editor from previous content
  await clearEditor(page);

  // Create code block that will be imported as a markdown into editor
  await page.keyboard.type('```markdown ');
  await page.keyboard.type(textToImport);
  await click(page, '.action-button .markdown');
  await assertHTML(page, expectedHTML, undefined, {ignoreClasses});

  // Cycle through import-export to verify it produces the same result
  await click(page, '.action-button .markdown');
  await click(page, '.action-button .markdown');
  await assertHTML(page, expectedHTML);
}

test.describe('Markdown', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    initialize({isCollab, page});
  });

  const BASE_BLOCK_SHORTCUTS = [
    {
      html: html`
        <h1><br /></h1>
      `,
      text: '# ',
    },
    {
      html: html`
        <h2><br /></h2>
      `,
      text: '## ',
    },
    {
      html: html`
        <ol>
          <li value="1"><br /></li>
        </ol>
      `,
      text: '1. ',
    },
    {
      html: html`
        <ol start="25">
          <li value="25"><br /></li>
        </ol>
      `,
      text: '25. ',
    },
    {
      html: html`
        <ol>
          <li value="1">
            <ol>
              <li value="1"><br /></li>
            </ol>
          </li>
        </ol>
      `,
      text: '    1. ',
    },
    {
      html: html`
        <ul>
          <li value="1"><br /></li>
        </ul>
      `,
      text: '- ',
    },
    {
      html: html`
        <ul>
          <li value="1">
            <ul>
              <li value="1"><br /></li>
            </ul>
          </li>
        </ul>
      `,
      text: '    - ',
    },
    {
      html: html`
        <ul>
          <li value="1"><br /></li>
        </ul>
      `,
      text: '* ',
    },
    {
      html: html`
        <ul>
          <li value="1">
            <ul>
              <li value="1"><br /></li>
            </ul>
          </li>
        </ul>
      `,
      text: '    * ',
    },
    {
      html: html`
        <ul>
          <li value="1">
            <ul>
              <li value="1"><br /></li>
            </ul>
          </li>
        </ul>
      `,
      text: '      * ',
    },
    {
      html: html`
        <ul>
          <li value="1">
            <ul>
              <li value="1">
                <ul>
                  <li value="1">
                    <br />
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `,
      text: '        * ',
    },
    {
      html: html`
        <div
          contenteditable="false"
          style="display: contents;"
          data-lexical-decorator="true">
          <hr />
        </div>
        <p><br /></p>
      `,
      text: '--- ',
    },
    {
      html: html`
        <div
          contenteditable="false"
          style="display: contents;"
          data-lexical-decorator="true">
          <hr />
        </div>
        <p><br /></p>
      `,
      text: '*** ',
    },
  ];

  const SIMPLE_TEXT_FORMAT_SHORTCUTS = [
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            world
          </em>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: 'hello *world*!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: 'hello **world**!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: 'hello ***world***!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: 'hello ___world___!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://www.test.com">
            <span data-lexical-text="true">world</span>
          </a>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: 'hello [world](https://www.test.com)!',
    },
  ];

  const NESTED_TEXT_FORMAT_SHORTCUTS = [
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
            data-lexical-text="true">
            hello world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: '~~_**hello world**_~~!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <em
            class="PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
            data-lexical-text="true">
            hello world
          </em>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: '~~_hello world_~~!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textStrikethrough"
            data-lexical-text="true">
            hello world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: '~~**hello world**~~!',
    },
    {
      html: html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            hello world
          </strong>
          <span data-lexical-text="true">!</span>
        </p>
      `,
      text: '_**hello world**_!',
    },
  ];

  BASE_BLOCK_SHORTCUTS.forEach((testCase) => {
    test(`can convert "${testCase.text}" shortcut`, async ({
      page,
      isCollab,
    }) => {
      await focusEditor(page);
      await page.keyboard.type(testCase.text);
      await assertHTML(page, testCase.html, undefined, {ignoreClasses: true});

      if (!isCollab) {
        const escapedText = testCase.text.replace('>', '&gt;');
        await undo(page);
        await assertHTML(
          page,
          `<p><span data-lexical-text="true">${escapedText}</span></p>`,
          undefined,
          {ignoreClasses: true},
        );
        await redo(page);
        await assertHTML(page, testCase.html, undefined, {ignoreClasses: true});
      }
    });
  });

  SIMPLE_TEXT_FORMAT_SHORTCUTS.forEach((testCase) => {
    test(`can convert "${testCase.text}" shortcut`, async ({
      page,
      isCollab,
    }) => {
      await focusEditor(page);
      await page.keyboard.type(testCase.text, {
        delay: LEGACY_EVENTS ? 50 : 0,
      });
      await assertHTML(page, testCase.html, undefined, {ignoreClasses: false});
      await assertMarkdownImportExport(page, testCase.text, testCase.html);
    });
  });

  NESTED_TEXT_FORMAT_SHORTCUTS.forEach((testCase) => {
    test(`can convert "${testCase.text}" shortcut`, async ({page}) => {
      await focusEditor(page);
      await page.keyboard.type(testCase.text, {
        delay: LEGACY_EVENTS ? 50 : 0,
      });
      await assertHTML(page, testCase.html, undefined, {ignoreClasses: false});
      await assertMarkdownImportExport(page, testCase.text, testCase.html);
    });
  });

  test('can undo/redo nested transformations', async ({page, isCollab}) => {
    await focusEditor(page);
    await page.keyboard.type('~~_**hello world**_~~');

    const BOLD_ITALIC_STRIKETHROUGH = html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <strong
          class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
          data-lexical-text="true">
          hello world
        </strong>
      </p>
    `;
    const BOLD_ITALIC = html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">~~</span>
        <strong
          class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
          data-lexical-text="true">
          hello world
        </strong>
        <span data-lexical-text="true">~~</span>
      </p>
    `;
    const BOLD = html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">~~_</span>
        <strong
          class="PlaygroundEditorTheme__textBold"
          data-lexical-text="true">
          hello world
        </strong>
        <span data-lexical-text="true">_</span>
      </p>
    `;
    const PLAIN = html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">~~_**hello world**</span>
      </p>
    `;

    await assertHTML(page, BOLD_ITALIC_STRIKETHROUGH);

    if (isCollab) {
      return;
    }

    await undo(page); // Undo last transformation
    await assertHTML(page, BOLD_ITALIC);
    await undo(page); // Undo transformation & its text typing
    await undo(page);
    await assertHTML(page, BOLD);
    await undo(page); // Undo transformation & its text typing
    await undo(page);
    await assertHTML(page, PLAIN);
    await redo(page); // Redo transformation & its text typing
    await redo(page);
    await assertHTML(page, BOLD);
    await redo(page); // Redo transformation & its text typing
    await redo(page);
    await assertHTML(page, BOLD_ITALIC);
    await redo(page); // Redo transformation
    await assertHTML(page, BOLD_ITALIC_STRIKETHROUGH);
  });

  test('can convert already styled text (overlapping ranges)', async ({
    page,
  }) => {
    // type partially bold/underlined text, add opening markdown tag within bold/underline part
    // and add closing within plain text
    await focusEditor(page);
    await pressToggleBold(page);
    await pressToggleUnderline(page);
    await page.keyboard.type('h*e~~llo');
    await pressToggleBold(page);
    await pressToggleUnderline(page);
    await page.keyboard.type(' wo~~r*ld');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            h
          </strong>
          <strong
            class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textUnderline"
            data-lexical-text="true">
            e
          </strong>
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            llo
          </strong>
          <em
            class="PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
            data-lexical-text="true">
            wo
          </em>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            r
          </em>
          <span data-lexical-text="true">ld</span>
        </p>
      `,
    );
  });

  test('can convert markdown text into rich text', async ({page, isCollab}) => {
    await focusEditor(page);
    await page.keyboard.type('```markdown ');
    await pasteFromClipboard(page, {
      'text/plain': IMPORTED_MARKDOWN,
    });

    const originalHTML = await getHTML(page);

    // Import from current markdown codeblock content
    await click(page, '.action-button .markdown');
    await assertHTML(page, IMPORTED_MARKDOWN_HTML);

    if (!isCollab) {
      await undo(page);
      await assertHTML(page, originalHTML);
      await redo(page);
      await assertHTML(page, IMPORTED_MARKDOWN_HTML);

      // Click again to run export/import cycle twice to make sure
      // no extra nodes (e.g. newlines) are created
      await click(page, '.action-button .markdown');
      await click(page, '.action-button .markdown');
      await click(page, '.action-button .markdown');
      await click(page, '.action-button .markdown');
      await assertHTML(page, IMPORTED_MARKDOWN_HTML);
    }
  });

  test('can type text with markdown', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type(TYPED_MARKDOWN);
    await assertHTML(page, TYPED_MARKDOWN_HTML);
  });

  test('itraword text format', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('he_llo_ world');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">he_llo_ world</span>
        </p>
      `,
    );

    await clearEditor(page);
    await page.keyboard.type('_hello world');
    await moveLeft(page, 3);
    await page.keyboard.type('_');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">_hello wo_rld</span>
        </p>
      `,
    );
  });

  test('can export text format next to a newline', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
    await page.keyboard.type('_world_');
    await click(page, '.action-button .markdown');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-highlight-language="markdown"
          data-gutter="12">
          <span data-lexical-text="true">Hello</span>
          <br />
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            *
          </span>
          <span data-lexical-text="true">world</span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            *
          </span>
        </code>
      `,
    );
  });
});

const TYPED_MARKDOWN = `# Markdown Shortcuts
This is *italic*, _italic_, **bold**, __bold__, ~~strikethrough~~ text
This is *__~~bold italic strikethrough~~__* text, ___~~this one too~~___
It ~~___works [with links](https://lexical.io) too___~~
*Nested **stars tags** are handled too*
# Title
## Subtitle
> Quote
--- - List here

    - Nested one


\`\`\`sql Code block


Done`;

const TYPED_MARKDOWN_HTML = html`
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Markdown Shortcuts</span>
  </h1>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <span
      class="PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      strikethrough
    </span>
    <span data-lexical-text="true">text</span>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textStrikethrough PlaygroundEditorTheme__textItalic"
      data-lexical-text="true">
      bold italic strikethrough
    </strong>
    <span data-lexical-text="true">text,</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      this one too
    </strong>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">It</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      works
    </strong>
    <a
      href="https://lexical.io"
      class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
      dir="ltr">
      <strong
        class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
        data-lexical-text="true">
        with links
      </strong>
    </a>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      too
    </strong>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      Nested
    </em>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
      data-lexical-text="true">
      stars tags
    </strong>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      are handled too
    </em>
  </p>
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Title</span>
  </h1>
  <h2 class="PlaygroundEditorTheme__h2 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Subtitle</span>
  </h2>
  <blockquote
    class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Quote</span>
  </blockquote>
  <div
    contenteditable="false"
    style="display: contents;"
    data-lexical-decorator="true">
    <hr />
  </div>
  <ul class="PlaygroundEditorTheme__ul">
    <li
      value="1"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">List here</span>
    </li>
    <li
      value="2"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
      <ul class="PlaygroundEditorTheme__ul">
        <li
          value="1"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Nested one</span>
        </li>
      </ul>
    </li>
  </ul>
  <code
    class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
    spellcheck="false"
    dir="ltr"
    data-highlight-language="sql"
    data-gutter="1">
    <span data-lexical-text="true">Code block</span>
  </code>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Done</span>
  </p>
`;

const IMPORTED_MARKDOWN = `# Markdown Import
### Formatting
This is *italic*, _italic_, **bold**, __bold__, ~~strikethrough~~ text

This is *__~~bold italic strikethrough~~__* text,
___~~this one too~~___

It ~~___works [with links](https://lexical.io)___~~ too

Links [with underscores](https://lexical.io/tag_here_and__here__and___here___too)

*Nested **stars tags** are handled too*
### Headings
# h1 Heading
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading
### Horizontal Rules
---
### Blockquotes
> Blockquotes text goes here
> And second
line after

> Standalone again

### Unordered lists
- Create a list with \`+\`, \`-\`, or \`*\`
    - Lists can be indented with 2 spaces
        - Very easy
### Ordered lists
1. Oredered lists started with numbers as \`1.\`
    1. And can be nested
    and multiline as well

31. Have any starting number
### Inline code
Inline \`code\` format which also \`preserves **_~~any markdown-like~~_** text\` within
### Code blocks
\`\`\`javascript
// Some comments
1 + 1 = 2;
**_~~1~~_**
\`\`\``;

const IMPORTED_MARKDOWN_HTML = html`
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Markdown Import</span>
  </h1>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Formatting</span>
  </h3>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <span
      class="PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      strikethrough
    </span>
    <span data-lexical-text="true">text</span>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      bold italic strikethrough
    </strong>
    <span data-lexical-text="true">text,</span>
    <br />
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      this one too
    </strong>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">It</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      works
    </strong>
    <a
      href="https://lexical.io"
      class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
      dir="ltr">
      <strong
        class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
        data-lexical-text="true">
        with links
      </strong>
    </a>
    <span data-lexical-text="true">too</span>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Links</span>
    <a
      href="https://lexical.io/tag_here_and__here__and___here___too"
      class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">with underscores</span>
    </a>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      Nested
    </em>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
      data-lexical-text="true">
      stars tags
    </strong>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      are handled too
    </em>
  </p>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Headings</span>
  </h3>
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h1 Heading</span>
  </h1>
  <h2 class="PlaygroundEditorTheme__h2 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h2 Heading</span>
  </h2>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h3 Heading</span>
  </h3>
  <h4 class="PlaygroundEditorTheme__h4 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h4 Heading</span>
  </h4>
  <h5 class="PlaygroundEditorTheme__h5 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h5 Heading</span>
  </h5>
  <h6 class="PlaygroundEditorTheme__h6 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h6 Heading</span>
  </h6>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Horizontal Rules</span>
  </h3>
  <div
    contenteditable="false"
    style="display: contents;"
    data-lexical-decorator="true">
    <hr />
  </div>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Blockquotes</span>
  </h3>
  <blockquote
    class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Blockquotes text goes here</span>
    <br />
    <span data-lexical-text="true">And second</span>
    <br />
    <span data-lexical-text="true">line after</span>
  </blockquote>
  <blockquote
    class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Standalone again</span>
  </blockquote>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Unordered lists</span>
  </h3>
  <ul class="PlaygroundEditorTheme__ul">
    <li
      value="1"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">Create a list with</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">+</span>
      </code>
      <span data-lexical-text="true">,</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">-</span>
      </code>
      <span data-lexical-text="true">, or</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">*</span>
      </code>
    </li>
    <li
      value="2"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
      <ul class="PlaygroundEditorTheme__ul">
        <li
          value="1"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">
            Lists can be indented with 2 spaces
          </span>
        </li>
        <li
          value="2"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
          <ul class="PlaygroundEditorTheme__ul">
            <li
              value="1"
              class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Very easy</span>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Ordered lists</span>
  </h3>
  <ol class="PlaygroundEditorTheme__ol1">
    <li
      value="1"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">
        Oredered lists started with numbers as
      </span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">1.</span>
      </code>
    </li>
    <li
      value="2"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
      <ol class="PlaygroundEditorTheme__ol2">
        <li
          value="1"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">And can be nested</span>
          <br />
          <span data-lexical-text="true">and multiline as well</span>
        </li>
      </ol>
    </li>
  </ol>
  <ol start="31" class="PlaygroundEditorTheme__ol1">
    <li
      value="31"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">Have any starting number</span>
    </li>
  </ol>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Inline code</span>
  </h3>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Inline</span>
    <code data-lexical-text="true">
      <span class="PlaygroundEditorTheme__textCode">code</span>
    </code>
    <span data-lexical-text="true">format which also</span>
    <code data-lexical-text="true">
      <span class="PlaygroundEditorTheme__textCode">
        preserves **_~~any markdown-like~~_** text
      </span>
    </code>
    <span data-lexical-text="true">within</span>
  </p>
  <h3 class="PlaygroundEditorTheme__h3 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Code blocks</span>
  </h3>
  <code
    class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
    spellcheck="false"
    dir="ltr"
    data-highlight-language="javascript"
    data-gutter="123">
    <span class="PlaygroundEditorTheme__tokenComment" data-lexical-text="true">
      // Some comments
    </span>
    <br />
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      +
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      =
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      2
    </span>
    <span
      class="PlaygroundEditorTheme__tokenPunctuation"
      data-lexical-text="true">
      ;
    </span>
    <br />
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      **
    </span>
    <span data-lexical-text="true">_</span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span data-lexical-text="true">_</span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      **
    </span>
  </code>
`;
