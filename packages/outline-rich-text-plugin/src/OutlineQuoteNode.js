// @flow strict

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

export class QuoteNode extends BlockNode {
  _type: 'quote';

  constructor(key?: NodeKey) {
    super(key);
    this.type = 'quote';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): QuoteNode {
    const quote = new QuoteNode();
    quote.flags = data.flags;
    return quote;
  }
  clone(): QuoteNode {
    const clone = new QuoteNode();
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('blockquote');
  }
  // $FlowFixMe: prevNode is always a QuoteNode
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
