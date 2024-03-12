/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from '.';
import type {CollabElementNode} from './CollabElementNode';
import type {NodeKey, NodeMap, TextNode} from 'lexical';
import type {Map as YMap} from 'yjs';

import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import simpleDiffWithCursor from 'shared/simpleDiffWithCursor';

import {syncPropertiesFromLexical, syncPropertiesFromYjs} from './Utils';

function diffTextContentAndApplyDelta(
  collabNode: CollabTextNode,
  key: NodeKey,
  prevText: string,
  nextText: string,
): void {
  const selection = $getSelection();
  let cursorOffset = nextText.length;

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const anchor = selection.anchor;

    if (anchor.key === key) {
      cursorOffset = anchor.offset;
    }
  }

  const diff = simpleDiffWithCursor(prevText, nextText, cursorOffset);
  collabNode.spliceText(diff.index, diff.remove, diff.insert);
}

export class CollabTextNode {
  _map: YMap<unknown>;
  _key: NodeKey;
  _parent: CollabElementNode;
  _text: string;
  _type: string;
  _normalized: boolean;

  constructor(
    map: YMap<unknown>,
    text: string,
    parent: CollabElementNode,
    type: string,
  ) {
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
    return $isTextNode(node) ? node : null;
  }

  getNode(): null | TextNode {
    const node = $getNodeByKey(this._key);
    return $isTextNode(node) ? node : null;
  }

  getSharedType(): YMap<unknown> {
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
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }

  spliceText(index: number, delCount: number, newText: string): void {
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

  syncPropertiesAndTextFromLexical(
    binding: Binding,
    nextLexicalNode: TextNode,
    prevNodeMap: null | NodeMap,
  ): void {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const nextText = nextLexicalNode.__text;

    syncPropertiesFromLexical(
      binding,
      this._map,
      prevLexicalNode,
      nextLexicalNode,
    );

    if (prevLexicalNode !== null) {
      const prevText = prevLexicalNode.__text;

      if (prevText !== nextText) {
        const key = nextLexicalNode.__key;
        diffTextContentAndApplyDelta(this, key, prevText, nextText);
        this._text = nextText;
      }
    }
  }

  syncPropertiesAndTextFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void {
    const lexicalNode = this.getNode();
    invariant(
      lexicalNode !== null,
      'syncPropertiesAndTextFromYjs: could not find decorator node',
    );

    syncPropertiesFromYjs(binding, this._map, lexicalNode, keysChanged);

    const collabText = this._text;

    if (lexicalNode.__text !== collabText) {
      const writable = lexicalNode.getWritable();
      writable.__text = collabText;
    }
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
  }
}

export function $createCollabTextNode(
  map: YMap<unknown>,
  text: string,
  parent: CollabElementNode,
  type: string,
): CollabTextNode {
  const collabNode = new CollabTextNode(map, text, parent, type);
  map._collabNode = collabNode;
  return collabNode;
}
