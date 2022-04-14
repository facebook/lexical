/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, NodeKey} from 'lexical';

import {ElementNode} from 'lexical';

export class EmbedNode extends ElementNode {
  static getType(): string {
    return 'embed';
  }

  static clone(node: EmbedNode): EmbedNode {
    return new EmbedNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const elem = document.createElement('div');
    return elem;
  }

  updateDOM(): false {
    return false;
  }
}

export function $createEmbedNode(): EmbedNode {
  return new EmbedNode();
}

export function $isEmbedNode(node: ?LexicalNode): boolean %checks {
  return node instanceof EmbedNode;
}
