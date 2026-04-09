/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Captures screenshots of each example for the gallery page.
 *
 * Usage:
 *   node scripts/capture-gallery-screenshots.mjs
 *
 * Prerequisites:
 *   - Playwright browsers installed (npx playwright install chromium)
 *
 * Output:
 *   Screenshots are saved to packages/lexical-website/static/img/gallery/
 */

import {execSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, unlinkSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GALLERY_DIR = resolve(
  ROOT,
  'packages/lexical-website/static/img/gallery',
);

// Examples to screenshot, keyed by directory name.
// waitForSelector: optional CSS selector to wait for before screenshotting.
const EXAMPLES = [
  {
    dir: 'vanilla-js-plugin',
    name: 'vanilla-js-plugin',
    waitForSelector: '[data-lexical-editor]',
  },
  {
    dir: 'react-rich-collab',
    name: 'react-rich-collab',
    // Editor is inside iframes, so wait for the iframe elements instead
    waitForSelector: 'iframe[name="left"]',
  },
  {
    dir: 'react-table',
    name: 'react-table',
    waitForSelector: '[data-lexical-editor]',
  },
];

const PORT = 5180;

function waitForServer(port, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((onResolve, onReject) => {
    const check = async () => {
      try {
        const resp = await fetch(`http://localhost:${port}`);
        if (resp.ok || resp.status === 304) {
          onResolve();
          return;
        }
      } catch {
        // Server not ready yet
      }
      if (Date.now() - start > timeoutMs) {
        onReject(
          new Error(
            `Server on port ${port} did not start within ${timeoutMs}ms`,
          ),
        );
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

function killPort(port) {
  try {
    execSync(`fuser -k ${port}/tcp`, {stdio: 'pipe'});
  } catch {
    // Nothing on that port
  }
  // Wait briefly for port to free
  try {
    execSync(`sleep 0.5`, {stdio: 'pipe'});
  } catch {
    // ignore
  }
}

function installDeps(exampleDir) {
  // Use npm install since examples are excluded from the pnpm workspace
  execSync('npm install', {
    cwd: exampleDir,
    stdio: 'pipe',
  });
  // Remove the lockfile created by npm (this is a pnpm monorepo)
  const lockfile = resolve(exampleDir, 'package-lock.json');
  if (existsSync(lockfile)) {
    unlinkSync(lockfile);
  }
}

function startDevServer(exampleDir, port) {
  const child = spawn(
    'npx',
    [
      'vite',
      '-c',
      'vite.config.monorepo.ts',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: exampleDir,
      detached: true,
      env: {...process.env, NODE_ENV: 'development'},
      stdio: 'pipe',
    },
  );

  // Unref so the child doesn't keep the parent alive if we exit early
  child.unref();

  child.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error(`  [vite stderr] ${msg.trim()}`);
    }
  });

  return child;
}

async function main() {
  // Ensure output dir exists
  mkdirSync(GALLERY_DIR, {recursive: true});

  // Import chromium from @playwright/test (a direct dependency)
  const {chromium} = await import('@playwright/test');

  const browser = await chromium.launch();

  console.warn(`Capturing screenshots for ${EXAMPLES.length} examples...\n`);

  for (let i = 0; i < EXAMPLES.length; i++) {
    const example = EXAMPLES[i];
    const exampleDir = resolve(ROOT, 'examples', example.dir);
    const outPath = resolve(GALLERY_DIR, `${example.name}.png`);

    console.warn(`[${i + 1}/${EXAMPLES.length}] ${example.name}`);

    if (!existsSync(exampleDir)) {
      console.error(`  Example directory not found: ${exampleDir}`);
      continue;
    }

    // Install deps if needed
    if (!existsSync(resolve(exampleDir, 'node_modules'))) {
      console.warn(`  Installing dependencies...`);
      installDeps(exampleDir);
    }

    // Ensure port is free
    killPort(PORT);

    // Start dev server
    console.warn(`  Starting dev server on port ${PORT}...`);
    startDevServer(exampleDir, PORT);

    try {
      await waitForServer(PORT);
      console.warn('  Server is ready.');

      const page = await browser.newPage({
        viewport: {height: 800, width: 1200},
      });

      await page.goto(`http://localhost:${PORT}`, {
        waitUntil: 'networkidle',
      });

      // Wait for the editor content to render
      if (example.waitForSelector) {
        await page.waitForSelector(example.waitForSelector, {timeout: 15000});
        // Give a moment for any animations/styles to settle
        await page.waitForTimeout(1000);
      }

      await page.screenshot({fullPage: false, path: outPath});
      console.warn(`  Screenshot saved: ${outPath}`);

      await page.close();
    } catch (err) {
      console.error(`  Error capturing ${example.name}: ${err.message}`);
    } finally {
      // Kill the dev server and all its children
      killPort(PORT);
    }
  }

  await browser.close();
  console.warn('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
