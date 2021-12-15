/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/**
 * Make empty strings use consistent double quotes
 */

module.exports = function normalizeQuotes(ast, _) {
  ast.walk((node) => {
    if (node.type !== 'string') {
      return;
    }
    if (node.value === '') {
      node.quote = '"';
    }
  });
  return ast;
};
