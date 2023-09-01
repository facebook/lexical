/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');
var yjs = require('yjs');
var selection = require('@lexical/selection');
var offset = require('@lexical/offset');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class CollabLineBreakNode {
  constructor(map, parent) {
    this._key = '';
    this._map = map;
    this._parent = parent;
    this._type = 'linebreak';
  }
  getNode() {
    const node = lexical.$getNodeByKey(this._key);
    return lexical.$isLineBreakNode(node) ? node : null;
  }
  getKey() {
    return this._key;
  }
  getSharedType() {
    return this._map;
  }
  getType() {
    return this._type;
  }
  getSize() {
    return 1;
  }
  getOffset() {
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }
  destroy(binding) {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
  }
}
function $createCollabLineBreakNode(map, parent) {
  const collabNode = new CollabLineBreakNode(map, parent);
  // @ts-expect-error: internal field
  map._collabNode = collabNode;
  return collabNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function simpleDiffWithCursor(a, b, cursor) {
  const aLength = a.length;
  const bLength = b.length;
  let left = 0; // number of same characters counting from left
  let right = 0; // number of same characters counting from right
  // Iterate left to the right until we find a changed character
  // First iteration considers the current cursor position
  while (left < aLength && left < bLength && a[left] === b[left] && left < cursor) {
    left++;
  }
  // Iterate right to the left until we find a changed character
  while (right + left < aLength && right + left < bLength && a[aLength - right - 1] === b[bLength - right - 1]) {
    right++;
  }
  // Try to iterate left further to the right without caring about the current cursor position
  while (right + left < aLength && right + left < bLength && a[left] === b[left]) {
    left++;
  }
  return {
    index: left,
    insert: b.slice(left, bLength - right),
    remove: aLength - left - right
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function diffTextContentAndApplyDelta(collabNode, key, prevText, nextText) {
  const selection = lexical.$getSelection();
  let cursorOffset = nextText.length;
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
    const anchor = selection.anchor;
    if (anchor.key === key) {
      cursorOffset = anchor.offset;
    }
  }
  const diff = simpleDiffWithCursor(prevText, nextText, cursorOffset);
  collabNode.spliceText(diff.index, diff.remove, diff.insert);
}
class CollabTextNode {
  constructor(map, text, parent, type) {
    this._key = '';
    this._map = map;
    this._parent = parent;
    this._text = text;
    this._type = type;
    this._normalized = false;
  }
  getPrevNode(nodeMap) {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return lexical.$isTextNode(node) ? node : null;
  }
  getNode() {
    const node = lexical.$getNodeByKey(this._key);
    return lexical.$isTextNode(node) ? node : null;
  }
  getSharedType() {
    return this._map;
  }
  getType() {
    return this._type;
  }
  getKey() {
    return this._key;
  }
  getSize() {
    return this._text.length + (this._normalized ? 0 : 1);
  }
  getOffset() {
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }
  spliceText(index, delCount, newText) {
    const collabElementNode = this._parent;
    const xmlText = collabElementNode._xmlText;
    const offset = this.getOffset() + 1 + index;
    if (delCount !== 0) {
      xmlText.delete(offset, delCount);
    }
    if (newText !== '') {
      xmlText.insert(offset, newText);
    }
  }
  syncPropertiesAndTextFromLexical(binding, nextLexicalNode, prevNodeMap) {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const nextText = nextLexicalNode.__text;
    syncPropertiesFromLexical(binding, this._map, prevLexicalNode, nextLexicalNode);
    if (prevLexicalNode !== null) {
      const prevText = prevLexicalNode.__text;
      if (prevText !== nextText) {
        const key = nextLexicalNode.__key;
        diffTextContentAndApplyDelta(this, key, prevText, nextText);
        this._text = nextText;
      }
    }
  }
  syncPropertiesAndTextFromYjs(binding, keysChanged) {
    const lexicalNode = this.getNode();
    if (!(lexicalNode !== null)) {
      throw Error(`syncPropertiesAndTextFromYjs: cound not find decorator node`);
    }
    syncPropertiesFromYjs(binding, this._map, lexicalNode, keysChanged);
    const collabText = this._text;
    if (lexicalNode.__text !== collabText) {
      const writable = lexicalNode.getWritable();
      writable.__text = collabText;
    }
  }
  destroy(binding) {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
  }
}
function $createCollabTextNode(map, text, parent, type) {
  const collabNode = new CollabTextNode(map, text, parent, type);
  // @ts-expect-error: internal field
  map._collabNode = collabNode;
  return collabNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const baseExcludedProperties = new Set(['__key', '__parent', '__next', '__prev']);
const elementExcludedProperties = new Set(['__first', '__last', '__size']);
const rootExcludedProperties = new Set(['__cachedText']);
const textExcludedProperties = new Set(['__text']);
function isExcludedProperty(name, node, binding) {
  if (baseExcludedProperties.has(name)) {
    return true;
  }
  if (lexical.$isTextNode(node)) {
    if (textExcludedProperties.has(name)) {
      return true;
    }
  } else if (lexical.$isElementNode(node)) {
    if (elementExcludedProperties.has(name) || lexical.$isRootNode(node) && rootExcludedProperties.has(name)) {
      return true;
    }
  }
  const nodeKlass = node.constructor;
  const excludedProperties = binding.excludedProperties.get(nodeKlass);
  return excludedProperties != null && excludedProperties.has(name);
}
function $getNodeByKeyOrThrow(key) {
  const node = lexical.$getNodeByKey(key);
  if (!(node !== null)) {
    throw Error(`could not find node by key`);
  }
  return node;
}
function $createCollabNodeFromLexicalNode(binding, lexicalNode, parent) {
  const nodeType = lexicalNode.__type;
  let collabNode;
  if (lexical.$isElementNode(lexicalNode)) {
    const xmlText = new yjs.XmlText();
    collabNode = $createCollabElementNode(xmlText, parent, nodeType);
    collabNode.syncPropertiesFromLexical(binding, lexicalNode, null);
    collabNode.syncChildrenFromLexical(binding, lexicalNode, null, null, null);
  } else if (lexical.$isTextNode(lexicalNode)) {
    // TODO create a token text node for token, segmented nodes.
    const map = new yjs.Map();
    collabNode = $createCollabTextNode(map, lexicalNode.__text, parent, nodeType);
    collabNode.syncPropertiesAndTextFromLexical(binding, lexicalNode, null);
  } else if (lexical.$isLineBreakNode(lexicalNode)) {
    const map = new yjs.Map();
    map.set('__type', 'linebreak');
    collabNode = $createCollabLineBreakNode(map, parent);
  } else if (lexical.$isDecoratorNode(lexicalNode)) {
    const xmlElem = new yjs.XmlElement();
    collabNode = $createCollabDecoratorNode(xmlElem, parent, nodeType);
    collabNode.syncPropertiesFromLexical(binding, lexicalNode, null);
  } else {
    {
      throw Error(`Expected text, element, decorator, or linebreak node`);
    }
  }
  collabNode._key = lexicalNode.__key;
  return collabNode;
}
function getNodeTypeFromSharedType(sharedType) {
  const type = sharedType instanceof yjs.Map ? sharedType.get('__type') : sharedType.getAttribute('__type');
  if (!(type != null)) {
    throw Error(`Expected shared type to include type attribute`);
  }
  return type;
}
function getOrInitCollabNodeFromSharedType(binding, sharedType, parent) {
  // @ts-expect-error: internal field
  const collabNode = sharedType._collabNode;
  if (collabNode === undefined) {
    const registeredNodes = binding.editor._nodes;
    const type = getNodeTypeFromSharedType(sharedType);
    const nodeInfo = registeredNodes.get(type);
    if (!(nodeInfo !== undefined)) {
      throw Error(`Node ${type} is not registered`);
    }
    const sharedParent = sharedType.parent;
    const targetParent = parent === undefined && sharedParent !== null ? getOrInitCollabNodeFromSharedType(binding, sharedParent) : parent || null;
    if (!(targetParent instanceof CollabElementNode)) {
      throw Error(`Expected parent to be a collab element node`);
    }
    if (sharedType instanceof yjs.XmlText) {
      return $createCollabElementNode(sharedType, targetParent, type);
    } else if (sharedType instanceof yjs.Map) {
      if (type === 'linebreak') {
        return $createCollabLineBreakNode(sharedType, targetParent);
      }
      return $createCollabTextNode(sharedType, '', targetParent, type);
    } else if (sharedType instanceof yjs.XmlElement) {
      return $createCollabDecoratorNode(sharedType, targetParent, type);
    }
  }
  return collabNode;
}
function createLexicalNodeFromCollabNode(binding, collabNode, parentKey) {
  const type = collabNode.getType();
  const registeredNodes = binding.editor._nodes;
  const nodeInfo = registeredNodes.get(type);
  if (!(nodeInfo !== undefined)) {
    throw Error(`Node ${type} is not registered`);
  }
  const lexicalNode = new nodeInfo.klass();
  lexicalNode.__parent = parentKey;
  collabNode._key = lexicalNode.__key;
  if (collabNode instanceof CollabElementNode) {
    const xmlText = collabNode._xmlText;
    collabNode.syncPropertiesFromYjs(binding, null);
    collabNode.applyChildrenYjsDelta(binding, xmlText.toDelta());
    collabNode.syncChildrenFromYjs(binding);
  } else if (collabNode instanceof CollabTextNode) {
    collabNode.syncPropertiesAndTextFromYjs(binding, null);
  } else if (collabNode instanceof CollabDecoratorNode) {
    collabNode.syncPropertiesFromYjs(binding, null);
  }
  binding.collabNodeMap.set(lexicalNode.__key, collabNode);
  return lexicalNode;
}
function syncPropertiesFromYjs(binding, sharedType, lexicalNode, keysChanged) {
  const properties = keysChanged === null ? sharedType instanceof yjs.Map ? Array.from(sharedType.keys()) : Object.keys(sharedType.getAttributes()) : Array.from(keysChanged);
  let writableNode;
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (isExcludedProperty(property, lexicalNode, binding)) {
      continue;
    }
    const prevValue = lexicalNode[property];
    let nextValue = sharedType instanceof yjs.Map ? sharedType.get(property) : sharedType.getAttribute(property);
    if (prevValue !== nextValue) {
      if (nextValue instanceof yjs.Doc) {
        const yjsDocMap = binding.docMap;
        if (prevValue instanceof yjs.Doc) {
          yjsDocMap.delete(prevValue.guid);
        }
        const nestedEditor = lexical.createEditor();
        const key = nextValue.guid;
        nestedEditor._key = key;
        yjsDocMap.set(key, nextValue);
        nextValue = nestedEditor;
      }
      if (writableNode === undefined) {
        writableNode = lexicalNode.getWritable();
      }
      writableNode[property] = nextValue;
    }
  }
}
function syncPropertiesFromLexical(binding, sharedType, prevLexicalNode, nextLexicalNode) {
  const type = nextLexicalNode.__type;
  const nodeProperties = binding.nodeProperties;
  let properties = nodeProperties.get(type);
  if (properties === undefined) {
    properties = Object.keys(nextLexicalNode).filter(property => {
      return !isExcludedProperty(property, nextLexicalNode, binding);
    });
    nodeProperties.set(type, properties);
  }
  const EditorClass = binding.editor.constructor;
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const prevValue = prevLexicalNode === null ? undefined : prevLexicalNode[property];
    let nextValue = nextLexicalNode[property];
    if (prevValue !== nextValue) {
      if (nextValue instanceof EditorClass) {
        const yjsDocMap = binding.docMap;
        let prevDoc;
        if (prevValue instanceof EditorClass) {
          // @ts-expect-error Lexical node
          const prevKey = prevValue._key;
          prevDoc = yjsDocMap.get(prevKey);
          yjsDocMap.delete(prevKey);
        }

        // If we already have a document, use it.
        const doc = prevDoc || new yjs.Doc();
        const key = doc.guid;
        // @ts-expect-error Lexical node
        nextValue._key = key;
        yjsDocMap.set(key, doc);
        nextValue = doc;
        // Mark the node dirty as we've assigned a new key to it
        binding.editor.update(() => {
          nextLexicalNode.markDirty();
        });
      }
      if (sharedType instanceof yjs.Map) {
        sharedType.set(property, nextValue);
      } else {
        sharedType.setAttribute(property, nextValue);
      }
    }
  }
}
function spliceString(str, index, delCount, newText) {
  return str.slice(0, index) + newText + str.slice(index + delCount);
}
function getPositionFromElementAndOffset(node, offset, boundaryIsEdge) {
  let index = 0;
  let i = 0;
  const children = node._children;
  const childrenLength = children.length;
  for (; i < childrenLength; i++) {
    const child = children[i];
    const childOffset = index;
    const size = child.getSize();
    index += size;
    const exceedsBoundary = boundaryIsEdge ? index >= offset : index > offset;
    if (exceedsBoundary && child instanceof CollabTextNode) {
      let textOffset = offset - childOffset - 1;
      if (textOffset < 0) {
        textOffset = 0;
      }
      const diffLength = index - offset;
      return {
        length: diffLength,
        node: child,
        nodeIndex: i,
        offset: textOffset
      };
    }
    if (index > offset) {
      return {
        length: 0,
        node: child,
        nodeIndex: i,
        offset: childOffset
      };
    } else if (i === childrenLength - 1) {
      return {
        length: 0,
        node: null,
        nodeIndex: i + 1,
        offset: childOffset + 1
      };
    }
  }
  return {
    length: 0,
    node: null,
    nodeIndex: 0,
    offset: 0
  };
}
function doesSelectionNeedRecovering(selection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  let recoveryNeeded = false;
  try {
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    if (
    // We might have removed a node that no longer exists
    !anchorNode.isAttached() || !focusNode.isAttached() ||
    // If we've split a node, then the offset might not be right
    lexical.$isTextNode(anchorNode) && anchor.offset > anchorNode.getTextContentSize() || lexical.$isTextNode(focusNode) && focus.offset > focusNode.getTextContentSize()) {
      recoveryNeeded = true;
    }
  } catch (e) {
    // Sometimes checking nor a node via getNode might trigger
    // an error, so we need recovery then too.
    recoveryNeeded = true;
  }
  return recoveryNeeded;
}
function syncWithTransaction(binding, fn) {
  binding.doc.transact(fn, binding);
}
function createChildrenArray(element, nodeMap) {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node = nodeMap === null ? lexical.$getNodeByKey(nodeKey) : nodeMap.get(nodeKey);
    if (node === null || node === undefined) {
      {
        throw Error(`createChildrenArray: node does not exist in nodeMap`);
      }
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}
function removeFromParent(node) {
  const oldParent = node.getParent();
  if (oldParent !== null) {
    const writableNode = node.getWritable();
    const writableParent = oldParent.getWritable();
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();
    // TODO: this function duplicates a bunch of operations, can be simplified.
    if (prevSibling === null) {
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableParent.__first = nextSibling.__key;
        writableNextSibling.__prev = null;
      } else {
        writableParent.__first = null;
      }
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableNextSibling.__prev = writablePrevSibling.__key;
        writablePrevSibling.__next = writableNextSibling.__key;
      } else {
        writablePrevSibling.__next = null;
      }
      writableNode.__prev = null;
    }
    if (nextSibling === null) {
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writableParent.__last = prevSibling.__key;
        writablePrevSibling.__next = null;
      } else {
        writableParent.__last = null;
      }
    } else {
      const writableNextSibling = nextSibling.getWritable();
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writablePrevSibling.__next = writableNextSibling.__key;
        writableNextSibling.__prev = writablePrevSibling.__key;
      } else {
        writableNextSibling.__prev = null;
      }
      writableNode.__next = null;
    }
    writableParent.__size--;
    writableNode.__parent = null;
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class CollabDecoratorNode {
  constructor(xmlElem, parent, type) {
    this._key = '';
    this._xmlElem = xmlElem;
    this._parent = parent;
    this._type = type;
    this._unobservers = new Set();
  }
  getPrevNode(nodeMap) {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return lexical.$isDecoratorNode(node) ? node : null;
  }
  getNode() {
    const node = lexical.$getNodeByKey(this._key);
    return lexical.$isDecoratorNode(node) ? node : null;
  }
  getSharedType() {
    return this._xmlElem;
  }
  getType() {
    return this._type;
  }
  getKey() {
    return this._key;
  }
  getSize() {
    return 1;
  }
  getOffset() {
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }
  syncPropertiesFromLexical(binding, nextLexicalNode, prevNodeMap) {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const xmlElem = this._xmlElem;
    syncPropertiesFromLexical(binding, xmlElem, prevLexicalNode, nextLexicalNode);
  }
  syncPropertiesFromYjs(binding, keysChanged) {
    const lexicalNode = this.getNode();
    if (!(lexicalNode !== null)) {
      throw Error(`syncPropertiesFromYjs: cound not find decorator node`);
    }
    const xmlElem = this._xmlElem;
    syncPropertiesFromYjs(binding, xmlElem, lexicalNode, keysChanged);
  }
  destroy(binding) {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
    this._unobservers.forEach(unobserver => unobserver());
    this._unobservers.clear();
  }
}
function $createCollabDecoratorNode(xmlElem, parent, type) {
  const collabNode = new CollabDecoratorNode(xmlElem, parent, type);
  // @ts-expect-error: internal field
  xmlElem._collabNode = collabNode;
  return collabNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class CollabElementNode {
  constructor(xmlText, parent, type) {
    this._key = '';
    this._children = [];
    this._xmlText = xmlText;
    this._type = type;
    this._parent = parent;
  }
  getPrevNode(nodeMap) {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return lexical.$isElementNode(node) ? node : null;
  }
  getNode() {
    const node = lexical.$getNodeByKey(this._key);
    return lexical.$isElementNode(node) ? node : null;
  }
  getSharedType() {
    return this._xmlText;
  }
  getType() {
    return this._type;
  }
  getKey() {
    return this._key;
  }
  isEmpty() {
    return this._children.length === 0;
  }
  getSize() {
    return 1;
  }
  getOffset() {
    const collabElementNode = this._parent;
    if (!(collabElementNode !== null)) {
      throw Error(`getOffset: cound not find collab element node`);
    }
    return collabElementNode.getChildOffset(this);
  }
  syncPropertiesFromYjs(binding, keysChanged) {
    const lexicalNode = this.getNode();
    if (!(lexicalNode !== null)) {
      throw Error(`syncPropertiesFromYjs: cound not find element node`);
    }
    syncPropertiesFromYjs(binding, this._xmlText, lexicalNode, keysChanged);
  }
  applyChildrenYjsDelta(binding, deltas) {
    const children = this._children;
    let currIndex = 0;
    for (let i = 0; i < deltas.length; i++) {
      const delta = deltas[i];
      const insertDelta = delta.insert;
      const deleteDelta = delta.delete;
      if (delta.retain != null) {
        currIndex += delta.retain;
      } else if (typeof deleteDelta === 'number') {
        let deletionSize = deleteDelta;
        while (deletionSize > 0) {
          const {
            node,
            nodeIndex,
            offset,
            length
          } = getPositionFromElementAndOffset(this, currIndex, false);
          if (node instanceof CollabElementNode || node instanceof CollabLineBreakNode || node instanceof CollabDecoratorNode) {
            children.splice(nodeIndex, 1);
            deletionSize -= 1;
          } else if (node instanceof CollabTextNode) {
            const delCount = Math.min(deletionSize, length);
            const prevCollabNode = nodeIndex !== 0 ? children[nodeIndex - 1] : null;
            const nodeSize = node.getSize();
            if (offset === 0 && delCount === 1 && nodeIndex > 0 && prevCollabNode instanceof CollabTextNode && length === nodeSize &&
            // If the node has no keys, it's been deleted
            Array.from(node._map.keys()).length === 0) {
              // Merge the text node with previous.
              prevCollabNode._text += node._text;
              children.splice(nodeIndex, 1);
            } else if (offset === 0 && delCount === nodeSize) {
              // The entire thing needs removing
              children.splice(nodeIndex, 1);
            } else {
              node._text = spliceString(node._text, offset, delCount, '');
            }
            deletionSize -= delCount;
          } else {
            // Can occur due to the deletion from the dangling text heuristic below.
            break;
          }
        }
      } else if (insertDelta != null) {
        if (typeof insertDelta === 'string') {
          const {
            node,
            offset
          } = getPositionFromElementAndOffset(this, currIndex, true);
          if (node instanceof CollabTextNode) {
            node._text = spliceString(node._text, offset, 0, insertDelta);
          } else {
            // TODO: maybe we can improve this by keeping around a redundant
            // text node map, rather than removing all the text nodes, so there
            // never can be dangling text.

            // We have a conflict where there was likely a CollabTextNode and
            // an Lexical TextNode too, but they were removed in a merge. So
            // let's just ignore the text and trigger a removal for it from our
            // shared type.
            this._xmlText.delete(offset, insertDelta.length);
          }
          currIndex += insertDelta.length;
        } else {
          const sharedType = insertDelta;
          const {
            nodeIndex
          } = getPositionFromElementAndOffset(this, currIndex, false);
          const collabNode = getOrInitCollabNodeFromSharedType(binding, sharedType, this);
          children.splice(nodeIndex, 0, collabNode);
          currIndex += 1;
        }
      } else {
        throw new Error('Unexpected delta format');
      }
    }
  }
  syncChildrenFromYjs(binding) {
    // Now diff the children of the collab node with that of our existing Lexical node.
    const lexicalNode = this.getNode();
    if (!(lexicalNode !== null)) {
      throw Error(`syncChildrenFromYjs: cound not find element node`);
    }
    const key = lexicalNode.__key;
    const prevLexicalChildrenKeys = createChildrenArray(lexicalNode, null);
    const lexicalChildrenKeysLength = prevLexicalChildrenKeys.length;
    const collabChildren = this._children;
    const collabChildrenLength = collabChildren.length;
    const collabNodeMap = binding.collabNodeMap;
    const visitedKeys = new Set();
    let collabKeys;
    let writableLexicalNode;
    let prevIndex = 0;
    let prevChildNode = null;
    if (collabChildrenLength !== lexicalChildrenKeysLength) {
      writableLexicalNode = lexicalNode.getWritable();
    }
    for (let i = 0; i < collabChildrenLength; i++) {
      const lexicalChildKey = prevLexicalChildrenKeys[prevIndex];
      const childCollabNode = collabChildren[i];
      const collabLexicalChildNode = childCollabNode.getNode();
      const collabKey = childCollabNode._key;
      if (collabLexicalChildNode !== null && lexicalChildKey === collabKey) {
        const childNeedsUpdating = lexical.$isTextNode(collabLexicalChildNode);
        // Update
        visitedKeys.add(lexicalChildKey);
        if (childNeedsUpdating) {
          childCollabNode._key = lexicalChildKey;
          if (childCollabNode instanceof CollabElementNode) {
            const xmlText = childCollabNode._xmlText;
            childCollabNode.syncPropertiesFromYjs(binding, null);
            childCollabNode.applyChildrenYjsDelta(binding, xmlText.toDelta());
            childCollabNode.syncChildrenFromYjs(binding);
          } else if (childCollabNode instanceof CollabTextNode) {
            childCollabNode.syncPropertiesAndTextFromYjs(binding, null);
          } else if (childCollabNode instanceof CollabDecoratorNode) {
            childCollabNode.syncPropertiesFromYjs(binding, null);
          } else if (!(childCollabNode instanceof CollabLineBreakNode)) {
            {
              throw Error(`syncChildrenFromYjs: expected text, element, decorator, or linebreak collab node`);
            }
          }
        }
        prevChildNode = collabLexicalChildNode;
        prevIndex++;
      } else {
        if (collabKeys === undefined) {
          collabKeys = new Set();
          for (let s = 0; s < collabChildrenLength; s++) {
            const child = collabChildren[s];
            const childKey = child._key;
            if (childKey !== '') {
              collabKeys.add(childKey);
            }
          }
        }
        if (collabLexicalChildNode !== null && lexicalChildKey !== undefined && !collabKeys.has(lexicalChildKey)) {
          const nodeToRemove = $getNodeByKeyOrThrow(lexicalChildKey);
          removeFromParent(nodeToRemove);
          i--;
          prevIndex++;
          continue;
        }
        writableLexicalNode = lexicalNode.getWritable();
        // Create/Replace
        const lexicalChildNode = createLexicalNodeFromCollabNode(binding, childCollabNode, key);
        const childKey = lexicalChildNode.__key;
        collabNodeMap.set(childKey, childCollabNode);
        if (prevChildNode === null) {
          const nextSibling = writableLexicalNode.getFirstChild();
          writableLexicalNode.__first = childKey;
          if (nextSibling !== null) {
            const writableNextSibling = nextSibling.getWritable();
            writableNextSibling.__prev = childKey;
            lexicalChildNode.__next = writableNextSibling.__key;
          }
        } else {
          const writablePrevChildNode = prevChildNode.getWritable();
          const nextSibling = prevChildNode.getNextSibling();
          writablePrevChildNode.__next = childKey;
          lexicalChildNode.__prev = prevChildNode.__key;
          if (nextSibling !== null) {
            const writableNextSibling = nextSibling.getWritable();
            writableNextSibling.__prev = childKey;
            lexicalChildNode.__next = writableNextSibling.__key;
          }
        }
        if (i === collabChildrenLength - 1) {
          writableLexicalNode.__last = childKey;
        }
        writableLexicalNode.__size++;
        prevChildNode = lexicalChildNode;
      }
    }
    for (let i = 0; i < lexicalChildrenKeysLength; i++) {
      const lexicalChildKey = prevLexicalChildrenKeys[i];
      if (!visitedKeys.has(lexicalChildKey)) {
        // Remove
        const lexicalChildNode = $getNodeByKeyOrThrow(lexicalChildKey);
        const collabNode = binding.collabNodeMap.get(lexicalChildKey);
        if (collabNode !== undefined) {
          collabNode.destroy(binding);
        }
        removeFromParent(lexicalChildNode);
      }
    }
  }
  syncPropertiesFromLexical(binding, nextLexicalNode, prevNodeMap) {
    syncPropertiesFromLexical(binding, this._xmlText, this.getPrevNode(prevNodeMap), nextLexicalNode);
  }
  _syncChildFromLexical(binding, index, key, prevNodeMap, dirtyElements, dirtyLeaves) {
    const childCollabNode = this._children[index];
    // Update
    const nextChildNode = $getNodeByKeyOrThrow(key);
    if (childCollabNode instanceof CollabElementNode && lexical.$isElementNode(nextChildNode)) {
      childCollabNode.syncPropertiesFromLexical(binding, nextChildNode, prevNodeMap);
      childCollabNode.syncChildrenFromLexical(binding, nextChildNode, prevNodeMap, dirtyElements, dirtyLeaves);
    } else if (childCollabNode instanceof CollabTextNode && lexical.$isTextNode(nextChildNode)) {
      childCollabNode.syncPropertiesAndTextFromLexical(binding, nextChildNode, prevNodeMap);
    } else if (childCollabNode instanceof CollabDecoratorNode && lexical.$isDecoratorNode(nextChildNode)) {
      childCollabNode.syncPropertiesFromLexical(binding, nextChildNode, prevNodeMap);
    }
  }
  syncChildrenFromLexical(binding, nextLexicalNode, prevNodeMap, dirtyElements, dirtyLeaves) {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const prevChildren = prevLexicalNode === null ? [] : createChildrenArray(prevLexicalNode, prevNodeMap);
    const nextChildren = createChildrenArray(nextLexicalNode, null);
    const prevEndIndex = prevChildren.length - 1;
    const nextEndIndex = nextChildren.length - 1;
    const collabNodeMap = binding.collabNodeMap;
    let prevChildrenSet;
    let nextChildrenSet;
    let prevIndex = 0;
    let nextIndex = 0;
    while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
      const prevKey = prevChildren[prevIndex];
      const nextKey = nextChildren[nextIndex];
      if (prevKey === nextKey) {
        // Nove move, create or remove
        this._syncChildFromLexical(binding, nextIndex, nextKey, prevNodeMap, dirtyElements, dirtyLeaves);
        prevIndex++;
        nextIndex++;
      } else {
        if (prevChildrenSet === undefined) {
          prevChildrenSet = new Set(prevChildren);
        }
        if (nextChildrenSet === undefined) {
          nextChildrenSet = new Set(nextChildren);
        }
        const nextHasPrevKey = nextChildrenSet.has(prevKey);
        const prevHasNextKey = prevChildrenSet.has(nextKey);
        if (!nextHasPrevKey) {
          // Remove
          this.splice(binding, nextIndex, 1);
          prevIndex++;
        } else {
          // Create or replace
          const nextChildNode = $getNodeByKeyOrThrow(nextKey);
          const collabNode = $createCollabNodeFromLexicalNode(binding, nextChildNode, this);
          collabNodeMap.set(nextKey, collabNode);
          if (prevHasNextKey) {
            this.splice(binding, nextIndex, 1, collabNode);
            prevIndex++;
            nextIndex++;
          } else {
            this.splice(binding, nextIndex, 0, collabNode);
            nextIndex++;
          }
        }
      }
    }
    const appendNewChildren = prevIndex > prevEndIndex;
    const removeOldChildren = nextIndex > nextEndIndex;
    if (appendNewChildren && !removeOldChildren) {
      for (; nextIndex <= nextEndIndex; ++nextIndex) {
        const key = nextChildren[nextIndex];
        const nextChildNode = $getNodeByKeyOrThrow(key);
        const collabNode = $createCollabNodeFromLexicalNode(binding, nextChildNode, this);
        this.append(collabNode);
        collabNodeMap.set(key, collabNode);
      }
    } else if (removeOldChildren && !appendNewChildren) {
      for (let i = this._children.length - 1; i >= nextIndex; i--) {
        this.splice(binding, i, 1);
      }
    }
  }
  append(collabNode) {
    const xmlText = this._xmlText;
    const children = this._children;
    const lastChild = children[children.length - 1];
    const offset = lastChild !== undefined ? lastChild.getOffset() + lastChild.getSize() : 0;
    if (collabNode instanceof CollabElementNode) {
      xmlText.insertEmbed(offset, collabNode._xmlText);
    } else if (collabNode instanceof CollabTextNode) {
      const map = collabNode._map;
      if (map.parent === null) {
        xmlText.insertEmbed(offset, map);
      }
      xmlText.insert(offset + 1, collabNode._text);
    } else if (collabNode instanceof CollabLineBreakNode) {
      xmlText.insertEmbed(offset, collabNode._map);
    } else if (collabNode instanceof CollabDecoratorNode) {
      xmlText.insertEmbed(offset, collabNode._xmlElem);
    }
    this._children.push(collabNode);
  }
  splice(binding, index, delCount, collabNode) {
    const children = this._children;
    const child = children[index];
    if (child === undefined) {
      if (!(collabNode !== undefined)) {
        throw Error(`splice: could not find collab element node`);
      }
      this.append(collabNode);
      return;
    }
    const offset = child.getOffset();
    if (!(offset !== -1)) {
      throw Error(`splice: expected offset to be greater than zero`);
    }
    const xmlText = this._xmlText;
    if (delCount !== 0) {
      // What if we delete many nodes, don't we need to get all their
      // sizes?
      xmlText.delete(offset, child.getSize());
    }
    if (collabNode instanceof CollabElementNode) {
      xmlText.insertEmbed(offset, collabNode._xmlText);
    } else if (collabNode instanceof CollabTextNode) {
      const map = collabNode._map;
      if (map.parent === null) {
        xmlText.insertEmbed(offset, map);
      }
      xmlText.insert(offset + 1, collabNode._text);
    } else if (collabNode instanceof CollabLineBreakNode) {
      xmlText.insertEmbed(offset, collabNode._map);
    } else if (collabNode instanceof CollabDecoratorNode) {
      xmlText.insertEmbed(offset, collabNode._xmlElem);
    }
    if (delCount !== 0) {
      const childrenToDelete = children.slice(index, index + delCount);
      for (let i = 0; i < childrenToDelete.length; i++) {
        childrenToDelete[i].destroy(binding);
      }
    }
    if (collabNode !== undefined) {
      children.splice(index, delCount, collabNode);
    } else {
      children.splice(index, delCount);
    }
  }
  getChildOffset(collabNode) {
    let offset = 0;
    const children = this._children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === collabNode) {
        return offset;
      }
      offset += child.getSize();
    }
    return -1;
  }
  destroy(binding) {
    const collabNodeMap = binding.collabNodeMap;
    const children = this._children;
    for (let i = 0; i < children.length; i++) {
      children[i].destroy(binding);
    }
    collabNodeMap.delete(this._key);
  }
}
function $createCollabElementNode(xmlText, parent, type) {
  const collabNode = new CollabElementNode(xmlText, parent, type);
  // @ts-expect-error: internal field
  xmlText._collabNode = collabNode;
  return collabNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function createBinding(editor, provider, id, doc, docMap, excludedProperties) {
  if (!(doc !== undefined && doc !== null)) {
    throw Error(`createBinding: doc is null or undefined`);
  }
  const rootXmlText = doc.get('root', yjs.XmlText);
  const root = $createCollabElementNode(rootXmlText, null, 'root');
  root._key = 'root';
  return {
    clientID: doc.clientID,
    collabNodeMap: new Map(),
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    docMap,
    editor,
    excludedProperties: excludedProperties || new Map(),
    id,
    nodeProperties: new Map(),
    root
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function createRelativePosition(point, binding) {
  const collabNodeMap = binding.collabNodeMap;
  const collabNode = collabNodeMap.get(point.key);
  if (collabNode === undefined) {
    return null;
  }
  let offset = point.offset;
  let sharedType = collabNode.getSharedType();
  if (collabNode instanceof CollabTextNode) {
    sharedType = collabNode._parent._xmlText;
    const currentOffset = collabNode.getOffset();
    if (currentOffset === -1) {
      return null;
    }
    offset = currentOffset + 1 + offset;
  } else if (collabNode instanceof CollabElementNode && point.type === 'element') {
    const parent = point.getNode();
    let accumulatedOffset = 0;
    let i = 0;
    let node = parent.getFirstChild();
    while (node !== null && i++ < offset) {
      if (lexical.$isTextNode(node)) {
        accumulatedOffset += node.getTextContentSize() + 1;
      } else {
        accumulatedOffset++;
      }
      node = node.getNextSibling();
    }
    offset = accumulatedOffset;
  }
  return yjs.createRelativePositionFromTypeIndex(sharedType, offset);
}
function createAbsolutePosition(relativePosition, binding) {
  return yjs.createAbsolutePositionFromRelativePosition(relativePosition, binding.doc);
}
function shouldUpdatePosition(currentPos, pos) {
  if (currentPos == null) {
    if (pos != null) {
      return true;
    }
  } else if (pos == null || !yjs.compareRelativePositions(currentPos, pos)) {
    return true;
  }
  return false;
}
function createCursor(name, color) {
  return {
    color: color,
    name: name,
    selection: null
  };
}
function destroySelection(binding, selection) {
  const cursorsContainer = binding.cursorsContainer;
  if (cursorsContainer !== null) {
    const selections = selection.selections;
    const selectionsLength = selections.length;
    for (let i = 0; i < selectionsLength; i++) {
      cursorsContainer.removeChild(selections[i]);
    }
  }
}
function destroyCursor(binding, cursor) {
  const selection = cursor.selection;
  if (selection !== null) {
    destroySelection(binding, selection);
  }
}
function createCursorSelection(cursor, anchorKey, anchorOffset, focusKey, focusOffset) {
  const color = cursor.color;
  const caret = document.createElement('span');
  caret.style.cssText = `position:absolute;top:0;bottom:0;right:-1px;width:1px;background-color:${color};z-index:10;`;
  const name = document.createElement('span');
  name.textContent = cursor.name;
  name.style.cssText = `position:absolute;left:-2px;top:-16px;background-color:${color};color:#fff;line-height:12px;font-size:12px;padding:2px;font-family:Arial;font-weight:bold;white-space:nowrap;`;
  caret.appendChild(name);
  return {
    anchor: {
      key: anchorKey,
      offset: anchorOffset
    },
    caret,
    color,
    focus: {
      key: focusKey,
      offset: focusOffset
    },
    name,
    selections: []
  };
}
function updateCursor(binding, cursor, nextSelection, nodeMap) {
  const editor = binding.editor;
  const rootElement = editor.getRootElement();
  const cursorsContainer = binding.cursorsContainer;
  if (cursorsContainer === null || rootElement === null) {
    return;
  }
  const cursorsContainerOffsetParent = cursorsContainer.offsetParent;
  if (cursorsContainerOffsetParent === null) {
    return;
  }
  const containerRect = cursorsContainerOffsetParent.getBoundingClientRect();
  const prevSelection = cursor.selection;
  if (nextSelection === null) {
    if (prevSelection === null) {
      return;
    } else {
      cursor.selection = null;
      destroySelection(binding, prevSelection);
      return;
    }
  } else {
    cursor.selection = nextSelection;
  }
  const caret = nextSelection.caret;
  const color = nextSelection.color;
  const selections = nextSelection.selections;
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorNode = nodeMap.get(anchorKey);
  const focusNode = nodeMap.get(focusKey);
  if (anchorNode == null || focusNode == null) {
    return;
  }
  let selectionRects;

  // In the case of a collapsed selection on a linebreak, we need
  // to improvise as the browser will return nothing here as <br>
  // apparantly take up no visual space :/
  // This won't work in all cases, but it's better than just showing
  // nothing all the time.
  if (anchorNode === focusNode && lexical.$isLineBreakNode(anchorNode)) {
    const brRect = editor.getElementByKey(anchorKey).getBoundingClientRect();
    selectionRects = [brRect];
  } else {
    const range = selection.createDOMRange(editor, anchorNode, anchor.offset, focusNode, focus.offset);
    if (range === null) {
      return;
    }
    selectionRects = selection.createRectsFromDOMRange(editor, range);
  }
  const selectionsLength = selections.length;
  const selectionRectsLength = selectionRects.length;
  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    let selection = selections[i];
    if (selection === undefined) {
      selection = document.createElement('span');
      selections[i] = selection;
      const selectionBg = document.createElement('span');
      selection.appendChild(selectionBg);
      cursorsContainer.appendChild(selection);
    }
    const top = selectionRect.top - containerRect.top;
    const left = selectionRect.left - containerRect.left;
    const style = `position:absolute;top:${top}px;left:${left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;pointer-events:none;z-index:5;`;
    selection.style.cssText = style;
    selection.firstChild.style.cssText = `${style}left:0;top:0;background-color:${color};opacity:0.3;`;
    if (i === selectionRectsLength - 1) {
      if (caret.parentNode !== selection) {
        selection.appendChild(caret);
      }
    }
  }
  for (let i = selectionsLength - 1; i >= selectionRectsLength; i--) {
    const selection = selections[i];
    cursorsContainer.removeChild(selection);
    selections.pop();
  }
}
function syncLocalCursorPosition(binding, provider) {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();
  if (localState === null) {
    return;
  }
  const anchorPos = localState.anchorPos;
  const focusPos = localState.focusPos;
  if (anchorPos !== null && focusPos !== null) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);
    if (anchorAbsPos !== null && focusAbsPos !== null) {
      const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(anchorAbsPos.type, anchorAbsPos.index);
      const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(focusAbsPos.type, focusAbsPos.index);
      if (anchorCollabNode !== null && focusCollabNode !== null) {
        const anchorKey = anchorCollabNode.getKey();
        const focusKey = focusCollabNode.getKey();
        const selection = lexical.$getSelection();
        if (!lexical.$isRangeSelection(selection)) {
          return;
        }
        const anchor = selection.anchor;
        const focus = selection.focus;
        setPoint(anchor, anchorKey, anchorOffset);
        setPoint(focus, focusKey, focusOffset);
      }
    }
  }
}
function setPoint(point, key, offset) {
  if (point.key !== key || point.offset !== offset) {
    let anchorNode = lexical.$getNodeByKey(key);
    if (anchorNode !== null && !lexical.$isElementNode(anchorNode) && !lexical.$isTextNode(anchorNode)) {
      const parent = anchorNode.getParentOrThrow();
      key = parent.getKey();
      offset = anchorNode.getIndexWithinParent();
      anchorNode = parent;
    }
    point.set(key, offset, lexical.$isElementNode(anchorNode) ? 'element' : 'text');
  }
}
function getCollabNodeAndOffset(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
sharedType, offset) {
  const collabNode = sharedType._collabNode;
  if (collabNode === undefined) {
    return [null, 0];
  }
  if (collabNode instanceof CollabElementNode) {
    const {
      node,
      offset: collabNodeOffset
    } = getPositionFromElementAndOffset(collabNode, offset, true);
    if (node === null) {
      return [collabNode, 0];
    } else {
      return [node, collabNodeOffset];
    }
  }
  return [null, 0];
}
function syncCursorPositions(binding, provider) {
  const awarenessStates = Array.from(provider.awareness.getStates());
  const localClientID = binding.clientID;
  const cursors = binding.cursors;
  const editor = binding.editor;
  const nodeMap = editor._editorState._nodeMap;
  const visitedClientIDs = new Set();
  for (let i = 0; i < awarenessStates.length; i++) {
    const awarenessState = awarenessStates[i];
    const [clientID, awareness] = awarenessState;
    if (clientID !== localClientID) {
      visitedClientIDs.add(clientID);
      const {
        anchorPos,
        focusPos,
        name,
        color,
        focusing
      } = awareness;
      let selection = null;
      let cursor = cursors.get(clientID);
      if (cursor === undefined) {
        cursor = createCursor(name, color);
        cursors.set(clientID, cursor);
      }
      if (anchorPos !== null && focusPos !== null && focusing) {
        const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
        const focusAbsPos = createAbsolutePosition(focusPos, binding);
        if (anchorAbsPos !== null && focusAbsPos !== null) {
          const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(anchorAbsPos.type, anchorAbsPos.index);
          const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(focusAbsPos.type, focusAbsPos.index);
          if (anchorCollabNode !== null && focusCollabNode !== null) {
            const anchorKey = anchorCollabNode.getKey();
            const focusKey = focusCollabNode.getKey();
            selection = cursor.selection;
            if (selection === null) {
              selection = createCursorSelection(cursor, anchorKey, anchorOffset, focusKey, focusOffset);
            } else {
              const anchor = selection.anchor;
              const focus = selection.focus;
              anchor.key = anchorKey;
              anchor.offset = anchorOffset;
              focus.key = focusKey;
              focus.offset = focusOffset;
            }
          }
        }
      }
      updateCursor(binding, cursor, selection, nodeMap);
    }
  }
  const allClientIDs = Array.from(cursors.keys());
  for (let i = 0; i < allClientIDs.length; i++) {
    const clientID = allClientIDs[i];
    if (!visitedClientIDs.has(clientID)) {
      const cursor = cursors.get(clientID);
      if (cursor !== undefined) {
        destroyCursor(binding, cursor);
        cursors.delete(clientID);
      }
    }
  }
}
function syncLexicalSelectionToYjs(binding, provider, prevSelection, nextSelection) {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();
  if (localState === null) {
    return;
  }
  const {
    anchorPos: currentAnchorPos,
    focusPos: currentFocusPos,
    name,
    color,
    focusing,
    awarenessData
  } = localState;
  let anchorPos = null;
  let focusPos = null;
  if (nextSelection === null || currentAnchorPos !== null && !nextSelection.is(prevSelection)) {
    if (prevSelection === null) {
      return;
    }
  }
  if (lexical.$isRangeSelection(nextSelection)) {
    anchorPos = createRelativePosition(nextSelection.anchor, binding);
    focusPos = createRelativePosition(nextSelection.focus, binding);
  }
  if (shouldUpdatePosition(currentAnchorPos, anchorPos) || shouldUpdatePosition(currentFocusPos, focusPos)) {
    awareness.setLocalState({
      anchorPos,
      awarenessData,
      color,
      focusPos,
      focusing,
      name
    });
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function syncEvent(binding, event) {
  const {
    target
  } = event;
  const collabNode = getOrInitCollabNodeFromSharedType(binding, target);
  if (collabNode instanceof CollabElementNode && event instanceof yjs.YTextEvent) {
    // @ts-expect-error We need to access the private property of the class
    const {
      keysChanged,
      childListChanged,
      delta
    } = event;

    // Update
    if (keysChanged.size > 0) {
      collabNode.syncPropertiesFromYjs(binding, keysChanged);
    }
    if (childListChanged) {
      collabNode.applyChildrenYjsDelta(binding, delta);
      collabNode.syncChildrenFromYjs(binding);
    }
  } else if (collabNode instanceof CollabTextNode && event instanceof yjs.YMapEvent) {
    const {
      keysChanged
    } = event;

    // Update
    if (keysChanged.size > 0) {
      collabNode.syncPropertiesAndTextFromYjs(binding, keysChanged);
    }
  } else if (collabNode instanceof CollabDecoratorNode && event instanceof yjs.YXmlEvent) {
    const {
      attributesChanged
    } = event;

    // Update
    if (attributesChanged.size > 0) {
      collabNode.syncPropertiesFromYjs(binding, attributesChanged);
    }
  } else {
    {
      throw Error(`Expected text, element, or decorator event`);
    }
  }
}
function syncYjsChangesToLexical(binding, provider, events, isFromUndoManger) {
  const editor = binding.editor;
  const currentEditorState = editor._editorState;

  // This line precompute the delta before editor update. The reason is
  // delta is computed when it is accessed. Note that this can only be
  // safely computed during the event call. If it is accessed after event
  // call it might result in unexpected behavior.
  // https://github.com/yjs/yjs/blob/00ef472d68545cb260abd35c2de4b3b78719c9e4/src/utils/YEvent.js#L132
  events.forEach(event => event.delta);
  editor.update(() => {
    const pendingEditorState = editor._pendingEditorState;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      syncEvent(binding, event);
    }
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      // We can't use Yjs's cursor position here, as it doesn't always
      // handle selection recovery correctly – especially on elements that
      // get moved around or split. So instead, we roll our own solution.
      if (doesSelectionNeedRecovering(selection)) {
        const prevSelection = currentEditorState._selection;
        if (lexical.$isRangeSelection(prevSelection)) {
          const prevOffsetView = offset.$createOffsetView(editor, 0, currentEditorState);
          const nextOffsetView = offset.$createOffsetView(editor, 0, pendingEditorState);
          const [start, end] = prevOffsetView.getOffsetsFromSelection(prevSelection);
          const nextSelection = nextOffsetView.createSelectionFromOffsets(start, end, prevOffsetView);
          if (nextSelection !== null) {
            lexical.$setSelection(nextSelection);
          } else {
            // Fallback is to use the Yjs cursor position
            syncLocalCursorPosition(binding, provider);
            if (doesSelectionNeedRecovering(selection)) {
              const root = lexical.$getRoot();

              // If there was a collision on the top level paragraph
              // we need to re-add a paragraph
              if (root.getChildrenSize() === 0) {
                root.append(lexical.$createParagraphNode());
              }

              // Fallback
              lexical.$getRoot().selectEnd();
            }
          }
        }
        syncLexicalSelectionToYjs(binding, provider, prevSelection, lexical.$getSelection());
      } else {
        syncLocalCursorPosition(binding, provider);
      }
    }
  }, {
    onUpdate: () => {
      syncCursorPositions(binding, provider);
    },
    skipTransforms: true,
    tag: isFromUndoManger ? 'historic' : 'collaboration'
  });
}
function handleNormalizationMergeConflicts(binding, normalizedNodes) {
  // We handle the merge operations here
  const normalizedNodesKeys = Array.from(normalizedNodes);
  const collabNodeMap = binding.collabNodeMap;
  const mergedNodes = [];
  for (let i = 0; i < normalizedNodesKeys.length; i++) {
    const nodeKey = normalizedNodesKeys[i];
    const lexicalNode = lexical.$getNodeByKey(nodeKey);
    const collabNode = collabNodeMap.get(nodeKey);
    if (collabNode instanceof CollabTextNode) {
      if (lexical.$isTextNode(lexicalNode)) {
        // We mutate the text collab nodes after removing
        // all the dead nodes first, otherwise offsets break.
        mergedNodes.push([collabNode, lexicalNode.__text]);
      } else {
        const offset = collabNode.getOffset();
        if (offset === -1) {
          continue;
        }
        const parent = collabNode._parent;
        collabNode._normalized = true;
        parent._xmlText.delete(offset, 1);
        collabNodeMap.delete(nodeKey);
        const parentChildren = parent._children;
        const index = parentChildren.indexOf(collabNode);
        parentChildren.splice(index, 1);
      }
    }
  }
  for (let i = 0; i < mergedNodes.length; i++) {
    const [collabNode, text] = mergedNodes[i];
    if (collabNode instanceof CollabTextNode && typeof text === 'string') {
      collabNode._text = text;
    }
  }
}
function syncLexicalUpdateToYjs(binding, provider, prevEditorState, currEditorState, dirtyElements, dirtyLeaves, normalizedNodes, tags) {
  syncWithTransaction(binding, () => {
    currEditorState.read(() => {
      // We check if the update has come from a origin where the origin
      // was the collaboration binding previously. This can help us
      // prevent unnecessarily re-diffing and possible re-applying
      // the same change editor state again. For example, if a user
      // types a character and we get it, we don't want to then insert
      // the same character again. The exception to this heuristic is
      // when we need to handle normalization merge conflicts.
      if (tags.has('collaboration') || tags.has('historic')) {
        if (normalizedNodes.size > 0) {
          handleNormalizationMergeConflicts(binding, normalizedNodes);
        }
        return;
      }
      if (dirtyElements.has('root')) {
        const prevNodeMap = prevEditorState._nodeMap;
        const nextLexicalRoot = lexical.$getRoot();
        const collabRoot = binding.root;
        collabRoot.syncPropertiesFromLexical(binding, nextLexicalRoot, prevNodeMap);
        collabRoot.syncChildrenFromLexical(binding, nextLexicalRoot, prevNodeMap, dirtyElements, dirtyLeaves);
      }
      const selection = lexical.$getSelection();
      const prevSelection = prevEditorState._selection;
      syncLexicalSelectionToYjs(binding, provider, prevSelection, selection);
    });
  });
}

