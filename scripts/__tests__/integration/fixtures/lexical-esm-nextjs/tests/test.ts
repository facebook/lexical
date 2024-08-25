/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { expect, test } from '@playwright/test';

test('index page has expected h1 and lexical state', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'Next.js Rich Text Lexical Example' })
	).toBeVisible();
	await expect(page.locator('.editor-input .editor-paragraph').first()).toContainText(/^Registered:.*typescript/);
});
