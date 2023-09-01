/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalTypeaheadMenuPlugin = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalTypeaheadMenuPlugin.dev.js') : require('./LexicalTypeaheadMenuPlugin.prod.js')
module.exports = LexicalTypeaheadMenuPlugin;