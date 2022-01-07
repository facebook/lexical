/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorNode, NodeKey, LexicalRef, NodeMap} from '@lexical/core';
import type {Binding} from '.';
import type {CollabElementNode} from './CollabElementNode';
import type {XmlElement} from 'yjs';

import {
  createEditorStateRef,
  $isDecoratorNode,
  $getNodeByKey,
} from '@lexical/core';
import {syncPropertiesFromLexical, syncPropertiesFromYjs} from './Utils';
import {Doc} from 'yjs';

export class CollabDecoratorNode {
  _xmlElem: XmlElement;
  _key: NodeKey;
  _parent: CollabElementNode;
  _type: string;

  constructor(xmlElem: XmlElement, parent: CollabElementNode, type: string) {
    this._key = '';
    this._xmlElem = xmlElem;
    this._parent = parent;
    this._type = type;
  }

  getPrevNode(nodeMap: null | NodeMap): null | DecoratorNode {
    if (nodeMap === null) {
      return null;
    }
    const node = nodeMap.get(this._key);
    return $isDecoratorNode(node) ? node : null;
  }

  getNode(): null | DecoratorNode {
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
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }

  syncPropertiesFromLexical(
    binding: Binding,
    nextLexicalNode: DecoratorNode,
    prevNodeMap: null | NodeMap,
  ): void {
    const prevLexicalNode = this.getPrevNode(prevNodeMap);
    const xmlElem = this._xmlElem;
    const prevRef: LexicalRef | null =
      prevLexicalNode === null ? null : prevLexicalNode.__ref;
    const nextRef: LexicalRef | null = nextLexicalNode.__ref;

    syncPropertiesFromLexical(
      binding,
      xmlElem,
      prevLexicalNode,
      nextLexicalNode,
    );

    // Handle refs
    if (prevRef !== nextRef) {
      if (nextRef === null) {
        xmlElem.removeAttribute('__ref');
        // Delete the subdocument
        if (xmlElem.firstChild !== null) {
          xmlElem.delete(0, 1);
        }
      } else {
        const {id, _type} = nextRef;
        xmlElem.setAttribute('__ref', {
          id,
          type: _type,
        });
        const yjsDocMap = binding.docMap;
        // Create a subdocument
        const doc = new Doc();
        xmlElem.insert(0, [doc]);
        yjsDocMap.set(id, doc);
      }
    }
  }

  syncPropertiesFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void {
    const lexicalNode = this.getNode();
    if (lexicalNode === null) {
      throw new Error('Should never happen');
    }
    const xmlElem = this._xmlElem;
    const collabRef = xmlElem.getAttribute('__ref');
    const lexicalRef: null | LexicalRef = lexicalNode.__ref;

    syncPropertiesFromYjs(binding, xmlElem, lexicalNode, keysChanged);

    // Handle refs
    if (collabRef === undefined) {
      if (lexicalRef !== null) {
        // Remove doc
        const writable = lexicalNode.getWritable();
        const yjsDocMap = binding.docMap;
        const {id} = lexicalRef;
        yjsDocMap.delete(id);
        writable.__ref = null;
      }
    } else if (typeof collabRef !== 'string') {
      if (
        lexicalRef === null ||
        lexicalRef.id !== collabRef.id ||
        lexicalRef._type !== collabRef.type
      ) {
        const writable = lexicalNode.getWritable();
        const {id, type} = collabRef;
        if (type === 'editorstate') {
          const ref = createEditorStateRef(id, null);
          const doc = xmlElem.firstChild;
          if (doc !== null) {
            const yjsDocMap = binding.docMap;
            yjsDocMap.set(id, doc);
          }
          writable.__ref = ref;
        }
      }
    }
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;
    collabNodeMap.delete(this._key);
  }
}

export function $createCollabDecoratorNode(
  xmlElem: XmlElement,
  parent: CollabElementNode,
  type: string,
): CollabDecoratorNode {
  const collabNode = new CollabDecoratorNode(xmlElem, parent, type);
  // $FlowFixMe: internal field
  xmlElem._collabNode = collabNode;
  return collabNode;
}
