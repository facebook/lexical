/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from './OutlineNode';

import {TextNode} from './OutlineTextNode';

export class LineBreakNode extends TextNode {
  constructor(key?: NodeKey) {
    super('\n', key);
    this.__type = 'linebreak';
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
