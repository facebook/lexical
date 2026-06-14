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
  waitForSelector,
} from '../utils/index.mjs';

async function insertReview(page) {
  await page.keyboard.type('/review');
  await waitForSelector(page, '.typeahead-popover');
  await page.keyboard.press('Enter');
  await waitForSelector(page, '.lexical-review-chrome');
}

async function insertCard(page) {
  await page.keyboard.type('/card');
  await waitForSelector(page, '.typeahead-popover');
  await page.keyboard.press('Enter');
  await waitForSelector(page, '.lexical-card-node');
}

async function insertPullQuote(page) {
  await page.keyboard.type('/pull');
  await waitForSelector(page, '.typeahead-popover');
  await page.keyboard.press('Enter');
  await waitForSelector(page, '.lexical-pullquote-node');
}

// Drop the empty boundary paragraph at the given edge of the document so the
// slot host becomes the first / last block. Deleting it by keyboard is
// unreliable around a shadow-root host (forward-merge into the host is a no-op),
// so go through the editor API and only ever remove an empty paragraph — never
// the host itself.
async function makeHostEdgeBlock(page, edge) {
  await evaluate(
    page,
    side => {
      const editor = window.lexicalEditor;
      editor.update(
        () => {
          const root = editor.getEditorState()._nodeMap.get('root');
          const child =
            side === 'first' ? root.getFirstChild() : root.getLastChild();
          if (
            child !== null &&
            child.getType() === 'paragraph' &&
            child.getTextContent() === ''
          ) {
            child.remove();
          }
        },
        {discrete: true},
      );
    },
    edge,
  );
  await sleep(80);
}

// Text of the top-level block immediately before / after the host, or null if
// there is none — used to confirm an arrow press inserted a paragraph outside
// the host and landed the caret there.
async function blockOutsideHost(page, hostSelector, side) {
  return evaluate(
    page,
    ([sel, which]) => {
      const root = document.querySelector('[data-lexical-editor="true"]');
      const host = document.querySelector(sel);
      if (root === null || host === null) {
        return null;
      }
      const blocks = Array.from(root.children);
      const index = blocks.indexOf(host);
      const target = which === 'before' ? blocks[index - 1] : blocks[index + 1];
      return target ? target.textContent : null;
    },
    [hostSelector, side],
  );
}

// Whether the collapsed DOM caret is inside an element matching `selector`.
async function caretInSelector(page, selector) {
  return evaluate(
    page,
    sel => {
      const s = window.getSelection();
      if (!s || s.rangeCount === 0 || s.anchorNode === null) {
        return false;
      }
      const node = s.anchorNode;
      const el = node.nodeType === 3 ? node.parentElement : node;
      return el !== null && el.closest(sel) !== null;
    },
    selector,
  );
}

async function blockCount(page) {
  return evaluate(
    page,
    () =>
      document.querySelector('[data-lexical-editor="true"]').children.length,
  );
}

const REVIEW = '.lexical-review-node';
const REVIEW_AUTHOR = '.lexical-review-author [data-lexical-slot="author"] p';
const REVIEW_BODY_FIRST = '.lexical-review-children p:first-child';
const CARD = '.lexical-card-node';
const CARD_TITLE = '[data-lexical-slot="title"] p';
const CARD_BODY = '.lexical-card-node > p';
const PULLQUOTE = '.lexical-pullquote-node';
const PQ_QUOTE_FIRST = '[data-lexical-slot="quote"] p:first-child';
const PQ_ATTRIBUTION = '[data-lexical-slot="attribution"] p';

