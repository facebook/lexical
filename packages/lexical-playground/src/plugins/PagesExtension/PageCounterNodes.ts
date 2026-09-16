/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {
  $getDocument,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  DecoratorNode,
  defineExtension,
  type LexicalCommand,
  type LexicalNode,
  mergeRegister,
} from 'lexical';

/**
 * Inline placeholder for the number of the page a header/footer is drawn
 * on. It renders nothing itself: the CSS rule
 * `[data-lexical-page-number]::before { content: counter(lexical-page) }`
 * fills it in, so the header can be cloned onto every page with no
 * per-page JavaScript.
 */
export class PageNumberNode extends DecoratorNode<null> {
  $config() {
    return this.config('page-number', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    const span = $getDocument().createElement('span');
    span.setAttribute('data-lexical-page-number', 'true');
    span.className = 'Pages__pageNumber';
    span.title = 'Page number';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): true {
    return true;
  }

  getTextContent(): string {
    return '#';
  }
}

/** Inline placeholder for the total number of pages, see {@link PageNumberNode}. */
export class PageCountNode extends DecoratorNode<null> {
  $config() {
    return this.config('page-count', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    const span = $getDocument().createElement('span');
    span.setAttribute('data-lexical-page-count', 'true');
    span.className = 'Pages__pageCount';
    span.title = 'Page count';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): true {
    return true;
  }

  getTextContent(): string {
    return '##';
  }
}

export function $createPageNumberNode(): PageNumberNode {
  return new PageNumberNode();
}

export function $isPageNumberNode(
  node: LexicalNode | null | undefined,
): node is PageNumberNode {
  return node instanceof PageNumberNode;
}

export function $createPageCountNode(): PageCountNode {
  return new PageCountNode();
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
  match: sel.tag('span').attr('data-lexical-page-number', true),
  name: '@lexical/playground/page-number',
});
const PageCountImportRule = defineImportRule({
  $import: () => [$createPageCountNode()],
  match: sel.tag('span').attr('data-lexical-page-count', true),
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
