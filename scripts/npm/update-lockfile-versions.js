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
const path = require('path');
const {packagesManager} = require('../shared/packagesManager');

const {npm_package_version} = process.env;

if (!npm_package_version) {
  console.error('Expecting npm_package_version to be set in the environment');
  process.exit(1);
}

const newVersion = npm_package_version;

// Get all public package names
const publicPackageNames = packagesManager
  .getPublicPackages()
  .map((pkg) => pkg.getNpmName());

console.log(
  `Updating lockfile for ${publicPackageNames.length} packages to version ${newVersion}`,
);

// Read the lockfile
const lockfilePath = path.resolve(__dirname, '../../pnpm-lock.yaml');
let lockfileContent = fs.readFileSync(lockfilePath, 'utf8');

// Extract the old version from the lockfile
// We look for the first occurrence of a @lexical package to get the current version
const firstPackage = publicPackageNames[0];
const versionMatch = lockfileContent.match(
  new RegExp(
    `${firstPackage.replace('/', '\\/')}@([0-9]+\\.[0-9]+\\.[0-9]+[^:\\s]*)`,
  ),
);

if (!versionMatch) {
  console.error(
    `Could not find old version in lockfile for ${firstPackage}. The lockfile may already be updated or has an unexpected format.`,
  );
  process.exit(1);
}

const oldVersion = versionMatch[1];
console.log(`Detected old version: ${oldVersion}`);

if (oldVersion === newVersion) {
  console.log('Old and new versions are the same, no update needed.');
  process.exit(0);
}

// For each package, replace all version references
publicPackageNames.forEach((packageName) => {
  // Escape special characters in package name for regex
  const escapedPackageName = packageName
    .replace(/\//g, '\\/')
    .replace(/@/g, '\\@');

  // Replace patterns like:
  // - @lexical/clipboard@0.39.0:
  // - @lexical/clipboard@0.39.0
  // - '@lexical/clipboard': 0.39.0
  // - "@lexical/clipboard": 0.39.0

  const patterns = [
    // Package entries like @lexical/clipboard@0.39.0:
    new RegExp(
      `(${escapedPackageName})@${oldVersion.replace(/\./g, '\\.')}:`,
      'g',
    ),
    // Package references like @lexical/clipboard@0.39.0
    new RegExp(
      `(${escapedPackageName})@${oldVersion.replace(/\./g, '\\.')}([^:])`,
      'g',
    ),
    // Dependency version strings like '@lexical/clipboard': 0.39.0
    new RegExp(
      `(['"]${escapedPackageName}['"]:\\s*)${oldVersion.replace(/\./g, '\\.')}`,
      'g',
    ),
  ];

  patterns.forEach((pattern, index) => {
    if (index === 0) {
      // Pattern for @package@version:
      lockfileContent = lockfileContent.replace(pattern, `$1@${newVersion}:`);
    } else if (index === 1) {
      // Pattern for @package@version (not followed by :)
      lockfileContent = lockfileContent.replace(pattern, `$1@${newVersion}$2`);
    } else {
      // Pattern for 'package': version
      lockfileContent = lockfileContent.replace(pattern, `$1${newVersion}`);
    }
  });
});

// Write the updated lockfile
fs.writeFileSync(lockfilePath, lockfileContent, 'utf8');

console.log(
  `Successfully updated pnpm-lock.yaml from ${oldVersion} to ${newVersion}`,
);
