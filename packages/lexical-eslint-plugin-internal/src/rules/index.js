/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const noOptionalChaining = require('./no-optional-chaining');
const noImportsFromSelf = require('./no-imports-from-self');

module.exports = {
  'no-imports-from-self': noImportsFromSelf,
  'no-optional-chaining': noOptionalChaining,
};
