/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs-extra';
import path from 'node:path';

import {packagesManager} from './shared/packagesManager.mjs';

fs.removeSync(path.resolve(`./npm`));
fs.removeSync(path.resolve(`./.ts-temp`));
packagesManager
  .getPublicPackages()
  .forEach((pkg) =>
    ['dist', 'npm'].forEach((subdir) => fs.removeSync(pkg.resolve(subdir))),
  );
