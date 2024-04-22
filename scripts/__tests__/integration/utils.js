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
  // playwright detects jest, so we clear this env var while running subcommands
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== 'JEST_WORKER_ID'),
  );
  return exec(cmd, {capture: ['stdout', 'stderr'], env}).catch((err) => {
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

/** @param {ctx} ExampleContext */
async function buildExample({packageJson, exampleDir}) {
  const lexicalPackages = new Map(
    packagesManager.getPublicPackages().map((pkg) => [pkg.getNpmName(), pkg]),
  );
  let hasPlaywright = false;
  const installDeps = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ].flatMap((depType) => {
    const deps = packageJson[depType] || {};
    hasPlaywright ||= '@playwright/test' in deps;
    return Object.keys(deps).flatMap((k) => {
      const pkg = lexicalPackages.get(k);
      return pkg
        ? [
            path.resolve(
              'npm',
              `${pkg.getDirectoryName()}-${pkg.packageJson.version}.tgz`,
            ),
          ]
        : [];
    });
  });
  if (installDeps.length === 0) {
    throw new Error(`No lexical dependencies detected: ${exampleDir}`);
  }
  ['node_modules', 'dist', 'build'].forEach((cleanDir) =>
    fs.removeSync(path.resolve(exampleDir, cleanDir)),
  );
  await withCwd(exampleDir, async () => {
    await exec(
      `npm install --no-save --no-package-lock ${installDeps
        .map((fn) => `'${fn}'`)
        .join(' ')}`,
    );
    await exec('npm run build');
    if (hasPlaywright) {
      await exec('npx playwright install');
    }
  });
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
    beforeAll(async () => buildExample(ctx), LONG_TIMEOUT);
    test('install & build succeeded', () => {
      expect(true).toBe(true);
    });
    test(`installed lexical ${monorepoVersion}`, () => {
      expect(
        fs.existsSync(path.join(exampleDir, 'node_modules', 'lexical')),
      ).toBe(true);
      expect(
        fs.readJsonSync(
          path.join(exampleDir, 'node_modules', 'lexical', 'package.json'),
        ),
      ).toMatchObject({version: monorepoVersion});
    });
    if (packageJson.scripts.test) {
      test(
        'tests pass',
        async () => {
          await withCwd(exampleDir, () => expectSuccessfulExec('npm run test'));
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
