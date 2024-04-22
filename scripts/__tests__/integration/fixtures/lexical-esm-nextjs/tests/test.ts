import { expect, test } from '@playwright/test';

test('index page has expected h1 and lexical state', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'Next.js Rich Text Lexical Example' })
	).toBeVisible();
	await expect(page.locator('.editor-input .editor-paragraph').first()).toContainText(/^Registered:.*typescript/);
});
