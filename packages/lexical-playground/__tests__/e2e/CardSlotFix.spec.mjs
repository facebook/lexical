/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToLineBeginning,
  moveToLineEnd,
} from '../keyboardShortcuts/index.mjs';
import {
  click,
  copyToClipboard,
  evaluate,
  expect,
  focusEditor,
  initialize,
  pasteFromClipboard,
  sleep,
  test,
} from '../utils/index.mjs';

async function insertCard(page) {
  await page.keyboard.type('/card');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(300);
}

// Paragraphs within a slot are joined with a marker so multi-paragraph
// states are unambiguous; an empty slot yields ''.
const PARA = '⏎';

async function slotText(page, name) {
  return evaluate(
    page,
    n => {
      const slot = document.querySelector(`[data-lexical-slot="${n}"]`);
      if (!slot) {
        return null;
      }
      return Array.from(
        slot.querySelectorAll('p.PlaygroundEditorTheme__paragraph'),
      )
        .map(p =>
          Array.from(p.querySelectorAll('span[data-lexical-text="true"]'))
            .map(s => s.textContent)
            .join(''),
        )
        .join('⏎');
    },
    name,
  );
}

async function cardCount(page) {
  return evaluate(
    page,
    () => document.querySelectorAll('.lexical-card-node').length,
  );
}

async function selectedCardCount(page) {
  return evaluate(
    page,
    () =>
      document.querySelectorAll('.lexical-card-node[data-selected="true"]')
        .length,
  );
}

async function slotCount(page, name) {
  return evaluate(
    page,
    n => document.querySelectorAll(`[data-lexical-slot="${n}"]`).length,
    name,
  );
}

async function assertCardIntact(page, {title, body}) {
  expect(await cardCount(page)).toBe(1);
  expect(await slotCount(page, 'title')).toBe(1);
  expect(await slotCount(page, 'body')).toBe(1);
  expect(await slotText(page, 'title')).toBe(title);
  expect(await slotText(page, 'body')).toBe(body);
}

test.describe('Card slot deletion boundaries', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  // --- Boundary no-op cases: the card must stay structurally intact ---

  test('backspace at empty title-slot start is a no-op', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    // Empty the slot with the same caret-then-single-key pattern the other
    // boundary tests use; the Meta+a variant flaked in CI.
    await moveToLineEnd(page);
    for (let i = 0; i < 'Title'.length; i++) {
      await page.keyboard.press('Backspace');
    }
    await sleep(120);
    expect(await slotText(page, 'title')).toBe('');
    // Caret is now at the empty slot start: this backspace must be a no-op.
    await page.keyboard.press('Backspace');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: ''});
  });

  test('backspace at non-empty title-slot start is a no-op', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineBeginning(page);
    await page.keyboard.press('Backspace');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'Title'});
  });

  test('backspace at body-slot start is a no-op, title intact', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="body"]');
    await sleep(100);
    await moveToLineBeginning(page);
    await page.keyboard.press('Backspace');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'Title'});
  });

  test('forward-delete at title-slot end is a no-op', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.press('Delete');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'Title'});
  });

  test('forward-delete at body-slot end (last slot) is a no-op', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="body"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.press('Delete');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'Title'});
  });

  // --- Intra-slot deletion: ordinary editing within a slot must still work ---

  test('backspace deletes one char within title slot', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.press('Backspace');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'Titl'});
  });

  test('forward-delete one char within body slot', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="body"]');
    await sleep(100);
    await moveToLineBeginning(page);
    await page.keyboard.press('Delete');
    await sleep(120);
    await assertCardIntact(page, {body: 'ody', title: 'Title'});
  });

  test('backspace at 2nd-paragraph start merges within slot', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('SECOND');
    await sleep(120);
    // Two paragraphs in the title slot before the merge.
    expect(await slotText(page, 'title')).toBe(`Title${PARA}SECOND`);
    await moveToLineBeginning(page);
    await page.keyboard.press('Backspace');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'TitleSECOND'});
  });

  test('forward-delete at 1st-paragraph end merges within slot', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('SECOND');
    await sleep(120);
    expect(await slotText(page, 'title')).toBe(`Title${PARA}SECOND`);
    await page.keyboard.press('ArrowUp');
    await moveToLineEnd(page);
    await page.keyboard.press('Delete');
    await sleep(120);
    await assertCardIntact(page, {body: 'Body', title: 'TitleSECOND'});
  });
});

test.describe('Card HTML serialization round-trip', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  test('copying a card and pasting it as HTML-only rebuilds its slots', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await assertCardIntact(page, {body: 'Body', title: 'Title'});

    // Select the whole card through its chrome — the 12px padding outside the
    // slots, which CardExtension promotes to a NodeSelection. A click in the
    // slot interior would drop the caret inside the slot instead.
    await click(page, '.lexical-card-node', {position: {x: 6, y: 6}});
    await sleep(100);

    const clipboard = await copyToClipboard(page);
    // Export side: each slot rides in its own named wrapper, the explicit
    // serialization from CardNode.exportDOM.
    expect(clipboard['text/html']).toContain('data-lexical-slot="title"');
    expect(clipboard['text/html']).toContain('data-lexical-slot="body"');

    // Drop the whole card, then paste HTML-only. The clipboard also carries
    // lexical JSON, which paste would prefer; passing text/html alone forces
    // the DOMImportExtension card rule — the import path this change adds.
    await page.keyboard.press('Backspace');
    await sleep(120);
    expect(await cardCount(page)).toBe(0);
    await pasteFromClipboard(page, {'text/html': clipboard['text/html']});
    await sleep(200);

    await assertCardIntact(page, {body: 'Body', title: 'Title'});
  });
});

test.describe('Card host data-selected mirroring', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  // CardNode and FigureNode both register the shared
  // NodeSelectionDataSelectedExtension under one name, each contributing its
  // own node type. The two `nodes` arrays must concatenate during config
  // merge; a plain shallow merge would let the last contributor win and the
  // Card host would never mirror its selection. This guards the Card side
  // (FigureSlot guards the Figure side, so the pair covers the merge).
  test('selecting a card sets data-selected on its host', async ({page}) => {
    await focusEditor(page);
    await insertCard(page);
    expect(await selectedCardCount(page)).toBe(0);
    // Click the chrome (the 12px padding outside the slots) to promote the
    // whole card to a NodeSelection.
    await click(page, '.lexical-card-node', {position: {x: 6, y: 6}});
    await sleep(120);
    expect(await selectedCardCount(page)).toBe(1);
  });
});
