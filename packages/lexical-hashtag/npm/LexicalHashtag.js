/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalHashtag = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalHashtag.dev.js') : require('./LexicalHashtag.prod.js')
module.exports = LexicalHashtag;