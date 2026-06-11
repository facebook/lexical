/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts/index.mjs';
import {
  click,
  evaluate,
  expect,
  focusEditor,
  initialize,
  sleep,
  test,
  waitForSelector,
} from '../utils/index.mjs';

async function insertPullQuote(page) {
  await page.keyboard.type('/pull');
  await waitForSelector(page, '.typeahead-popover');
  await page.keyboard.press('Enter');
}

async function slotText(page, name) {
  return evaluate(
    page,
    n => {
      const wrapper = document.querySelector(`[data-lexical-slot="${n}"]`);
      if (!wrapper) {
        return null;
      }
      return Array.from(
        wrapper.querySelectorAll('p.PlaygroundEditorTheme__paragraph'),
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

async function pullquoteCount(page) {
  return evaluate(
    page,
    () => document.querySelectorAll('.lexical-pullquote-node').length,
  );
}

async function selectedPullquoteCount(page) {
  return evaluate(
    page,
    () =>
      document.querySelectorAll('.lexical-pullquote-node[data-selected="true"]')
        .length,
  );
}

test.describe('PullQuote slot host', () => {
  test.beforeEach(async ({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
  });

  test('inserts a PullQuote with two seeded editable slots', async ({page}) => {
    await focusEditor(page);
    await insertPullQuote(page);

    expect(await pullquoteCount(page)).toBe(1);
    expect(await slotText(page, 'quote')).toContain('discover the limits');
    expect(await slotText(page, 'attribution')).toBe('Arthur C. Clarke');
  });

  test('typing inside the quote slot replaces only its text', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPullQuote(page);

    await click(page, '[data-lexical-slot="quote"] p');
    await sleep(100);
    await selectAll(page);
    await sleep(120);
    await page.keyboard.type('A new quote');
    await sleep(120);

    expect(await slotText(page, 'quote')).toBe('A new quote');
    expect(await slotText(page, 'attribution')).toBe('Arthur C. Clarke');
  });

  test('typing inside the attribution slot replaces only its text', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPullQuote(page);

    await click(page, '[data-lexical-slot="attribution"] p');
    await sleep(100);
    await selectAll(page);
    await sleep(120);
    await page.keyboard.type('Someone Else');
    await sleep(120);

    expect(await slotText(page, 'attribution')).toBe('Someone Else');
    expect(await slotText(page, 'quote')).toContain('discover the limits');
  });

  // Clicking the chrome (the padding outside both slot wrappers) promotes
  // the whole PullQuote to a NodeSelection — mirrored onto the host DOM
  // via `data-selected="true"` by NodeSelectionDataSelectedExtension.
  test('chrome click sets data-selected on the host', async ({page}) => {
    await focusEditor(page);
    await insertPullQuote(page);

    expect(await selectedPullquoteCount(page)).toBe(0);
    await click(page, '.lexical-pullquote-node', {position: {x: 4, y: 4}});
    await sleep(120);
    expect(await selectedPullquoteCount(page)).toBe(1);
  });

  // Clicking inside either slot wrapper must drop the caret in the slot,
  // not promote to a whole-PullQuote NodeSelection. The reconciler scaffold
  // wrapper is keyless, so without the explicit guard in
  // `$resolveChromeTarget` the click would resolve to the PullQuote host
  // and steal focus from the slot the user just clicked into.
  test('slot wrapper click stays in the slot', async ({page}) => {
    await focusEditor(page);
    await insertPullQuote(page);

    await click(page, '[data-lexical-slot="quote"]', {position: {x: 4, y: 4}});
    await sleep(120);
    expect(await selectedPullquoteCount(page)).toBe(0);
  });
});
