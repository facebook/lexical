/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {
  $insertNodes,
  $nodesOfType,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type EditorConfig,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type NodeKey,
  TextNode,
} from 'lexical';

export const PAGE_NUMBER_ATTRIBUTE = 'data-lexical-page-number';
export const PAGE_COUNT_ATTRIBUTE = 'data-lexical-page-count';

/**
 * The number of the page a header/footer is drawn on, as a token text node:
 * it formats like any other text (bold, size, color) and cannot be edited
 * character by character. Its text is the placeholder `#` until
 * `HeaderFooterSession` writes the real number: into the live editor for
 * the page being edited, and into every page's static clone.
 */
export class PageNumberNode extends TextNode {
  $config() {
    return this.config('page-number', {extends: TextNode});
  }

  constructor(text: string = '#', key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor);
    dom.setAttribute(PAGE_NUMBER_ATTRIBUTE, 'true');
    return dom;
  }

  isTextEntity(): true {
    return true;
  }
}

/** The total number of pages, see {@link PageNumberNode}. */
export class PageCountNode extends TextNode {
  $config() {
    return this.config('page-count', {extends: TextNode});
  }

  constructor(text: string = '##', key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor);
    dom.setAttribute(PAGE_COUNT_ATTRIBUTE, 'true');
    return dom;
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createPageNumberNode(): PageNumberNode {
  return new PageNumberNode().setMode('token');
}

export function $isPageNumberNode(
  node: LexicalNode | null | undefined,
): node is PageNumberNode {
  return node instanceof PageNumberNode;
}

export function $createPageCountNode(): PageCountNode {
  return new PageCountNode().setMode('token');
}

export function $isPageCountNode(
  node: LexicalNode | null | undefined,
): node is PageCountNode {
  return node instanceof PageCountNode;
}

export const INSERT_PAGE_NUMBER_COMMAND: LexicalCommand<undefined> =
  createCommand('INSERT_PAGE_NUMBER_COMMAND');
export const INSERT_PAGE_COUNT_COMMAND: LexicalCommand<undefined> =
  createCommand('INSERT_PAGE_COUNT_COMMAND');

const PageNumberImportRule = defineImportRule({
  $import: () => [$createPageNumberNode()],
  match: sel.tag('span').attr(PAGE_NUMBER_ATTRIBUTE, true),
  name: '@lexical/playground/page-number',
});
const PageCountImportRule = defineImportRule({
  $import: () => [$createPageCountNode()],
  match: sel.tag('span').attr(PAGE_COUNT_ATTRIBUTE, true),
  name: '@lexical/playground/page-count',
});

/** Registers the counter nodes, their DOM import rules and insert commands. */
export const PageCounterNodesExtension = defineExtension({
  dependencies: [
    configExtension(DOMImportExtension, {
      rules: [PageNumberImportRule, PageCountImportRule],
    }),
  ],
  name: '@lexical/playground/PageCounterNodes',
  nodes: [PageNumberNode, PageCountNode],
  register: editor =>
    mergeRegister(
      editor.registerCommand(
        INSERT_PAGE_NUMBER_COMMAND,
        () => {
          $insertNodes([$createPageNumberNode()]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        INSERT_PAGE_COUNT_COMMAND,
        () => {
          $insertNodes([$createPageCountNode()]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    ),
});

/**
 * Write the page number and page count into the rendered DOM of a header or
 * footer (a static clone, outside any editor). The nodes' text sits inside
 * whatever format wrappers the text node rendered, so the number keeps the
 * text's formatting.
 */
export function writeCountersIntoDOM(
  root: ParentNode,
  pageNumber: number,
  pageCount: number,
): void {
  const write = (selector: string, value: string) => {
    for (const el of root.querySelectorAll(selector)) {
      const walker = el.ownerDocument.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
      );
      const text = walker.nextNode();
      if (text !== null && text.nodeValue !== value) {
        text.nodeValue = value;
      }
    }
  };
  write(`[${PAGE_NUMBER_ATTRIBUTE}]`, String(pageNumber));
  write(`[${PAGE_COUNT_ATTRIBUTE}]`, String(pageCount));
}

/**
 * Set the counter nodes of a nested editor to the values of the page it is
 * being edited on, so the author sees real numbers while editing.
 */
export function $writeCountersIntoEditor(
  pageNumber: number,
  pageCount: number,
): void {
  for (const node of $nodesOfType(PageNumberNode)) {
    if (node.getTextContent() !== String(pageNumber)) {
      node.setTextContent(String(pageNumber));
    }
  }
  for (const node of $nodesOfType(PageCountNode)) {
    if (node.getTextContent() !== String(pageCount)) {
      node.setTextContent(String(pageCount));
    }
  }
}
