/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode} from './OutlineNode';
import type {Selection} from './OutlineSelection';

import {BlockNode} from './OutlineBlockNode';
import invariant from 'shared/invariant';

export class RootNode extends BlockNode {
  type: 'root';

  static deserialize(data: $FlowFixMe): RootNode {
    return new RootNode();
  }

  constructor() {
    super('root');
    this.__type = 'root';
  }

  clone(): RootNode {
    return new RootNode();
  }
  isAttached(): true {
    return true;
  }
  select(): Selection {
    // You can't select root nodes.
    invariant(false, 'select: cannot be called on root nodes');
  }
  remove(): void {
    // You can't select root nodes.
    invariant(false, 'remove: cannot be called on root nodes');
  }
  replace<N: OutlineNode>(): N {
    // You can't select root nodes.
    invariant(false, 'replace: cannot be called on root nodes');
  }
  insertBefore() {
    invariant(false, 'insertBefore: cannot be called on root nodes');
  }
  insertAfter() {
    invariant(false, 'insertAfter: cannot be called on root nodes');
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
