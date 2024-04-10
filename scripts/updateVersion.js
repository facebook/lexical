/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs-extra');
const glob = require('glob');

const packages = {
  '@lexical/clipboard': 'lexical-clipboard',
  '@lexical/code': 'lexical-code',
  '@lexical/dragon': 'lexical-dragon',
  '@lexical/file': 'lexical-file',
  '@lexical/hashtag': 'lexical-hashtag',
  '@lexical/headless': 'lexical-headless',
  '@lexical/history': 'lexical-history',
  '@lexical/html': 'lexical-html',
  '@lexical/link': 'lexical-link',
  '@lexical/list': 'lexical-list',
  '@lexical/mark': 'lexical-mark',
  '@lexical/markdown': 'lexical-markdown',
  '@lexical/offset': 'lexical-offset',
  '@lexical/overflow': 'lexical-overflow',
  '@lexical/plain-text': 'lexical-plain-text',
  '@lexical/react': 'lexical-react',
  '@lexical/rich-text': 'lexical-rich-text',
  '@lexical/selection': 'lexical-selection',
  '@lexical/table': 'lexical-table',
  '@lexical/text': 'lexical-text',
  '@lexical/utils': 'lexical-utils',
  '@lexical/yjs': 'lexical-yjs',
  lexical: 'lexical',
  'lexical-playground': 'lexical-playground',
  shared: 'shared',
};

/**
 * Update every package.json in the packages/ directory from the packages
 * list above.
 *
 * - Set the version to the monorepo ./package.json version
 * - Update the dependencies and peerDependencies
 * - Update the exports map and set other required default fields
 *
 * Also scans the examples/ directory for package.json files and updates
 * their dependencies as well, so the examples are kept up to date with
 * the most recently published version of lexical.
 */
function updateVersion() {
  // get version from monorepo package.json version
  const basePackageJSON = fs.readJsonSync(`./package.json`);
  const version = basePackageJSON.version;
  // update individual packages
  Object.values(packages).forEach((pkg) => {
    const packageJSON = fs.readJsonSync(`./packages/${pkg}/package.json`);
    packageJSON.version = version;
    updateDependencies(packageJSON, version);
    updateModule(packageJSON, pkg);
    fs.writeJsonSync(`./packages/${pkg}/package.json`, packageJSON, {
      spaces: 2,
    });
  });
  // update dependencies in the examples
  glob.sync('./examples/*/package.json').forEach((fn) => {
    const packageJSON = fs.readJsonSync(fn);
    packageJSON.version = version;
    updateDependencies(packageJSON, version);
    fs.writeJsonSync(fn, packageJSON, {
      spaces: 2,
    });
  });
}

/**
 * Replace the extension in a .js or .mjs filename with another extension.
 * Used to convert between the two or to add a prefix before the extension.
 *
 * `ext` may contain $1 to use the original extension in the
 * replacement, e.g. replaceExtension('foo.js', '.bar$1') -> 'foo.bar.js'
 *
 * @param {string} fileName
 * @param {string} ext
 * @returns {string} fileName with ext as the new extension
 */
function replaceExtension(fileName, ext) {
  return fileName.replace(/(\.m?js)$/, ext);
}

/**
 * Replace a .js filename with .mjs, this extension is required for maximal
 * ESM compatibility because bundlers and node have hard-coded behavior for
 * files of this extension.
 *
 * @param {string} fileName
 * @returns {string} fileName with .mjs instead of .js
 */
function withEsmExtension(fileName) {
  return replaceExtension(fileName, '.mjs');
}

/**
 * Used for naming node condition ESM fork modules, which can use top-level
 * await.
 *
 * @param {string} fileName
 * @returns {string} fileName with .node.mjs extension
 */
function withNodeEsmExtension(fileName) {
  return replaceExtension(fileName, '.node.mjs');
}

/**
 * webpack can use these conditions to choose a dev or prod
 * build without a fork module, which is especially helpful
 * in the ESM build.
 *
 * @param {string} fileName may have .js or .mjs extension
 * @returns {Record<'development'|'production', string>}
 */
