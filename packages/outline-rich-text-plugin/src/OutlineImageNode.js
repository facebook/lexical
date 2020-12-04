// @flow strict

import type {NodeKey} from 'outline';

import {OutlineNode} from 'outline';

export class ImageNode extends OutlineNode {
  _type: 'image';
  _src: string;
  _altText: string;

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.type = 'image';
    this._src = src;
    this._altText = altText;
  }
  clone(): ImageNode {
    const clone = new ImageNode(this._src, this._altText, this.key);
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }
  isImage(): true {
    return true;
  }

  // View

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    const img = document.createElement('img');
    img.src = this._src;
    img.alt = this._altText;
    dom.contentEditable = 'false';
    dom.appendChild(img);
    return dom;
  }
  updateDOM(prevNode: ImageNode, dom: HTMLElement): boolean {
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
