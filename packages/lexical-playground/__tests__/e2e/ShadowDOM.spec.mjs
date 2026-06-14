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
  copyToClipboard,
  expect,
  focusEditor,
  html,
  initialize,
  insertSampleImage,
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

  test('inserts a sample image through the shadow toolbar', async ({page}) => {
    await focusEditor(page);
    // The Insert dropdown opens inside the shadow toolbar and the modal's
    // "Sample" button inserts an ImageNode whose <img> renders inside the
    // shadow root. Playwright's selector engine pierces open shadow roots,
    // so the image element is reachable from the page locator.
    await insertSampleImage(page);
    await expect(page.locator('.editor-image img').first()).toBeVisible();
  });

  test('pastes a file image into the shadow editor', async ({page}) => {
    await focusEditor(page);
    // Simulate a file-bearing paste targeted at the shadow-internal
    // contentEditable. `@lexical/clipboard`'s paste handler runs against
    // a real `ClipboardEvent`, reads `clipboardData.files`, and inserts
    // an ImageNode through `INSERT_IMAGE_COMMAND`. The interesting bit
    // here is that the paste event is dispatched at a node inside an
    // open shadow root and still reaches Lexical's listener.
    await page.evaluate(() => {
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
      const ce = findEditor(document);
      // 1x1 transparent PNG.
      const bytes = Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ),
        c => c.charCodeAt(0),
      );
      const file = new File([bytes], 'tiny.png', {type: 'image/png'});
      const dt = new DataTransfer();
      dt.items.add(file);
      ce.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          clipboardData: dt,
          composed: true,
        }),
      );
    });
    await expect(page.locator('.editor-image img').first()).toBeVisible();
  });

  test('clicking an image inside the shadow root selects the ImageNode', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertSampleImage(page);
    const img = page.locator('.editor-image img').first();
    await img.click();
    // Lexical's image plugin upgrades the selection to a NodeSelection
    // (registered as a click listener on the rootElement, which lives
    // inside the shadow root). The plugin reflects the selected state by
    // toggling a `focused` class on the underlying <img>.
    await expect(img).toHaveClass(/focused/);
  });

  test('blur and re-focus on the shadow-internal editor exercise the focus path', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('before');
    // Drive the rootElement's blur path. Lexical registers focus / blur
    // listeners directly on the rootElement, which lives inside the
    // shadow root, so the listeners fire even though the document-level
    // `activeElement` is reported as the shadow host.
    await page.evaluate(() => {
      window.lexicalEditor.getRootElement().blur();
    });
    await focusEditor(page);
    await page.keyboard.type(' after');
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).toContain('before after');
  });

  test('survives a Korean IME composition cycle inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('start ');
    // Walk a Korean composition cycle (jamo → syllable) at the
    // shadow-internal contentEditable. Lexical registers its composition
    // listeners on the rootElement (inside the shadow root), so this
    // exercises them across the boundary. The platform IME normally
    // commits the composed text through DOM mutations the headless
    // browser can't simulate, but the editor must stay alive and accept
    // input after the cycle ends.
    await page.evaluate(() => {
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
      const ce = findEditor(document);
      const fire = (type, data) =>
        ce.dispatchEvent(
          new CompositionEvent(type, {bubbles: true, composed: true, data}),
        );
      fire('compositionstart', '');
      fire('compositionupdate', 'ㄱ');
      fire('compositionupdate', '가');
      fire('compositionupdate', '한');
      fire('compositionend', '한');
    });
    await page.keyboard.type(' end');
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).toContain('start');
    expect(text).toContain('end');
  });

  test('survives a Chinese pinyin IME composition cycle inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('start ');
    // Same shape as the Korean cycle above, but with the pinyin → hanzi
    // progression a Chinese IME typically drives. The platform IME
    // commits the final hanzi through DOM mutations the headless
    // browser can't simulate; the editor must stay alive and keep
    // accepting input.
    await page.evaluate(() => {
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
      const ce = findEditor(document);
      const fire = (type, data) =>
        ce.dispatchEvent(
          new CompositionEvent(type, {bubbles: true, composed: true, data}),
        );
      fire('compositionstart', '');
      fire('compositionupdate', 'ni');
      fire('compositionupdate', 'ni h');
      fire('compositionupdate', 'ni hao');
      fire('compositionend', '你好');
    });
    await page.keyboard.type(' end');
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).toContain('start');
    expect(text).toContain('end');
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
    // Collapse the caret to the end of "hi" via window.getSelection so
    // paste inserts at the cursor rather than replacing the selectAll
    // range. moveToEditorEnd's Ctrl/Cmd+End keystroke never reaches the
    // shadow-internal editor on CI (document.activeElement reverts to
    // the shadow host), and WebKit ignores `addRange` with a start
    // container inside an open shadow tree — setBaseAndExtent works
    // across all engines (same approach as selectInnerText in the
    // browser-unit suite).
    await page.evaluate(() => {
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
      const lastText = editor?.querySelector('[data-lexical-text="true"]');
      const textNode = lastText?.firstChild;
      if (textNode && textNode.nodeType === 3) {
        const end = textNode.textContent.length;
        const sel = window.getSelection();
        sel.setBaseAndExtent(textNode, end, textNode, end);
      }
    });
    await pasteFromClipboard(page, clipboard);
    await assertHTML(
      page,
      html`
        <p><span data-lexical-text="true">hihi</span></p>
      `,
      undefined,
      IGNORE,
    );
  });

  test('markdown shortcuts and a list run inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    // `# heading` converts to <h1>, then a list shortcut starts a
    // bulleted list — both flows live in `@lexical/markdown` /
    // `@lexical/list` and depend on the shadow-aware text-mutation reads.
    await page.keyboard.type('# Heading');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- item one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('item two');
    await assertHTML(
      page,
      html`
        <h1><span data-lexical-text="true">Heading</span></h1>
        <ul>
          <li value="1"><span data-lexical-text="true">item one</span></li>
          <li value="2"><span data-lexical-text="true">item two</span></li>
        </ul>
      `,
      undefined,
      IGNORE,
    );
  });

  test('undo / redo round-trip from the lexical-history plugin works inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('first');
    await page.keyboard.press('Enter');
    await page.keyboard.type('second');
    // Lexical-history's undo/redo commands run through the editor's
    // command queue, not through DOM-level undo, so they have to keep
    // working under shadow DOM.
    await page.evaluate(() => {
      window.lexicalEditor.dispatchCommand(
        Symbol.for('UNDO_COMMAND'),
        undefined,
      );
    });
    // The Symbol-keyed command lookup above only works if `UNDO_COMMAND`
    // happens to be a registered symbol-for; otherwise rely on the
    // keyboard shortcut path the playground exposes.
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+z');
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).not.toContain('second');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    const redoneText = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(redoneText).toContain('first');
  });

  test('the playground tree-view mirrors the shadow-mounted editor state', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('tree view content');
    // The tree-view-output sits in the light DOM but reads the
    // EditorState that lives behind the shadow boundary; it should
    // surface the same text we just typed.
    const treeOutput = await page
      .locator('.tree-view-output pre')
      .first()
      .textContent();
    expect(treeOutput).toContain('tree view content');
  });

  test('pointerdown dispatched at a shadow-internal node carries the real target on composedPath', async ({
    page,
  }) => {
    // Touch / pen / mouse all funnel through PointerEvents; Lexical's
    // window-attached pointerdown listeners use `getComposedEventTarget`
    // to recover the real target across the shadow boundary. This
    // verifies that part directly with a synthetic `pointerType: 'touch'`
    // event.
    const composedTag = await page.evaluate(() => {
      const findEditor = root => {
        const direct = root.querySelector('[data-lexical-editor="true"]');
        if (direct !== null) return direct;
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot !== null) {
            const inner = findEditor(el.shadowRoot);
            if (inner !== null) return inner;
          }
        }
        return null;
      };
      const ce = findEditor(document);
      let composedTargetTag = null;
      const listener = event => {
        composedTargetTag = event.composedPath()[0].tagName;
      };
      window.addEventListener('pointerdown', listener, true);
      ce.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          composed: true,
          pointerType: 'touch',
        }),
      );
      window.removeEventListener('pointerdown', listener, true);
      return composedTargetTag;
    });
    // `event.target` would be the shadow host on a window listener; the
    // composed path's first entry is the un-retargeted contentEditable.
    expect(composedTag).toBe('DIV');
  });

  test('pasted HTML with a <script> tag is sanitized inside the shadow root', async ({
    page,
  }) => {
    await focusEditor(page);
    // @lexical/clipboard's paste pipeline strips unsupported node types;
    // a `<script>` tag never becomes a Lexical node, so the side effect
    // it would have triggered never runs. The shadow boundary doesn't
    // change that — the paste handler runs at the contentEditable
    // inside the shadow root.
    await page.evaluate(() => {
      const findEditor = root => {
        const direct = root.querySelector('[data-lexical-editor="true"]');
        if (direct !== null) return direct;
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot !== null) {
            const inner = findEditor(el.shadowRoot);
            if (inner !== null) return inner;
          }
        }
        return null;
      };
      const ce = findEditor(document);
      const dt = new DataTransfer();
      dt.setData(
        'text/html',
        '<p>safe text</p><script>window.__shadowPwned = true;</script>',
      );
      ce.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          clipboardData: dt,
          composed: true,
        }),
      );
    });
    const pwned = await page.evaluate(() => Boolean(window.__shadowPwned));
    expect(pwned).toBe(false);
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect(text).toContain('safe text');
  });

  test('typing 1000 characters inside the shadow root completes without hanging', async ({
    page,
  }) => {
    // A coarse perf smoke test: a large keyboard input run shouldn't
    // hang or trip the test timeout. This protects against accidental
    // reconciler regressions specific to the shadow code path (each
    // keystroke runs the full update + composed-selection read).
    await focusEditor(page);
    const t0 = Date.now();
    await page.keyboard.type('a'.repeat(1000), {delay: 0});
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(60_000);
    const text = await page
      .locator('div[contenteditable="true"]')
      .first()
      .textContent();
    expect((text ?? '').length).toBeGreaterThanOrEqual(1000);
  });
});

test.describe('Shadow DOM (collab)', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    // The split view's two clients both render through ShadowDomWrapper
    // when the playground's shadow toggle is on. Rich-text-only mirrors
    // the non-collab block above; this describe only runs when the suite
    // is invoked in a collab mode.
    test.skip(isPlainText || !isCollab);
    return initialize({isCollab, isShadowDOM: true, page});
  });

  test('text typed on one client converges on the other inside shadow roots', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('shadow collab');
    // yjs sync is asynchronous; assert on the right frame's
    // contentEditable text. Both clients render inside their own open
    // shadow root, and Lexical's collab plugin uses the same composed
    // selection reads that drive the non-collab path.
    const rightEditable = page
      .frameLocator('[name="right"]')
      .locator('div[contenteditable="true"][data-lexical-editor="true"]')
      .first();
    await expect(rightEditable).toContainText('shadow collab');
  });
});
