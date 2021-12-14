/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const parser = require('postcss-value-parser');

/**
 * Remove leading zeros from numbers
 */
module.exports = function normalizeLeadingZero(ast, _) {
  ast.walk((node) => {
    if (node.type !== 'word') {
      return;
    }
    const value = Number.parseFloat(node.value);
    if (Number.isNaN(value)) {
      return;
    }
    const dimension = parser.unit(node.value);
    if (value < 1 && value >= 0) {
      node.value =
        value.toString().replace('0.', '.') + (dimension ? dimension.unit : '');
    }
  });
  return ast;
};
