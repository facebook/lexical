/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @noInheritDoc */
class HashtagNode extends lexical.TextNode {
  static getType() {
    return 'hashtag';
  }
  static clone(node) {
    return new HashtagNode(node.__text, node.__key);
  }
  constructor(text, key) {
    super(text, key);
  }
  createDOM(config) {
    const element = super.createDOM(config);
    utils.addClassNamesToElement(element, config.theme.hashtag);
    return element;
  }
  static importJSON(serializedNode) {
    const node = $createHashtagNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'hashtag'
    };
  }
  canInsertTextBefore() {
    return false;
  }
  isTextEntity() {
    return true;
  }
}

/**
 * Generates a HashtagNode, which is a string following the format of a # followed by some text, eg. #lexical.
 * @param text - The text used inside the HashtagNode.
 * @returns - The HashtagNode with the embedded text.
 */
function $createHashtagNode(text = '') {
  return lexical.$applyNodeReplacement(new HashtagNode(text));
}

/**
 * Determines if node is a HashtagNode.
 * @param node - The node to be checked.
 * @returns true if node is a HashtagNode, false otherwise.
 */
function $isHashtagNode(node) {
  return node instanceof HashtagNode;
}

exports.$createHashtagNode = $createHashtagNode;
exports.$isHashtagNode = $isHashtagNode;
exports.HashtagNode = HashtagNode;
