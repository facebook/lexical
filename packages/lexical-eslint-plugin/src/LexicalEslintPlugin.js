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

// Legacy config format (ESLint 7-8)
const legacyAll = {
  plugins: ['@lexical'],
  rules: {
    '@lexical/rules-of-lexical': /** @type {'warn'|'error'|'off'}*/ ('warn'),
  },
};

const plugin = {
  configs: {
    // Legacy configs (ESLint 7-8) - available under multiple names for compatibility
    all: legacyAll,
    // Flat configs (ESLint 9-10+) - placeholders, will be set below
    'flat/all': /** @type {any} */ (null),
    'flat/recommended': /** @type {any} */ (null),
    'legacy-all': legacyAll,
    'legacy-recommended': legacyAll,
    recommended: legacyAll,
  },
  meta: {name, version},
  rules: {
    'rules-of-lexical': rulesOfLexical,
  },
};

// Flat config format (ESLint 9-10+)
// Must be created after plugin is defined to avoid circular reference
const flatAll = {
  plugins: {
    '@lexical': plugin,
  },
  rules: {
    '@lexical/rules-of-lexical': 'warn' /** @type {'warn'|'error'|'off'}*/,
  },
};

plugin.configs['flat/all'] = flatAll;
plugin.configs['flat/recommended'] = flatAll;

module.exports = plugin;
