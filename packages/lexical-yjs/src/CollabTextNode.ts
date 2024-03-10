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

import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import simpleDiffWithCursor from 'shared/simpleDiffWithCursor';
import {Map as YMap, Text as YText} from 'yjs';

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
  collabNode._text.delete(diff.index, diff.remove);
  collabNode._text.insert(diff.index, diff.insert);
}

export class CollabTextNode {
  _map: YMap<unknown>;
  _text: YText;
  _key: NodeKey;
  _parent: CollabElementNode;
  _type: string;
  _normalized: boolean;

  constructor(
    map: YMap<unknown>,
    text: string | undefined,
    parent: CollabElementNode,
    type: string,
  ) {
    this._key = '';
    this._map = map;
    // When text is undefined, the node is synced from remote, so _map already contains _text
    if (text === undefined) {
      this._text = this._map.get('_text') as YText;
    } else {
      this._text = new YText(text);
      this._map.set('_text', this._text);
    }
    this._parent = parent;
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

  getCursorYjsType(): YText {
    return this._text;
  }

  getType(): string {
    return this._type;
  }

  getKey(): NodeKey {
    return this._key;
  }

  getOffset(): number {
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
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

    this.syncTextFromYjs();
  }

  syncTextFromYjs(): void {
    const lexicalNode = this.getNode();
    invariant(
      lexicalNode !== null,
      'syncTextFromYjs: could not find decorator node',
    );
    const collabText = this._text.toJSON();

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
  text: string | undefined,
  parent: CollabElementNode,
  type: string,
): CollabTextNode {
  const collabNode = new CollabTextNode(map, text, parent, type);
  map._collabNode = collabNode;
  collabNode._text._collabNode = collabNode;
  return collabNode;
}
