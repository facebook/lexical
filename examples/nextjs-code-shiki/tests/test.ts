/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, test} from '@playwright/test';

test('index page has expected h1 and lexical state', async ({page}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {name: 'Lexical Next.js Code Shiki Example'}),
  ).toBeVisible();
  // The synchronous list comes from shiki/langs bundledLanguagesInfo
  await expect(
    page.locator('.editor-input .editor-paragraph').first(),
  ).toContainText(/Registered:.*typescript/);
  // Confirms the dynamic `@shikijs/langs/python` import succeeded under
  // Next.js, which only works if shiki packages are external in the
  // published @lexical/code-shiki bundle.
  await expect(
    page.locator('.editor-input').getByText('Loaded: python'),
  ).toBeVisible();
});
