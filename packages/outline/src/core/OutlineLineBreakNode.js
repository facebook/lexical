/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from './OutlineNode';

import {OutlineNode} from './OutlineNode';

export class LineBreakNode extends OutlineNode {
  static deserialize(data: $FlowFixMe): LineBreakNode {
    return new LineBreakNode();
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'linebreak';
  }

  getTextContent(): '\n' {
    return '\n';
  }

  clone(): LineBreakNode {
    return new LineBreakNode(this.__key);
  }

  createDOM(): HTMLElement {
    return document.createElement('br');
  }

  updateDOM(): false {
    return false;
  }
}

export function createLineBreakNode(): LineBreakNode {
  return new LineBreakNode();
}

export function isLineBreakNode(node: ?OutlineNode): boolean %checks {
  return node instanceof LineBreakNode;
}