/** @module @lexical/yjs */
const CONNECTED_COMMAND = lexical.createCommand('CONNECTED_COMMAND');
const TOGGLE_CONNECT_COMMAND = lexical.createCommand('TOGGLE_CONNECT_COMMAND');
function createUndoManager(binding, root) {
  return new yjs.UndoManager(root, {
    trackedOrigins: new Set([binding, null])
  });
}
function initLocalState(provider, name, color, focusing, awarenessData) {
  provider.awareness.setLocalState({
    anchorPos: null,
    awarenessData,
    color,
    focusPos: null,
    focusing: focusing,
    name
  });
}
function setLocalStateFocus(provider, name, color, focusing, awarenessData) {
  const {
    awareness
  } = provider;
  let localState = awareness.getLocalState();
  if (localState === null) {
    localState = {
      anchorPos: null,
      awarenessData,
      color,
      focusPos: null,
      focusing: focusing,
      name
    };
  }
  localState.focusing = focusing;
  awareness.setLocalState(localState);
}

exports.CONNECTED_COMMAND = CONNECTED_COMMAND;
exports.TOGGLE_CONNECT_COMMAND = TOGGLE_CONNECT_COMMAND;
exports.createBinding = createBinding;
exports.createUndoManager = createUndoManager;
exports.initLocalState = initLocalState;
exports.setLocalStateFocus = setLocalStateFocus;
exports.syncCursorPositions = syncCursorPositions;
exports.syncLexicalUpdateToYjs = syncLexicalUpdateToYjs;
exports.syncYjsChangesToLexical = syncYjsChangesToLexical;
