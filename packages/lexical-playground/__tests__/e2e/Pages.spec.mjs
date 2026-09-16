/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToLineEnd,
} from '../keyboardShortcuts/index.mjs';
import {
  assertSelection,
  click,
  evaluate,
  expect,
  focusEditor,
  initialize,
  selectFromInsertDropdown,
  test,
  waitForSelector,
} from '../utils/index.mjs';

const HOST = '.Pages__host';

const LAYER = '.Pages__host > .Pages__layer';

const LIVE_SLOT = '.Pages__slot--live';

const LIVE_CONTENT = '.Pages__slotContent--live';

/** Two lines of body text at the default A4 page width. */
const LONG_LINE =
  'The quick brown fox jumps over the lazy dog. ' +
  'The quick brown fox jumps over the lazy dog. ' +
  'The quick brown fox jumps over the lazy dog.';

function textNode(value) {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: value,
    type: 'text',
    version: 1,
  };
}

function paragraph(value) {
  return {
    children: value === '' ? [] : [textNode(value)],
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    type: 'paragraph',
    version: 1,
  };
}

function paragraphs(count, prefix = 'Paragraph') {
  return Array.from({length: count}, (_, i) =>
    paragraph(`${prefix} ${i + 1}: ${LONG_LINE}`),
  );
}

function table(rows, columns) {
  const cell = value => ({
    backgroundColor: null,
    children: [paragraph(value)],
    colSpan: 1,
    direction: null,
    format: '',
    headerState: 0,
    indent: 0,
    rowSpan: 1,
    type: 'tablecell',
    version: 1,
  });
  return {
    children: Array.from({length: rows}, (_row, r) => ({
      children: Array.from({length: columns}, (_column, c) =>
        cell(`R${r + 1}C${c + 1}`),
      ),
      direction: null,
      format: '',
      indent: 0,
      type: 'tablerow',
      version: 1,
    })),
    direction: null,
    format: '',
    indent: 0,
    type: 'table',
    version: 1,
  };
}

/** Replace the document with `children` (top-level nodes, as JSON). */
async function loadDocument(page, children) {
  await evaluate(
    page,
    serializedChildren => {
      const editor = window.lexicalEditor;
      editor.setEditorState(
        editor.parseEditorState({
          root: {
            children: serializedChildren,
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        }),
      );
    },
    children,
  );
}

async function openPageSetup(page) {
  await click(page, '.page-setup');
  await waitForSelector(page, '.PageSetupDialog');
}

async function closePageSetup(page) {
  await click(page, '.Modal__closeButton');
  await waitForSelector(page, '.PageSetupDialog', {state: 'detached'});
}

async function togglePageSetupSwitch(page, id) {
  await click(page, `#${id} button[role="switch"]`);
}

async function enablePaged(page) {
  await openPageSetup(page);
  await togglePageSetupSwitch(page, 'paged-toggle');
  await closePageSetup(page);
  await waitForSelector(page, LAYER);
}

async function enableHeader(page) {
  await openPageSetup(page);
  await togglePageSetupSwitch(page, 'page-header-toggle');
  await closePageSetup(page);
}

function pageCount(page) {
  return evaluate(
    page,
    host =>
      Number(
        document.querySelector(host).style.getPropertyValue('--page-count'),
      ),
    HOST,
  );
}

/** Wait until the page layer stops changing its page count. */
async function waitForStablePageCount(page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const count = await pageCount(page);
        const stable = count === last;
        last = count;
        return stable && count > 0;
      },
      {intervals: [200, 300, 500], timeout: 10000},
    )
    .toBe(true);
  return last;
}

/**
 * Host-relative vertical extent of the content area of every page, in the
 * order they are rendered.
 */
function contentAreas(page) {
  return evaluate(
    page,
    ({host, layer}) => {
      const hostEl = document.querySelector(host);
      const hostTop = hostEl.getBoundingClientRect().top;
      const rel = el => {
        const r = el.getBoundingClientRect();
        return {bottom: r.bottom - hostTop, top: r.top - hostTop};
      };
      const layerEl = document.querySelector(layer);
      const firstHeader = layerEl.querySelector('.Pages__header--first');
      const breaks = [...layerEl.querySelectorAll('.Pages__break')];
      const headers = [...layerEl.querySelectorAll('.Pages__breakHeader')];
      const lastFooter = layerEl.querySelector('.Pages__footer--last');
      const areas = [];
      let top = rel(firstHeader).bottom;
      breaks.forEach((brk, i) => {
        areas.push({bottom: rel(brk).top, top});
        top = rel(headers[i]).bottom;
      });
      areas.push({bottom: rel(lastFooter).top, top});
      return areas;
    },
    {host: HOST, layer: LAYER},
  );
}

