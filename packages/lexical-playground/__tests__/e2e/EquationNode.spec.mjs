/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  click,
  expect,
  focus,
  focusEditor,
  html,
  initialize,
  selectFromInsertDropdown,
  test,
  waitForSelector,
} from '../utils/index.mjs';

export async function insertBlockEquation(page, equation) {
  await selectFromInsertDropdown(page, '.equation');
  await click(page, 'input[data-test-id="equation-inline-checkbox"]');
  await focus(page, 'textarea[data-test-id="equation-input"]');
  await page.keyboard.type(equation);
  await click(page, 'button[data-test-id="equation-submit-btn"]');
}

function equationHtml(inline = true) {
  const tag = inline ? 'span' : 'div';
  return `<${tag}
            class="editor-equation"
            contenteditable="false"
            data-lexical-decorator="true">
            <img
              alt=""
              height="0"
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              width="0" />
            <span>
              ${inline ? '' : `<span class="katex-display">`}
              <span class="katex">
                <span class="katex-html" aria-hidden="true">
                  <span class="base">
                    <span class="strut" style="height: 0.6444em;"></span>
                    <span class="mord">1</span>
                  </span>
                </span>
              </span>
              ${inline ? '' : `</span>`}
            </span>
            <img
              alt=""
              height="0"
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              width="0" />
          </${tag}>`;
}

test.describe('EquationNode', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    return initialize({
      isCollab,
      page,
    });
  });
  test('inline EquationNode is wrapped in a paragraph', async ({
    page,
    isCollab,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('$1$');
    await waitForSelector(page, '.editor-equation');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          ${equationHtml(true)}
          <br />
        </p>
      `,
    );
  });
  test('block EquationNode is a child of the root', async ({
    page,
    isCollab,
  }) => {
    await focusEditor(page);
    await insertBlockEquation(page, '1');
    await waitForSelector(page, '.editor-equation');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br />
        </p>
        ${equationHtml(false)}
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br />
        </p>
      `,
    );
  });
  test('equation dialog inserts templates and symbols', async ({page}) => {
    await focusEditor(page);
    await selectFromInsertDropdown(page, '.equation');

    await click(page, 'button[data-test-id="equation-template-fraction"]');
    await expect(page.locator('[data-test-id="equation-input"]')).toHaveValue(
      '\\frac{a}{b}',
    );

    await click(page, 'button[data-test-id="equation-symbol-alpha"]');
    await expect(page.locator('[data-test-id="equation-input"]')).toHaveValue(
      '\\frac{\\alpha}{b}',
    );

    await click(page, 'button[data-test-id="equation-submit-btn"]');
    await waitForSelector(page, '.editor-equation');
  });
  test('block EquationNode exports to fenced markdown', async ({page}) => {
    await focusEditor(page);
    await insertBlockEquation(page, '\\frac{a}{b}');
    await waitForSelector(page, '.editor-equation');

    await click(page, '.action-button .markdown');

    const markdown = await page
      .locator('code[data-language="markdown"]')
      .innerText();
    expect(markdown).toContain('$$\n\\frac{a}{b}\n$$');
  });
});
