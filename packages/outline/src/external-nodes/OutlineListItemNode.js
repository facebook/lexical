/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from '../OutlineNode';

import {BlockNode} from '../OutlineBlockNode';

export class ListItemNode extends BlockNode {
  _type: 'listitem';

  constructor(key?: NodeKey) {
    super(key);
    this.type = 'listitem';
  }

  clone(): ListItemNode {
    const clone = new ListItemNode(this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('li');
  }
  updateDOM(prevNode: ListItemNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
