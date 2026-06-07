/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineEnd} from '../keyboardShortcuts/index.mjs';
import {
  click,
  expect,
  focusEditor,
  initialize,
  sleep,
  test,
} from '../utils/index.mjs';

// The other client. `focusEditor` and all the keyboard/click helpers act on the
// 'left' frame, so reading 'right' proves the slot host and its slot contents
// crossed the Yjs channel rather than only rendering locally.
function otherFrame(page) {
  return page.frame('right');
}

async function insertCard(page) {
  await page.keyboard.type('/card');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(300);
}

async function insertFigure(page) {
  await page.keyboard.type('/figure');
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(300);
}

function slotText(frame, name) {
  return frame.evaluate(n => {
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
  }, name);
}

function cardCount(frame) {
  return frame.evaluate(
    () => document.querySelectorAll('.lexical-card-node').length,
  );
}

function slotCount(frame, name) {
  return frame.evaluate(
    n => document.querySelectorAll(`[data-lexical-slot="${n}"]`).length,
    name,
  );
}

function figureCount(frame) {
  return frame.evaluate(
    () => document.querySelectorAll('.lexical-figure-node').length,
  );
}

function equationCount(frame) {
  return frame.evaluate(
    () =>
      document.querySelectorAll(
        '.lexical-figure-node [data-lexical-slot="media"] .editor-equation',
      ).length,
  );
}

test.describe('Named slot collaborative convergence', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    // Only meaningful with a second client; plain text has no slot hosts.
    test.skip(!isCollab);
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  test('an ElementNode slot host and its slot text converge to the other client', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);

    const right = otherFrame(page);
    await expect.poll(() => cardCount(right)).toBe(1);
    await expect.poll(() => slotCount(right, 'title')).toBe(1);
    await expect.poll(() => slotCount(right, 'body')).toBe(1);
    await expect.poll(() => slotText(right, 'title')).toBe('Title');
    await expect.poll(() => slotText(right, 'body')).toBe('Body');
  });

  test('editing slot text on one client converges to the other', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    const right = otherFrame(page);
    await expect.poll(() => slotText(right, 'title')).toBe('Title');

    await click(page, '[data-lexical-slot="title"]');
    await sleep(100);
    await moveToLineEnd(page);
    await page.keyboard.type('X');
    await sleep(120);

    await expect.poll(() => slotText(right, 'title')).toBe('TitleX');
    // The body slot must not have been disturbed by the title edit.
    await expect.poll(() => slotText(right, 'body')).toBe('Body');
  });

  test('a DecoratorNode slot host converges with its media slot intact', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertFigure(page);

    const right = otherFrame(page);
    await expect.poll(() => figureCount(right)).toBe(1);
    await expect.poll(() => equationCount(right)).toBe(1);
  });
});
