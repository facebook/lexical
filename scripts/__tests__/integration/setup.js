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
const fs = require('fs-extra');
const {exec} = require('child-process-promise');
const {packagesManager} = require('../../shared/packagesManager');
const {version} = require('../../shared/readMonorepoPackageJson')();

/**
 * @param {import('@jest/types').Config.GlobalConfig} globalConfig
 * @param {import('@jest/types').Config.ProjectConfig} projectConfig
 */
module.exports = async function (globalConfig, projectConfig) {
  const needsBuild = packagesManager
    .getPublicPackages()
    .some(
      (pkg) =>
        !fs.existsSync(
          path.resolve(`./npm/${pkg.getDirectoryName()}-${version}.tgz`),
        ),
    );
  if (!needsBuild) {
    return;
  }
  await exec('npm run prepare-release');
  const packDest = path.resolve('./npm');
  fs.mkdirpSync(packDest);
  for (const pkg of packagesManager.getPublicPackages()) {
    const cwd = process.cwd();
    try {
      process.chdir(pkg.resolve('npm'));
      await exec(`npm pack --pack-destination '${packDest}'`);
    } finally {
      process.chdir(cwd);
    }
  }
};
