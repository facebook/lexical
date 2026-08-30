/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from '.';
import type {CollabElementNode} from './CollabElementNode';
import type {XmlElement} from 'yjs';

import invariant from '@lexical/internal/invariant';
import {
  $getNodeByKey,
  $isDecoratorNode,
  type DecoratorNode,
  type NodeKey,
  type NodeMap,
} from 'lexical';

import {
  $destroySlotsShared,
  $syncPropertiesFromYjs,
  $syncSlotsFromLexicalShared,
  $syncSlotsFromYjsShared,
  syncPropertiesFromLexical,
} from './Utils';

type IntentionallyMarkedAsDirtyElement = boolean;

export class CollabDecoratorNode {
  _xmlElem: XmlElement;
  _key: NodeKey;
  // Normally a decorator's parent is an element, but a slot-value decorator
  // hosted by another decorator has that decorator as its parent.
  _parent: CollabElementNode | CollabDecoratorNode;
  _type: string;

  constructor(
    xmlElem: XmlElement,
    parent: CollabElementNode | CollabDecoratorNode,
    type: string,
  ) {
    this._key = '';
    this._xmlElem = xmlElem;
    this._parent = parent;
    this._type = type;
  }

  getPrevNode(nodeMap: null | NodeMap): null | DecoratorNode<unknown> {
    if (nodeMap === null) {
      return null;
    }

    const node = nodeMap.get(this._key);
    return $isDecoratorNode(node) ? node : null;
  }

  getNode(): null | DecoratorNode<unknown> {
    const node = $getNodeByKey(this._key);
    return $isDecoratorNode(node) ? node : null;
  }

  getSharedType(): XmlElement {
    return this._xmlElem;
  }

  getType(): string {
    return this._type;
  }

  getKey(): NodeKey {
    return this._key;
  }

  getSize(): number {
    return 1;
  }

  getOffset(): number {
    // A slot-value decorator has a decorator parent, but slots live outside the
    // linked-list children channel so getOffset is never called on one. Only an
    // element parent exposes getChildOffset, so narrow before dereferencing.
    invariant(
      !(this._parent instanceof CollabDecoratorNode),
      'getOffset: expected parent to be a collab element node',
    );
    return this._parent.getChildOffset(this);
  }

  syncPropertiesFromLexical(
    binding: Binding,
    nextLexicalNode: DecoratorNode<unknown>,
    prevNodeMap: null | NodeMap,
  ): void {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const xmlElem = this._xmlElem;

    syncPropertiesFromLexical(
      binding,
      xmlElem,
      prevLexicalNode,
      nextLexicalNode,
    );
  }

  syncPropertiesFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void {
    const lexicalNode = this.getNode();
    if (lexicalNode === null) {
      // Concurrently removed from Lexical; nothing to sync.
      return;
    }
    const xmlElem = this._xmlElem;
    $syncPropertiesFromYjs(binding, xmlElem, lexicalNode, keysChanged);
  }

  // Reconcile named slots from the `__slots` Y.Map attribute on this decorator's
  // `_xmlElem` into the lexical node. A decorator host has no children channel,
  // so slots are its only structural descendants. Mirrors
  // CollabElementNode.syncSlotsFromYjs but reads `_xmlElem` instead of
  // `_xmlText`.
  syncSlotsFromYjs(
    binding: Binding,
    lexicalNode: DecoratorNode<unknown>,
  ): void {
    $syncSlotsFromYjsShared(binding, this._xmlElem, lexicalNode, this);
  }

  // Mirror of the lexical slot map into the `__slots` Y.Map attribute on this
  // decorator's `_xmlElem`. Local (lexical -> yjs) counterpart of
  // syncSlotsFromYjs. Mirrors CollabElementNode.syncSlotsFromLexical but writes
  // `_xmlElem` instead of `_xmlText`.
  syncSlotsFromLexical(
    binding: Binding,
    nextLexicalNode: DecoratorNode<unknown>,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void {
    $syncSlotsFromLexicalShared(
      binding,
      this._xmlElem,
      nextLexicalNode,
      prevNodeMap,
      dirtyElements,
      dirtyLeaves,
      this,
    );
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;

    // A decorator host has no children channel; its slots are its only
    // descendants. Destroy each slot's collab node so it doesn't dangle in
    // binding.collabNodeMap after the host is removed. The host's `_xmlElem`
    // must still be attached here for SLOTS_ATTR_KEY to read back.
    $destroySlotsShared(binding, this._xmlElem);

    if (collabNodeMap.get(this._key) === this) {
      collabNodeMap.delete(this._key);
    }
  }
}

export function $createCollabDecoratorNode(
  xmlElem: XmlElement,
  parent: CollabElementNode | CollabDecoratorNode,
  type: string,
): CollabDecoratorNode {
  const collabNode = new CollabDecoratorNode(xmlElem, parent, type);
  xmlElem._collabNode = collabNode;
  return collabNode;
}
