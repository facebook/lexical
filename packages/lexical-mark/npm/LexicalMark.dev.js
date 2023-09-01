/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');
var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class MarkNode extends lexical.ElementNode {
  /** @internal */

  static getType() {
    return 'mark';
  }
  static clone(node) {
    return new MarkNode(Array.from(node.__ids), node.__key);
  }
  static importDOM() {
    return null;
  }
  static importJSON(serializedNode) {
    const node = $createMarkNode(serializedNode.ids);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      ids: this.getIDs(),
      type: 'mark',
      version: 1
    };
  }
  constructor(ids, key) {
    super(key);
    this.__ids = ids || [];
  }
  createDOM(config) {
    const element = document.createElement('mark');
    utils.addClassNamesToElement(element, config.theme.mark);
    if (this.__ids.length > 1) {
      utils.addClassNamesToElement(element, config.theme.markOverlap);
    }
    return element;
  }
  updateDOM(prevNode, element, config) {
    const prevIDs = prevNode.__ids;
    const nextIDs = this.__ids;
    const prevIDsCount = prevIDs.length;
    const nextIDsCount = nextIDs.length;
    const overlapTheme = config.theme.markOverlap;
    if (prevIDsCount !== nextIDsCount) {
      if (prevIDsCount === 1) {
        if (nextIDsCount === 2) {
          utils.addClassNamesToElement(element, overlapTheme);
        }
      } else if (nextIDsCount === 1) {
        utils.removeClassNamesFromElement(element, overlapTheme);
      }
    }
    return false;
  }
  hasID(id) {
    const ids = this.getIDs();
    for (let i = 0; i < ids.length; i++) {
      if (id === ids[i]) {
        return true;
      }
    }
    return false;
  }
  getIDs() {
    const self = this.getLatest();
    return $isMarkNode(self) ? self.__ids : [];
  }
  addID(id) {
    const self = this.getWritable();
    if ($isMarkNode(self)) {
      const ids = self.__ids;
      self.__ids = ids;
      for (let i = 0; i < ids.length; i++) {
        // If we already have it, don't add again
        if (id === ids[i]) return;
      }
      ids.push(id);
    }
  }
  deleteID(id) {
    const self = this.getWritable();
    if ($isMarkNode(self)) {
      const ids = self.__ids;
      self.__ids = ids;
      for (let i = 0; i < ids.length; i++) {
        if (id === ids[i]) {
          ids.splice(i, 1);
          return;
        }
      }
    }
  }
  insertNewAfter(selection, restoreSelection = true) {
    const element = this.getParentOrThrow().insertNewAfter(selection, restoreSelection);
    if (lexical.$isElementNode(element)) {
      const markNode = $createMarkNode(this.__ids);
      element.append(markNode);
      return markNode;
    }
    return null;
  }
  canInsertTextBefore() {
    return false;
  }
  canInsertTextAfter() {
    return false;
  }
  canBeEmpty() {
    return false;
  }
  isInline() {
    return true;
  }
  extractWithChild(child, selection, destination) {
    if (!lexical.$isRangeSelection(selection) || destination === 'html') {
      return false;
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    const isBackward = selection.isBackward();
    const selectionLength = isBackward ? anchor.offset - focus.offset : focus.offset - anchor.offset;
    return this.isParentOf(anchorNode) && this.isParentOf(focusNode) && this.getTextContent().length === selectionLength;
  }
  excludeFromCopy(destination) {
    return destination !== 'clone';
  }
}
function $createMarkNode(ids) {
  return lexical.$applyNodeReplacement(new MarkNode(ids));
}
function $isMarkNode(node) {
  return node instanceof MarkNode;
}

