/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  deleteNextWord,
  moveToEditorBeginning,
  selectAll,
  selectPrevWord,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  expect,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

const IGNORE = {ignoreClasses: true, ignoreDir: true, ignoreInlineStyles: true};

test.describe('Shadow DOM', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    // Rich-text-only; collab renders in split iframes which is an orthogonal
    // concern to shadow root encapsulation.
    test.skip(isPlainText || isCollab);
    return initialize({isShadowDOM: true, page});
  });

  test('renders the editor inside an open shadow root', async ({page}) => {
    await expect(page.locator('[data-test-id="shadow-dom-host"]')).toHaveCount(
      1,
    );
    // document.querySelector does not pierce shadow roots, so a null result
    // proves the contentEditable lives inside the shadow tree. Playwright's
    // selector engine still sees it (it pierces open shadow roots).
    const contentEditableInLightDom = await page.evaluate(
      () => document.querySelector('div[contenteditable="true"]') !== null,
    );
    expect(contentEditableInLightDom).toBe(false);
    await expect(
      page.locator('div[contenteditable="true"]').first(),
    ).toBeVisible();
  });

  test('types and reconciles text inside the shadow root', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await assertHTML(
      page,
      html`
        <p><span data-lexical-text="true">Hello world</span></p>
      `,
      undefined,
      IGNORE,
    );
  });

  test('selects a word with Selection.modify and formats it', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    // Word-granularity selection goes through RangeSelection.modify, which
    // reads the result via Selection.getComposedRanges inside a shadow root.
    await selectPrevWord(page);
    await toggleBold(page);
    await assertHTML(
      page,
      html`
        <p>
          <span data-lexical-text="true">Hello</span>
          <strong data-lexical-text="true">world</strong>
        </p>
      `,
      undefined,
      IGNORE,
    );
  });

  test('select all and delete clears the editor', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p><br /></p>
      `,
      undefined,
      IGNORE,
    );
  });

  test('deletes by word inside the shadow root', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await moveToEditorBeginning(page);
    // Forward word deletion extends the selection with native Selection.modify
    // and removes it; this is the operation that historically failed in shadow
    // DOM without composed-range reads.
    await deleteNextWord(page);
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).not.toContain('Hello');
    expect(text).toContain('world');
  });
});
