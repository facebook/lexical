#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
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
  'lexical-headless',
  'lexical-html',
  'lexical-history',
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
  'lexical-markdown',
  'lexical-mark',
  'lexical-devtools-core',
];
const SHARED_PKG = 'shared';

module.exports = {
  DEFAULT_PKGS,
  LEXICAL_PKG,
  SHARED_PKG,
};