/** @module @lexical/mark */
function $unwrapMarkNode(node) {
  const children = node.getChildren();
  let target = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (target === null) {
      node.insertBefore(child);
    } else {
      target.insertAfter(child);
    }
    target = child;
  }
  node.remove();
}
function $wrapSelectionInMarkNode(selection, isBackward, id, createNode) {
  const nodes = selection.getNodes();
  const anchorOffset = selection.anchor.offset;
  const focusOffset = selection.focus.offset;
  const nodesLength = nodes.length;
  const startOffset = isBackward ? focusOffset : anchorOffset;
  const endOffset = isBackward ? anchorOffset : focusOffset;
  let currentNodeParent;
  let lastCreatedMarkNode;

  // We only want wrap adjacent text nodes, line break nodes
  // and inline element nodes. For decorator nodes and block
  // element nodes, we step out of their boundary and start
  // again after, if there are more nodes.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if (lexical.$isElementNode(lastCreatedMarkNode) && lastCreatedMarkNode.isParentOf(node)) {
      // If the current node is a child of the last created mark node, there is nothing to do here
      continue;
    }
    const isFirstNode = i === 0;
    const isLastNode = i === nodesLength - 1;
    let targetNode = null;
    if (lexical.$isTextNode(node)) {
      // Case 1: The node is a text node and we can split it
      const textContentSize = node.getTextContentSize();
      const startTextOffset = isFirstNode ? startOffset : 0;
      const endTextOffset = isLastNode ? endOffset : textContentSize;
      if (startTextOffset === 0 && endTextOffset === 0) {
        continue;
      }
      const splitNodes = node.splitText(startTextOffset, endTextOffset);
      targetNode = splitNodes.length > 1 && (splitNodes.length === 3 || isFirstNode && !isLastNode || endTextOffset === textContentSize) ? splitNodes[1] : splitNodes[0];
    } else if ($isMarkNode(node)) {
      // Case 2: the node is a mark node and we can ignore it as a target,
      // moving on to its children. Note that when we make a mark inside
      // another mark, it may utlimately be unnested by a call to
      // `registerNestedElementResolver<MarkNode>` somewhere else in the
      // codebase.

      continue;
    } else if (lexical.$isElementNode(node) && node.isInline()) {
      // Case 3: inline element nodes can be added in their entirety to the new
      // mark
      targetNode = node;
    }
    if (targetNode !== null) {
      // Now that we have a target node for wrapping with a mark, we can run
      // through special cases.
      if (targetNode && targetNode.is(currentNodeParent)) {
        // The current node is a child of the target node to be wrapped, there
        // is nothing to do here.
        continue;
      }
      const parentNode = targetNode.getParent();
      if (parentNode == null || !parentNode.is(currentNodeParent)) {
        // If the parent node is not the current node's parent node, we can
        // clear the last created mark node.
        lastCreatedMarkNode = undefined;
      }
      currentNodeParent = parentNode;
      if (lastCreatedMarkNode === undefined) {
        // If we don't have a created mark node, we can make one
        const createMarkNode = createNode || $createMarkNode;
        lastCreatedMarkNode = createMarkNode([id]);
        targetNode.insertBefore(lastCreatedMarkNode);
      }

      // Add the target node to be wrapped in the latest created mark node
      lastCreatedMarkNode.append(targetNode);
    } else {
      // If we don't have a target node to wrap we can clear our state and
      // continue on with the next node
      currentNodeParent = undefined;
      lastCreatedMarkNode = undefined;
    }
  }
  // Make selection collapsed at the end
  if (lexical.$isElementNode(lastCreatedMarkNode)) {
    // eslint-disable-next-line no-unused-expressions
    isBackward ? lastCreatedMarkNode.selectStart() : lastCreatedMarkNode.selectEnd();
  }
}
function $getMarkIDs(node, offset) {
  let currentNode = node;
  while (currentNode !== null) {
    if ($isMarkNode(currentNode)) {
      return currentNode.getIDs();
    } else if (lexical.$isTextNode(currentNode) && offset === currentNode.getTextContentSize()) {
      const nextSibling = currentNode.getNextSibling();
      if ($isMarkNode(nextSibling)) {
        return nextSibling.getIDs();
      }
    }
    currentNode = currentNode.getParent();
  }
  return null;
}

exports.$createMarkNode = $createMarkNode;
exports.$getMarkIDs = $getMarkIDs;
exports.$isMarkNode = $isMarkNode;
exports.$unwrapMarkNode = $unwrapMarkNode;
exports.$wrapSelectionInMarkNode = $wrapSelectionInMarkNode;
exports.MarkNode = MarkNode;
