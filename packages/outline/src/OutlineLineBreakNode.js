/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey} from './OutlineNode';

import {TextNode} from './OutlineTextNode';

export class LineBreakNode extends TextNode {
  constructor(key?: NodeKey) {
    super('\n', key);
    this.__type = 'linebreak';
  }

  clone(): LineBreakNode {
    const clone = new LineBreakNode(this.__key);
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  createDOM(): HTMLElement {
    return document.createElement('br');
  }

  updateDOM(): false {
    return false;
  }
}

export function createLineBreakNode(): LineBreakNode {
  return new LineBreakNode().makeImmutable();
}

export function isLineBreakNode(node: ?OutlineNode): boolean %checks {
  return node instanceof LineBreakNode;
}
