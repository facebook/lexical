/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const {LEXICAL_PKG, DEFAULT_PKGS} = require('./npm/packages');

const packages = [LEXICAL_PKG, ...DEFAULT_PKGS];
packages.forEach((pkg) => {
  fs.removeSync(path.resolve(`./packages/${pkg}/dist`));
  fs.removeSync(path.resolve(`./packages/${pkg}/npm`));
});
