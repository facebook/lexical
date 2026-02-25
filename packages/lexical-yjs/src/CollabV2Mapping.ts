/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isTextNode, type LexicalNode, NodeKey, type TextNode} from 'lexical';
import invariant from 'shared/invariant';
import {XmlElement, XmlText} from 'yjs';

type SharedType = XmlElement | XmlText;

// Stores mappings between Yjs shared types and the Lexical nodes they were last associated with.
export class CollabV2Mapping {
  private _nodeMap: Map<NodeKey, LexicalNode> = new Map();

  private _sharedTypeToNodeKeys: Map<SharedType, NodeKey[]> = new Map();
  private _nodeKeyToSharedType: Map<NodeKey, SharedType> = new Map();

  set(sharedType: SharedType, node: LexicalNode | TextNode[]): void {
    const isArray = node instanceof Array;

    // Clear all existing associations for this key.
    this.delete(sharedType);

    // If nodes were associated with other shared types, remove those associations.
    const nodes = isArray ? node : [node];
    for (const n of nodes) {
      const key = n.getKey();
      if (this._nodeKeyToSharedType.has(key)) {
        const otherSharedType = this._nodeKeyToSharedType.get(key)!;
        const keyIndex = this._sharedTypeToNodeKeys
          .get(otherSharedType)!
          .indexOf(key);
        if (keyIndex !== -1) {
          this._sharedTypeToNodeKeys.get(otherSharedType)!.splice(keyIndex, 1);
        }
        this._nodeKeyToSharedType.delete(key);
        this._nodeMap.delete(key);
      }
    }

    if (sharedType instanceof XmlText) {
      invariant(isArray, 'Text nodes must be mapped as an array');
      if (node.length === 0) {
        return;
      }
      this._sharedTypeToNodeKeys.set(
        sharedType,
        node.map((n) => n.getKey()),
      );
      for (const n of node) {
        this._nodeMap.set(n.getKey(), n);
        this._nodeKeyToSharedType.set(n.getKey(), sharedType);
      }
    } else {
      invariant(!isArray, 'Element nodes must be mapped as a single node');
      invariant(!$isTextNode(node), 'Text nodes must be mapped to XmlText');
      this._sharedTypeToNodeKeys.set(sharedType, [node.getKey()]);
      this._nodeMap.set(node.getKey(), node);
      this._nodeKeyToSharedType.set(node.getKey(), sharedType);
    }
  }

  get(sharedType: XmlElement): LexicalNode | undefined;
  get(sharedType: XmlText): TextNode[] | undefined;
  get(sharedType: SharedType): LexicalNode | Array<TextNode> | undefined;
  get(sharedType: SharedType): LexicalNode | Array<TextNode> | undefined {
    const nodes = this._sharedTypeToNodeKeys.get(sharedType);
    if (nodes === undefined) {
      return undefined;
    }
    if (sharedType instanceof XmlText) {
      const arr = Array.from(
        nodes.map((nodeKey) => this._nodeMap.get(nodeKey)!),
      ) as Array<TextNode>;
      return arr.length > 0 ? arr : undefined;
    }
    return this._nodeMap.get(nodes[0])!;
  }

  getSharedType(node: LexicalNode): SharedType | undefined {
    return this._nodeKeyToSharedType.get(node.getKey());
  }

  delete(sharedType: SharedType): void {
    const nodeKeys = this._sharedTypeToNodeKeys.get(sharedType);
    if (nodeKeys === undefined) {
      return;
    }
    for (const nodeKey of nodeKeys) {
      this._nodeMap.delete(nodeKey);
      this._nodeKeyToSharedType.delete(nodeKey);
    }
    this._sharedTypeToNodeKeys.delete(sharedType);
  }

  deleteNode(nodeKey: NodeKey): void {
    const sharedType = this._nodeKeyToSharedType.get(nodeKey);
    if (sharedType) {
      this.delete(sharedType);
    }
    this._nodeMap.delete(nodeKey);
  }

  has(sharedType: SharedType): boolean {
    return this._sharedTypeToNodeKeys.has(sharedType);
  }

  clear(): void {
    this._nodeMap.clear();
    this._sharedTypeToNodeKeys.clear();
    this._nodeKeyToSharedType.clear();
  }
}
