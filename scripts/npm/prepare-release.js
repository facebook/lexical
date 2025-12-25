#!/usr/bin/env node

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
const path = require('node:path');
const {packagesManager} = require('../shared/packagesManager');

const monorepoPackageJson = require('../shared/readMonorepoPackageJson')();

const version = monorepoPackageJson.version;

/**
 * Cleans the npm dir from the package and constructs it with:
 * - All the files from the pkg dist (recursively)
 * - All of the *.flow files from the pkg flow (not recursively)
 * - The package.json and README.md from pkg
 * - The LICENSE file from the monorepo root
 *
 * @param {import('../shared/PackageMetadata').PackageMetadata} pkg the directory name of the package to process (e.g. 'lexical-rich-text')
 */
function preparePackage(pkg) {
  console.log(
    `Preparing packages/${pkg.getDirectoryName()} for release as ${pkg.getNpmName()}`,
  );
  fs.removeSync(pkg.resolve('npm'));
  fs.ensureDirSync(pkg.resolve('npm'));
  fs.copySync(pkg.resolve('dist'), pkg.resolve('npm'));
  const flowSources = glob.sync(pkg.resolve('flow', '*.flow'), {
    windowsPathsNoEscape: true,
  });
  if (flowSources.length === 0) {
    console.error(
      `Missing Flow type definitions for package ${pkg.getDirectoryName()}`,
    );
  }
  flowSources.forEach((flowSource) =>
    fs.copySync(flowSource, pkg.resolve('npm', path.basename(flowSource))),
  );
  ['package.json', 'README.md'].forEach((fn) =>
    fs.copySync(pkg.resolve(fn), pkg.resolve('npm', fn)),
  );

  // Replace workspace:* with actual version in npm/package.json
  const npmPackageJsonPath = pkg.resolve('npm', 'package.json');
  const npmPackageJson = fs.readJsonSync(npmPackageJsonPath);

  // Replace workspace:* in dependencies and devDependencies
  ['dependencies', 'devDependencies'].forEach((depType) => {
    if (npmPackageJson[depType]) {
      Object.keys(npmPackageJson[depType]).forEach((dep) => {
        if (npmPackageJson[depType][dep] === 'workspace:*') {
          npmPackageJson[depType][dep] = version;
        }
      });
    }
  });

  fs.writeJsonSync(npmPackageJsonPath, npmPackageJson, {spaces: 2});

  fs.copySync('LICENSE', pkg.resolve('npm', 'LICENSE'));
}

/**
 * Prepares the npm directories for all public packages. If a package should
 * not be published, make sure to set `"private": true` in its package.json.
 */
function preparePublicPackages() {
  packagesManager.getPublicPackages().forEach(preparePackage);
}

preparePublicPackages();
