/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * For bootstrapping reasons, this module is written in CJS JavaScript so no
 * compilation is necessary
 */

import type {Rule} from 'eslint';

import * as jsPlugin from './LexicalEslintPlugin.js';

export type {RulesOfLexicalOptions} from './rules/rules-of-lexical.js';

// Legacy config format (ESLint 7-8)
export interface LegacyConfig {
  plugins: string[];
  rules: {
    '@lexical/rules-of-lexical': 'warn' | 'error' | 'off';
  };
}

// Flat config format (ESLint 9-10+)
export interface FlatConfig {
  plugins: {
    '@lexical': Plugin;
  };
  rules: {
    '@lexical/rules-of-lexical': 'warn' | 'error' | 'off';
  };
}

export interface Plugin {
  meta: {
    name: string;
    version: string;
  };
  rules: {
    'rules-of-lexical': Rule.RuleModule;
  };
  configs: {
    // Legacy configs (ESLint 7-8) - available under multiple names
    all: LegacyConfig;
    'legacy-all': LegacyConfig;
    'legacy-recommended': LegacyConfig;
    recommended: LegacyConfig;
    // Flat configs (ESLint 9-10+)
    'flat/all': FlatConfig;
    'flat/recommended': FlatConfig;
  };
}

const plugin: Plugin = jsPlugin;

// eslint-disable-next-line no-restricted-exports
export default plugin;
