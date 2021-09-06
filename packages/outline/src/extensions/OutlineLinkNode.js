/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, ParsedTextNode, EditorConfig} from 'outline';

import {TextNode} from 'outline';

export type ParsedLinkNode = {
  ...ParsedTextNode,
  __text: string,
};

export class LinkNode extends TextNode {
  __url: string;

  static deserialize(data: $FlowFixMe): LinkNode {
    return new LinkNode(data.__text, data.__url);
  }

  constructor(text: string, url: string, key?: NodeKey) {
    super(text, key);
    this.__url = url;
    this.__type = 'link';
  }
  clone(): LinkNode {
    return new LinkNode(this.__text, this.__url, this.__key);
  }
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('span');
    const text = super.createDOM(config);
    const theme = config.theme;
    const className = theme.link;
    if (className !== undefined) {
      element.className = className;
    }
    element.appendChild(text);
    return element;
  }
  updateDOM<EditorContext>(
    // $FlowFixMe: not sure how to fix this
    prevNode: LinkNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    // $FlowFixMe: this should always be right
    const text: HTMLElement = dom.firstChild;
    const needsReplace = super.updateDOM(prevNode, text, config);
    if (needsReplace) {
      const replacementText = super.createDOM(config);
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
