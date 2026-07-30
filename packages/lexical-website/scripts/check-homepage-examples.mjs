/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Smoke test for the built website homepage. A successful `docusaurus build`
// does not catch *runtime* failures in the embedded editor examples — e.g.
// #8860, where a Lexical node-registration invariant crashed an example in the
// optimized dev build. This loads the built homepage in a real browser and
// fails if any embedded example throws while mounting.
//
// Usage: node scripts/check-homepage-examples.mjs
// Assumes `build/` already exists (run the docusaurus build first).

import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(__dirname, '..', 'build');

// The homepage editor examples, keyed by the `data-example-error` marker that
// ExampleErrorBoundary renders on failure (matches `stackblitzPath`).
const EXPECTED_EXAMPLES = [
  'website-notion',
  'website-chat',
  'website-rich-input',
  'agent-example',
];

// External resources (analytics) that may be network-blocked in CI. Errors
// from these are unrelated to the examples and must not fail the check.
const IGNORED_ERROR_PATTERNS = [
  /googletagmanager\.com/,
  /_vercel\//,
  /vercel-insights/,
  /ERR_TUNNEL_CONNECTION_FAILED/,
  /Failed to load resource/,
];

const CONTENT_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function startServer() {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(BUILD_DIR, urlPath);
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!existsSync(filePath)) {
      // Only fall back to the SPA shell for extension-less client routes;
      // a missing asset must 404 so it surfaces as a real failure.
      if (path.extname(urlPath) === '') {
        filePath = path.join(BUILD_DIR, 'index.html');
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }
    res.writeHead(200, {
      'Content-Type':
        CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  if (!existsSync(path.join(BUILD_DIR, 'index.html'))) {
    throw new Error(
      `Missing ${BUILD_DIR}/index.html. Run the website build first ` +
        `(pnpm run --filter @lexical/website build).`,
    );
  }

  const server = await startServer();
  const {port} = server.address();
  const baseURL = `http://127.0.0.1:${port}/`;

  // In CI, Playwright resolves its own browser from the default cache. Allow
  // an explicit override (e.g. for sandboxes with a shared browser install).
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? {executablePath} : {});
  const page = await browser.newPage();

  const errors = [];
  const keep = source => text => {
    if (!IGNORED_ERROR_PATTERNS.some(re => re.test(text))) {
      errors.push(`[${source}] ${text}`);
    }
  };
  page.on('pageerror', err => keep('pageerror')(err.stack || err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      keep('console.error')(msg.text());
    }
  });

  let brokenExamples = [];
  let renderedEditors = 0;
  try {
    await page.goto(baseURL, {timeout: 60000, waitUntil: 'load'});
    // The examples are below the fold; some are lazy-loaded on scroll.
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(800);
    }
    await page.waitForTimeout(2000);

    brokenExamples = await page.$$eval('[data-example-error]', nodes =>
      nodes.map(n => n.getAttribute('data-example-error')),
    );
    renderedEditors = await page.$$eval(
      '[data-lexical-editor]',
      nodes => nodes.length,
    );
  } finally {
    await browser.close();
    server.close();
  }

  const problems = [];
  if (brokenExamples.length > 0) {
    problems.push(
      `Example error boundaries triggered: ${brokenExamples.join(', ')}`,
    );
  }
  if (errors.length > 0) {
    problems.push(`Runtime errors on the homepage:\n  ${errors.join('\n  ')}`);
  }
  // At minimum the three synchronous editors must mount. The agent example is
  // lazy/browser-only and may not finish mounting its heavy worker in CI, so we
  // do not require all four editors here — a crash in it still surfaces via the
  // error boundary marker above.
  if (renderedEditors < EXPECTED_EXAMPLES.length - 1) {
    problems.push(
      `Only ${renderedEditors} editor(s) mounted, expected at least ` +
        `${EXPECTED_EXAMPLES.length - 1}.`,
    );
  }

  if (problems.length > 0) {
    console.error('\n❌ Homepage examples check FAILED:\n');
    for (const p of problems) {
      console.error(`  • ${p}`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `✅ Homepage examples OK (${renderedEditors} editors mounted, no ` +
      `runtime errors, no broken examples).\n`,
  );
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
