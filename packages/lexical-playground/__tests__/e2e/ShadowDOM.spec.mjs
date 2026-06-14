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
  moveToEditorEnd,
  selectAll,
  selectPrevWord,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  copyToClipboard,
  expect,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
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
        <p><br data-lexical-managed-linebreak="true" /></p>
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

  test('clicking a table cell creates a range selection inside the cell', async ({
    page,
    browserName,
  }) => {
    // Webkit's headless pointer dispatch is flaky on the table cell hit-test;
    // the underlying handler is exercised by the chromium/firefox runs.
    test.skip(browserName === 'webkit');
    await focusEditor(page);
    // Manual sequence — `insertTable` from utils opens the Insert dropdown
    // via click() but the dropdown's outside-click handler also runs against
    // the same synthetic click event in the shadow-mounted toolbar; explicit
    // steps with waitFor between them keep the dropdown open long enough to
    // pick the Table item.
    await page
      .locator('.toolbar-item[aria-label="Insert specialized editor node"]')
      .click();
    const tableItem = page.locator('.dropdown .item .table');
    await tableItem.waitFor();
    await tableItem.click();
    await page.locator('input[data-test-id="table-modal-rows"]').fill('2');
    await page.locator('input[data-test-id="table-modal-columns"]').fill('2');
    await page
      .locator('div[data-test-id="table-model-confirm-insert"] > .Button__root')
      .click();
    await page.locator('table').waitFor();
    // Clicking a cell goes through the window-attached pointerdown listener
    // in lexical-table; without getComposedEventTarget the event.target is
    // retargeted to the shadow host and the rootElement.contains() gate
    // rejects the click. Type into a non-first cell to assert the click
    // actually placed the caret inside that cell.
    // InsertTableDialog defaults to includeHeaders=true, so 3 of the 4 cells
    // are <th>; pick the only <td> as the non-first cell.
    const targetCell = page.locator('table td').last();
    await targetCell.click();
    await page.keyboard.type('typed');
    const cellText = await targetCell.textContent();
    expect(cellText).toContain('typed');
  });

  test('component picker opens, navigates and inserts a heading', async ({
    page,
  }) => {
    await focusEditor(page);
    // The slash menu (LexicalTypeaheadMenuPlugin) repositions on scroll; the
    // popup is anchored to the editor's selection and its open/close cycle
    // exercises the typeahead path that reads the composed selection.
    await page.keyboard.type('/heading');
    // LexicalMenu's defaultMenuRenderFn portals the typeahead popup as
    // `<div class="typeahead-popover mentions-menu">`; there is no
    // dedicated data-test-id, so target the rendered class.
    await expect(
      page.locator('.typeahead-popover.mentions-menu'),
    ).toBeVisible();
    // Insert the first option (Heading 1).
    await page.keyboard.press('Enter');
    await page.keyboard.type('Heading text');
    await assertHTML(
      page,
      html`
        <h1><span data-lexical-text="true">Heading text</span></h1>
      `,
      undefined,
      IGNORE,
    );
  });

  test('copy and paste round-trips text inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    // Wait until the editor's data-lexical-editor mount finishes so the
    // typed characters land on the shadow-internal contentEditable rather
    // than racing against the initial mount on CI.
    await page
      .locator('div[contenteditable="true"][data-lexical-editor="true"]')
      .waitFor();
    await page.keyboard.type('hi');
    // Wait until the typed text is reflected in the editor state and the
    // selection collapsed at the end of "hi". CI's faster timing races
    // selectAll/copy against the typing reconcile; local headless absorbs
    // it.
    await page
      .locator('div[contenteditable="true"][data-lexical-editor="true"]')
      .getByText('hi')
      .waitFor();
    await selectAll(page);
    // The copy guard in @lexical/clipboard reads selection through
    // getDOMSelectionPoints; without it the shadow host makes
    // isSelectionWithinEditor return false and the copy is dropped.
    const clipboard = await copyToClipboard(page);
    // Sanity: if the shadow-path copy guard ever regresses, surface that
    // here rather than letting paste become a silent no-op.
    expect(Object.keys(clipboard).length).toBeGreaterThan(0);
    // DIAGNOSTIC: surface clipboard payload sizes so CI failures can point
    // at the actual cause (empty lexical payload vs paste-side insertion).
    const clipboardDebug = await page.evaluate(
      data => ({
        htmlSlice: (data['text/html'] ?? '').slice(0, 200),
        lexicalRaw: data['application/x-lexical-editor'] ?? null,
        textPlain: data['text/plain'] ?? null,
        types: Object.keys(data),
      }),
      clipboard,
    );
    // eslint-disable-next-line no-console
    console.log('CLIPBOARD DEBUG:', JSON.stringify(clipboardDebug));
    // Re-focus the shadow-internal contentEditable: between the type and
    // moveToEditorEnd steps CI loses real focus to the shadow host
    // (document.activeElement = host DIV), so the Ctrl/Cmd+End keystroke
    // dispatched on the host never reaches the editor and selectAll's
    // full-text range stays put — making paste a destructive replace.
    await focusEditor(page);
    await moveToEditorEnd(page);
    // DIAGNOSTIC: editor state right before paste — confirms which element
    // paste should target and whether activeElement is the editor.
    const beforePasteDebug = await page.evaluate(() => {
      const findEditor = root => {
        const direct = root.querySelector(
          'div[contenteditable="true"][data-lexical-editor="true"]',
        );
        if (direct !== null) return direct;
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot !== null) {
            const inner = findEditor(el.shadowRoot);
            if (inner !== null) return inner;
          }
        }
        return null;
      };
      const editor = findEditor(document);
      const editorRoot = editor?.getRootNode();
      const sel = window.getSelection();
      let composedStart = null;
      let composedEnd = null;
      let composedStartNode = null;
      try {
        if (
          sel &&
          typeof sel.getComposedRanges === 'function' &&
          editorRoot !== null &&
          editorRoot !== document
        ) {
          const ranges = sel.getComposedRanges({shadowRoots: [editorRoot]});
          const r = ranges?.[0];
          if (r) {
            composedStart = r.startOffset;
            composedEnd = r.endOffset;
            composedStartNode = r.startContainer?.nodeName ?? null;
          }
        }
      } catch (_e) {
        // ignore
      }
      return {
        activeIsEditable: document.activeElement?.isContentEditable ?? null,
        activeMatchesLexical:
          document.activeElement?.matches?.('[data-lexical-editor]') ?? null,
        activeTag: document.activeElement?.tagName ?? null,
        composedEnd,
        composedStart,
        composedStartNode,
        editorInShadow: editorRoot !== null && editorRoot !== document,
        editorOuterStart: editor?.outerHTML?.slice(0, 200) ?? null,
        selAnchorOffset: sel?.anchorOffset ?? null,
        selFocusOffset: sel?.focusOffset ?? null,
        selIsCollapsed: sel?.isCollapsed ?? null,
        selRangeCount: sel?.rangeCount ?? null,
      };
    });
    // eslint-disable-next-line no-console
    console.log('BEFORE PASTE:', JSON.stringify(beforePasteDebug));
    await pasteFromClipboard(page, clipboard);
    // DIAGNOSTIC: editor innerHTML right after paste, before assertHTML
    // retries, so we see exactly what landed in the editor when CI fails.
    const afterPasteDebug = await page.evaluate(() => {
      const findEditor = root => {
        const direct = root.querySelector(
          'div[contenteditable="true"][data-lexical-editor="true"]',
        );
        if (direct !== null) return direct;
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot !== null) {
            const inner = findEditor(el.shadowRoot);
            if (inner !== null) return inner;
          }
        }
        return null;
      };
      const editor = findEditor(document);
      return {
        activeIsEditable: document.activeElement?.isContentEditable ?? null,
        activeTag: document.activeElement?.tagName ?? null,
        innerHTML: editor?.innerHTML?.slice(0, 400) ?? null,
      };
    });
    // eslint-disable-next-line no-console
    console.log('AFTER PASTE:', JSON.stringify(afterPasteDebug));
    await assertHTML(
      page,
      html`
        <p><span data-lexical-text="true">hihi</span></p>
      `,
      undefined,
      IGNORE,
    );
  });
});
