/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict'
const LexicalDecoratorBlockNode = ['development', 'test'].includes(process.env.NODE_ENV) ? require('./LexicalDecoratorBlockNode.dev.js') : require('./LexicalDecoratorBlockNode.prod.js')
module.exports = LexicalDecoratorBlockNode;