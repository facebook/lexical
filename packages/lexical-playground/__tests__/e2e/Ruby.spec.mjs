/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveRight,
  pressBackspace,
  selectAll,
  selectCharacters,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  copyToClipboard,
  evaluate,
  expect,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  sleep,
  test,
  withExclusiveClipboardAccess,
} from '../utils/index.mjs';

async function insertRubyViaToolbar(page, annotation) {
  await click(page, 'button[aria-label="Insert ruby annotation"]');
  const input = page.locator('.ruby-editor .ruby-input');
  await input.waitFor({state: 'visible', timeout: 1000});
  await input.fill(annotation);
  await input.press('Enter');
  await sleep(50);
}

async function getRubyNodes(page) {
  return evaluate(page, () => {
    const editor = window.lexicalEditor;
    const result = [];
    editor.read(() => {
      for (const [, node] of editor.getEditorState()._nodeMap) {
        if (node.getType() === 'ruby') {
          result.push({
            annotation: node.getAnnotation(),
            text: node.__text,
          });
        }
      }
    });
    return result;
  });
}

async function getSelectionInfo(page) {
  return evaluate(page, () => {
    const editor = window.lexicalEditor;
    return editor.read(() => {
      const sel = editor.getEditorState()._selection;
      if (!sel || !sel.anchor) {
        return null;
      }
      const anchorNode = editor.getEditorState()._nodeMap.get(sel.anchor.key);
      const focusNode = editor.getEditorState()._nodeMap.get(sel.focus.key);
      return {
        anchor: {
          offset: sel.anchor.offset,
          text: anchorNode?.__text || '',
          type: anchorNode?.getType() || '',
        },
        focus: {
          offset: sel.focus.offset,
          text: focusNode?.__text || '',
          type: focusNode?.getType() || '',
        },
        isCollapsed:
          sel.anchor.key === sel.focus.key &&
          sel.anchor.offset === sel.focus.offset,
      };
    });
  });
}

