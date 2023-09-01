/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalFile = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalFile.dev.js') : require('./LexicalFile.prod.js')
module.exports = LexicalFile;