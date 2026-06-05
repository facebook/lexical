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
  evaluate,
  expect,
  focusEditor,
  initialize,
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
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Delete');
    await sleep(120);
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
