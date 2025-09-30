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
const {packagesManager} = require('./shared/packagesManager');
const {PackageMetadata} = require('./shared/PackageMetadata');
const npmToWwwName = require('./www/npmToWwwName');

const monorepoPackageJson = require('./shared/readMonorepoPackageJson')();
// get version from monorepo package.json version
const version = monorepoPackageJson.version;

const publicNpmNames = new Set(
  packagesManager.getPublicPackages().map((pkg) => pkg.getNpmName()),
);

/**
 * @typedef {Record<'import'|'require', Record<string,string>>} ImportRequireExports
 */

/**
 * - Set the version to the monorepo ./package.json version
 * - Update dependencies, devDependencies, and peerDependencies
 * - Update the exports map and set other required default fields
 * @param {PackageMetadata} pkg
 */
function updatePackage(pkg) {
  pkg.packageJson.version = version;
  updateDependencies(pkg);
  if (!pkg.isPrivate()) {
    updatePublicPackage(pkg);
  }
  pkg.writeSync();
}

/**
 * Update every package.json in the packages/ and examples/ directories
 *
 * - Set the version to the monorepo ./package.json version
 * - Update the versions of monorepo dependencies, devDependencies, and peerDependencies
 * - Update the exports map and set other required default fields
 *
 */
function updateVersion() {
  packagesManager.getPackages().forEach(updatePackage);
  glob
    .sync([
      './examples/*/package.json',
      './scripts/__tests__/integration/fixtures/*/package.json',
    ])
    .forEach((packageJsonPath) =>
      updatePackage(new PackageMetadata(packageJsonPath)),
    );
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
 * @param {string} basename the name of the entry point module without an extension (e.g. 'index')
 * @param {string} [typesBasename]
 * @returns {ImportRequireExports} The export map for this file
 */
function exportEntry(basename, typesBasename = `${basename}.d.ts`) {
  // Bundlers such as webpack require 'types' to be first and 'default' to be
  // last per #5731. Keys are in descending priority order.
  const prefix = `./${basename}`;
  const types = `./${typesBasename}`;
  return {
    /* eslint-disable sort-keys-fix/sort-keys-fix */
    import: {
      types,
      ...withEnvironments(`${prefix}.mjs`),
      node: `${prefix}.node.mjs`,
      default: `${prefix}.mjs`,
    },
    require: {
      types,
      ...withEnvironments(`${prefix}.js`),
      default: `${prefix}.js`,
    },
    /* eslint-enable sort-keys-fix/sort-keys-fix */
  };
}

/**
 * Add a browser condition for a particular entry point in the package.json
 *
 * @param {string} basename the name of the entry point module without an extension (e.g. 'index')
 * @param {string} [typesBasename]
 * @param {ImportRequireExports} exports
 * @returns {Record<'browser'|'import'|'require', Record<string,string>>} The export map for this file
 */
function withBrowser(exports) {
  const browser = Object.fromEntries(
    Object.entries(exports.import).flatMap(([k, v]) => {
      if (k === 'node') {
        return [];
      } else if (k === 'types') {
        return [[k, v]];
      }
      return [[k, v.replace(/((?:\.dev|\.prod)?\.m?js)$/, '.browser$1')]];
    }),
  );
  return {browser, ...exports};
}

/**
 * Update the public package's packageJson in-place to add default configurations
 * for `sideEffects` and `module` as well as to maintain the `exports` map.
 *
 * @param {PackageMetadata} pkg
 */
function updatePublicPackage(pkg) {
  const {packageJson} = pkg;
  if (packageJson.sideEffects === undefined) {
    packageJson.sideEffects = false;
  }
  // If there's a main we expect a single entry point
  if (packageJson.main) {
    packageJson.module = replaceExtension(packageJson.main, '.mjs');
    packageJson.exports = {
      '.': exportEntry(
        replaceExtension(packageJson.main, ''),
        packageJson.types,
      ),
    };
  } else {
    const exports = {};
    // Export all src/*.tsx? files that do not have a prefix extension (e.g. no .d.ts)
    for (const fn of fs.readdirSync(pkg.resolve('src'))) {
      if (/^[^.]+\.tsx?$/.test(fn)) {
        const basename = fn.replace(/\.tsx?$/, '');
        const hasBrowser = fs.existsSync(
          pkg.resolve('src', fn.replace(/(\.tsx?)$/, '.browser$1')),
        );
        const packageName = pkg.getNpmName();
        const isIndex = basename === 'index';
        const entryNameInput = isIndex
          ? packageName
          : `${packageName}/${basename}`;
        const entryName = npmToWwwName(entryNameInput);
        let entry = exportEntry(entryName, `${basename}.d.ts`);
        if (hasBrowser) {
          entry = withBrowser(entry);
        }
        // support for import "@lexical/react/LexicalComposer"
        exports[isIndex ? '.' : `./${basename}`] = entry;
        if (!hasBrowser && !isIndex) {
          // support for import "@lexical/react/LexicalComposer.js"
          // @mdxeditor/editor uses this at least as of v3.46.0
          exports[`./${basename}.js`] = entry;
        }
      }
    }
    packageJson.exports = exports;
  }
}

/**
 * Update dependencies and peerDependencies in pkg in-place.
 * All entries for monorepo packages will be updated to version.
 * All peerDependencies for monorepo packages will be moved to dependencies.
 *
 * @param {PackageMetadata} pkg
 */
function updateDependencies(pkg) {
  const {packageJson} = pkg;
  const {
    dependencies = {},
    peerDependencies = {},
    devDependencies = {},
  } = packageJson;
  [dependencies, devDependencies].forEach((deps) => {
    Object.keys(deps).forEach((dep) => {
      if (publicNpmNames.has(dep)) {
        deps[dep] = version;
      }
    });
  });
  // Move peerDependencies on lexical monorepo packages to dependencies
  // per #5783
  Object.keys(peerDependencies).forEach((peerDep) => {
    if (publicNpmNames.has(peerDep)) {
      delete peerDependencies[peerDep];
      dependencies[peerDep] = version;
    }
  });
  pkg
    .sortDependencies('dependencies', dependencies)
    .sortDependencies('devDependencies', devDependencies)
    .sortDependencies('peerDependencies', peerDependencies);
}

updateVersion();
