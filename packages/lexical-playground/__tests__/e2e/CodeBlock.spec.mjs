/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToEnd,
  moveToStart,
  selectAll,
  selectCharacters,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../utils/index.mjs';

async function toggleCodeBlock(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.code');
}

test.describe('CodeBlock', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('Can create code block with markdown', async ({page, isRichText}) => {
    await focusEditor(page);
    await page.keyboard.type('``` alert(1);');
    if (isRichText) {
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [0, 4, 0],
        focusOffset: 1,
        focusPath: [0, 4, 0],
      });
      await assertHTML(
        page,
        html`
          <code
            class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
            spellcheck="false"
            dir="ltr"
            data-gutter="1"
            data-highlight-language="javascript">
            <span
              class="PlaygroundEditorTheme__tokenFunction"
              data-lexical-text="true">
              alert
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              (
            </span>
            <span
              class="PlaygroundEditorTheme__tokenProperty"
              data-lexical-text="true">
              1
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              )
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              ;
            </span>
          </code>
        `,
      );

      // Remove code block (back to a normal paragraph) and check that highlights are converted into regular text
      await moveToEditorBeginning(page);
      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">alert(1);</span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">\`\`\` alert(1);</span>
          </p>
        `,
      );
    }
  });

  test('Can create code block with markdown and wrap existing text', async ({
    page,
    isRichText,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('alert(1);');
    await moveToEditorBeginning(page);
    await page.keyboard.type('``` ');
    if (isRichText) {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 0, 0],
        focusOffset: 0,
        focusPath: [0, 0, 0],
      });
      await assertHTML(
        page,
        html`
          <code
            class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
            spellcheck="false"
            dir="ltr"
            data-gutter="1"
            data-highlight-language="javascript">
            <span
              class="PlaygroundEditorTheme__tokenFunction"
              data-lexical-text="true">
              alert
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              (
            </span>
            <span
              class="PlaygroundEditorTheme__tokenProperty"
              data-lexical-text="true">
              1
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              )
            </span>
            <span
              class="PlaygroundEditorTheme__tokenPunctuation"
              data-lexical-text="true">
              ;
            </span>
          </code>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">\`\`\` alert(1);</span>
          </p>
        `,
      );
    }
  });

  test('Can select multiple paragraphs and convert to code block', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('foo');
    await page.keyboard.press('Enter');
    await page.keyboard.type('bar');
    await page.keyboard.press('Enter');
    await page.keyboard.type('yar');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('meh');

    await selectAll(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">foo</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">bar</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">yar</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">meh</span>
        </p>
      `,
    );

    await toggleCodeBlock(page);

    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="12345"
          data-highlight-language="javascript">
          <span data-lexical-text="true">foo</span>
          <br />
          <span data-lexical-text="true">bar</span>
          <br />
          <span data-lexical-text="true">yar</span>
          <br />
          <br />
          <span data-lexical-text="true">meh</span>
        </code>
      `,
    );
  });

  test('Can switch highlighting language in a toolbar', async ({
    page,
    isRichText,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('``` select * from users');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <code
            class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
            spellcheck="false"
            dir="ltr"
            data-gutter="1"
            data-highlight-language="javascript">
            <span data-lexical-text="true">select</span>
            <span
              class="PlaygroundEditorTheme__tokenOperator"
              data-lexical-text="true">
              *
            </span>
            <span data-lexical-text="true">from users</span>
          </code>
        `,
      );
      await click(page, '.toolbar-item.code-language');
      await click(page, 'button:has-text("SQL")');
      await assertHTML(
        page,
        html`
          <code
            class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
            spellcheck="false"
            dir="ltr"
            data-gutter="1"
            data-highlight-language="sql">
            <span
              class="PlaygroundEditorTheme__tokenAttr"
              data-lexical-text="true">
              select
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="PlaygroundEditorTheme__tokenOperator"
              data-lexical-text="true">
              *
            </span>
            <span data-lexical-text="true"></span>
            <span
              class="PlaygroundEditorTheme__tokenAttr"
              data-lexical-text="true">
              from
            </span>
            <span data-lexical-text="true">users</span>
          </code>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">\`\`\` select * from users</span>
          </p>
        `,
      );
    }
  });

  test('Can maintain indent when creating new lines', async ({
    page,
    isRichText,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('``` alert(1);');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('alert(2);');
    await page.keyboard.press('Enter');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-gutter="123"
          data-highlight-language="javascript">
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            alert
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenProperty"
            data-lexical-text="true">
            1
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            alert
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenProperty"
            data-lexical-text="true">
            2
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span data-lexical-text="true"></span>
        </code>
      `,
    );
  });

  test('Can (un)indent multiple lines at once', async ({
    page,
    isRichText,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('``` if (x) {');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('x();');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('}');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-gutter="123"
          data-highlight-language="javascript">
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            if
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span data-lexical-text="true">x</span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            {
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            x
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            }
          </span>
        </code>
      `,
    );
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-gutter="123"
          data-highlight-language="javascript">
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            if
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span data-lexical-text="true">x</span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            {
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            x
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            }
          </span>
        </code>
      `,
    );
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-gutter="123"
          data-highlight-language="javascript">
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            if
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span data-lexical-text="true">x</span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            {
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            x
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            }
          </span>
        </code>
      `,
    );
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          spellcheck="false"
          dir="ltr"
          data-gutter="123"
          data-highlight-language="javascript">
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            if
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span data-lexical-text="true">x</span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            {
          </span>
          <br />
          <span
            class="PlaygroundEditorTheme__tokenFunction"
            data-lexical-text="true">
            x
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            (
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            )
          </span>
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            ;
          </span>
          <br />
          <span
            class="PlaygroundEditorTheme__tokenPunctuation"
            data-lexical-text="true">
            }
          </span>
        </code>
      `,
    );
  });

  test('Can move around lines with option+arrow keys', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    const abcHTML = html`
      <code
        class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
        spellcheck="false"
        dir="ltr"
        data-gutter="123"
        data-highlight-language="javascript">
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          a
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
        <br />
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          b
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
        <br />
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          c
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
      </code>
    `;
    const bcaHTML = html`
      <code
        class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
        spellcheck="false"
        dir="ltr"
        data-gutter="123"
        data-highlight-language="javascript">
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          b
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
        <br />
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          c
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
        <br />
        <span
          class="PlaygroundEditorTheme__tokenFunction"
          data-lexical-text="true">
          a
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          (
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          )
        </span>
        <span
          class="PlaygroundEditorTheme__tokenPunctuation"
          data-lexical-text="true">
          ;
        </span>
      </code>
    `;
    const endOfFirstLine = {
      anchorOffset: 1,
      anchorPath: [0, 3, 0],
      focusOffset: 1,
      focusPath: [0, 3, 0],
    };
    const endOfLastLine = {
      anchorOffset: 1,
      anchorPath: [0, 13, 0],
      focusOffset: 1,
      focusPath: [0, 13, 0],
    };
    await focusEditor(page);
    await page.keyboard.type('``` a();\nb();\nc();');
    await assertHTML(page, abcHTML);
    await assertSelection(page, endOfLastLine);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    // Workaround for #1173: just insert and remove a space to fix Firefox losing the selection
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await assertSelection(page, endOfFirstLine);
    // End workaround
    // Ensure attempting to move a line up at the top of a codeblock no-ops
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowUp');
    await assertSelection(page, endOfFirstLine);
    await assertHTML(page, abcHTML);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await assertSelection(page, endOfLastLine);
    // Can't move a line down and out of codeblock
    await assertHTML(page, bcaHTML);
    await page.keyboard.press('ArrowDown');
    await assertSelection(page, endOfLastLine);
    await assertHTML(page, bcaHTML);
  });

  /**
   * Code example for tests:
   *
   * function run() {
   *   return [null, undefined, 2, ""];
   * }
   *
   */
  const EXPECTED_HTML = html`
    <code
      class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
      spellcheck="false"
      dir="ltr"
      data-gutter="123"
      data-highlight-language="javascript">
      <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">
        function
      </span>
      <span data-lexical-text="true"></span>
      <span
        class="PlaygroundEditorTheme__tokenFunction"
        data-lexical-text="true">
        run
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        (
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        )
      </span>
      <span data-lexical-text="true"></span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        {
      </span>
      <br />
      <span data-lexical-text="true"></span>
      <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">
        return
      </span>
      <span data-lexical-text="true"></span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        [
      </span>
      <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">
        null
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        ,
      </span>
      <span data-lexical-text="true"></span>
      <span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">
        undefined
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        ,
      </span>
      <span data-lexical-text="true"></span>
      <span
        class="PlaygroundEditorTheme__tokenProperty"
        data-lexical-text="true">
        2
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        ,
      </span>
      <span data-lexical-text="true"></span>
      <span
        class="PlaygroundEditorTheme__tokenSelector"
        data-lexical-text="true">
        ""
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        ]
      </span>
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        ;
      </span>
      <br />
      <span
        class="PlaygroundEditorTheme__tokenPunctuation"
        data-lexical-text="true">
        }
      </span>
    </code>
  `;
  const CODE_PASTING_TESTS = [
    {
      expectedHTML: EXPECTED_HTML,
      name: 'VS Code',
      pastedHTML: `<meta charset='utf-8'><div style="color: #d4d4d4;background-color: #1e1e1e;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #569cd6;">function</span><span style="color: #d4d4d4;"> </span><span style="color: #dcdcaa;">run</span><span style="color: #d4d4d4;">() {</span></div><div><span style="color: #d4d4d4;">  </span><span style="color: #c586c0;">return</span><span style="color: #d4d4d4;"> [</span><span style="color: #569cd6;">null</span><span style="color: #d4d4d4;">, </span><span style="color: #569cd6;">undefined</span><span style="color: #d4d4d4;">, </span><span style="color: #b5cea8;">2</span><span style="color: #d4d4d4;">, </span><span style="color: #ce9178;">""</span><span style="color: #d4d4d4;">];</span></div><div><span style="color: #d4d4d4;">}</span></div></div>`,
    },
    {
      expectedHTML: EXPECTED_HTML,
      name: 'Quip',
      pastedHTML: `<meta charset='utf-8'><pre>function run() {<br>  return [null, undefined, 2, ""];<br>}</pre>`,
    },
    {
      expectedHTML: EXPECTED_HTML,
      name: 'WebStorm / Idea',
      pastedHTML: `<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head><body><pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;"><span style="color:#cc7832;">function&#32;</span><span style="color:#ffc66d;">run</span>()&#32;{<br>&#32;&#32;<span style="color:#cc7832;">return&#32;</span>[<span style="color:#cc7832;">null,&#32;undefined,&#32;</span><span style="color:#6897bb;">2</span><span style="color:#cc7832;">,&#32;</span><span style="color:#6a8759;">""</span>]<span style="color:#cc7832;">;<br></span>}</pre></body></html>`,
    },
    {
      expectedHTML: EXPECTED_HTML,
      name: 'Postman IDE',
      pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #800555;font-weight: bold;">function</span><span style="color: #000000;"> run() {</span></div><div><span style="color: #000000;">  </span><span style="color: #800555;font-weight: bold;">return</span><span style="color: #000000;"> [</span><span style="color: #800555;font-weight: bold;">null</span><span style="color: #000000;">, </span><span style="color: #800555;font-weight: bold;">undefined</span><span style="color: #000000;">, </span><span style="color: #ff00aa;">2</span><span style="color: #000000;">, </span><span style="color: #2a00ff;">""</span><span style="color: #000000;">];</span></div><div><span style="color: #000000;">}</span></div></div>`,
    },
    {
      expectedHTML: EXPECTED_HTML,
      name: 'Slack message',
      pastedHTML: `<meta charset='utf-8'><pre class="c-mrkdwn__pre" data-stringify-type="pre" style="box-sizing: inherit; margin: 4px 0px; padding: 8px; --saf-0:rgba(var(--sk_foreground_low,29,28,29),0.13); font-size: 12px; line-height: 1.50001; font-variant-ligatures: none; white-space: pre-wrap; word-break: break-word; word-break: normal; tab-size: 4; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;, monospace !important; border: 1px solid var(--saf-0); border-radius: 4px; background: rgba(var(--sk_foreground_min,29,28,29),0.04); counter-reset: list-0 0 list-1 0 list-2 0 list-3 0 list-4 0 list-5 0 list-6 0 list-7 0 list-8 0 list-9 0; color: rgb(29, 28, 29); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">function run() {\n  return [null, undefined, 2, ""];\n}</pre>`,
    },
    {
      expectedHTML: `<code class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr" spellcheck="false" dir="ltr" data-highlight-language="javascript" data-gutter="1234"><span class="PlaygroundEditorTheme__tokenAttr" data-lexical-text="true">const</span><span data-lexical-text="true"> Lexical </span><span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">=</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">requireCond</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenSelector" data-lexical-text="true">'gk'</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector" data-lexical-text="true">'runtime_is_dev'</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">{</span><br><span data-lexical-text="true">  </span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">true</span><span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">:</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector" data-lexical-text="true">'Lexical.dev'</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">,</span><br><span data-lexical-text="true">  </span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">false</span><span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">:</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector" data-lexical-text="true">'Lexical.prod'</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">,</span><br><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">}</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">;</span></code>`,
      name: 'CodeHub',
      pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: 'monaco,monospace', Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 13px;line-height: 20px;white-space: pre;"><div><span style="color: #ff0000;">const</span><span style="color: #000000;"> </span><span style="color: #800000;">Lexical</span><span style="color: #000000;"> = </span><span style="color: #383838;">requireCond</span><span style="color: #000000;">(</span><span style="color: #863b00;">'gk'</span><span style="color: #000000;">, </span><span style="color: #863b00;">'runtime_is_dev'</span><span style="color: #000000;">, {</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">true</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.dev'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">false</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.prod'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">});</span></div></div>`,
    },
    {
      expectedHTML: EXPECTED_HTML,
      name: 'GitHub / Gist',
      pastedHTML: `<meta charset='utf-8'><table class="highlight tab-size js-file-line-container js-code-nav-container js-tagsearch-file" data-tab-size="8" data-paste-markdown-skip="" data-tagsearch-lang="JavaScript" data-tagsearch-path="example.js" style="box-sizing: border-box; border-spacing: 0px; border-collapse: collapse; tab-size: 8; color: rgb(36, 41, 47); font-family: -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;"><td id="file-example-js-LC1" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">function</span> <span class="pl-en" style="box-sizing: border-box; color: var(--color-prettylights-syntax-entity);">run</span><span class="pl-kos" style="box-sizing: border-box;">(</span><span class="pl-kos" style="box-sizing: border-box;">)</span> <span class="pl-kos" style="box-sizing: border-box;">{</span></td></tr><tr style="box-sizing: border-box; background-color: transparent;"><td id="file-example-js-L2" class="blob-num js-line-number js-code-nav-line-number" data-line-number="2" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC2" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;">  <span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">return</span> <span class="pl-kos" style="box-sizing: border-box;">[</span><span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">null</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">undefined</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">2</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-s" style="box-sizing: border-box; color: var(--color-prettylights-syntax-string);">""</span><span class="pl-kos" style="box-sizing: border-box;">]</span><span class="pl-kos" style="box-sizing: border-box;">;</span></td></tr><tr style="box-sizing: border-box;"><td id="file-example-js-L3" class="blob-num js-line-number js-code-nav-line-number" data-line-number="3" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC3" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-kos" style="box-sizing: border-box;">}</span></td></tr></tbody></table>`,
    },
    {
      expectedHTML: html`
        <p class="PlaygroundEditorTheme__paragraph">
          <code data-lexical-text="true">
            <span class="PlaygroundEditorTheme__textCode">12</span>
          </code>
        </p>
      `,
      name: 'Single line <code>',
      pastedHTML: `<meta charset='utf-8'><code>12</code>`,
    },
    {
      expectedHTML: html`
        <code
          class="PlaygroundEditorTheme__code"
          spellcheck="false"
          data-gutter="12"
          data-highlight-language="javascript">
          <span
            class="PlaygroundEditorTheme__tokenProperty"
            data-lexical-text="true">
            1
          </span>
          <br />
          <span
            class="PlaygroundEditorTheme__tokenProperty"
            data-lexical-text="true">
            2
          </span>
        </code>
      `,
      name: 'Multiline <code>',
      pastedHTML: `<meta charset='utf-8'><code>1\n2</code>`,
    },
  ];

  CODE_PASTING_TESTS.forEach((testCase, i) => {
    test(`Code block html paste: ${testCase.name}`, async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);

      await focusEditor(page);
      await pasteFromClipboard(page, {
        'text/html': testCase.pastedHTML,
      });
      await assertHTML(page, testCase.expectedHTML);
    });
  });

  test('When pressing CMD/Ctrl + Left, CMD/Ctrl + Right, the cursor should go to the start of the code', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('``` ');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.type('a b');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.keyboard.type('c d');
    await page.keyboard.press('Space');
    await assertHTML(
      page,
      `
      <code
        class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
        dir="ltr"
        spellcheck="false"
        data-gutter="12"
        data-highlight-language="javascript">
        <span data-lexical-text="true">a b</span>
        <br />
        <span data-lexical-text="true">c d</span>
      </code>
    `,
    );

    await selectCharacters(page, 'left', 13);
    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 2, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await moveToStart(page);
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 0, 0],
      focusOffset: 2,
      focusPath: [0, 0, 0],
    });

    await moveToEnd(page);
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });

    await moveToStart(page);
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 0, 0],
      focusOffset: 2,
      focusPath: [0, 0, 0],
    });

    await selectCharacters(page, 'right', 11);
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 2, 0],
    });

    await moveToEnd(page);
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 2, 0],
      focusOffset: 5,
      focusPath: [0, 2, 0],
    });

    await page.pause();
  });
});
