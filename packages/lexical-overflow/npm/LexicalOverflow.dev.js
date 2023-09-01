/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');

/** @module @lexical/overflow */
/** @noInheritDoc */
class OverflowNode extends lexical.ElementNode {
  static getType() {
    return 'overflow';
  }
  static clone(node) {
    return new OverflowNode(node.__key);
  }
  static importJSON(serializedNode) {
    return $createOverflowNode();
  }
  static importDOM() {
    return null;
  }
  constructor(key) {
    super(key);
    this.__type = 'overflow';
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'overflow'
    };
  }
  createDOM(config) {
    const div = document.createElement('span');
    const className = config.theme.characterLimit;
    if (typeof className === 'string') {
      div.className = className;
    }
    return div;
  }
  updateDOM(prevNode, dom) {
    return false;
  }
  insertNewAfter(selection, restoreSelection = true) {
    const parent = this.getParentOrThrow();
    return parent.insertNewAfter(selection, restoreSelection);
  }
  excludeFromCopy() {
    return true;
  }
}
function $createOverflowNode() {
  return lexical.$applyNodeReplacement(new OverflowNode());
}
function $isOverflowNode(node) {
  return node instanceof OverflowNode;
}

exports.$createOverflowNode = $createOverflowNode;
exports.$isOverflowNode = $isOverflowNode;
exports.OverflowNode = OverflowNode;
