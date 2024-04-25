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
