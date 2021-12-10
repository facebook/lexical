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
  NodeMap,
} from 'outline';
import type {Binding} from '.';

import {
  $getNodeByKeyOrThrow,
  syncPropertiesFromOutline,
  $createCollabNodeFromOutlineNode,
  getOrInitCollabNodeFromSharedType,
  createOutlineNodeFromCollabNode,
  getPositionFromElementAndOffset,
  syncPropertiesFromYjs,
  spliceString,
} from './Utils';
import {CollabTextNode} from './CollabTextNode';
import {CollabLineBreakNode} from './CollabLineBreakNode';
import {
  $isElementNode,
  $isTextNode,
  $getNodeByKey,
  $isDecoratorNode,
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
    return $isElementNode(node) ? node : null;
  }

  getNode(): null | ElementNode {
    const node = $getNodeByKey(this._key);
    return $isElementNode(node) ? node : null;
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
            throw new Error('Should never happen for ' + String(node));
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
    const outlineChildrenKeysLength = prevOutlineChildrenKeys.length;
    const collabChildren = this._children;
    const collabChildrenLength = collabChildren.length;
    const collabNodeMap = binding.collabNodeMap;
    const visitedKeys = new Set();
    let collabKeys;
    // Assign the new children key array that we're about to mutate
    let writableOutlineNode;

    if (collabChildrenLength !== outlineChildrenKeysLength) {
      writableOutlineNode = lazilyCloneElementNode(
        outlineNode,
        writableOutlineNode,
        nextOutlineChildrenKeys,
      );
    }
    let prevIndex = 0;

    for (let i = 0; i < collabChildrenLength; i++) {
      const outlineChildKey = prevOutlineChildrenKeys[prevIndex];
      const childCollabNode = collabChildren[i];
      const collabOutlineChildNode = childCollabNode.getNode();
      const collabKey = childCollabNode._key;

      if (collabOutlineChildNode !== null && outlineChildKey === collabKey) {
        const childNeedsUpdating = $isTextNode(collabOutlineChildNode);
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
        }
        nextOutlineChildrenKeys[i] = outlineChildKey;
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
        if (
          collabOutlineChildNode !== null &&
          outlineChildKey !== undefined &&
          !collabKeys.has(outlineChildKey)
        ) {
          i--;
          prevIndex++;
          continue;
        }
        writableOutlineNode = lazilyCloneElementNode(
          outlineNode,
          writableOutlineNode,
          nextOutlineChildrenKeys,
        );
        // Create/Replace
        const outlineChildNode = createOutlineNodeFromCollabNode(
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
          $getNodeByKeyOrThrow(outlineChildKey).getWritable();
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

  _syncChildFromOutline(
    binding: Binding,
    index: number,
    key: NodeKey,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void {
    const childCollabNode = this._children[index];
    // Update
    const nextChildNode = $getNodeByKeyOrThrow(key);
    if (
      childCollabNode instanceof CollabElementNode &&
      $isElementNode(nextChildNode)
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
      $isTextNode(nextChildNode)
    ) {
      childCollabNode.syncPropertiesAndTextFromOutline(
        binding,
        nextChildNode,
        prevNodeMap,
      );
    } else if (
      childCollabNode instanceof CollabDecoratorNode &&
      $isDecoratorNode(nextChildNode)
    ) {
      childCollabNode.syncPropertiesFromOutline(
        binding,
        nextChildNode,
        prevNodeMap,
      );
    }
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
    const prevEndIndex = prevChildren.length - 1;
    const nextEndIndex = nextChildren.length - 1;
    let prevChildrenSet: void | Set<NodeKey>;
    let nextChildrenSet: void | Set<NodeKey>;
    let prevIndex = 0;
    let nextIndex = 0;

    while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
      const prevKey = prevChildren[prevIndex];
      const nextKey = nextChildren[nextIndex];

      if (prevKey === nextKey) {
        // Nove move, create or remove
        this._syncChildFromOutline(
          binding,
          nextIndex,
          nextKey,
          prevNodeMap,
          dirtyElements,
          dirtyLeaves,
        );
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
          const collabNode = $createCollabNodeFromOutlineNode(
            binding,
            nextChildNode,
            this,
          );
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
        const collabNode = $createCollabNodeFromOutlineNode(
          binding,
          nextChildNode,
          this,
        );
        this.append(collabNode);
      }
    } else if (removeOldChildren && !appendNewChildren) {
      for (let i = prevEndIndex; i >= prevIndex; i--) {
        this.splice(binding, i, 1);
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

export function $createCollabElementNode(
  xmlText: XmlText,
  parent: null | CollabElementNode,
  type: string,
): CollabElementNode {
  const collabNode = new CollabElementNode(xmlText, parent, type);
  // $FlowFixMe: internal field
  xmlText._collabNode = collabNode;
  return collabNode;
}
