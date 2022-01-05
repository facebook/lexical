'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = inject;

var _StyleXSheet = require('./StyleXSheet');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
function inject(ltrRule, priority) {
  var rtlRule =
    arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  _StyleXSheet.styleSheet.insert(ltrRule, priority, rtlRule);
}
