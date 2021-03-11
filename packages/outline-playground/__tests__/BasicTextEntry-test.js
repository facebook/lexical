/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, repeat, assertHtmlSnapshot} from './utils';

describe('BasicTextEntry', () => {
  initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
    describe(`Rich text`, () => {
      it('Simple text entry and selection', async () => {
        const {page} = e2e;
  
        await page.focus('div.editor');
        await page.keyboard.type('Hello World.');
        await page.keyboard.press('Enter');
        await page.keyboard.type('This is another block.');
        await page.keyboard.down('Shift');
        await repeat(6, async () => await page.keyboard.down('ArrowLeft'));
        await page.keyboard.up('Shift');
        await page.keyboard.type('paragraph.');
        await page.keyboard.type(' :)');
  
        await assertHtmlSnapshot(page);
      });
    });
  });
});
