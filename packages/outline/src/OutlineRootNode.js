/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode} from './OutlineNode';

import {BlockNode} from './OutlineBlockNode';

export class RootNode extends BlockNode {
  type: 'root';

  constructor() {
    super('root');
    this.__type = 'root';
  }

  clone(): RootNode {
    const clone = new RootNode();
    clone.__children = [...this.__children];
    return clone;
  }

  isAttached(): true {
    return true;
  }

  // View

  updateDOM(prevNode: RootNode, dom: HTMLElement): false {
    return false;
  }
}

export function createRootNode(): RootNode {
  return new RootNode();
}

export function isRootNode(node: ?OutlineNode): boolean %checks {
  return node instanceof RootNode;
}