function withEnvironments(fileName) {
  return {
    development: replaceExtension(fileName, '.dev$1'),
    production: replaceExtension(fileName, '.prod$1'),
  };
}

/**
 * Build an export map for a particular entry point in the package.json
 *
 * @param {string} file the path to the cjs build product for an entry point (e.g. 'index.js')
 * @param {string} types the path to the TypeScript .d.ts file
 * @returns {Record<'import'|'require', Record<string,string>>} The export map for this file
 */
function exportEntry(file, types) {
  // Bundlers such as webpack require 'types' to be first and 'default' to be
  // last per #5731. Keys are in descending priority order.
  return {
    /* eslint-disable sort-keys-fix/sort-keys-fix */
    import: {
      types: `./${types}`,
      ...withEnvironments(`./${withEsmExtension(file)}`),
      node: `./${withNodeEsmExtension(file)}`,
      default: `./${withEsmExtension(file)}`,
    },
    require: {
      types: `./${types}`,
      ...withEnvironments(`./${file}`),
      default: `./${file}`,
    },
    /* eslint-enable sort-keys-fix/sort-keys-fix */
  };
}

/**
 * Update the parsed packageJSON in-place to add default configurations
 * for `sideEffects` and `module` as well as to maintain the `exports` map.
 *
 * @param {Record<string, any>} packageJSON
 * @param {string} pkg
 */
function updateModule(packageJSON, pkg) {
  if (packageJSON.sideEffects === undefined) {
    packageJSON.sideEffects = false;
  }
  if (packageJSON.main) {
    packageJSON.module = withEsmExtension(packageJSON.main);
    packageJSON.exports = {
      '.': exportEntry(packageJSON.main, packageJSON.types || 'index.d.ts'),
    };
  } else if (fs.existsSync(`./packages/${pkg}/dist`)) {
    const exports = {};
    for (const file of fs.readdirSync(`./packages/${pkg}/dist`)) {
      if (/^[^.]+\.js$/.test(file)) {
        const entry = exportEntry(file, file.replace(/\.js$/, '.d.ts'));
        // support for import "@lexical/react/LexicalComposer"
        exports[`./${file.replace(/\.js$/, '')}`] = entry;
        // support for import "@lexical/react/LexicalComposer.js"
        // @mdxeditor/editor uses this at least as of 2.13.1
        exports[`./${file}`] = entry;
      }
    }
    packageJSON.exports = exports;
  }
}

/**
 * Replace the dependency map at packageJSON[key] in-place with
 * deps sorted lexically by key. If deps was empty, it will be removed.
 *
 * @param {Record<string, any>} packageJSON
 * @param {'dependencies'|'peerDependencies'} key
 * @param {Record<string, string>} deps
 */
function sortDependencies(packageJSON, key, deps) {
  const entries = Object.entries(deps);
  if (entries.length === 0) {
    delete packageJSON[key];
  } else {
    packageJSON[key] = Object.fromEntries(
      entries.sort((a, b) => a[0].localeCompare(b[0])),
    );
  }
}

/**
 * Update depdenencies and peerDependencies in packageJSON in-place.
 * All entries for monorepo packages will be updated to version.
 * All peerDependencies for monorepo packages will be moved to dependencies.
 *
 * @param {Record<string, any>} packageJSON
 * @param {string} version
 */
function updateDependencies(packageJSON, version) {
  const {dependencies = {}, peerDependencies = {}} = packageJSON;
  Object.keys(dependencies).forEach((dep) => {
    if (packages[dep] !== undefined) {
      dependencies[dep] = version;
    }
  });
  // Move peerDependencies on lexical monorepo packages to dependencies
  // per #5783
  Object.keys(peerDependencies).forEach((peerDep) => {
    if (packages[peerDep] !== undefined) {
      delete peerDependencies[peerDep];
      dependencies[peerDep] = version;
    }
  });
  sortDependencies(packageJSON, 'dependencies', dependencies);
  sortDependencies(packageJSON, 'peerDependencies', peerDependencies);
}

updateVersion();
