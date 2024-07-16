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
const path = require('node:path');

module.exports = function readMonorepoPackageJson() {
  return fs.readJsonSync(path.resolve(__dirname, '../../package.json'));
};
