/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const parser = require('postcss-value-parser');

/**
 * Turn millisecond values to seconds (shorter), except when < 10ms
 */

module.exports = function normalizeTimings(ast, _) {
  ast.walk((node) => {
    if (node.type !== 'word') {
      return;
    }
    const value = Number.parseFloat(node.value);
    if (Number.isNaN(value)) {
      return;
    }
    const dimension = parser.unit(node.value);
    if (!dimension || dimension.unit !== 'ms' || value < 10) {
      return;
    }
    node.value = value / 1000 + 's';
  });
  return ast;
};
