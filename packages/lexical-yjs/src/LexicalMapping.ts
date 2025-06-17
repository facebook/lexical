/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isTextNode, type LexicalNode, type TextNode} from 'lexical';
import invariant from 'shared/invariant';
import {XmlElement, XmlHook, XmlText} from 'yjs';

import {BiMultiMap} from './BiMultiMap';

export class LexicalMapping {
  private _map: BiMultiMap<XmlElement | XmlText, LexicalNode>;

  constructor() {
    this._map = new BiMultiMap();
  }

  set(
    sharedType: XmlElement | XmlText | XmlHook,
    node: LexicalNode | TextNode[],
  ) {
    invariant(!(sharedType instanceof XmlHook), 'XmlHook is not supported');
    const isArray = node instanceof Array;
    if (sharedType instanceof XmlText) {
      invariant(isArray, 'Text nodes must be mapped as an array');
      this._map.putAll(sharedType, node);
    } else {
      invariant(!isArray, 'Element nodes must be mapped as a single node');
      invariant(!$isTextNode(node), 'Text nodes must be mapped to XmlText');
      this._map.put(sharedType, node);
    }
  }

  get(
    sharedType: XmlElement | XmlText | XmlHook,
  ): LexicalNode | Array<TextNode> | undefined {
    if (sharedType instanceof XmlHook) {
      return undefined;
    }
    const nodes = this._map.get(sharedType);
    if (nodes === undefined) {
      return undefined;
    }
    if (sharedType instanceof XmlText) {
      const arr = Array.from(nodes) as Array<TextNode>;
      return arr.length > 0 ? arr : undefined;
    }
    return nodes.values().next().value;
  }

  getSharedType(node: LexicalNode): XmlElement | XmlText | undefined {
    return this._map.getKey(node);
  }

  clear(): void {
    this._map.clear();
  }

  delete(sharedType: XmlElement | XmlText): boolean {
    return this._map.removeKey(sharedType);
  }

  has(sharedType: XmlElement | XmlText): boolean {
    return this._map.hasKey(sharedType);
  }

  hasNode(node: LexicalNode): boolean {
    return this._map.hasValue(node);
  }
}
