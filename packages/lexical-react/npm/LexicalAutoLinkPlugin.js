/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalAutoLinkPlugin = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalAutoLinkPlugin.dev.js') : require('./LexicalAutoLinkPlugin.prod.js')
module.exports = LexicalAutoLinkPlugin;