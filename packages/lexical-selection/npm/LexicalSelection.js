/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalSelection = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalSelection.dev.js') : require('./LexicalSelection.prod.js')
module.exports = LexicalSelection;