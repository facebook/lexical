/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs-extra';
import {glob} from 'glob';
import path from 'node:path';

import {PackageMetadata} from './shared/PackageMetadata.mjs';
import {packagesManager} from './shared/packagesManager.mjs';
import readMonorepoPackageJson from './shared/readMonorepoPackageJson.mjs';
import npmToWwwName from './www/npmToWwwName.mjs';

const monorepoPackageJson = readMonorepoPackageJson();
// get version from monorepo package.json version
const version = monorepoPackageJson.version;

const publicNpmNames = new Set(
  packagesManager.getPublicPackages().map(pkg => pkg.getNpmName()),
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
    .forEach(packageJsonPath =>
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
 * The subdirectory of a package that holds built artifacts (and is what
 * the public exports/main/types fields resolve into). Keeping this in one
 * place makes the package directory itself a publishable npm package and
 * allows `pnpm link` / `file:` consumers to point at the package root.
 */
const DIST_DIR = 'dist';

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
  const prefix = `./${DIST_DIR}/${basename}`;
  const types = `./${DIST_DIR}/${typesBasename}`;
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
 * Strip any leading './' or 'dist/' segment from a path stored in
 * package.json. Existing package.json fields may be `Lexical.js`,
 * `./Lexical.js`, or `./dist/Lexical.js` depending on when they were
 * last written; normalize to the bare basename for derivation.
 *
 * @param {string} value
 * @returns {string}
 */
function stripDistPrefix(value) {
  return value.replace(/^(\.\/)?(dist\/)?/, '');
}

/**
 * Files that should be present alongside package.json in every public
 * package directory so it ships as a complete npm package without any
 * separate copy-into-`npm/` step. Listed in publish order.
 */
const PUBLIC_FILES_FIELD = ['dist', 'README.md', 'LICENSE'];

/**
 * Copy the monorepo LICENSE into the package directory. The published
 * tarball must contain the LICENSE next to package.json; doing this
 * during `update-packages` keeps the working tree publishable without
 * relying on the previous prepare-release copy step.
 *
 * @param {PackageMetadata} pkg
 */
function ensureLicense(pkg) {
  const dest = pkg.resolve('LICENSE');
  fs.copySync(path.resolve('LICENSE'), dest);
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
    const mainBase = stripDistPrefix(packageJson.main);
    const typesBase = packageJson.types
      ? stripDistPrefix(packageJson.types)
      : undefined;
    packageJson.main = `./${DIST_DIR}/${mainBase}`;
    packageJson.module = `./${DIST_DIR}/${replaceExtension(mainBase, '.mjs')}`;
    if (typesBase) {
      packageJson.types = `./${DIST_DIR}/${typesBase}`;
    }
    packageJson.exports = {
      '.': exportEntry(replaceExtension(mainBase, ''), typesBase),
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
  // Whitelist what ships to npm. The package root is the publish root, so
  // we no longer need a separate `npm/` copy step.
  packageJson.files = [...PUBLIC_FILES_FIELD];
  ensureLicense(pkg);
}

/**
 * Update dependencies and peerDependencies in pkg in-place.
 * All entries for monorepo packages will be updated to version.
 * All peerDependencies for monorepo packages will be moved to dependencies.
 *
 * @param {PackageMetadata} pkg
 */
function updateDependencies(pkg) {
  // examples should use exact versions since they
  // are not currently in the workspace
  const depVersion =
    path.basename(pkg.resolve('..')) !== 'packages' ? version : 'workspace:*';
  const {packageJson} = pkg;
  const {
    dependencies = {},
    peerDependencies = {},
    devDependencies = {},
  } = packageJson;
  [dependencies, devDependencies].forEach(deps => {
    Object.keys(deps).forEach(dep => {
      if (publicNpmNames.has(dep)) {
        deps[dep] = depVersion;
      }
    });
  });
  // Move peerDependencies on lexical monorepo packages to dependencies
  // per #5783
  Object.keys(peerDependencies).forEach(peerDep => {
    if (publicNpmNames.has(peerDep)) {
      delete peerDependencies[peerDep];
      dependencies[peerDep] = depVersion;
    }
  });
  pkg
    .sortDependencies('dependencies', dependencies)
    .sortDependencies('devDependencies', devDependencies)
    .sortDependencies('peerDependencies', peerDependencies);
}

updateVersion();
