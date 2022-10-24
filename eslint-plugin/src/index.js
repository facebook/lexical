/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const rules = require('./rules');

module.exports = {
  configs: {
    all: {
      rules: {
        'lexical/no-optional-chaining': 'error',
      },
    },
    recommended: {
      rules: {
        'lexical/no-optional-chaining': 'error',
      },
    },
  },
  rules,
};
