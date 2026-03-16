/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const rules = require('./rules');

// Legacy config format (ESLint 7-8)
const legacyAll = {
  rules: {
    '@lexical/internal/no-imports-from-self': 'error',
    '@lexical/internal/no-optional-chaining': 'error',
  },
};

const plugin = {
  configs: {
    // Legacy configs (ESLint 7-8) - available under multiple names for compatibility
    all: legacyAll,
    'legacy-all': legacyAll,
    'legacy-recommended': legacyAll,
    recommended: legacyAll,
  },
  rules,
};

// Flat config format (ESLint 9-10+)
const flatAll = {
  plugins: {
    '@lexical/internal': plugin,
  },
  rules: {
    '@lexical/internal/no-imports-from-self': 'error',
    '@lexical/internal/no-optional-chaining': 'error',
  },
};

plugin.configs['flat/all'] = flatAll;
plugin.configs['flat/recommended'] = flatAll;

module.exports = plugin;
