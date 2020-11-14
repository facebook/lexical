// @flow strict

import {Node} from '../OutlineNode';

export class ImageNode extends Node {
  _type: 'image';
  _src: string;
  _altText: string;

  constructor(src: string, altText: string) {
    super('div');
    this._type = 'image';
    this._src = src;
    this._altText = altText;
  }
  clone(): ImageNode {
    const clone = new ImageNode(this._src, this._altText);
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
  isImage(): true {
    return true;
  }

  // View

  _create(): HTMLElement {
    const dom = document.createElement('div');
    const img = document.createElement('img');
    img.src = this._src;
    img.alt = this._altText;
    dom.contentEditable = 'false';
    dom.appendChild(img);
    return dom;
  }
  _update(prevNode: Node, dom: HTMLElement): boolean {
    // $FlowFixMe: this is always a TextNode
    const prevImageNode: ImageNode = prevNode;
    // $FlowFixMe: this is always a HTMLImageElement
    const img: HTMLImageElement = dom.firstChild;
    const prevAltText = prevImageNode._altText;
    const nextAltText = this._altText;
    if (prevAltText !== nextAltText) {
      img.alt = nextAltText;
    }
    const prevSrc = prevImageNode._src;
    const nextSrc = this._src;
    if (prevSrc !== nextSrc) {
      img.src = nextSrc;
    }
    return false;
  }
}

export function createImageNode(src: string, altText: string): ImageNode {
  return new ImageNode(src, altText);
}