/** Host-relative bounding box of the first element matching `selector`. */
function hostRelativeBox(page, selector) {
  return evaluate(
    page,
    ({host, sel}) => {
      const hostRect = document.querySelector(host).getBoundingClientRect();
      const r = document.querySelector(sel).getBoundingClientRect();
      return {
        bottom: r.bottom - hostRect.top,
        height: r.height,
        left: r.left - hostRect.left,
        top: r.top - hostRect.top,
        width: r.width,
      };
    },
    {host: HOST, sel: selector},
  );
}

test.describe('Pages', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Shows the placeholder on the first page while the document is empty', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await enablePaged(page);
    await waitForStablePageCount(page);

    const placeholder = page.locator('.ContentEditable__placeholder');
    await expect(placeholder).toHaveText('Enter some rich text...');
    await expect(placeholder).toBeVisible();

    // The placeholder must sit inside the first page's content area, not
    // under the header band that the page layer draws over the root.
    const [firstPage] = await contentAreas(page);
    const box = await hostRelativeBox(page, '.ContentEditable__placeholder');
    expect(box.top).toBeGreaterThanOrEqual(firstPage.top - 1);
    expect(box.bottom).toBeLessThanOrEqual(firstPage.bottom + 1);

    // And nothing from the page layer may cover it.
    const covered = await evaluate(page, () => {
      const el = document.querySelector('.ContentEditable__placeholder');
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + 10, r.top + r.height / 2);
      return hit !== null && hit.closest('.Pages__layer') !== null;
    });
    expect(covered).toBe(false);
  });

  test('Escape from a header returns the caret to where it was in the body', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second');
    await moveToEditorBeginning(page);
    await moveToLineEnd(page);
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });

    await enablePaged(page);
    await enableHeader(page);
    await openPageSetup(page);
    await click(page, '[data-test-id="page-header-edit-default"]');
    await waitForSelector(page, LIVE_SLOT);
    await page.keyboard.type('Header');
    await expect(page.locator(LIVE_CONTENT)).toHaveText('Header');

    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    await expect(page.locator('.ContentEditable__root')).toBeFocused();
    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });
  });

  test('Typing continues after an inserted page count', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body');
    await enablePaged(page);
    await enableHeader(page);
    await openPageSetup(page);
    await click(page, '[data-test-id="page-header-edit-default"]');
    await waitForSelector(page, LIVE_SLOT);

    await page.keyboard.type('Page ');
    await selectFromInsertDropdown(page, '.page-number');
    await page.keyboard.type(' of ');
    await selectFromInsertDropdown(page, '.page-count');
    await page.keyboard.type('!');

    await expect(page.locator(LIVE_CONTENT)).toHaveText('Page 1 of 1!');
    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    await expect(
      page.locator('[data-page-slot="header"][data-page-index="0"]'),
    ).toHaveText('Page 1 of 1!');
  });

  test('A table that crosses a page boundary moves whole to the next page', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await loadDocument(page, [
      ...paragraphs(12),
      table(12, 3),
      ...paragraphs(12, 'Trailing'),
    ]);
    await enablePaged(page);
    const count = await waitForStablePageCount(page);
    expect(count).toBeGreaterThanOrEqual(2);

    const areas = await contentAreas(page);
    const rootBox = await hostRelativeBox(page, '.ContentEditable__root');
    const box = await hostRelativeBox(
      page,
      '.PlaygroundEditorTheme__tableScrollableWrapper',
    );
    // Full width, inside the page.
    expect(box.width).toBeGreaterThan(rootBox.width / 2);
    expect(box.left).toBeGreaterThanOrEqual(rootBox.left);
    expect(box.left + box.width).toBeLessThanOrEqual(
      rootBox.left + rootBox.width + 1,
    );
    // And entirely inside one page's content area.
    const containing = areas.find(
      area => box.top >= area.top - 1 && box.bottom <= area.bottom + 1,
    );
    expect(containing).toBeDefined();
  });
});
