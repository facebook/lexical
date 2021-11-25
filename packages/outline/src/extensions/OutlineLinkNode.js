/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, OutlineNode, Selection} from 'outline';

import {BlockNode} from 'outline';

export class LinkNode extends BlockNode {
  __url: string;

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(node.__url, node.__key);
  }

  constructor(url: string, key?: NodeKey) {
    super(key);
    this.__url = url;
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('a');
    const theme = config.theme;
    const className = theme.link;
    element.href = this.__url;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }

  updateDOM<EditorContext>(
    // $FlowFixMe: not sure how to fix this
    prevNode: LinkNode,
    // $FlowFixMe: not sure how to fix this
    dom: HTMLAnchorElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    const url = this.__url;
    if (url !== prevNode.__url) {
      dom.href = url;
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

  insertNewAfter(selection: Selection): null | BlockNode {
    const block = this.getParentOrThrow().insertNewAfter(selection);
    if (block !== null) {
      const linkNode = createLinkNode(this.__url);
      block.append(linkNode);
      return linkNode;
    }
    return null;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }
}

export function createLinkNode(url: string): LinkNode {
  return new LinkNode(url);
}

export function isLinkNode(node: ?OutlineNode): boolean %checks {
  return node instanceof LinkNode;
}