// The slot-aware ArrowDown/Up escape (registerSlotHostArrowEscape) lets a slot
// host that is the first/last block step out instead of trapping the caret. The
// browser already moves the caret between a host's editable regions and into an
// existing sibling — even across a contentEditable=false chrome — so the helper
// only fills the dead-end gap by inserting a paragraph before/after the host.
test.describe('Slot host ArrowDown/Up escape', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    return initialize({isCollab, page});
  });

  // The Review is the interesting case: its chrome renders the body children
  // ABOVE the `author` slot, the opposite of the slots-first Card / PullQuote,
  // so the helper is given explicit top/bottom regions.
  test('Review: ArrowDown at the end of the author (last block) exits below it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertReview(page);
    await click(page, REVIEW_AUTHOR);
    await page.keyboard.type('Jane');
    await makeHostEdgeBlock(page, 'last');

    await click(page, REVIEW_AUTHOR);
    await moveToLineEnd(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('After');
    await sleep(120);

    expect(await blockOutsideHost(page, REVIEW, 'after')).toBe('After');
    // The author line was not disturbed by the escape.
    expect(
      await evaluate(
        page,
        sel => {
          const p = document.querySelector(sel);
          return p ? p.textContent : null;
        },
        REVIEW_AUTHOR,
      ),
    ).toBe('Jane');
  });

  test('Review: ArrowUp at the start of the body (first block) exits above it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertReview(page);
    await click(page, REVIEW_BODY_FIRST);
    await page.keyboard.type('Body');
    await makeHostEdgeBlock(page, 'first');

    await click(page, REVIEW_BODY_FIRST);
    await moveToLineBeginning(page);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Before');
    await sleep(120);

    expect(await blockOutsideHost(page, REVIEW, 'before')).toBe('Before');
  });

  test('Review: ArrowDown from the body does not escape past the author', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertReview(page);
    await click(page, REVIEW_BODY_FIRST);
    await page.keyboard.type('Body');
    await click(page, REVIEW_AUTHOR);
    await page.keyboard.type('Jane');
    // The `author` slot renders below the body in the chrome, so even as the
    // last block, ArrowDown from the body must NOT escape the Review (the old
    // inverted-edge bug took the body as the bottom region and inserted a
    // paragraph past the author). Whether the caret then steps into the author
    // is up to the browser — Chromium crosses the contentEditable island, while
    // Firefox leaves the caret in the body — so assert only the cross-browser
    // guarantee: the caret stays inside the Review and nothing is inserted.
    await makeHostEdgeBlock(page, 'last');
    const before = await blockCount(page);

    await click(page, REVIEW_BODY_FIRST);
    await moveToLineEnd(page);
    await page.keyboard.press('ArrowDown');
    await sleep(100);

    expect(await caretInSelector(page, REVIEW)).toBe(true);
    expect(await blockCount(page)).toBe(before);
  });

  test('Card: ArrowDown at the end of the body (last block) exits below it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, CARD_BODY);
    await page.keyboard.type('Body');
    await makeHostEdgeBlock(page, 'last');

    await click(page, CARD_BODY);
    await moveToLineEnd(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('After');
    await sleep(120);

    expect(await blockOutsideHost(page, CARD, 'after')).toBe('After');
  });

  test('Card: ArrowUp at the start of the title (first block) exits above it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertCard(page);
    await click(page, CARD_TITLE);
    await page.keyboard.type('Title');
    await makeHostEdgeBlock(page, 'first');

    await click(page, CARD_TITLE);
    await moveToLineBeginning(page);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Before');
    await sleep(120);

    expect(await blockOutsideHost(page, CARD, 'before')).toBe('Before');
  });

  test('PullQuote: ArrowDown at the end of the attribution (last block) exits below it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPullQuote(page);
    await makeHostEdgeBlock(page, 'last');

    await click(page, PQ_ATTRIBUTION);
    await moveToLineEnd(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('After');
    await sleep(120);

    expect(await blockOutsideHost(page, PULLQUOTE, 'after')).toBe('After');
  });

  test('PullQuote: ArrowUp at the start of the quote (first block) exits above it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPullQuote(page);
    await makeHostEdgeBlock(page, 'first');

    await click(page, PQ_QUOTE_FIRST);
    await moveToLineBeginning(page);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Before');
    await sleep(120);

    expect(await blockOutsideHost(page, PULLQUOTE, 'before')).toBe('Before');
  });
});
