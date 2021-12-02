/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextOperation, Map as YMap, XmlText, XmlElement} from 'yjs';
import type {
  ElementNode,
  NodeKey,
  IntentionallyMarkedAsDirtyElement,
  OutlineNode,
  NodeMap,
} from 'outline';
import type {Binding} from '.';

import {
  getNodeByKeyOrThrow,
  syncPropertiesFromOutline,
  createCollabNodeFromOutlineNode,
  getOrInitCollabNodeFromSharedType,
  createOutlineNodeFromCollabNode,
  getPositionFromElementAndOffset,
  syncPropertiesFromYjs,
  spliceString,
} from './Utils';
import {CollabTextNode} from './CollabTextNode';
import {CollabLineBreakNode} from './CollabLineBreakNode';
import {
  isElementNode,
  isTextNode,
  getNodeByKey,
  isDecoratorNode,
} from 'outline';
import {CollabDecoratorNode} from './CollabDecoratorNode';

export class CollabElementNode {
  _key: NodeKey;
  _children: Array<
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode,
  >;
  _xmlText: XmlText;
  _type: string;
  _parent: null | CollabElementNode;

  constructor(
    xmlText: XmlText,
    parent: null | CollabElementNode,
    type: string,
  ) {
    this._key = '';
    this._children = [];
    this._xmlText = xmlText;
    this._type = type;
    this._parent = parent;
  }

  getPrevNode(nodeMap: null | NodeMap): null | ElementNode {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return isElementNode(node) ? node : null;
  }

  getNode(): null | ElementNode {
    const node = getNodeByKey(this._key);
    return isElementNode(node) ? node : null;
  }

  getSharedType(): XmlText {
    return this._xmlText;
  }

  getType(): string {
    return this._type;
  }

  getKey(): NodeKey {
    return this._key;
  }

  isEmpty(): boolean {
    return this._children.length === 0;
  }

  getSize(): number {
    return 1;
  }

  getOffset(): number {
    const collabElementNode = this._parent;
    if (collabElementNode === null) {
      throw new Error('Should never happen');
    }
    return collabElementNode.getChildOffset(this);
  }

  syncPropertiesFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void {
    const outlineNode = this.getNode();
    if (outlineNode === null) {
      this.getNode();
      throw new Error('Should never happen');
    }
    syncPropertiesFromYjs(binding, this._xmlText, outlineNode, keysChanged);
  }

