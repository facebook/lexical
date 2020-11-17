// @flow strict

import type {NodeKey} from '../OutlineNode';

import {BlockNode} from '../OutlineBlockNode';

export class ParagraphNode extends BlockNode {
  _type: 'paragraph';

  constructor(key?: NodeKey) {
    super(key);
    this._type = 'paragraph';
  }
  clone(): ParagraphNode {
    const clone = new ParagraphNode(this._key);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._flags = this._flags;
    return clone;
  }

  // View

  _create(): HTMLElement {
    return document.createElement('p');
  }
  // $FlowFixMe: prevNode is always a ParagraphNode
  _update(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createParagraphNode(): ParagraphNode {
  const paragraph = new ParagraphNode();
  // Paragraph nodes align with text direection
  paragraph.makeDirectioned();
  return paragraph;
}
