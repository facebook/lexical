/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

import {startServer} from './serve-built-website.mjs';

const PAGES = [
  {examples: ['vanilla-js'], path: 'quick-start'},
  {examples: ['react-plain-text', 'react-rich'], path: 'react'},
  {examples: ['vanilla-js-plugin'], path: 'creating-plugin'},
  {examples: ['node-state-review'], path: 'node-state'},
];
const FILES = {
  'node-state-review': 'src/ReviewExtension.ts',
  'react-plain-text': 'src/App.tsx',
  'react-rich': 'src/App.tsx',
  'vanilla-js': 'src/main.ts',
  'vanilla-js-plugin': 'src/emoji-plugin/EmojiExtension.ts',
};

async function main() {
  const server = await startServer();
  const {port} = server.address();
  const baseURL = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage();
  const errors = [];
  const stackblitzRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'stackblitz.com') {
      stackblitzRequests.push(request.url());
    }
  });

  try {
    for (const {examples, path} of PAGES) {
      await page.goto(`${baseURL}/docs/getting-started/${path}`, {
        waitUntil: 'load',
      });
      assert.equal(
        await page.locator('[data-doc-example]').count(),
        examples.length,
      );
      await expect(page.locator('iframe[src*="stackblitz"]')).toHaveCount(0);
      for (const example of examples) {
        const demo = page.locator(`[data-doc-example="${example}"]`);
        await demo.scrollIntoViewIfNeeded();
        const iframe = demo.locator('iframe');
        await expect(iframe).toHaveAttribute('src', `/examples/${example}/`);
        const frame = iframe.contentFrame();
        const editor = frame.locator('[contenteditable="true"]');
        await expect(editor).toHaveCount(1);
        await expect(editor).toBeVisible();
        assert.equal(
          await page.evaluate(
            () =>
              document.activeElement &&
              document.activeElement.tagName === 'IFRAME',
          ),
          false,
          'An embedded editor must not steal focus',
        );
        const button = demo.getByRole('link', {name: 'Open in StackBlitz'});
        await expect(button).toHaveAttribute('target', '_blank');
        await expect(button).toHaveAttribute('rel', /noopener/);
        const url = new URL(await button.getAttribute('href'));
        assert.equal(url.hostname, 'stackblitz.com');
        assert.ok(url.pathname.endsWith(`/examples/${example}`));
        assert.equal(url.searchParams.get('file'), FILES[example]);
        assert.equal(url.searchParams.has('embed'), false);

        await editor.click();
        await editor.press('ControlOrMeta+a');
        await editor.pressSequentially('Hello from the documentation');
        await expect(editor).toHaveText('Hello from the documentation');
        if (example === 'react-rich') {
          await editor.press('ControlOrMeta+a');
          await frame
            .getByRole('button', {exact: true, name: 'Format Bold'})
            .click();
          await expect(editor.locator('strong')).toHaveText(
            'Hello from the documentation',
          );
          await frame.getByRole('button', {exact: true, name: 'Undo'}).click();
          await expect(editor.locator('strong')).toHaveCount(0);
        }
        if (example === 'vanilla-js-plugin') {
          await editor.press('ControlOrMeta+a');
          await editor.pressSequentially(':) ');
          const emoji = editor.locator('.emoji-node');
          await expect(emoji).toHaveCount(1);
          const background = await emoji.evaluate(
            node => getComputedStyle(node).backgroundImage,
          );
          assert.ok(
            background.startsWith('url("'),
            'The emoji image must be bundled',
          );
          const response = await page.request.get(background.slice(5, -2));
          assert.equal(response.status(), 200);
          assert.match(response.headers()['content-type'], /image\/png/);
          // Formatting clones the custom node; its schema must carry the ID.
          await editor.press('ControlOrMeta+a');
          await editor.press('ControlOrMeta+b');
          const state = frame.locator('#lexical-state');
          await expect(state).toHaveValue(/"format": 1/);
          const saved = await state.inputValue();
          const nodes = JSON.parse(saved).root.children.flatMap(
            node => node.children,
          );
          const serializedEmoji = nodes.find(node => node.type === 'emoji');
          assert.equal(serializedEmoji.unifiedID, '1f642');
          assert.equal(serializedEmoji.format, 1);
          assert.equal(serializedEmoji.mode, 'token');
          await editor.evaluate((element, json) => {
            const instance = element.__lexicalEditor;
            instance.setEditorState(instance.parseEditorState(json));
          }, saved);
          await expect(state).toHaveValue(saved);
          await expect(editor.locator('.emoji-node')).toHaveCount(1);
          process.stdout.write(
            'PASS emoji schema: clone, inherited formatting, JSON round trip\n',
          );
        }
        if (example === 'node-state-review') {
          const paragraph = editor.locator('p');
          const toggle = frame.getByRole('button', {name: 'Toggle reviewed'});
          await toggle.click();
          await expect(paragraph).toHaveAttribute('data-reviewed', 'true');
          await expect(frame.locator('#json')).toHaveValue(/"reviewed": true/);
          // Another update must carry the ad-hoc state across a clone.
          await editor.press('End');
          await editor.pressSequentially('!');
          await expect(paragraph).toHaveAttribute('data-reviewed', 'true');
          await frame.getByRole('button', {name: 'Export HTML'}).click();
          const html = frame.getByLabel('HTML (export, edit, then import)');
          await expect(html).toHaveValue(/data-reviewed="true"/);
          await paragraph.click();
          await toggle.click();
          await expect(paragraph).not.toHaveAttribute('data-reviewed');
          await expect(frame.locator('#json')).not.toHaveValue(
            /"reviewed": true/,
          );
          await frame.getByRole('button', {name: 'Import HTML'}).click();
          await expect(paragraph).toHaveAttribute('data-reviewed', 'true');
          await expect(paragraph).toHaveText('Hello from the documentation!');
          await expect(frame.locator('#json')).toHaveValue(/"reviewed": true/);
          // Invalid/missing flags default to false, preserving child formatting.
          await html.fill(
            '<p data-reviewed="false"><strong>Not reviewed</strong></p>',
          );
          await frame.getByRole('button', {name: 'Import HTML'}).click();
          await expect(paragraph).not.toHaveAttribute('data-reviewed');
          await expect(paragraph.locator('strong')).toHaveText('Not reviewed');
          process.stdout.write(
            'PASS NodeState: toggle, clone, JSON, HTML export/import\n',
          );
        }
        // Focus the document again before checking the next lazy-loaded demo.
        await page.locator('h1').click();
        process.stdout.write(
          `PASS ${example}: hosted editor, typing, StackBlitz link\n`,
        );
      }
    }
    assert.deepEqual(errors, [], 'Documentation demos must not throw');
    assert.deepEqual(
      stackblitzRequests,
      [],
      'Reading the docs must not load StackBlitz',
    );
    process.stdout.write(
      'PASS getting started examples: no runtime errors or StackBlitz requests\n',
    );
  } finally {
    if (errors.length > 0) {
      console.error('Browser errors:', errors);
    }
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
