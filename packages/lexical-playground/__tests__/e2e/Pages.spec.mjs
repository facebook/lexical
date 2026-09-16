/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  click,
  evaluate,
  expect,
  initialize,
  test,
  waitForSelector,
} from '../utils/index.mjs';

const HOST = '.Pages__host';

const LAYER = '.Pages__host > .Pages__layer';

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
});
