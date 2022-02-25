#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

const LEXICAL_PKG = 'lexical';
const LEXICAL_HELPERS_PKG = 'lexical-helpers';
const DEFAULT_PKGS = [
  'lexical-react',
  'lexical-yjs',
  'lexical-list',
  'lexical-table',
  'lexical-file',
  'lexical-clipboard',
];

module.exports = {
  DEFAULT_PKGS,
  LEXICAL_HELPERS_PKG,
  LEXICAL_PKG,
};
