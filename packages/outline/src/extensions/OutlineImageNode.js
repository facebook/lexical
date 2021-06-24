/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses} from '../core/OutlineEditor';

import {OutlineNode} from '../core/OutlineNode';

export class ImageNode extends MediaNode {
  __src: string;

  constructor(src: string, altText: string, key?: NodeKey) {
    super(altText, key);
    this.__type = 'image';
    this.__src = src;
  }
  clone(): ImageNode {
    return new ImageNode(this.__src, this.__altText, this.__key);
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const img = document.createElement('img');
    img.src = this.__src;
    img.alt = this.__altText;
    const className = editorThemeClasses.image;
    if (className !== undefined) {
      img.className = className;
    }
    return img;
  }
  // $FlowFixMe: we know from about that we are using a HTMLImageElement
  updateDOM(prevNode: ImageNode, dom: HTMLImageElement): boolean {
    const prevAltText = prevNode.__altText;
    const nextAltText = this.__altText;
    if (prevAltText !== nextAltText) {
      dom.alt = nextAltText;
    }
    const prevSrc = prevNode.__src;
    const nextSrc = this.__src;
    if (prevSrc !== nextSrc) {
      dom.src = nextSrc;
    }
    return false;
  }
}

export function createImageNode(src: string, altText: string): ImageNode {
  return new ImageNode(src, altText);
}

export function isImageNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ImageNode;
}
