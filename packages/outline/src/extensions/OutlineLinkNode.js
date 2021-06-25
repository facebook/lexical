/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorThemeClasses} from 'outline';

import {TextNode} from 'outline';

export class LinkNode extends TextNode {
  __url: string;

  constructor(text: string, url: string, key?: NodeKey) {
    super(text, key);
    this.__url = url;
    this.__type = 'link';
  }
  clone(): LinkNode {
    return new LinkNode(this.__text, this.__url, this.__key);
  }
  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = super.createDOM(editorThemeClasses);
    const className = editorThemeClasses.link;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(
    // $FlowFixMe: not sure how to fix this
    prevNode: LinkNode,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
  ): boolean {
    const textUpdate = super.updateDOM(prevNode, dom, editorThemeClasses);
    return textUpdate;
  }
  getURL(): string {
    return this.getLatest().__url;
  }
  setURL(url: string): void {
    const writable = this.getWritable<LinkNode>();
    writable.__url = url;
  }
  canInsertTextAtEnd(): false {
    return false;
  }
}

export function createLinkNode(text: string, url: string): LinkNode {
  return new LinkNode(text, url);
}

export function isLinkNode(node: TextNode): boolean %checks {
  return node instanceof LinkNode;
}
