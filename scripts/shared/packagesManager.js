/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const path = require('node:path');
const glob = require('glob');

const {PackageMetadata} = require('./PackageMetadata');

/**
 *
 * @param {PackageMetadata} a
 * @param {PackageMetadata} b
 * @returns {number}
 */
function packageSort(a, b) {
  return a.getDirectoryName().localeCompare(b.getDirectoryName());
}

/** Cache of all PackageMetadata for the packages directory */
class PackagesManager {
  /** @type {Array<PackageMetadata>} */
  packages;
  /** @type {Map<string, PackageMetadata>} */
  packagesByNpmName = new Map();
  /** @type {Map<string, PackageMetadata>} */
  packagesByDirectoryName = new Map();

  /**
   * @param {Array<string>} packagePaths
   */
  constructor(packagePaths) {
    this.packages = packagePaths
      .map((packagePath) => new PackageMetadata(packagePath))
      .sort(packageSort);
    for (const pkg of this.packages) {
      this.packagesByNpmName.set(pkg.getNpmName(), pkg);
      this.packagesByDirectoryName.set(pkg.getDirectoryName(), pkg);
    }
  }

  /**
   * Get the PackageMetadata for a package by its npm name.
   * @param {string} name
   * @returns {PackageMetadata}
   */
  getPackageByNpmName(name) {
    const pkg = this.packagesByNpmName.get(name);
    if (!pkg) {
      throw new Error(`Missing package with npm name '${name}'`);
    }
    return pkg;
  }

  /**
   * Get the PackageMetadata for a package by its npm name.
   * @param {string} name
   * @returns {PackageMetadata}
   */
  getPackageByDirectoryName(name) {
    const pkg = this.packagesByDirectoryName.get(name);
    if (!pkg) {
      throw new Error(`Missing package with directory name '${name}'`);
    }
    return pkg;
  }

  /**
   * Get the cached metadata for all packages in the packages directory,
   * sorted by directory name.
   * @returns {Array<PackageMetadata>}
   */
  getPackages() {
    return this.packages;
  }

  /**
   * Get the cached metadata for packages in the packages directory
   * where the private field is not set to true, sorted by directory
   * name ('lexical' will come before 'lexical-*').
   * @returns {Array<PackageMetadata>}
   */
  getPublicPackages() {
    return this.packages.filter((pkg) => !pkg.isPrivate());
  }

  /**
   * Given an array of npm dependencies (may include non-Lexical names),
   * return all required transitive monorepo dependencies to have those
   * packages (in a topologically ordered Map).
   *
   * @param {Array<string>} npmDependencies
   * @returns {Map<string, PackageMetadata>}
   */
  computedMonorepoDependencyMap(npmDependencies) {
    /** @type {Map<string, PackageMetadata>} */
    const depsMap = new Map();
    const visited = new Set();
    /** @param {string[]} deps */
    const traverse = (deps) => {
      for (const dep of deps) {
        if (visited.has(dep)) {
          continue;
        }
        visited.add(dep);
        if (!depsMap.has(dep)) {
          const pkg = this.packagesByNpmName.get(dep);
          if (pkg) {
            traverse(Object.keys(pkg.packageJson.dependencies || {}));
            depsMap.set(dep, pkg);
          }
        }
      }
    };
    traverse(npmDependencies);
    return depsMap;
  }
}

exports.packagesManager = new PackagesManager(
  glob.sync(
    path.resolve(
      path.dirname(path.dirname(__dirname)),
      'packages/*/package.json',
    ),
  ),
);
