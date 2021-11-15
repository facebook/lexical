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

import {BlockNode, isBlockNode} from './OutlineBlockNode';
import {NO_DIRTY_NODES} from './OutlineConstants';
import {getActiveEditor, isCurrentlyReadOnlyMode} from './OutlineUpdates';
import invariant from 'shared/invariant';

export class RootNode extends BlockNode {
  __cachedText: null | string;

  static clone(): RootNode {
    return new RootNode();
  }

  constructor() {
    super('root');
    this.__type = 'root';
    this.__cachedText = null;
  }

  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    const cachedText = this.__cachedText;
    if (
      isCurrentlyReadOnlyMode() ||
      getActiveEditor()._dirtyType === NO_DIRTY_NODES
    ) {
      if (
        cachedText !== null &&
        (!includeInert || includeDirectionless !== false)
      ) {
        return cachedText;
      }
    }
    return super.getTextContent(includeInert, includeDirectionless);
  }
  select(): Selection {
    // You can't select root nodes.
    invariant(false, 'select: cannot be called on root nodes');
  }
  remove(): void {
    // You can't select root nodes.
    invariant(false, 'remove: cannot be called on root nodes');
  }
  replace<N: OutlineNode>(node: N): N {
    // You can't select root nodes.
    invariant(false, 'replace: cannot be called on root nodes');
  }
  insertBefore() {
    invariant(false, 'insertBefore: cannot be called on root nodes');
  }
  insertAfter(node: OutlineNode): OutlineNode {
    invariant(false, 'insertAfter: cannot be called on root nodes');
  }

  // View

  updateDOM(prevNode: RootNode, dom: HTMLElement): false {
    return false;
  }

  // Mutate

  append(...nodesToAppend: OutlineNode[]): BlockNode {
    for (let i = 0; i < nodesToAppend.length; i++) {
      if (!isBlockNode(nodesToAppend[i])) {
        invariant(
          false,
          'rootNode.append: Only block nodes can be appended to the root node',
        );
      }
    }
    return super.append(...nodesToAppend);
  }

  canBeEmpty(): false {
    return false;
  }
}

export function createRootNode(): RootNode {
  return new RootNode();
}

export function isRootNode(node: ?OutlineNode): boolean %checks {
  return node instanceof RootNode;
}
