/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const normalizeLeadingZero = require('./normalizers/leading-zero.js');
const normalizeQuotes = require('./normalizers/quotes.js');
const normalizeTimings = require('./normalizers/timings.js');
const normalizeWhitespace = require('./normalizers/whitespace.js');
const normalizeZeroDimensions = require('./normalizers/zero-dimensions.js');
const parser = require('postcss-value-parser');

// `Timings` should be before `LeadingZero`, because it
// changes 500ms to 0.5s, then `LeadingZero` makes it .5s
const normalizers = [
  normalizeWhitespace,
  normalizeTimings,
  normalizeZeroDimensions,
  normalizeLeadingZero,
  normalizeQuotes,
];

function normalizeValue(value, key) {
  let ast = parser(value);
  normalizers.forEach((fn) => {
    ast = fn(ast, key);
  });
  return ast.toString();
}

module.exports = normalizeValue;
