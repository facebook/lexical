/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, Locator, Page, test} from '@playwright/test';

const editor = (page: Page, name: string): Locator =>
  page.locator(`lexical-editor[name="${name}"] div[contenteditable="true"]`);

async function clearAndType(
  page: Page,
  name: string,
  text: string,
): Promise<void> {
  await editor(page, name).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('lexical-editor').first().waitFor();
});

test('renders two editors, each in its own open shadow root', async ({
  page,
}) => {
  await expect(page.locator('lexical-editor')).toHaveCount(2);

  const stats = await page.evaluate(() => {
    const elements = [...document.querySelectorAll('lexical-editor')];
    return {
      // querySelector does not pierce shadow roots, so none of the
      // contentEditables should be reachable from the document.
      lightDomContentEditables: document.querySelectorAll(
        'div[contenteditable="true"]',
      ).length,
      total: elements.length,
      withShadow: elements.filter(el => el.shadowRoot !== null).length,
    };
  });
  expect(stats).toEqual({
    lightDomContentEditables: 0,
    total: 2,
    withShadow: 2,
  });
});

test('types and formats inside a web component shadow root', async ({page}) => {
  await clearAndType(page, 'notes', 'hello world');
  await expect(editor(page, 'notes')).toHaveText('hello world');

  // Select "world" and bold it with the in-shadow toolbar button.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+ArrowLeft');
  }
  const boldButton = page
    .locator('lexical-editor[name="notes"] .toolbar button')
    .first();
  await boldButton.click();

  await expect(editor(page, 'notes').locator('strong')).toHaveText('world');
  // The toolbar reflects the selection's format, proving the selection is
  // readable inside the shadow root.
  await expect(boldButton).toHaveAttribute('aria-pressed', 'true');
});

test('the two editors are independent', async ({page}) => {
  await clearAndType(page, 'notes', 'first editor');
  await clearAndType(page, 'summary', 'second editor');
  await expect(editor(page, 'notes')).toHaveText('first editor');
  await expect(editor(page, 'summary')).toHaveText('second editor');
});

test('deletes by word inside the shadow root', async ({page}) => {
  await clearAndType(page, 'notes', 'hello world');
  await page.keyboard.press('ControlOrMeta+Backspace');
  await expect(editor(page, 'notes')).toHaveText('hello ');
});

test('is form-associated via ElementInternals', async ({page}) => {
  await clearAndType(page, 'notes', 'form value one');
  await clearAndType(page, 'summary', 'form value two');

  await page.locator('button[type="submit"]').click();

  // The form value of each editor is its serialized Lexical state, collected
  // by FormData without any hidden <input>.
  const output = page.locator('#form-output');
  await expect(output).toContainText('notes:');
  await expect(output).toContainText('summary:');
  await expect(output).toContainText('form value one');
  await expect(output).toContainText('form value two');
});

test('dispatches a composed input event across the shadow boundary', async ({
  page,
}) => {
  await clearAndType(page, 'summary', 'x');
  // The page-level (light DOM) listener observes the composed `input` event
  // dispatched from inside the shadow root.
  await expect(page.locator('#last-edited')).toHaveText('Last edited: summary');
});
