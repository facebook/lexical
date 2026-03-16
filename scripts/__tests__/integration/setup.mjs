/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
import fs from 'fs-extra';
import path from 'node:path';

import {exec} from '../../shared/childProcess.js';
import {packagesManager} from '../../shared/packagesManager.js';
import readMonorepoPackageJson from '../../shared/readMonorepoPackageJson.js';

const {version} = readMonorepoPackageJson();

/**
 * Vitest global setup function
 */
export default async function () {
  const needsBuild = packagesManager
    .getPublicPackages()
    .some(
      (pkg) =>
        !fs.existsSync(
          path.resolve(`./npm/${pkg.getDirectoryName()}-${version}.tgz`),
        ),
    );
  if (!needsBuild) {
    // eslint-disable-next-line no-console
    console.log(
      '\nWARNING: Running integration tests with cached build artifacts from a previous `pnpm run prepare-release`.',
    );
    return;
  }
  await exec('pnpm run prepare-release');
  const packDest = path.resolve('./npm');
  fs.mkdirpSync(packDest);
  for (const pkg of packagesManager.getPublicPackages()) {
    const cwd = process.cwd();
    try {
      process.chdir(pkg.resolve('npm'));
      await exec(`pnpm pack --pack-destination ${packDest}`);
    } finally {
      process.chdir(cwd);
    }
  }
}
