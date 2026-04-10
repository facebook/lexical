/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode} from 'lexical';

import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {$create, $getEditor, ElementNode, isHTMLElement} from 'lexical';

import {PagesExtension} from '../../plugins/PagesExtension';
import {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from './PageContentNode';

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
    dom.className = 'PlaygroundEditorTheme__page';
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

  measureHeight(): number {
    const {clearMeasurementFlag} = getExtensionDependencyFromEditor(
      $getEditor(),
      PagesExtension,
    ).output;

    clearMeasurementFlag(this);
    const element = this.getPageElement();
    if (!element) return 0;
    element.style.minHeight = 'unset';
    const height = element.scrollHeight;
    element.style.minHeight = '';
    return height;
  }

  getUnderflowingChildren(): LexicalNode[] {
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!rootElement) return [];
    const pageElement = this.getPageElement();
    if (!pageElement) return [];
    const contentElement = this.getPageContentElement();
    if (!contentElement) return [];
    const nextPage = this.getNextSibling();
    if (!$isPageNode(nextPage)) return [];
    const nextPageContentNode = nextPage.getContentNode();
    if (!nextPageContentNode) return [];
    const nextPageContentChildren = nextPageContentNode.getChildren();
    if (!nextPageContentChildren.length) return [];
    const nextPageContentElement = nextPage.getPageContentElement();
    if (!nextPageContentElement) return [];
    const nextPageChildNodes = Array.from(nextPageContentElement.childNodes);
    pageElement.style.minHeight = 'unset';
    const pageHeight = parseInt(
      rootElement.style.getPropertyValue('--page-height'),
      10,
    );
    if (!pageHeight) return [];
    let overflowAfterIndex = 0;
    let currentPageHeight = pageElement.scrollHeight;
    const {setFixedHeight} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;

    while (currentPageHeight < pageHeight) {
      const nextChild = nextPageChildNodes[overflowAfterIndex]?.cloneNode(true);
      if (!nextChild) break;
      contentElement.appendChild(nextChild);
      currentPageHeight = pageElement.scrollHeight;
      if (currentPageHeight > pageHeight) break;
      overflowAfterIndex++;
      setFixedHeight(this, currentPageHeight);
    }
    pageElement.style.minHeight = '';
    if (overflowAfterIndex === 0) return [];
    return nextPageContentChildren.slice(0, overflowAfterIndex);
  }

  getOverflowingChildren(): LexicalNode[] {
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!rootElement) return [];
    const pageElement = this.getPageElement();
    if (!pageElement) return [];
    const contentElement = this.getPageContentElement();
    const contentNode = this.getContentNode();
    if (!contentElement || !contentNode) return [];
    const children = contentNode.getChildren();
    const childNodes = Array.from(contentElement.childNodes);
    if (children.length !== childNodes.length) {
      childNodes.forEach((childNode) => childNode.remove());
      contentNode.reconcileObservedMutation(contentElement, editor);
      return this.getOverflowingChildren();
    }
    pageElement.style.minHeight = 'unset';
    const pageHeight = parseInt(
      rootElement.style.getPropertyValue('--page-height'),
      10,
    );
    if (!pageHeight) return [];
    let currentPageHeight = pageElement.scrollHeight;
    let overflowAfterIndex = children.length - 1;
    const {setFixedHeight} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;

    while (currentPageHeight > pageHeight) {
      const lastChild = childNodes[overflowAfterIndex];
      if (lastChild) lastChild.remove();
      currentPageHeight = pageElement.scrollHeight;
      setFixedHeight(this, currentPageHeight);
      if (currentPageHeight < pageHeight) break;
      overflowAfterIndex--;
    }
    pageElement.style.minHeight = '';
    return children.slice(overflowAfterIndex || 1);
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

  fixFlow() {
    const {clearMeasurementFlag, getFixedHeight} =
      getExtensionDependencyFromEditor($getEditor(), PagesExtension).output;
    if (!this.isAttached()) return clearMeasurementFlag(this);
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!isHTMLElement(rootElement)) return;
    const pageHeight = parseInt(
      rootElement.style.getPropertyValue('--page-height'),
      10,
    );
    const fixedPageHeight = getFixedHeight(this);
    const currentPageHeight = this.measureHeight();
    if (currentPageHeight === fixedPageHeight) return;
    if (!pageHeight || !currentPageHeight) return;
    if (currentPageHeight === 0) return;
    const isOverflowing = currentPageHeight > pageHeight;
    if (isOverflowing) this.fixOverflow();
    else this.fixUnderflow();
  }

  fixOverflow() {
    const contentNode = this.getContentNode();
    const childrenSize = contentNode.getChildrenSize();
    if (childrenSize === 1) return;
    const overflowingChildren = this.getOverflowingChildren();
    if (!overflowingChildren.length) return;
    const nextSibling = this.getNextSibling();
    if ($isPageNode(nextSibling)) {
      const nextContent = nextSibling.getContentNode();
      const nextPageFirstChild = nextContent.getFirstChild();
      if (!nextPageFirstChild) return;
      overflowingChildren.forEach((child: LexicalNode) => {
        nextPageFirstChild.insertBefore(child);
      });
    } else {
      const newPage = $createPageNode();
      newPage.getContentNode().append(...overflowingChildren);
      this.insertAfter(newPage);
    }
  }

  fixUnderflow() {
    const contentNode = this.getContentNode();
    const childrenSize = contentNode.getChildrenSize();
    if (!childrenSize) return this.remove();
    const nextSibling = this.getNextSibling();
    if (!$isPageNode(nextSibling)) return;
    const nextContent = nextSibling.getContentNode();
    const nextPageChildrenSize = nextContent.getChildrenSize();
    if (nextPageChildrenSize === 0) return;
    const underflowingChildren = this.getUnderflowingChildren();
    if (!underflowingChildren.length) return;
    contentNode.append(...underflowingChildren);
    if (nextPageChildrenSize !== underflowingChildren.length) return;
    nextSibling.remove();
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
