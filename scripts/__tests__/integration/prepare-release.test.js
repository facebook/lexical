/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const {packagesManager} = require('../../shared/packagesManager');
const path = require('node:path');
const {describeExample} = require('./utils');

describe('prepare-release tests', () => {
  for (const pkg of packagesManager.getPublicPackages()) {
    describe(pkg.getNpmName(), () => {
      const tgzPath = path.join(
        'npm',
        `${pkg.getDirectoryName()}-${pkg.packageJson.version}.tgz`,
      );
      test(`${tgzPath} exists`, () =>
        expect(fs.existsSync(tgzPath)).toBe(true));
    });
  }
});
['examples', 'scripts/__tests__/integration/fixtures']
  .flatMap((packagesDir) =>
    glob.sync(`${packagesDir}/*/package.json`, {windowsPathsNoEscape: true}),
  )
  .forEach((exampleJsonPath) => describeExample(exampleJsonPath));
