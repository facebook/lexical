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
const {LEXICAL_PKG, DEFAULT_PKGS, SHARED_PKG} = require('./npm/packages');

const packages = [LEXICAL_PKG, ...DEFAULT_PKGS, SHARED_PKG];
packages.forEach((pkg) => {
  fs.removeSync(path.resolve(`./.ts-temp`));
  fs.removeSync(path.resolve(`./packages/${pkg}/dist`));
  fs.removeSync(path.resolve(`./packages/${pkg}/npm`));
});
