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
const DEFAULT_PKGS = [
  'lexical-react',
  'lexical-yjs',
  'lexical-list',
  'lexical-table',
  'lexical-file',
  'lexical-clipboard',
  'lexical-hashtag',
  'lexical-selection',
  'lexical-offset',
  'lexical-code',
  'lexical-plain-text',
  'lexical-rich-text',
  'lexical-utils',
  'lexical-dragon',
  'lexical-overflow',
  'lexical-link',
  'lexical-text',
];

module.exports = {
  DEFAULT_PKGS,
  LEXICAL_PKG,
};
