/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs-extra';
import {globSync} from 'glob';
import path from 'node:path';
import prettier from 'prettier';

import {packagesManager} from './shared/packagesManager.mjs';

/**
 * @typedef {Object} UpdateTsconfigOptions
 * @property {Array<[string, Array<string>]>} extraPaths additional paths to add
 * @property {string} jsonFileName path to the tsconfig.json
 * @property {import('prettier').Options} prettierConfig the monorepo prettier config
 * @property {boolean} test true to include the test paths (default: false)
 */

/**
 * @param {opts} UpdateTsconfigOptions
 * @returns {Promise<void>}
 */
async function updateTsconfig({
  extraPaths,
  jsonFileName,
  prettierConfig,
  test,
}) {
  const prevTsconfigContents = fs.readFileSync(jsonFileName, 'utf8');
  const tsconfig = JSON.parse(prevTsconfigContents);
  const publicPaths = [];
  const privatePaths = [];
  const testPaths = [];
  const configDir = path.resolve(path.dirname(jsonFileName));
  for (const pkg of packagesManager.getPackages()) {
    const resolveRelative = (...subPaths) =>
      path
        .relative(configDir, pkg.resolve(...subPaths))
        .replace(/^(?!\.)/, './');

    if (pkg.isPrivate()) {
      // lexical-test-utils is a private package whose modules are imported
      // (by their package name) from unit tests across the monorepo, so it
      // needs tsconfig path entries just like the old `shared` package did.
      if (pkg.getDirectoryName() !== 'lexical-test-utils') {
        continue;
      }
      for (const {name, sourceFileName} of pkg.getPrivateModuleEntries()) {
        privatePaths.push([name, [resolveRelative('src', sourceFileName)]]);
      }
    } else {
      for (const {name, sourceFileName} of pkg.getExportedNpmModuleEntries()) {
        publicPaths.push([name, [resolveRelative('src', sourceFileName)]]);
      }
    }
    if (test) {
      testPaths.push([`${pkg.getNpmName()}/src`, [resolveRelative('src')]]);
      for (const fn of globSync(
        pkg.resolve('src', '__tests__', 'utils', '*.{ts,tsx,mjs,jsx}'),
        {windowsPathsNoEscape: true},
      )) {
        testPaths.push([
          `${pkg.getNpmName()}/src/__tests__/utils`,
          [resolveRelative(fn)],
        ]);
      }
    }
  }
  const paths = Object.fromEntries([
    ...extraPaths,
    ...publicPaths,
    ...privatePaths,
    ...testPaths,
  ]);
  tsconfig.compilerOptions.paths = paths;
  // This is async in future versions of prettier
  const nextTsconfigContents = await prettier.format(JSON.stringify(tsconfig), {
    ...prettierConfig,
    filepath: jsonFileName,
  });
  if (prevTsconfigContents !== nextTsconfigContents) {
    fs.writeFileSync(jsonFileName, nextTsconfigContents);
  }
}

// Example/site aliases relative to packages/lexical-website (the website
// type-checks the out-of-workspace @examples sources embedded in its docs).
/** @type {Array<[string, Array<string>]>} */
const WEBSITE_EXTRA_PATHS = [
  [
    '@examples/agent-example/Editor',
    ['../../examples/agent-example/src/Editor.tsx'],
  ],
  [
    '@examples/website-chat/Editor',
    ['../../examples/website-chat/src/Editor.tsx'],
  ],
  [
    '@examples/website-notion/Editor',
    ['../../examples/website-notion/src/Editor.tsx'],
  ],
  [
    '@examples/website-rich-input/Editor',
    ['../../examples/website-rich-input/src/Editor.tsx'],
  ],
  [
    '@examples/website-toolbar/Editor',
    ['../../examples/website-toolbar/src/Editor.tsx'],
  ],
  ['@site/*', ['./*']],
];

// The monorepo's package path aliases only need to exist for the configs
// that resolve undeclared cross-package imports: the unit-test typecheck
// (tests import sibling packages without declaring them) and the website
// (it type-checks the @examples sources). The root tsconfig.json and
// tsconfig.build.json are hand-maintained and resolve via the `source`
// export condition (customConditions) instead, so they are not generated
// here.
async function updateAllTsconfig() {
  const prettierConfig =
    (await prettier.resolveConfig(new URL(import.meta.url).pathname)) || {};
  await updateTsconfig({
    extraPaths: [],
    jsonFileName: './tsconfig.test.json',
    prettierConfig,
    test: true,
  });
  await updateTsconfig({
    extraPaths: WEBSITE_EXTRA_PATHS,
    jsonFileName: './packages/lexical-website/tsconfig.json',
    prettierConfig,
    test: false,
  });
  await updateTsconfig({
    extraPaths: [['lexicalOriginal', ['../lexical/src/']]],
    jsonFileName: './packages/lexical-devtools/tsconfig.json',
    prettierConfig,
    test: false,
  });
}

updateAllTsconfig();
