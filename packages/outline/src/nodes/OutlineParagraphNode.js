// @flow strict

import {BranchNode} from '../OutlineBranchNode';

export class ParagraphNode extends BranchNode {
  _type: 'paragraph';

  constructor() {
    super();
    this._type = 'paragraph';
  }
  clone(): ParagraphNode {
    const clone = new ParagraphNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
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
  return new ParagraphNode();
}