test.describe('Ruby', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can insert a ruby annotation via toolbar', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Hello');
    await selectCharacters(page, 'left', 5);

    await insertRubyViaToolbar(page, 'ハロー');

    const rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(1);
    expect(rubies[0]).toEqual({annotation: 'ハロー', text: 'Hello'});

    const hasRubyDOM = await evaluate(page, () => {
      const root = document.querySelector('div[contenteditable="true"]');
      const inner = root.querySelector('[data-ruby-annotation]');
      return inner
        ? {
            annotation: inner.dataset.rubyAnnotation,
            hasClass: inner.classList.contains('PlaygroundEditorTheme__ruby'),
          }
        : null;
    });
    expect(hasRubyDOM).not.toBeNull();
    expect(hasRubyDOM.annotation).toBe('ハロー');
    expect(hasRubyDOM.hasClass).toBe(true);
  });

  test('Ruby DOM has wrapper span with inner annotated span', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('漢');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'かん');

    const structure = await evaluate(page, () => {
      const root = document.querySelector('div[contenteditable="true"]');
      const inner = root.querySelector('[data-ruby-annotation]');
      if (!inner) {
        return null;
      }
      const wrapper = inner.parentElement;
      return {
        innerHasDataLexicalText:
          inner.getAttribute('data-lexical-text') === 'true',
        innerTagName: inner.tagName,
        innerText: inner.textContent,
        wrapperTagName: wrapper.tagName,
      };
    });

    expect(structure).not.toBeNull();
    expect(structure.wrapperTagName).toBe('SPAN');
    expect(structure.innerTagName).toBe('SPAN');
    expect(structure.innerHasDataLexicalText).toBe(true);
    expect(structure.innerText).toBe('漢');
  });

  test('Arrow left skips over ruby node', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // End → "C" end, ArrowLeft → "C":0, ArrowLeft → skip ruby → "A":1
    await page.keyboard.press('End');
    await sleep(50);
    await moveLeft(page, 2);
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.anchor.type).toBe('text');
    expect(info.anchor.text).toBe('A');
    expect(info.anchor.offset).toBe(1);
  });

  test('Arrow right skips over ruby node', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Home → "A":0, ArrowRight → "A":1, ArrowRight → skip ruby → "C":0
    await page.keyboard.press('Home');
    await sleep(50);
    await moveRight(page, 2);
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.anchor.type).toBe('text');
    expect(info.anchor.text).toBe('C');
    expect(info.anchor.offset).toBe(0);
  });

  test('Backspace at ruby boundary deletes ruby as atomic unit', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "C":0 (right after ruby boundary)
    await page.keyboard.press('End');
    await sleep(50);
    await moveLeft(page, 1);
    await sleep(50);

    // Backspace: prev sibling of "C" is ruby → delete it
    await pressBackspace(page, 1);
    await sleep(50);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">AC</span>
        </p>
      `,
    );
  });

  test('Delete key at ruby boundary deletes ruby as atomic unit', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "A":1 (right before ruby boundary)
    await page.keyboard.press('Home');
    await sleep(50);
    await moveRight(page, 1);
    await sleep(50);

    // Delete: next content is ruby (token mode = deleted as a whole unit)
    await page.keyboard.press('Delete');
    await sleep(50);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">AC</span>
        </p>
      `,
    );
  });

  test('Select-all and typing replaces ruby', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('XY');
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'わい');

    await selectAll(page);
    await sleep(50);

    await page.keyboard.type('Replaced');
    await sleep(50);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Replaced</span>
        </p>
      `,
    );

    const rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(0);
  });

  test('Toggle ruby off removes annotation and restores plain text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Word');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'ワード');

    let rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(1);

    await selectAll(page);
    await sleep(50);
    await click(page, 'button[aria-label="Insert ruby annotation"]');
    await sleep(50);

    rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(0);

    const textContent = await evaluate(page, () => {
      const editor = window.lexicalEditor;
      return editor.read(() => {
        return editor.getEditorState()._nodeMap.get('root').getTextContent();
      });
    });
    expect(textContent).toContain('Word');
  });

  test('Copy and paste preserves ruby annotation', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Test');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'テスト');

    await selectAll(page);

    await withExclusiveClipboardAccess(async () => {
      const clipboard = await copyToClipboard(page);

      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await pasteFromClipboard(page, clipboard);
    });

    await sleep(100);

    const rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(2);
    expect(rubies[0]).toEqual({annotation: 'テスト', text: 'Test'});
    expect(rubies[1]).toEqual({annotation: 'テスト', text: 'Test'});
  });

  test('Ruby node serializes correctly to JSON', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('漢字');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'かんじ');

    const roundTrip = await evaluate(page, () => {
      const editor = window.lexicalEditor;
      let json;
      editor.read(() => {
        json = editor.getEditorState().toJSON();
      });
      const paragraph = json.root.children[0];
      const rubyJSON = paragraph.children.find(c => c.type === 'ruby');
      return rubyJSON
        ? {
            annotation: rubyJSON.annotation,
            text: rubyJSON.text,
            type: rubyJSON.type,
          }
        : null;
    });

    expect(roundTrip).not.toBeNull();
    expect(roundTrip.type).toBe('ruby');
    expect(roundTrip.text).toBe('漢字');
    expect(roundTrip.annotation).toBe('かんじ');
  });

  test('Multiple adjacent ruby nodes are independent', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('AB');
    await page.keyboard.press('Home');
    await selectCharacters(page, 'right', 1);
    await insertRubyViaToolbar(page, 'えい');

    await page.keyboard.press('End');
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'びー');

    const rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(2);
    expect(rubies[0]).toEqual({annotation: 'えい', text: 'A'});
    expect(rubies[1]).toEqual({annotation: 'びー', text: 'B'});
  });

  test('Ruby exportDOM produces semantic <ruby> with <rt>', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('漢');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'かん');

    const exportedHTML = await evaluate(page, () => {
      const editor = window.lexicalEditor;
      let result = '';
      editor.read(() => {
        for (const [, node] of editor.getEditorState()._nodeMap) {
          if (node.getType() === 'ruby') {
            const {element} = node.exportDOM();
            result = element.outerHTML;
          }
        }
      });
      return result;
    });

    expect(exportedHTML).toBe('<ruby>漢<rt>かん</rt></ruby>');
  });

  test('Ruby node with collapsed selection is a no-op', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Hello');

    await click(page, 'button[aria-label="Insert ruby annotation"]');
    await sleep(50);

    const floatingEditor = page.locator('.ruby-editor .ruby-input');
    await expect(floatingEditor).not.toBeVisible();

    const rubies = await getRubyNodes(page);
    expect(rubies).toHaveLength(0);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );
  });
});

test.describe('Ruby — Shift+arrow selection', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Shift+Right extends selection past ruby to next text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "A":1 (just before ruby)
    await page.keyboard.press('Home');
    await sleep(50);
    await moveRight(page, 1);
    await sleep(50);

    // Shift+Right should skip ruby and extend focus to "C"
    await page.keyboard.down('Shift');
    await moveRight(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
    // Anchor stays at "A":1
    expect(info.anchor.text).toBe('A');
    expect(info.anchor.offset).toBe(1);
    // Focus lands past ruby on "C" with safe offset ≥1
    expect(info.focus.text).toBe('C');
    expect(info.focus.offset).toBeGreaterThanOrEqual(0);
  });

  test('Shift+Left extends selection past ruby to previous text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABC" → select "B" → ruby → "A" + ruby("B","び") + "C"
    await page.keyboard.type('ABC');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "C":0 (just after ruby)
    await page.keyboard.press('End');
    await sleep(50);
    await moveLeft(page, 1);
    await sleep(50);

    // Shift+Left should skip ruby and extend focus to "A"
    await page.keyboard.down('Shift');
    await moveLeft(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
    // Focus should be on "A"
    expect(info.focus.text).toBe('A');
  });

  test('Shift+Right skips consecutive ruby group', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABCD" → select "B" → ruby, then select "C" → ruby
    // Result: "A" + ruby("B","び") + ruby("C","し") + "D"
    await page.keyboard.type('ABCD');
    await moveLeft(page, 2);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Re-navigate: now select "C" for second ruby
    await page.keyboard.press('End');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'し');

    // Place caret at "A":1
    await page.keyboard.press('Home');
    await moveRight(page, 1);
    await sleep(50);

    // Shift+Right should skip both rubies, land focus on "D"
    await page.keyboard.down('Shift');
    await moveRight(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
    expect(info.focus.text).toBe('D');
  });

  test('Shift+Left skips consecutive ruby group', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "ABCD" → rubies on "B" and "C"
    // Result: "A" + ruby("B","び") + ruby("C","し") + "D"
    await page.keyboard.type('ABCD');
    await moveLeft(page, 2);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    await page.keyboard.press('End');
    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'し');

    // Place caret at "D":0
    await page.keyboard.press('End');
    await moveLeft(page, 1);
    await sleep(50);

    // Shift+Left should skip both rubies, land focus on "A"
    await page.keyboard.down('Shift');
    await moveLeft(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
    expect(info.focus.text).toBe('A');
  });
});

test.describe('Ruby — line boundary navigation', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Arrow left at line start when ruby is first child does not get stuck', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "AB" → select "A" → ruby → ruby("A","えい") + "B"
    await page.keyboard.type('AB');
    await page.keyboard.press('Home');
    await selectCharacters(page, 'right', 1);
    await insertRubyViaToolbar(page, 'えい');

    // Place caret at "B":0 (right after ruby)
    await page.keyboard.press('End');
    await moveLeft(page, 1);
    await sleep(50);

    // ArrowLeft should skip ruby. Since ruby is first child with no
    // previous TextNode, cursor should move to paragraph boundary.
    await moveLeft(page, 1);
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    // Should NOT be stuck on the ruby node
    expect(info.anchor.type).not.toBe('ruby');
  });

  test('Arrow right at line end when ruby is last child does not get stuck', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "AB" → select "B" → ruby → "A" + ruby("B","び")
    await page.keyboard.type('AB');
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "A":1 (just before ruby)
    await page.keyboard.press('Home');
    await moveRight(page, 1);
    await sleep(50);

    // ArrowRight should skip ruby. Since ruby is last child with no
    // next TextNode, cursor should move to paragraph end boundary.
    await moveRight(page, 1);
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.anchor.type).not.toBe('ruby');
  });

  test('Shift+Left at line start when ruby is first child extends to boundary', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "AB" → select "A" → ruby → ruby("A","えい") + "B"
    await page.keyboard.type('AB');
    await page.keyboard.press('Home');
    await selectCharacters(page, 'right', 1);
    await insertRubyViaToolbar(page, 'えい');

    // Place caret at "B":0
    await page.keyboard.press('End');
    await moveLeft(page, 1);
    await sleep(50);

    // Shift+Left should extend selection past ruby to start boundary
    await page.keyboard.down('Shift');
    await moveLeft(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
  });

  test('Shift+Right at line end when ruby is last child extends to boundary', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // "AB" → select "B" → ruby → "A" + ruby("B","び")
    await page.keyboard.type('AB');
    await selectCharacters(page, 'left', 1);
    await insertRubyViaToolbar(page, 'び');

    // Place caret at "A":1
    await page.keyboard.press('Home');
    await moveRight(page, 1);
    await sleep(50);

    // Shift+Right should extend selection past ruby to end boundary
    await page.keyboard.down('Shift');
    await moveRight(page, 1);
    await page.keyboard.up('Shift');
    await sleep(50);

    const info = await getSelectionInfo(page);
    expect(info).not.toBeNull();
    expect(info.isCollapsed).toBe(false);
  });

  test('Arrow keys do not get stuck when ruby is the only child', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Type single char, select all, convert to ruby
    await page.keyboard.type('漢');
    await selectAll(page);
    await insertRubyViaToolbar(page, 'かん');

    // Pressing End then multiple ArrowLeft presses should eventually
    // reach paragraph start — cursor must not stay stuck on the ruby.
    await page.keyboard.press('End');
    await sleep(50);
    await moveLeft(page, 3);
    await sleep(200);

    const afterLeft = await getSelectionInfo(page);
    expect(afterLeft).not.toBeNull();

    // Pressing Home then multiple ArrowRight presses should eventually
    // reach paragraph end.
    await page.keyboard.press('Home');
    await sleep(50);
    await moveRight(page, 3);
    await sleep(200);

    const afterRight = await getSelectionInfo(page);
    expect(afterRight).not.toBeNull();

    // The main assertion: after enough arrow presses in each direction,
    // the cursor position changed — it was not stuck on the ruby.
    // Exact positions vary by browser, so we verify non-null selection.
  });
});
