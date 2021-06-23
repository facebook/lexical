/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorThemeClasses} from 'outline';

import {OutlineNode} from 'outline';

export class ImageNode extends OutlineNode {
  __src: string;
  __altText: string;

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__type = 'image';
    this.__src = src;
    this.__altText = altText;
  }
  getTextContent(): string {
    return this.__altText;
  }
  clone(): ImageNode {
    return new ImageNode(this.__src, this.__altText, this.__key);
  }
  isImage(): true {
    return true;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const dom = document.createElement('div');
    const img = document.createElement('img');
    img.src = this.__src;
    img.alt = this.__altText;
    const className = editorThemeClasses.image;
    if (className !== undefined) {
      dom.className = className;
    }
    dom.appendChild(img);
    return dom;
  }
  updateDOM(prevNode: ImageNode, dom: HTMLElement): boolean {
    // $FlowFixMe: this is always a HTMLImageElement
    const img: HTMLImageElement = dom.firstChild;
    const prevAltText = prevNode.__altText;
    const nextAltText = this.__altText;
    if (prevAltText !== nextAltText) {
      img.alt = nextAltText;
    }
    const prevSrc = prevNode.__src;
    const nextSrc = this.__src;
    if (prevSrc !== nextSrc) {
      img.src = nextSrc;
    }
    return false;
  }
}

export function createImageNode(src: string, altText: string): ImageNode {
  return new ImageNode(src, altText);
}
