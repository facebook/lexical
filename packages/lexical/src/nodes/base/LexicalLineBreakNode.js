/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from '../../LexicalNode';

import {LexicalNode} from '../../LexicalNode';

export class LineBreakNode extends LexicalNode {
  static getType(): string {
    return 'linebreak';
  }

  static clone(node: LineBreakNode): LineBreakNode {
    return new LineBreakNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  getTextContent(): '\n' {
    return '\n';
  }

  createDOM(): HTMLElement {
    return document.createElement('br');
  }

  updateDOM(): false {
    return false;
  }
}

export function $createLineBreakNode(): LineBreakNode {
  return new LineBreakNode();
}

export function $isLineBreakNode(node: ?LexicalNode): boolean %checks {
  return node instanceof LineBreakNode;
}
