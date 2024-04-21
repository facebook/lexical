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

const LONG_TIMEOUT = 60 * 1000;

/**
 * exec the command in a child process from the given directory.
 *
 * @param {string} dir
 * @param  {Parameters<typeof exec>} args
 * @returns {Promise<string>}
 */
async function dirExec(dir, ...args) {
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    return await exec(...args);
  } finally {
    process.chdir(cwd);
  }
}

exports.dirExec = dirExec;

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
  const installDeps = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ].flatMap((depType) => {
    const deps = packageJson[depType] || {};
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
  await dirExec(
    exampleDir,
    `npm install --no-save --no-package-lock ${installDeps
      .map((fn) => `'${fn}'`)
      .join(' ')}`,
  );
  await dirExec(exampleDir, `npm run build`);
}

/**
 * Build the example project with prerelease lexical artifacts
 *
 * @param {string} packgeJsonPath
 * @param {(ctx: ExampleContext) => void} bodyFun
 */
function describeExample(packageJsonPath, bodyFun) {
  const packageJson = fs.readJsonSync(packageJsonPath);
  const exampleDir = path.dirname(packageJsonPath);
  /** @type {ExampleContext} */
  const ctx = {exampleDir, packageJson, packageJsonPath};
  describe(exampleDir, () => {
    beforeAll(async () => buildExample(ctx), LONG_TIMEOUT);
    test('install & build succeeded', () => {
      expect(true).toBe(true);
    });
    test('installed lexical', () => {
      expect(
        fs.existsSync(path.join(exampleDir, 'node_modules', 'lexical')),
      ).toBe(true);
    });
    if (packageJson.scripts.test) {
      test(
        'tests pass',
        async () => {
          expect(await dirExec(exampleDir, 'npm run build')).not.toBe(null);
        },
        LONG_TIMEOUT,
      );
    }
    bodyFun(ctx);
  });
}

exports.describeExample = describeExample;
