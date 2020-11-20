// @flow strict

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

export class QuoteNode extends BlockNode {
  _type: 'quote';

  constructor(key?: NodeKey) {
    super(key);
    this._type = 'quote';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): QuoteNode {
    const quote = new QuoteNode();
    quote._flags = data._flags;
    return quote;
  }
  clone(): QuoteNode {
    const clone = new QuoteNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._flags = this._flags;
    return clone;
  }

  // View

  _create(): HTMLElement {
    return document.createElement('blockquote');
  }
  // $FlowFixMe: prevNode is always a QuoteNode
  _update(prevNode: QuoteNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createQuoteNode(): QuoteNode {
  const list = new QuoteNode();
  // List nodes align with text direection
  list.makeDirectioned();
  return list;
}
