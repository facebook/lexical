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

import * as plugin from './LexicalEslintPlugin.js';

export type {RulesOfLexicalOptions} from './rules/rules-of-lexical.js';
export default plugin;
