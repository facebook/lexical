/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextNode, NodeKey, NodeMap} from 'outline';
import type {Binding} from '.';
import type {CollabBlockNode} from './CollabBlockNode';
import type {Map as YMap} from 'yjs';

import {getSelection, isTextNode, getNodeByKey} from 'outline';
import {syncPropertiesFromOutline, syncPropertiesFromYjs} from './Utils';

function simpleDiffWithCursor(
  a: string,
  b: string,
  cursor: number,
): {index: number, remove: number, insert: string} {
  const aLength = a.length;
  const bLength = b.length;
  let left = 0; // number of same characters counting from left
  let right = 0; // number of same characters counting from right
  // Iterate left to the right until we find a changed character
  // First iteration considers the current cursor position
  while (
    left < aLength &&
    left < bLength &&
    a[left] === b[left] &&
    left < cursor
  ) {
    left++;
  }
  // Iterate right to the left until we find a changed character
  while (
    right + left < aLength &&
    right + left < bLength &&
    a[aLength - right - 1] === b[bLength - right - 1]
  ) {
    right++;
  }
  // Try to iterate left further to the right without caring about the current cursor position
  while (
    right + left < aLength &&
    right + left < bLength &&
    a[left] === b[left]
  ) {
    left++;
  }
  return {
    index: left,
    remove: aLength - left - right,
    insert: b.slice(left, bLength - right),
  };
}

function diffTextContentAndApplyDelta(
  collabNode: CollabTextNode,
  key: NodeKey,
  prevText: string,
  nextText: string,
): void {
  const selection = getSelection();
  let cursorOffset = nextText.length;
  if (selection !== null && selection.isCollapsed()) {
    const anchor = selection.anchor;
    if (anchor.key === key) {
      cursorOffset = anchor.offset;
    }
  }
  const diff = simpleDiffWithCursor(prevText, nextText, cursorOffset);
  collabNode.spliceText(diff.index, diff.remove, diff.insert);
}

export class CollabTextNode {
  _map: YMap;
  _key: NodeKey;
  _parent: CollabBlockNode;
  _text: string;
  _type: string;
  _normalized: boolean;

  constructor(map: YMap, text: string, parent: CollabBlockNode, type: string) {
    this._key = '';
    this._map = map;
    this._parent = parent;
    this._text = text;
    this._type = type;
    this._normalized = false;
  }

  getPrevNode(nodeMap: null | NodeMap): null | TextNode {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return isTextNode(node) ? node : null;
  }

  getNode(): null | TextNode {
    const node = getNodeByKey(this._key);
    return isTextNode(node) ? node : null;
  }

  getSharedType(): YMap {
    return this._map;
  }

  getType(): string {
    return this._type;
  }

  getKey(): NodeKey {
    return this._key;
  }

  getSize(): number {
    return this._text.length + (this._normalized ? 0 : 1);
  }

  getOffset(): number {
    const collabBlockNode = this._parent;
    return collabBlockNode.getChildOffset(this);
  }

  spliceText(index: number, delCount: number, newText: string) {
    const collabBlockNode = this._parent;
    const xmlText = collabBlockNode._xmlText;
    const offset = this.getOffset() + 1 + index;
    if (delCount !== 0) {
      xmlText.delete(offset, delCount);
    }
    if (newText !== '') {
      xmlText.insert(offset, newText);
    }
  }

  syncPropertiesAndTextFromOutline(
    binding: Binding,
    nextOutlineNode: TextNode,
    prevNodeMap: null | NodeMap,
  ): void {
    const prevOutlineNode = this.getPrevNode(prevNodeMap);
    const nextText = nextOutlineNode.__text;

    syncPropertiesFromOutline(
      binding,
      this._map,
      prevOutlineNode,
      nextOutlineNode,
    );

    if (prevOutlineNode !== null) {
      const prevText = prevOutlineNode.__text;
      if (prevText !== nextText) {
        const key = nextOutlineNode.__key;
        diffTextContentAndApplyDelta(this, key, prevText, nextText);
        this._text = nextText;
      }
    }
  }

  syncPropertiesAndTextFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void {
    const outlineNode = this.getNode();
    if (outlineNode === null) {
      throw new Error('Should never happen');
    }

    syncPropertiesFromYjs(binding, this._map, outlineNode, keysChanged);

    const collabText = this._text;
    if (outlineNode.__text !== collabText) {
      const writable = outlineNode.getWritable();
      writable.__text = collabText;
    }
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
  }
}

export function createCollabTextNode(
  map: YMap,
  text: string,
  parent: CollabBlockNode,
  type: string,
): CollabTextNode {
  const collabNode = new CollabTextNode(map, text, parent, type);
  // $FlowFixMe: internal field
  map._collabNode = collabNode;
  return collabNode;
}
