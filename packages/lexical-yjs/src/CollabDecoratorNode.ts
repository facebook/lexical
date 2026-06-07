/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from '.';
import type {CollabLineBreakNode} from './CollabLineBreakNode';
import type {CollabTextNode} from './CollabTextNode';
import type {DecoratorNode, LexicalNode, NodeKey, NodeMap} from 'lexical';
import type {XmlElement, XmlText} from 'yjs';

import invariant from '@lexical/internal/invariant';
import {
  $getNodeByKey,
  $getSlot,
  $getSlotNames,
  $isDecoratorNode,
  $isElementNode,
  $removeSlot,
  $setSlot,
} from 'lexical';
import {Map as YMap} from 'yjs';

import {CollabElementNode} from './CollabElementNode';
import {
  $createCollabNodeFromLexicalNode,
  $getOrInitCollabNodeFromSharedType,
  $syncPropertiesFromYjs,
  createLexicalNodeFromCollabNode,
  SLOTS_ATTR_KEY,
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

  // Reconcile named slots from the `slots` Y.Map attribute on this decorator's
  // `_xmlElem` into the lexical node. A decorator host has no children channel,
  // so slots are its only structural descendants. Mirrors
  // CollabElementNode.syncSlotsFromYjs but reads `_xmlElem` instead of
  // `_xmlText`.
  syncSlotsFromYjs(
    binding: Binding,
    lexicalNode: DecoratorNode<unknown>,
  ): void {
    const slotsY = this._xmlElem.getAttribute(SLOTS_ATTR_KEY) as unknown;
    const yNames =
      slotsY instanceof YMap ? new Set(slotsY.keys()) : new Set<string>();

    for (const name of $getSlotNames(lexicalNode)) {
      if (!yNames.has(name)) {
        const slotNode = $getSlot(lexicalNode, name);
        if (slotNode !== null) {
          const slotCollab = binding.collabNodeMap.get(slotNode.__key);
          if (slotCollab !== undefined) {
            slotCollab.destroy(binding);
          }
        }
        $removeSlot(lexicalNode, name);
      }
    }

    if (!(slotsY instanceof YMap)) {
      return;
    }
    for (const [name, slotSharedType] of slotsY.entries()) {
      if ($getSlot(lexicalNode, name) !== null) {
        continue;
      }
      const slotCollab = $getOrInitCollabNodeFromSharedType(
        binding,
        slotSharedType as XmlText | YMap<unknown> | XmlElement,
        this,
      );
      const slotLexicalNode = createLexicalNodeFromCollabNode(
        binding,
        slotCollab,
        null,
      );
      $setSlot(lexicalNode, name, slotLexicalNode);
    }
  }

  // Mirror of the lexical slot map into the `slots` Y.Map attribute on this
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
    const slotNames = $getSlotNames(nextLexicalNode);
    const existing = this._xmlElem.getAttribute(SLOTS_ATTR_KEY) as unknown;

    if (slotNames.length === 0 && !(existing instanceof YMap)) {
      return;
    }

    let slotsY: YMap<unknown>;
    if (existing instanceof YMap) {
      slotsY = existing;
    } else {
      slotsY = new YMap();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._xmlElem.setAttribute(SLOTS_ATTR_KEY, slotsY as any);
    }

    const nextNames = new Set(slotNames);
    for (const name of Array.from(slotsY.keys())) {
      if (!nextNames.has(name)) {
        const removed = slotsY.get(name) as XmlText | XmlElement | undefined;
        if (removed !== undefined) {
          removed._collabNode.destroy(binding);
        }
        slotsY.delete(name);
      }
    }

    const collabNodeMap = binding.collabNodeMap;
    for (const name of slotNames) {
      const slotNode = $getSlot<LexicalNode>(nextLexicalNode, name);
      if (slotNode === null) {
        continue;
      }
      const slotCollab = collabNodeMap.get(slotNode.__key);
      if (
        slotCollab !== undefined &&
        slotsY.get(name) === slotCollab.getSharedType()
      ) {
        this._syncSlotContentFromLexical(
          binding,
          slotCollab,
          slotNode,
          prevNodeMap,
          dirtyElements,
          dirtyLeaves,
        );
      } else {
        const prev = slotsY.get(name) as XmlText | XmlElement | undefined;
        if (prev !== undefined) {
          prev._collabNode.destroy(binding);
        }
        const created = $createCollabNodeFromLexicalNode(
          binding,
          slotNode,
          this,
        );
        collabNodeMap.set(slotNode.__key, created);
        slotsY.set(name, created.getSharedType());
      }
    }
  }

  _syncSlotContentFromLexical(
    binding: Binding,
    slotCollab:
      | CollabElementNode
      | CollabTextNode
      | CollabDecoratorNode
      | CollabLineBreakNode,
    slotNode: LexicalNode,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void {
    if (slotCollab instanceof CollabElementNode && $isElementNode(slotNode)) {
      slotCollab.syncPropertiesFromLexical(binding, slotNode, prevNodeMap);
      slotCollab.syncChildrenFromLexical(
        binding,
        slotNode,
        prevNodeMap,
        dirtyElements,
        dirtyLeaves,
      );
      slotCollab.syncSlotsFromLexical(
        binding,
        slotNode,
        prevNodeMap,
        dirtyElements,
        dirtyLeaves,
      );
    } else if (
      slotCollab instanceof CollabDecoratorNode &&
      $isDecoratorNode(slotNode)
    ) {
      slotCollab.syncPropertiesFromLexical(binding, slotNode, prevNodeMap);
      slotCollab.syncSlotsFromLexical(
        binding,
        slotNode,
        prevNodeMap,
        dirtyElements,
        dirtyLeaves,
      );
    }
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;

    // A decorator host has no children channel; its slots are its only
    // descendants. Destroy each slot's collab node so it doesn't dangle in
    // binding.collabNodeMap after the host is removed. The host's `_xmlElem`
    // must still be attached here for `slots` to read back.
    const slotsY = this._xmlElem.getAttribute(SLOTS_ATTR_KEY) as unknown;
    if (slotsY instanceof YMap) {
      for (const name of slotsY.keys()) {
        const slot = slotsY.get(name) as XmlText | XmlElement | undefined;
        if (slot !== undefined) {
          slot._collabNode.destroy(binding);
        }
      }
    }

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
