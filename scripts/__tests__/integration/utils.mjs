/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
import fs from 'fs-extra';
import {glob} from 'glob';
import path from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';

import {exec} from '../../shared/childProcess.mjs';
import {packagesManager} from '../../shared/packagesManager.mjs';
import readMonorepoPackageJson from '../../shared/readMonorepoPackageJson.mjs';

/** @typedef {import('../../shared/PackageMetadata.mjs').PackageMetadata} PackageMetadata */

const monorepoVersion = readMonorepoPackageJson().version;

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

/**
 * @param {string} cmd
 * @returns {Promise<{stdout: string; stderr: string}>}
 */
function expectSuccessfulExec(cmd) {
  // Filter out VITEST_WORKER_ID to prevent Playwright from detecting Vitest environment
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== 'VITEST_WORKER_ID'),
  );
  return exec(cmd, {env}).catch(err => {
    expect(
      Object.fromEntries(
        ['code', 'stdout', 'stderr'].map(prop => [prop, err[prop]]),
      ),
    ).toBe(null);
    throw err;
  });
}

/**
 * @typedef {Object} ExampleContext
 * @property {string} packageJsonPath
 * @property {string} exampleDir
 * @property {Record<string, any>} packageJson
 */

/**
 * @param {ExampleContext} ctx
 * @returns {Promise<Map<string, PackageMetadata>>} The installed monorepo dependency map
 */
async function buildExample({packageJson, packageJsonPath, exampleDir}) {
  let hasPlaywright = false;
  /** @type {Map<string, string>} */
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
  // Build pnpm.overrides entries pointing each monorepo dep at its
  // freshly built tarball. We layer them on top of any pnpm.overrides
  // the example already declares (e.g. agent-example's stubs for
  // onnxruntime-node / sharp) so the existing overrides keep firing.
  const lexicalOverrides = Object.fromEntries(
    Array.from(depsMap.entries(), ([dep, pkg]) => [
      dep,
      `file:${path.resolve(
        'npm',
        `${pkg.getDirectoryName()}-${monorepoVersion}.tgz`,
      )}`,
    ]),
  );
  const augmentedPackageJson = {
    ...packageJson,
    pnpm: {
      ...(packageJson.pnpm || {}),
      overrides: {
        ...((packageJson.pnpm && packageJson.pnpm.overrides) || {}),
        ...lexicalOverrides,
      },
    },
  };
  const originalPackageJsonBytes = fs.readFileSync(packageJsonPath);
  [
    'node_modules',
    'dist',
    'build',
    '.next',
    '.svelte-kit',
    'pnpm-lock.yaml',
  ].forEach(cleanPath => fs.removeSync(path.resolve(exampleDir, cleanPath)));

  try {
    fs.writeJsonSync(packageJsonPath, augmentedPackageJson, {spaces: 2});
    await withCwd(exampleDir, async () => {
      await expectSuccessfulExec('pnpm install --ignore-workspace');
      await expectSuccessfulExec('pnpm run build');
      if (hasPlaywright) {
        await expectSuccessfulExec('pnpm exec playwright install');
      }
    });
  } finally {
    // Restore the unmodified package.json so the test doesn't leave a
    // dirty working tree behind (the file-path overrides reference an
    // absolute path on the runner that wouldn't make sense elsewhere).
    fs.writeFileSync(packageJsonPath, originalPackageJsonBytes);
  }
  return depsMap;
}

/**
 * Build the example project with prerelease lexical artifacts
 *
 * @param {string} packageJsonPath
 * @param {undefined | ((ctx: ExampleContext) => void)} [bodyFun=undefined]
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
      const packageNames = deps.map(pkg => pkg.getNpmName());
      expect(packageNames).toContain('lexical');
      for (const pkg of deps) {
        const name = pkg.getNpmName();
        // Direct deps surface as `node_modules/<name>/` symlinks (pnpm)
        // or real dirs (npm). Transitive deps without a top-level entry
        // live under `node_modules/.pnpm/<encoded>@<ver>[+peer-hash]/
        // node_modules/<name>/`, so glob both shapes and pick the first
        // package.json with a matching name + version.
        const candidates = [
          path.join(exampleDir, 'node_modules', name, 'package.json'),
          ...glob.sync(
            `node_modules/.pnpm/*/node_modules/${name}/package.json`,
            {
              absolute: true,
              cwd: exampleDir,
            },
          ),
        ];
        const match = candidates.find(candidate => {
          if (!fs.existsSync(candidate)) {
            return false;
          }
          const json = fs.readJsonSync(candidate);
          return json.name === name && json.version === monorepoVersion;
        });
        if (match === undefined) {
          throw new Error(
            `Could not find ${name}@${monorepoVersion} under ${exampleDir}/node_modules (searched ${candidates.length} candidate${candidates.length === 1 ? '' : 's'})`,
          );
        }
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

/**
 * Describe a dev-example that uses workspace:* deps.
 * These are built in-place using pnpm (workspace linking) rather than tarballs.
 *
 * @param {string} packageJsonPath
 */
function describeDevExample(packageJsonPath) {
  const packageJson = fs.readJsonSync(packageJsonPath);
  const exampleDir = path.dirname(packageJsonPath);
  describe(exampleDir, () => {
    beforeAll(async () => {
      await withCwd(exampleDir, async () => {
        await expectSuccessfulExec('pnpm install');
        await expectSuccessfulExec('pnpm run build');
      });
    }, LONG_TIMEOUT);
    test('build succeeded', () => {
      expect(true).toBe(true);
    });
    if (packageJson.scripts && packageJson.scripts.test) {
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
  });
}

/**
 * Describe a fixture that consumes monorepo packages via pnpm's link:
 * protocol. The fixture is intentionally outside the pnpm workspace, so
 * `pnpm install --ignore-workspace` resolves link: deps as real symlinks
 * into packages/ — the workflow real consumers use with `pnpm link`.
 *
 * @param {string} packageJsonPath
 */
function describeLinkedFixture(packageJsonPath) {
  const packageJson = fs.readJsonSync(packageJsonPath);
  const exampleDir = path.dirname(packageJsonPath);
  describe(exampleDir, () => {
    beforeAll(async () => {
      // Wipe lockfile + node_modules so each run hits the linked package
      // freshly (paranoia against stale pnpm content-addressable caches).
      for (const cleanPath of ['node_modules', 'pnpm-lock.yaml', 'dist']) {
        fs.removeSync(path.resolve(exampleDir, cleanPath));
      }
      await withCwd(exampleDir, async () => {
        await expectSuccessfulExec('pnpm install --ignore-workspace');
        await expectSuccessfulExec('pnpm run build');
      });
    }, LONG_TIMEOUT);
    test('build succeeded', () => {
      expect(true).toBe(true);
    });
    if (packageJson.scripts && packageJson.scripts.test) {
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
  });
}

/**
 * @param {Record<string, any>} packageJson
 * @returns {boolean} true if any dependency uses pnpm's link: protocol
 */
function hasLinkProtocolDeps(packageJson) {
  for (const depType of ['dependencies', 'devDependencies']) {
    const deps = packageJson[depType] || {};
    if (
      Object.values(deps).some(
        v => typeof v === 'string' && v.startsWith('link:'),
      )
    ) {
      return true;
    }
  }
  return false;
}

export {
  describeDevExample,
  describeExample,
  describeLinkedFixture,
  expectSuccessfulExec,
  hasLinkProtocolDeps,
  withCwd,
};
