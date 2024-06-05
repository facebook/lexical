/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @ts-check

const {name, version} = require('../package.json');
const {rulesOfLexical} = require('./rules/rules-of-lexical.js');

const all = {
  plugins: ['@lexical'],
  rules: {
    '@lexical/rules-of-lexical': 'warn',
  },
};

const plugin = {
  configs: {
    all,
    recommended: all,
  },
  meta: {name, version},
  rules: {
    'rules-of-lexical': rulesOfLexical,
  },
};

module.exports = plugin;
