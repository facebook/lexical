/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs-extra');
const path = require('node:path');
const {packagesManager} = require('./shared/packagesManager');

fs.removeSync(path.resolve(`./npm`));
fs.removeSync(path.resolve(`./.ts-temp`));
packagesManager
  .getPublicPackages()
  .forEach((pkg) =>
    ['dist', 'npm'].forEach((subdir) => fs.removeSync(pkg.resolve(subdir))),
  );
