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

  /**
   * @param {Array<string>} packagePaths
   */
  constructor(packagePaths) {
    this.packages = packagePaths
      .map((packagePath) => new PackageMetadata(packagePath))
      .sort(packageSort);
  }

  /**
   * Get the PackageMetadata for a package by its npm name.
   * @param {string} name
   * @returns {PackageMetadata}
   */
  getPackageByNpmName(name) {
    const pkg = this.packages.find(
      (candidate) => candidate.getNpmName() === name,
    );
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
    const pkg = this.packages.find(
      (candidate) => candidate.getDirectoryName() === name,
    );
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
}

exports.packagesManager = new PackagesManager(
  glob.sync(
    path.resolve(
      path.dirname(path.dirname(__dirname)),
      'packages/*/package.json',
    ),
  ),
);
