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

import {packagesManager} from './shared/packagesManager.js';

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
      if (pkg.getDirectoryName() !== 'shared') {
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

/** @type {Array<[string, Array<string>]>} */
const WEBSITE_EXAMPLE_PATHS = [
  [
    '@examples/agent-example/Editor',
    ['./examples/agent-example/src/Editor.tsx'],
  ],
  ['@examples/website-chat/Editor', ['./examples/website-chat/src/Editor.tsx']],
  [
    '@examples/website-notion/Editor',
    ['./examples/website-notion/src/Editor.tsx'],
  ],
  [
    '@examples/website-rich-input/Editor',
    ['./examples/website-rich-input/src/Editor.tsx'],
  ],
  [
    '@examples/website-toolbar/Editor',
    ['./examples/website-toolbar/src/Editor.tsx'],
  ],
  ['@site/*', ['./packages/lexical-website/*']],
];

async function updateAllTsconfig() {
  const prettierConfig =
    (await prettier.resolveConfig(new URL(import.meta.url).pathname)) || {};
  await updateTsconfig({
    extraPaths: WEBSITE_EXAMPLE_PATHS,
    jsonFileName: './tsconfig.json',
    prettierConfig,
    test: true,
  });
  await updateTsconfig({
    extraPaths: [],
    jsonFileName: './tsconfig.build.json',
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
