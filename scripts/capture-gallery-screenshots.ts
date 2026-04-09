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
 * Example list is defined in packages/lexical-website/src/components/Gallery/galleryExamples.ts.
 */

import {type ChildProcess, execSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, unlinkSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  type GalleryExample,
  galleryExamples,
} from '../packages/lexical-website/src/components/Gallery/galleryExamples';

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
const IS_WINDOWS = process.platform === 'win32';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

function installDeps(exampleDir: string): void {
  // --ignore-workspace so pnpm installs this example's own deps
  // rather than running the monorepo workspace install.
  // shell: true isolates the child from the tsx loader.
  execSync('pnpm install --ignore-workspace', {
    cwd: exampleDir,
    shell: true,
    stdio: 'pipe',
  });
  // Run the prepare script if it exists (e.g. svelte-kit sync)
  try {
    execSync('pnpm run --if-present prepare', {
      cwd: exampleDir,
      shell: true,
      stdio: 'pipe',
    });
  } catch {
    // prepare is optional
  }
  // Remove the lockfile created for this standalone install
  const lockfile = resolve(exampleDir, 'pnpm-lock.yaml');
  if (existsSync(lockfile)) {
    unlinkSync(lockfile);
  }
}

function getViteConfig(exampleDir: string, explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  const monorepo = resolve(exampleDir, 'vite.config.monorepo.ts');
  return existsSync(monorepo) ? 'vite.config.monorepo.ts' : 'vite.config.ts';
}

function startDevServer(
  exampleDir: string,
  port: number,
  viteConfig: string,
): ChildProcess {
  const child = spawn(
    IS_WINDOWS ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'vite', '-c', viteConfig, '--port', String(port), '--strictPort'],
    {
      cwd: exampleDir,
      env: {...process.env, NODE_ENV: 'development'},
      stdio: 'pipe',
      // On Unix, create a process group so we can kill the tree
      ...(IS_WINDOWS ? {} : {detached: true}),
    },
  );

  child.stderr.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error(`  [vite stderr] ${msg.trim()}`);
    }
  });

  return child;
}

function killProcessTree(child: ChildProcess): void {
  if (child.exitCode !== null || child.pid == null) {
    return;
  }
  try {
    if (IS_WINDOWS) {
      // taskkill /T kills the process tree on Windows
      execSync(`taskkill /T /F /PID ${child.pid}`, {stdio: 'pipe'});
    } else {
      // Kill the process group (negative pid) on Unix
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    // Process may already be dead
  }
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

    // Start dev server
    const viteConfig = getViteConfig(exampleDir, example.viteConfig);
    console.warn(`  Starting dev server on port ${PORT} (${viteConfig})...`);
    const child = startDevServer(exampleDir, PORT, viteConfig);

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
      killProcessTree(child);
      // Brief pause to let the port free up before the next server
      await sleep(500);
    }
  }

  await browser.close();
  console.warn('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