  applyChildrenYjsDelta(binding: Binding, deltas: Array<TextOperation>): void {
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
          const {node, nodeIndex, offset, length} =
            getPositionFromElementAndOffset(this, currIndex, false);

          if (
            node instanceof CollabElementNode ||
            node instanceof CollabLineBreakNode ||
            node instanceof CollabDecoratorNode
          ) {
            children.splice(nodeIndex, 1);
            deletionSize -= 1;
          } else if (node instanceof CollabTextNode) {
            const delCount = Math.min(deletionSize, length);
            if (offset === 0 && delCount === node.getSize()) {
              // The entire thing needs removing
              children.splice(nodeIndex, 1);
            } else {
              node._text = spliceString(node._text, offset, delCount, '');
            }
            deletionSize -= delCount;
          } else {
            throw new Error('Should never happen for ' + node);
          }
        }
      } else if (insertDelta != null) {
        if (typeof insertDelta === 'string') {
          const {node, offset} = getPositionFromElementAndOffset(
            this,
            currIndex,
            true,
          );

          if (node instanceof CollabTextNode) {
            node._text = spliceString(node._text, offset, 0, insertDelta);
          } else {
            throw new Error('Should never happen');
          }
          currIndex += insertDelta.length;
        } else {
          const sharedType: XmlText | YMap | XmlElement = insertDelta;
          const {nodeIndex} = getPositionFromElementAndOffset(
            this,
            currIndex,
            false,
          );
          const collabNode = getOrInitCollabNodeFromSharedType(
            binding,
            sharedType,
            this,
          );
          children.splice(nodeIndex, 0, collabNode);
          currIndex += 1;
        }
      } else {
        throw new Error('Unexpected delta format');
      }
    }
  }

  syncChildrenFromYjs(binding: Binding): void {
    // Now diff the children of the collab node with that of our existing Outline node.
    const outlineNode = this.getNode();
    if (outlineNode === null) {
      this.getNode();
      throw new Error('Should never happen');
    }
    const key = outlineNode.__key;
    const prevOutlineChildrenKeys = outlineNode.__children;
    const nextOutlineChildrenKeys = [];
    const visitedKeys = new Set();
    const outlineChildrenKeysLength = prevOutlineChildrenKeys.length;
    const collabChildren = this._children;
    const collabChildrenLength = collabChildren.length;
    const collabNodeMap = binding.collabNodeMap;
    // Assign the new children key array that we're about to mutate
    let writableOutlineNode;

    if (collabChildrenLength !== outlineChildrenKeysLength) {
      writableOutlineNode = lazilyCloneElementNode(
        outlineNode,
        writableOutlineNode,
        nextOutlineChildrenKeys,
      );
    }

    for (let i = 0; i < collabChildrenLength; i++) {
      const outlineChildKey = prevOutlineChildrenKeys[i];
      const childCollabNode = collabChildren[i];
      const collabOutlineChildNode = childCollabNode.getNode();
      let outlineChildNode: null | OutlineNode =
        outlineChildKey === undefined
          ? null
          : getNodeByKey(prevOutlineChildrenKeys[i]);

      if (
        outlineChildNode !== null &&
        childCollabNode._type === outlineChildNode.__type
      ) {
        const childNeedsUpdating =
          collabOutlineChildNode === null || isTextNode(collabOutlineChildNode);
        // Update
        visitedKeys.add(outlineChildKey);
        if (childNeedsUpdating) {
          childCollabNode._key = outlineChildKey;
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
            throw new Error('Should never happen');
          }
          if (outlineChildNode === null) {
            collabNodeMap.set(outlineNode.__key, childCollabNode);
          }
        }
        nextOutlineChildrenKeys[i] = outlineChildKey;
      } else {
        writableOutlineNode = lazilyCloneElementNode(
          outlineNode,
          writableOutlineNode,
          nextOutlineChildrenKeys,
        );
        // Create/Replace
        outlineChildNode = createOutlineNodeFromCollabNode(
          binding,
          childCollabNode,
          key,
        );
        const childKey = outlineChildNode.__key;
        collabNodeMap.set(childKey, childCollabNode);
        nextOutlineChildrenKeys[i] = childKey;
      }
    }
    for (let i = 0; i < outlineChildrenKeysLength; i++) {
      const outlineChildKey = prevOutlineChildrenKeys[i];
      if (!visitedKeys.has(outlineChildKey)) {
        // Remove
        const outlineChildNode =
          getNodeByKeyOrThrow(outlineChildKey).getWritable();
        const collabNode = binding.collabNodeMap.get(outlineChildKey);
        if (collabNode !== undefined) {
          collabNode.destroy(binding);
        }
        outlineChildNode.__parent = null;
      }
    }
  }

  syncPropertiesFromOutline(
    binding: Binding,
    nextOutlineNode: ElementNode,
    prevNodeMap: null | NodeMap,
  ): void {
    syncPropertiesFromOutline(
      binding,
      this._xmlText,
      this.getPrevNode(prevNodeMap),
      nextOutlineNode,
    );
  }

  syncChildrenFromOutline(
    binding: Binding,
    nextOutlineNode: ElementNode,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void {
    const prevOutlineNode = this.getPrevNode(prevNodeMap);
    const prevChildren =
      prevOutlineNode === null ? [] : prevOutlineNode.__children;
    const nextChildren = nextOutlineNode.__children;
    const visitedChildKeys = new Set();
    const prevChildrenLength = prevChildren.length;
    const nextChildrenLength = nextChildren.length;
    const collabNodeMap = binding.collabNodeMap;

    // This algorithm could be optimal, and do what the reconciler
    // does, and try and match keys that might have moved. Otherwise,
    // we end up doing lots of replace calls.
    for (let i = 0; i < nextChildrenLength; i++) {
      const prevChildKey = prevChildren[i];
      const nextChildKey = nextChildren[i];
      const childCollabNode = this._children[i];

      if (prevChildKey === nextChildKey && childCollabNode !== undefined) {
        visitedChildKeys.add(nextChildKey);
        if (
          (dirtyElements !== null && dirtyElements.has(nextChildKey)) ||
          (dirtyLeaves !== null && dirtyLeaves.has(nextChildKey))
        ) {
          // Update
          const nextChildNode = getNodeByKeyOrThrow(nextChildKey);
          if (
            childCollabNode instanceof CollabElementNode &&
            isElementNode(nextChildNode)
          ) {
            childCollabNode.syncPropertiesFromOutline(
              binding,
              nextChildNode,
              prevNodeMap,
            );
            childCollabNode.syncChildrenFromOutline(
              binding,
              nextChildNode,
              prevNodeMap,
              dirtyElements,
              dirtyLeaves,
            );
          } else if (
            childCollabNode instanceof CollabTextNode &&
            isTextNode(nextChildNode)
          ) {
            childCollabNode.syncPropertiesAndTextFromOutline(
              binding,
              nextChildNode,
              prevNodeMap,
            );
          } else if (
            childCollabNode instanceof CollabDecoratorNode &&
            isDecoratorNode(nextChildNode)
          ) {
            childCollabNode.syncPropertiesFromOutline(
              binding,
              nextChildNode,
              prevNodeMap,
            );
          }
        }
      } else {
        if (nextChildKey === undefined) {
          if (prevChildKey !== undefined) {
            visitedChildKeys.add(prevChildKey);
          }
          // Remove
          throw new Error('TODO: does this even happen?');
        } else {
          const nextChildNode = getNodeByKeyOrThrow(nextChildKey);
          const collabNode = createCollabNodeFromOutlineNode(
            binding,
            nextChildNode,
            this,
          );
          if (prevChildKey === undefined) {
            // Create
            this.splice(binding, i, 0, collabNode);
          } else {
            visitedChildKeys.add(prevChildKey);
            // Replace
            this.splice(binding, i, 1, collabNode);
          }
          collabNodeMap.set(nextChildKey, collabNode);
        }
      }
    }
    let deletedIndex = 0;
    for (let i = 0; i < prevChildrenLength; i++) {
      const prevChildKey = prevChildren[i];
      if (!visitedChildKeys.has(prevChildKey)) {
        // Remove
        this.splice(binding, i - deletedIndex, 1);
        deletedIndex++;
      }
    }
  }

  append(
    collabNode:
      | CollabElementNode
      | CollabDecoratorNode
      | CollabTextNode
      | CollabLineBreakNode,
  ): void {
    const xmlText = this._xmlText;
    const children = this._children;
    const lastChild = children[children.length - 1];
    const offset =
      lastChild !== undefined ? lastChild.getOffset() + lastChild.getSize() : 0;
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

  splice(
    binding: Binding,
    index: number,
    delCount: number,
    collabNode?:
      | CollabElementNode
      | CollabDecoratorNode
      | CollabTextNode
      | CollabLineBreakNode,
  ): void {
    const children = this._children;
    const child = children[index];
    if (child === undefined) {
      if (collabNode !== undefined) {
        this.append(collabNode);
      } else {
        throw new Error('Should never happen');
      }
      return;
    }
    const offset = child.getOffset();
    if (offset === -1) {
      throw new Error('Should never happen');
    }
    const xmlText = this._xmlText;
    if (delCount !== 0) {
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

  getChildOffset(
    collabNode:
      | CollabElementNode
      | CollabTextNode
      | CollabDecoratorNode
      | CollabLineBreakNode,
  ): number {
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

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;
    const children = this._children;
    for (let i = 0; i < children.length; i++) {
      children[i].destroy(binding);
    }
    collabNodeMap.delete(this._key);
  }
}

function lazilyCloneElementNode(
  outlineNode: ElementNode,
  writableOutlineNode: void | ElementNode,
  nextOutlineChildrenKeys: Array<NodeKey>,
): ElementNode {
  if (writableOutlineNode === undefined) {
    const clone = outlineNode.getWritable();
    clone.__children = nextOutlineChildrenKeys;
    return clone;
  }
  return writableOutlineNode;
}

export function createCollabElementNode(
  xmlText: XmlText,
  parent: null | CollabElementNode,
  type: string,
): CollabElementNode {
  const collabNode = new CollabElementNode(xmlText, parent, type);
  // $FlowFixMe: internal field
  xmlText._collabNode = collabNode;
  return collabNode;
}
