/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalNodeEventPlugin = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalNodeEventPlugin.dev.js') : require('./LexicalNodeEventPlugin.prod.js')
module.exports = LexicalNodeEventPlugin;