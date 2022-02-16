/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DOMConversion} from '../../LexicalNode';
import type {EditorConfig, LexicalNode, NodeKey, RangeSelection} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {$isElementNode, ElementNode} from 'lexical';

export class LinkNode extends ElementNode {
  __url: string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(node.__url, node.__key);
  }

  constructor(url: string, key?: NodeKey): void {
    super(key);
    this.__url = url;
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('a');
    element.href = this.__url;
    addClassNamesToElement(element, config.theme.link);
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

  static convertDOM(element: Node): DOMConversion | null {
    const nodeName = element.nodeName.toLowerCase();
    if (nodeName === 'a') {
      return {
        fn: (domNode: Node) => {
          let node = null;
          if (domNode instanceof HTMLAnchorElement) {
            node = $createLinkNode(domNode.href);
          }
          return {node};
        },
        priority: 1,
      };
    }
    return null;
  }

  getURL(): string {
    return this.getLatest().__url;
  }

  setURL(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createLinkNode(this.__url);
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }
}

export function $createLinkNode(url: string): LinkNode {
  return new LinkNode(url);
}

export function $isLinkNode(node: ?LexicalNode): boolean %checks {
  return node instanceof LinkNode;
}
