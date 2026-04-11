/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode} from 'lexical';

import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {
  $create,
  $getEditor,
  addClassNamesToElement,
  ElementNode,
} from 'lexical';

import {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from './PageContentNode';
import {PagesExtension} from './PagesExtension';

export class PageNode extends ElementNode {
  $config() {
    return this.config('page', {
      extends: ElementNode,
    });
  }

  getContentNode(): PageContentNode {
    const content = this.getChildren().find($isPageContentNode);
    if (!content) throw new Error('PageNode: Content node not found');
    return content;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    addClassNamesToElement(
      dom,
      getExtensionDependencyFromEditor($getEditor(), PagesExtension).config
        .pageClass,
    );
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  getPageNumber(): number {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = parent.getFirstChild();
    let index = 0;
    while (node !== null) {
      if (this.is(node)) {
        return index + 1;
      }
      if ($isPageNode(node)) {
        index++;
      }
      node = node.getNextSibling();
    }
    return -1;
  }

  getPageElement(): HTMLElement | null {
    const editor = $getEditor();
    return editor.getElementByKey(this.getKey());
  }

  getPageContentElement(): HTMLElement | null {
    const editor = $getEditor();
    return editor.getElementByKey(this.getContentNode().getKey());
  }

  getPreviousPage(): PageNode | null {
    let previousSibling = this.getPreviousSibling();
    while (previousSibling && !$isPageNode(previousSibling)) {
      previousSibling = previousSibling.getPreviousSibling();
    }
    if (!$isPageNode(previousSibling)) return null;
    return previousSibling;
  }

  getNextPage(): PageNode | null {
    let nextSibling = this.getNextSibling();
    while (nextSibling && !$isPageNode(nextSibling)) {
      nextSibling = nextSibling.getNextSibling();
    }
    if (!$isPageNode(nextSibling)) return null;
    return nextSibling;
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
}

export function $createPageNode(): PageNode {
  return $create(PageNode).append($createPageContentNode());
}

export function $isPageNode(
  node: LexicalNode | null | undefined,
): node is PageNode {
  return node instanceof PageNode;
}
