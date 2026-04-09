/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, SerializedElementNode} from 'lexical';

import {ElementNode} from 'lexical';

import {$isPageNode, PageNode} from './PageNode';

export type SerializedPageContentNode = SerializedElementNode;

export class PageContentNode extends ElementNode {
  static getType(): string {
    return 'page-content';
  }

  static clone(node: PageContentNode): PageContentNode {
    return new PageContentNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'PlaygroundEditorTheme__pageContent';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): PageContentNode {
    return new PageContentNode();
  }

  getPageNode(): PageNode {
    const parent = this.getParent();
    if (!$isPageNode(parent))
      throw new Error('PageContentNode: Parent is not a PageNode');
    return parent;
  }

  isShadowRoot(): boolean {
    return true;
  }

  excludeFromCopy(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  exportJSON(): SerializedPageContentNode {
    return {
      ...super.exportJSON(),
      type: 'page-content',
      version: 1,
    };
  }

  canBeEmpty(): boolean {
    return false;
  }
}

export function $createPageContentNode(): PageContentNode {
  return new PageContentNode();
}

export function $isPageContentNode(
  node: LexicalNode | null | undefined,
): node is PageContentNode {
  return node instanceof PageContentNode;
}
