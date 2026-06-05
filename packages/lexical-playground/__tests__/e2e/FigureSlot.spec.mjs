/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  click,
  doubleClick,
  evaluate,
  expect,
  focusEditor,
  initialize,
  sleep,
  test,
} from '../utils/index.mjs';

async function insertFigure(page) {
  await page.keyboard.type('/figure');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(300);
}

async function figureCount(page) {
  return evaluate(
    page,
    () => document.querySelectorAll('.lexical-figure-node').length,
  );
}

async function selectedFigureCount(page) {
  return evaluate(
    page,
    () =>
      document.querySelectorAll('.lexical-figure-node[data-selected="true"]')
        .length,
  );
}

async function equationCount(page) {
  return evaluate(
    page,
    () =>
      document.querySelectorAll(
        '.lexical-figure-node [data-lexical-slot="media"] .editor-equation',
      ).length,
  );
}

async function equationEditorOpen(page) {
  return evaluate(
    page,
    () => document.querySelectorAll('.EquationEditor_blockEditor').length > 0,
  );
}

test.describe('Figure atomic decorator slot', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  test('insert renders one figure host with an equation in the media slot', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);
    expect(await figureCount(page)).toBe(1);
    expect(await equationCount(page)).toBe(1);
  });

  test('ArrowRight from the preceding paragraph selects the whole figure', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);
    // Insert leaves an empty paragraph before the figure and the caret in the
    // empty paragraph after it. Place the caret in the leading paragraph, then
    // step forward onto the figure boundary.
    await click(page, 'div[contenteditable="true"] > p:first-child');
    await sleep(100);
    await page.keyboard.press('ArrowRight');
    await sleep(120);
    expect(await selectedFigureCount(page)).toBe(1);
    // The caret stepped over the atom rather than into the slot: the equation
    // editor never opened.
    expect(await equationEditorOpen(page)).toBe(false);
  });

  test('ArrowLeft from the following paragraph selects the whole figure', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);
    // Caret already sits in the empty paragraph after the figure.
    await page.keyboard.press('ArrowLeft');
    await sleep(120);
    expect(await selectedFigureCount(page)).toBe(1);
    expect(await equationEditorOpen(page)).toBe(false);
  });

  test('clicking the figure selects the whole figure, not the equation alone', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);
    await click(page, '.lexical-figure-node [data-lexical-slot="media"]');
    await sleep(120);
    expect(await selectedFigureCount(page)).toBe(1);
    expect(await equationEditorOpen(page)).toBe(false);
  });

  test('Backspace on the selected figure removes it', async ({page}) => {
    await focusEditor(page);
    await insertFigure(page);
    await page.keyboard.press('ArrowLeft');
    await sleep(120);
    expect(await selectedFigureCount(page)).toBe(1);
    await page.keyboard.press('Backspace');
    await sleep(120);
    expect(await figureCount(page)).toBe(0);
  });

  test('double-click still opens the equation editor', async ({page}) => {
    await focusEditor(page);
    await insertFigure(page);
    await doubleClick(
      page,
      '.lexical-figure-node [data-lexical-slot="media"] .editor-equation',
    );
    await sleep(150);
    expect(await equationEditorOpen(page)).toBe(true);
  });

  test('arrow keys move the caret inside the equation editor, not trapped by the figure', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);
    await doubleClick(
      page,
      '.lexical-figure-node [data-lexical-slot="media"] .editor-equation',
    );
    await sleep(150);
    expect(await equationEditorOpen(page)).toBe(true);
    // Place the caret at offset 3 inside the LaTeX textarea, then press
    // ArrowLeft. If the figure traps the key (a lexical arrow handler runs
    // against the host's NodeSelection and preventDefaults), the textarea
    // caret stays put or the editor closes; it should move to offset 2.
    await evaluate(page, () => {
      const ta = document.querySelector('.EquationEditor_blockEditor');
      ta.focus();
      ta.setSelectionRange(3, 3);
    });
    await sleep(60);
    await page.keyboard.press('ArrowLeft');
    await sleep(80);
    expect(await equationEditorOpen(page)).toBe(true);
    const caretAfterLeft = await evaluate(page, () => {
      const ta = document.querySelector('.EquationEditor_blockEditor');
      return ta ? ta.selectionStart : -1;
    });
    expect(caretAfterLeft).toBe(2);
    // Up / down are also trapped by the same NodeSelection arrow handler.
    // ArrowUp on the single-line LaTeX moves the native caret to line start.
    await evaluate(page, () => {
      const ta = document.querySelector('.EquationEditor_blockEditor');
      ta.focus();
      ta.setSelectionRange(3, 3);
    });
    await sleep(60);
    await page.keyboard.press('ArrowUp');
    await sleep(80);
    expect(await equationEditorOpen(page)).toBe(true);
    const caretAfterUp = await evaluate(page, () => {
      const ta = document.querySelector('.EquationEditor_blockEditor');
      return ta ? ta.selectionStart : -1;
    });
    expect(caretAfterUp).toBe(0);
  });
});
