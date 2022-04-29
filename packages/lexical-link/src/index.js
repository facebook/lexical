/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  RangeSelection,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$isElementNode, createCommand, ElementNode} from 'lexical';

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

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('a');
    element.href = this.__url;
    addClassNamesToElement(element, config.theme.link);
    return element;
  }

  updateDOM(
    // $FlowFixMe: not sure how to fix this
    prevNode: LinkNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    // $FlowFixMe: not sure how to fix this
    const anchor: HTMLAnchorElement = dom;
    const url = this.__url;
    if (url !== prevNode.__url) {
      anchor.href = url;
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: (node: Node) => ({
        conversion: convertAnchorElement,
        priority: 1,
      }),
    };
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

function convertAnchorElement(domNode: Node): DOMConversionOutput {
  let node = null;
  if (domNode instanceof HTMLAnchorElement) {
    node = $createLinkNode(domNode.href);
  }
  return {node};
}

export function $createLinkNode(url: string): LinkNode {
  return new LinkNode(url);
}

export function $isLinkNode(node: ?LexicalNode): boolean %checks {
  return node instanceof LinkNode;
}

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  static getType(): string {
    return 'autolink';
  }

  // $FlowFixMe[incompatible-extend]
  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(node.__url, node.__key);
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createAutoLinkNode(this.__url);
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

export function $createAutoLinkNode(url: string): AutoLinkNode {
  return new AutoLinkNode(url);
}

export function $isAutoLinkNode(node: ?LexicalNode): boolean %checks {
  return node instanceof AutoLinkNode;
}

export const TOGGLE_LINK_COMMAND: LexicalCommand<string | null> =
  createCommand();
