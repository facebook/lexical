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
 *   pnpm run capture-gallery-screenshots
 *
 * Prerequisites:
 *   - Playwright browsers installed (npx playwright install chromium)
 *
 * Output:
 *   Screenshots are saved to packages/lexical-website/static/img/gallery/
 *
 * Example list is defined in scripts/gallery-examples.ts.
 */

import {execSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, unlinkSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {type GalleryExample, galleryExamples} from './gallery-examples';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GALLERY_DIR = resolve(
  ROOT,
  'packages/lexical-website/static/img/gallery',
);

// Only screenshot examples that have a waitForSelector configured
const EXAMPLES = galleryExamples.filter(
  (ex): ex is GalleryExample & {waitForSelector: string} =>
    ex.waitForSelector != null,
);

const PORT = 5180;

function waitForServer(port: number, timeoutMs = 60000): Promise<void> {
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

function killPort(port: number): void {
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

function installDeps(exampleDir: string): void {
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

function startDevServer(exampleDir: string, port: number): void {
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

  child.stderr.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error(`  [vite stderr] ${msg.trim()}`);
    }
  });
}

async function main(): Promise<void> {
  // Ensure output dir exists
  mkdirSync(GALLERY_DIR, {recursive: true});

  // Import chromium from @playwright/test (a direct dependency)
  const {chromium} = await import('@playwright/test');

  const browser = await chromium.launch();

  console.warn(`Capturing screenshots for ${EXAMPLES.length} examples...\n`);

  for (let i = 0; i < EXAMPLES.length; i++) {
    const example = EXAMPLES[i];
    const exampleDir = resolve(ROOT, 'examples', example.dir);
    const outPath = resolve(GALLERY_DIR, `${example.dir}.png`);

    console.warn(`[${i + 1}/${EXAMPLES.length}] ${example.dir}`);

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
      await page.waitForSelector(example.waitForSelector, {timeout: 15000});
      // Give a moment for any animations/styles to settle
      await page.waitForTimeout(1000);

      await page.screenshot({fullPage: false, path: outPath});
      console.warn(`  Screenshot saved: ${outPath}`);

      await page.close();
    } catch (err) {
      console.error(
        `  Error capturing ${example.dir}: ${(err as Error).message}`,
      );
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
