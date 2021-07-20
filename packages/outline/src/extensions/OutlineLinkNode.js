/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, ParsedTextNode, EditorThemeClasses} from 'outline';

import {TextNode} from 'outline';

export type ParsedLinkNode = {
  ...ParsedTextNode,
  __text: string,
};

export class LinkNode extends TextNode {
  __url: string;

  static deserialize(data: $FlowFixMe): LinkNode {
    return TextNode.deserialize.call(this, data, data.__text, data.__url);
  }

  constructor(text: string, url: string, key?: NodeKey) {
    super(text, key);
    this.__url = url;
    this.__type = 'link';
  }
  clone(): LinkNode {
    return new LinkNode(this.__text, this.__url, this.__key);
  }
  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = document.createElement('span');
    const text = super.createDOM(editorThemeClasses);
    const className = editorThemeClasses.link;
    if (className !== undefined) {
      element.className = className;
    }
    element.appendChild(text);
    return element;
  }
  updateDOM(
    // $FlowFixMe: not sure how to fix this
    prevNode: LinkNode,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
  ): boolean {
    // $FlowFixMe: this should always be right
    const text: HTMLElement = dom.firstChild;
    const needsReplace = super.updateDOM(prevNode, text, editorThemeClasses);
    if (needsReplace) {
      const replacementText = super.createDOM(editorThemeClasses);
      dom.replaceChild(replacementText, text);
    }
    return false;
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
