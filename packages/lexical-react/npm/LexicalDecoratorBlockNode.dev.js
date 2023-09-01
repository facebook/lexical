/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class DecoratorBlockNode extends lexical.DecoratorNode {
  constructor(format, key) {
    super(key);
    this.__format = format || '';
  }
  exportJSON() {
    return {
      format: this.__format || '',
      type: 'decorator-block',
      version: 1
    };
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
  setFormat(format) {
    const self = this.getWritable();
    self.__format = format;
  }
  isInline() {
    return false;
  }
}
function $isDecoratorBlockNode(node) {
  return node instanceof DecoratorBlockNode;
}

exports.$isDecoratorBlockNode = $isDecoratorBlockNode;
exports.DecoratorBlockNode = DecoratorBlockNode;
