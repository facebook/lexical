/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  applyHeading,
  moveToEditorBeginning,
  moveToLineEnd,
  selectAll,
} from '../keyboardShortcuts/index.mjs';
import {
  assertSelection,
  click,
  copyToClipboard,
  evaluate,
  expect,
  focusEditor,
  initialize,
  pasteFromClipboard,
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

function codeBlock(lines) {
  const children = [];
  for (let i = 0; i < lines; i++) {
    if (i > 0) {
      children.push({type: 'linebreak', version: 1});
    }
    children.push({
      ...textNode(`const line${i} = ${i};`),
      type: 'code-highlight',
    });
  }
  return {
    children,
    direction: null,
    format: '',
    indent: 0,
    language: 'js',
    type: 'code',
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

/** Open the default header for editing from the page setup dialog. */
async function editHeader(page) {
  await openPageSetup(page);
  await click(page, '[data-test-id="page-header-edit-default"]');
  await waitForSelector(page, LIVE_SLOT);
}

const INSERT_MENU_BUTTON = '[aria-label="Insert specialized editor node"]';

async function insertMenuItems(page) {
  await click(page, INSERT_MENU_BUTTON);
  await waitForSelector(page, '.dropdown .item');
  const items = await page.locator('.dropdown .item .text').allTextContents();
  await page.keyboard.press('Escape');
  await waitForSelector(page, '.dropdown', {state: 'detached'});
  return items;
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

  test('A block taller than a page does not run the page count away', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await loadDocument(page, [
      ...paragraphs(3),
      codeBlock(80),
      ...paragraphs(3, 'Trailing'),
    ]);
    await enablePaged(page);
    const count = await waitForStablePageCount(page);
    expect(count).toBeLessThanOrEqual(3);

    const areas = await contentAreas(page);
    const box = await hostRelativeBox(page, '.PlaygroundEditorTheme__code');
    const containing = areas.find(
      area => box.top >= area.top - 1 && box.bottom <= area.bottom + 1,
    );
    expect(containing).toBeDefined();
  });

  test('Empty headers do not invite clicks while read-only', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body');
    await enablePaged(page);
    await enableHeader(page);
    const header = page.locator(
      '[data-page-slot="header"][data-page-index="0"]',
    );
    const hint = () =>
      evaluate(page, () => {
        const el = document.querySelector(
          '[data-page-slot="header"][data-page-index="0"]',
        );
        const style = getComputedStyle(el, '::after');
        return {
          content: style.content,
          cursor: getComputedStyle(el).cursor,
          display: style.display,
        };
      });
    // Firefox reports the unresolved `attr()` form of the content.
    const editable = await hint();
    expect(editable.content).toContain('Click to add a');
    expect(editable.cursor).toBe('text');
    expect(editable.display).toBe('block');

    await click(page, '.action-button .lock');
    await expect(page.locator('.ContentEditable__root')).toHaveAttribute(
      'contenteditable',
      'false',
    );
    const readOnly = await hint();
    expect(readOnly.cursor).not.toBe('text');
    expect(readOnly.content === 'none' || readOnly.display === 'none').toBe(
      true,
    );
    // The slot no longer takes pointer events, so Playwright must be told
    // to click through it.
    await header.click({force: true});
    await expect(page.locator(LIVE_SLOT)).toHaveCount(0);

    await click(page, '.action-button .unlock');
    expect((await hint()).content).toContain('Click to add a');
  });

  test('Enter at the end of a page starts the next page and keeps typing there', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await loadDocument(page, paragraphs(30));
    await enablePaged(page);
    const count = await waitForStablePageCount(page);
    expect(count).toBeGreaterThanOrEqual(2);

    // The last paragraph that ends on page 1.
    const [firstPage] = await contentAreas(page);
    const index = await evaluate(
      page,
      ({host, bottom}) => {
        const hostTop = document
          .querySelector(host)
          .getBoundingClientRect().top;
        const blocks = [
          ...document.querySelectorAll('.ContentEditable__root > p'),
        ];
        let last = -1;
        blocks.forEach((p, i) => {
          if (p.getBoundingClientRect().bottom - hostTop <= bottom + 1) {
            last = i;
          }
        });
        return last;
      },
      {bottom: firstPage.bottom, host: HOST},
    );
    expect(index).toBeGreaterThan(0);
    const block = page.locator('.ContentEditable__root > p').nth(index);
    await block.scrollIntoViewIfNeeded();
    const box = await block.boundingBox();
    await page.mouse.click(box.x + box.width - 5, box.y + box.height - 8);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('New paragraph');
    await page.keyboard.type(' continues');

    await expect(
      page.locator('.ContentEditable__root > p').nth(index + 1),
    ).toHaveText('New paragraph continues');
    await expect(
      page.locator('.ContentEditable__root > p').nth(index + 2),
    ).toHaveText(`Paragraph ${index + 2}: ${LONG_LINE}`);

    // The new paragraph starts on page 2.
    const areas = await contentAreas(page);
    const newBox = await evaluate(
      page,
      ({host, i}) => {
        const hostTop = document
          .querySelector(host)
          .getBoundingClientRect().top;
        const span = document
          .querySelectorAll('.ContentEditable__root > p')
          [i].querySelector('span');
        const r = span.getBoundingClientRect();
        return {bottom: r.bottom - hostTop, top: r.top - hostTop};
      },
      {host: HOST, i: index + 1},
    );
    expect(newBox.top).toBeGreaterThanOrEqual(areas[1].top - 1);
    expect(newBox.bottom).toBeLessThanOrEqual(areas[1].bottom + 1);
  });

  test('Arrow keys move the caret across a page boundary', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await loadDocument(page, paragraphs(30));
    await enablePaged(page);
    const count = await waitForStablePageCount(page);
    expect(count).toBeGreaterThanOrEqual(2);

    const [firstPage] = await contentAreas(page);
    const index = await evaluate(
      page,
      ({host, bottom}) => {
        const hostTop = document
          .querySelector(host)
          .getBoundingClientRect().top;
        const blocks = [
          ...document.querySelectorAll('.ContentEditable__root > p'),
        ];
        let last = -1;
        blocks.forEach((p, i) => {
          if (p.getBoundingClientRect().bottom - hostTop <= bottom + 1) {
            last = i;
          }
        });
        return last;
      },
      {bottom: firstPage.bottom, host: HOST},
    );
    const block = page.locator('.ContentEditable__root > p').nth(index);
    await block.scrollIntoViewIfNeeded();
    const box = await block.boundingBox();
    // Caret in the last line of the last paragraph on page 1.
    await page.mouse.click(box.x + 40, box.y + box.height - 8);
    const before = await evaluate(page, () => {
      const s = window.lexicalEditor.getEditorState()._selection;
      return s.anchor.key;
    });

    await page.keyboard.press('ArrowDown');
    const after = await evaluate(page, () => {
      const s = window.lexicalEditor.getEditorState()._selection;
      return s.anchor.key;
    });
    expect(after).not.toBe(before);
    const anchorIndex = await evaluate(page, () => {
      const s = window.lexicalEditor.getEditorState()._selection;
      const el = window.lexicalEditor.getElementByKey(s.anchor.key);
      return [
        ...document.querySelectorAll('.ContentEditable__root > p'),
      ].indexOf(el.closest('p'));
    });
    expect(anchorIndex).toBe(index + 1);

    await page.keyboard.press('ArrowUp');
    const back = await evaluate(page, () => {
      const s = window.lexicalEditor.getEditorState()._selection;
      return s.anchor.key;
    });
    expect(back).toBe(before);
  });

  test('Deleting the whole document keeps the header and returns to one page', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await loadDocument(page, paragraphs(30));
    await enablePaged(page);
    await enableHeader(page);
    await openPageSetup(page);
    await click(page, '[data-test-id="page-header-edit-default"]');
    await waitForSelector(page, LIVE_SLOT);
    await page.keyboard.type('Kept header');
    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    expect(await waitForStablePageCount(page)).toBeGreaterThanOrEqual(2);

    await focusEditor(page);
    await selectAll(page);
    await page.keyboard.press('Backspace');
    await expect(page.locator('.ContentEditable__root > p')).toHaveCount(1);
    expect(await waitForStablePageCount(page)).toBe(1);
    await expect(page.locator('.Pages__break')).toHaveCount(0);
    await expect(
      page.locator('[data-page-slot="header"][data-page-index="0"]'),
    ).toHaveText('Kept header');
    await expect(page.locator('.ContentEditable__placeholder')).toBeVisible();
  });

  test('Pasting a header with a page number into the body inserts plain text', async ({
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
    await page.keyboard.type('No. ');
    await selectFromInsertDropdown(page, '.page-number');
    await page.keyboard.type(' end');
    await expect(page.locator(LIVE_CONTENT)).toHaveText('No. 1 end');
    // The live header is the first editable root in the document, so the
    // copy helper reads from it.
    await selectAll(page);
    const clipboard = await copyToClipboard(page);
    expect(clipboard['application/x-lexical-editor']).toContain(
      '"type":"page-number"',
    );

    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    await page.keyboard.press('End');
    await pasteFromClipboard(page, clipboard);
    // The body editor has no page number node; the token pastes as text.
    await expect(page.locator('.ContentEditable__root > p').first()).toHaveText(
      'BodyNo. 1 end',
    );
    await expect(
      page.locator('.ContentEditable__root [data-lexical-page-number]'),
    ).toHaveCount(0);
  });
  test('Formats the block type right after a click into header text', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body text');
    await enablePaged(page);
    await enableHeader(page);
    await editHeader(page);
    await page.keyboard.type('Hi there');
    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});

    // A click into the middle of the text: the caret lands inside a text
    // node, which is the case where the toolbar used to keep pointing at
    // the document until the next selection change.
    const text = page.locator(
      '[data-page-slot="header"][data-page-index="0"] [data-lexical-text]',
    );
    const box = await text.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await waitForSelector(page, LIVE_SLOT);
    await click(page, '[aria-label="Formatting options for text style"]');
    await click(page, '.dropdown .item:has-text("Quote")');
    await expect(page.locator(`${LIVE_CONTENT} > blockquote`)).toHaveText(
      'Hi there',
    );
    await expect(page.locator('.ContentEditable__root > p')).toHaveText(
      'Body text',
    );
  });

  test('The Insert menu offers only what the active editor supports', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body');
    await enablePaged(page);
    await enableHeader(page);

    const documentItems = await insertMenuItems(page);
    expect(documentItems).toContain('Page Break');
    expect(documentItems).toContain('Sticky Note');
    expect(documentItems).not.toContain('Page Number');

    await editHeader(page);
    const headerItems = await insertMenuItems(page);
    expect(headerItems).toContain('Horizontal Rule');
    expect(headerItems).toContain('Page Number');
    expect(headerItems).toContain('Page Count');
    expect(headerItems).not.toContain('Page Break');
    expect(headerItems).not.toContain('Sticky Note');

    // And what it offers goes into the header, not the document.
    await selectFromInsertDropdown(page, '.horizontal-rule');
    await expect(page.locator(`${LIVE_CONTENT} hr`)).toHaveCount(1);
    await expect(page.locator('.ContentEditable__root hr')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    expect(await insertMenuItems(page)).toContain('Page Break');
  });

  test('Shortcuts, the component picker and the floating toolbar work in a header', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body');
    await enablePaged(page);
    await enableHeader(page);
    await editHeader(page);

    await page.keyboard.type('Title');
    await applyHeading(page, 1);
    await expect(page.locator(`${LIVE_CONTENT} > h1`)).toHaveText('Title');
    await expect(page.locator('.ContentEditable__root > p')).toHaveText('Body');

    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await waitForSelector(page, '.typeahead-popover');
    const options = await page
      .locator('.typeahead-popover .item .text')
      .allTextContents();
    expect(options).toContain('Divider');
    expect(options).toContain('Page Number');
    expect(options).not.toContain('Page Break');
    await page.keyboard.type('divider');
    await expect(
      page.locator('.typeahead-popover .item .text').first(),
    ).toHaveText('Divider');
    await page.keyboard.press('Enter');
    await expect(page.locator(`${LIVE_CONTENT} hr`)).toHaveCount(1);
    await expect(page.locator('.ContentEditable__root hr')).toHaveCount(0);

    await page.keyboard.type('Bold me');
    for (let i = 0; i < 'Bold me'.length; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }
    await waitForSelector(page, '.floating-text-format-popup');
    await click(
      page,
      '.floating-text-format-popup [aria-label="Format text as bold"]',
    );
    await expect(page.locator(`${LIVE_CONTENT} strong`)).toHaveText('Bold me');
    await expect(page.locator(`${LIVE_CONTENT} > h1`)).toHaveText('Title');
  });
  test('Inserting a GIF into a header renders the image there', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
    await focusEditor(page);
    await page.keyboard.type('Body');
    await enablePaged(page);
    await enableHeader(page);
    await editHeader(page);
    await page.keyboard.type('Logo ');
    // The image is a React-rendered node that needs the application's
    // providers; when the header editor's React tree sat outside them, the
    // component threw during render and no image was ever rendered.
    // (`.editor-image img`, not any `img`: WebKit gets a managed
    // line-break image after a trailing decorator from Lexical itself.)
    await selectFromInsertDropdown(page, '.gif');
    await expect(page.locator(`${LIVE_CONTENT} .editor-image img`)).toHaveCount(
      1,
    );
    await expect(
      page.locator('.ContentEditable__root .editor-image img'),
    ).toHaveCount(0);

    // The static copies on other pages carry the image as well.
    await page.keyboard.press('Escape');
    await waitForSelector(page, LIVE_SLOT, {state: 'detached'});
    await expect(
      page.locator(
        '[data-page-slot="header"][data-page-index="0"] .editor-image img',
      ),
    ).toHaveCount(1);
  });
});
