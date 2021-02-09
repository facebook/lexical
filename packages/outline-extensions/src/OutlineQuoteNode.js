/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

export class QuoteNode extends BlockNode {
  __type: 'quote';

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'quote';
  }

  clone(): QuoteNode {
    const clone = new QuoteNode();
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('blockquote');
  }
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createQuoteNode(): QuoteNode {
  const list = new QuoteNode();
  // List nodes align with text direection
  list.makeDirectioned();
  return list;
}
