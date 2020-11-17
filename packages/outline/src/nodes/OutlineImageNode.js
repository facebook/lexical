// @flow strict

import type {NodeKey} from '../OutlineNode';

import {LeafNode} from '../OutlineLeafNode';

export class ImageNode extends LeafNode {
  _type: 'image';
  _src: string;
  _altText: string;

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this._type = 'image';
    this._src = src;
    this._altText = altText;
  }
  clone(): ImageNode {
    const clone = new ImageNode(this._src, this._altText, this._key);
    clone._parent = this._parent;
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
  // $FlowFixMe: fix the type for prevNode
  _update(prevNode: ImageNode, dom: HTMLElement): boolean {
    // $FlowFixMe: this is always a HTMLImageElement
    const img: HTMLImageElement = dom.firstChild;
    const prevAltText = prevNode._altText;
    const nextAltText = this._altText;
    if (prevAltText !== nextAltText) {
      img.alt = nextAltText;
    }
    const prevSrc = prevNode._src;
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
