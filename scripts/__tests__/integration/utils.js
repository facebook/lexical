/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const {exec} = require('child-process-promise');
const {packagesManager} = require('../../shared/packagesManager');
const fs = require('fs-extra');
const path = require('node:path');

const monorepoVersion = require('../../shared/readMonorepoPackageJson')()
  .version;

const LONG_TIMEOUT = 240 * 1000;

/**
 * @function
 * @template T
 * @param {string} dir
 * @param {() => Promise<T> | T} cb
 * @returns {Promise<T>}
 */
async function withCwd(dir, cb) {
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    return await cb();
  } finally {
    process.chdir(cwd);
  }
}
exports.withCwd = withCwd;

/**
 * @param {string} cmd
 * @returns {Promise<string>}
 */
function expectSuccessfulExec(cmd) {
  // clear out parts of the environment that would confuse
  // node, npm and playwright.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== 'JEST_WORKER_ID'),
  );
  // Ensure PATH includes node binary directory
  if (
    process.execPath &&
    env.PATH &&
    !env.PATH.includes(path.dirname(process.execPath))
  ) {
    env.PATH = `${path.dirname(process.execPath)}:${env.PATH}`;
  } else if (process.execPath && !env.PATH) {
    env.PATH = path.dirname(process.execPath);
  }
  // Prevent npm from trying to be interactive
  env.CI = 'true';
  env.npm_config_yes = 'true';

  return exec(cmd, {
    capture: ['stdout', 'stderr'],
    env,
    // Provide empty stdin to prevent hanging on input
    stdio: ['ignore', 'pipe', 'pipe'],
  }).catch((err) => {
    expect(
      Object.fromEntries(
        ['code', 'stdout', 'stderr'].map((prop) => [prop, err[prop]]),
      ),
    ).toBe(null);
    throw err;
  });
}
exports.expectSuccessfulExec = expectSuccessfulExec;

/**
 * @typedef {Object} ExampleContext
 * @property {string} packageJsonPath
 * @property {string} exampleDir
 * @property {Record<string, any>} packageJson
 */

/**
 * @param {ctx} ExampleContext
 * @returns {Promise<Map<string, PackageMetadata>>} The installed monorepo dependency map
 */
async function buildExample({packageJson, exampleDir}) {
  let hasPlaywright = false;
  /** @type {Map<string, string} */
  const allDeps = new Map();
  for (const depType of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'lexicalUnreleasedDependencies',
  ]) {
    const deps = packageJson[depType] || {};
    hasPlaywright ||= '@playwright/test' in deps;
    for (const [dep, v] of Object.entries(deps)) {
      allDeps.set(dep, `${dep}@${v}`);
    }
  }
  const depsMap = packagesManager.computedMonorepoDependencyMap([
    ...allDeps.keys(),
  ]);
  if (depsMap.size === 0) {
    throw new Error(`No lexical dependencies detected: ${exampleDir}`);
  }
  const installDeps = Array.from(depsMap.entries(), ([dep, pkg]) =>
    path.resolve('npm', `${pkg.getDirectoryName()}-${monorepoVersion}.tgz`),
  );
  ['node_modules', 'dist', 'build', '.next', '.svelte-kit'].forEach(
    (cleanDir) => fs.removeSync(path.resolve(exampleDir, cleanDir)),
  );

  const packageJsonPath = path.resolve(exampleDir, 'package.json');
  const packageJsonBackup = fs.readFileSync(packageJsonPath, 'utf8');

  try {
    await withCwd(exampleDir, async () => {
      console.log(`[${exampleDir}] Starting npm install...`);
      // First install regular dependencies from package.json
      // This ensures optional dependencies like @rollup/rollup-linux-x64-gnu are installed
      await expectSuccessfulExec('npm install');
      console.log(`[${exampleDir}] npm install complete`);

      console.log(`[${exampleDir}] Installing tarballs...`);
      // Install tarballs (will modify package.json, but we'll restore it)
      // Not using --no-save to avoid npm bug with optional dependencies
      // See https://github.com/npm/cli/issues/4828
      await expectSuccessfulExec(
        `npm install ${installDeps.map((fn) => `'${fn}'`).join(' ')}`,
      );
      console.log(`[${exampleDir}] Tarballs installed`);

      console.log(`[${exampleDir}] Running build...`);
      await expectSuccessfulExec('npm run build');
      console.log(`[${exampleDir}] Build complete`);

      if (hasPlaywright) {
        console.log(`[${exampleDir}] Installing Playwright...`);
        await expectSuccessfulExec('npx playwright install');
        console.log(`[${exampleDir}] Playwright installed`);
      }
    });
  } finally {
    // Restore package.json to original state
    console.log(`[${exampleDir}] Restoring package.json`);
    fs.writeFileSync(packageJsonPath, packageJsonBackup);
  }
  return depsMap;
}

/**
 * Build the example project with prerelease lexical artifacts
 *
 * @param {string} packgeJsonPath
 * @param {undefined | (ctx: ExampleContext) => void} [bodyFun=undefined]
 */
function describeExample(packageJsonPath, bodyFun = undefined) {
  const packageJson = fs.readJsonSync(packageJsonPath);
  const exampleDir = path.dirname(packageJsonPath);
  /** @type {ExampleContext} */
  const ctx = {exampleDir, packageJson, packageJsonPath};
  describe(exampleDir, () => {
    /** @type {PackageMetadata[]} */
    const deps = [];
    beforeAll(async () => {
      deps.push(...(await buildExample(ctx)).values());
    }, LONG_TIMEOUT);
    test('install & build succeeded', () => {
      expect(true).toBe(true);
    });
    test(`installed lexical ${monorepoVersion}`, () => {
      const packageNames = deps.map((pkg) => pkg.getNpmName());
      expect(packageNames).toContain('lexical');
      for (const pkg of deps) {
        const installedPath = path.join(
          exampleDir,
          'node_modules',
          pkg.getNpmName(),
        );
        expect({[installedPath]: fs.existsSync(installedPath)}).toEqual({
          [installedPath]: true,
        });
        expect(
          fs.readJsonSync(path.join(installedPath, 'package.json')),
        ).toMatchObject({name: pkg.getNpmName(), version: monorepoVersion});
      }
    });
    if (packageJson.scripts.test) {
      test(
        'tests pass',
        async () => {
          await withCwd(exampleDir, () =>
            expectSuccessfulExec('pnpm run test'),
          );
        },
        LONG_TIMEOUT,
      );
    }
    if (bodyFun) {
      bodyFun(ctx);
    }
  });
}

exports.describeExample = describeExample;
