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
		page.getByRole('heading', { name: 'SvelteKit Lexical Basic - Vanilla JS' })
	).toBeVisible();
	await expect(page.locator('#lexical-state')).toHaveValue(
		/"text": "Welcome to the Vanilla JS Lexical Demo!"/
	);
});

test('lexical editor has an accessible numeric version', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'SvelteKit Lexical Basic - Vanilla JS' })
	).toBeVisible();
	expect(await page.evaluate(() =>
		// @ts-expect-error
		document.querySelector('[contenteditable]')!.__lexicalEditor.constructor.version
	)).toMatch(/^\d+\.\d+\.\d+/);
});
