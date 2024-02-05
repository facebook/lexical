/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  click,
  dragMouse,
  focusEditor,
  mouseMoveToSelector,
  selectFromInsertDropdown,
  selectorBoundingBox,
  test,
  waitForSelector,
} from '../utils/index.mjs';

async function toggleBulletList(page) {
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.bullet-list');
}

test(`Can create mutliple bullet lists and then toggle off the list.`, async ({
  page,
  isPlainText,
}) => {
  test.skip(isPlainText);

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      if (
        msg.text().includes('error #68') ||
        msg.text().includes('getNodesBetween: ancestor is null')
      ) {
        test.fail();
      }
    }
  });

  await focusEditor(page);
  await toggleBulletList(page);
  await page.keyboard.type('one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('two');
  await page.keyboard.press('Enter');
  await selectFromInsertDropdown(page, '.horizontal-rule');
  await waitForSelector(page, 'hr');
  await page.keyboard.type('three');
  await page.keyboard.press('Enter');
  await mouseMoveToSelector(page, 'li:has-text("one")');
  await page.mouse.down();
  await dragMouse(
    page,
    await selectorBoundingBox(page, 'li:has-text("one")'),
    await selectorBoundingBox(page, 'li:has-text("three")'),
    'middle',
    'end',
  );
});
