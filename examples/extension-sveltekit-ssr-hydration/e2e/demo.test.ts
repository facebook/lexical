import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('[contenteditable] h1')).toContainText(
		'Welcome to the Svelte 5 Tailwind example!'
	);
});
test('html is prerendered', async ({ page }) => {
	const responsePromise = page.waitForResponse('/');
	const scripts: string[] = [];
	page.on('response', (r) => {
		if (r.request().resourceType() === 'script') {
			r.text().then((text) => scripts.push(text));
		}
	});
	await page.goto('/');
	const response = await (await responsePromise).text();
	expect(response).toContain('SERVER_AND_HTML_ONLY');
	await expect(page.locator('[contenteditable]')).toContainText('SERVER_AND_HTML_ONLY');
	// we don't render the json server-side
	expect(response).not.toContain('"root": ');
	// but we do render it client-side
	await expect(page.locator('pre')).toContainText('"root": ');
	// confirm that the expected server-only text isn't in any script chunk
	// to prove that we are rehydrating directly from html and not some
	// other sidecar
	expect(scripts.filter((text) => text.includes('SERVER_AND_HTML_ONLY'))).toEqual([]);
	// verify that the lexical editor is mounted and has an accessible version
	expect(
		await page.evaluate(
			() =>
				// @ts-expect-error -- internal implementation detail
				document.querySelector('[contenteditable]')!.__lexicalEditor.constructor.version
		)
	).toMatch(/^\d+\.\d+\.\d+/);
});
