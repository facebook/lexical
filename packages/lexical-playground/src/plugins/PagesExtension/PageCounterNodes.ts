/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
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
  type SerializedEditorState,
  TextNode,
} from 'lexical';

export const PAGE_NUMBER_ATTRIBUTE = 'data-lexical-page-number';
export const PAGE_COUNT_ATTRIBUTE = 'data-lexical-page-count';
const PAGE_NUMBER_TYPE = 'page-number';
const PAGE_COUNT_TYPE = 'page-count';
/** Text of a counter that has not been resolved to a page yet. */
const PAGE_NUMBER_PLACEHOLDER = '#';
const PAGE_COUNT_PLACEHOLDER = '##';

/**
 * The number of the page a header/footer is drawn on, as a token text node:
 * it formats like any other text (bold, size, color) and cannot be edited
 * character by character. Its text is the placeholder `#` until
 * `HeaderFooterSession` writes the real number: into the live editor for
 * the page being edited, and into every page's static clone.
 */
export class PageNumberNode extends TextNode {
  $config() {
    return this.config(PAGE_NUMBER_TYPE, {extends: TextNode});
  }

  constructor(text: string = PAGE_NUMBER_PLACEHOLDER, key?: NodeKey) {
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
    return this.config(PAGE_COUNT_TYPE, {extends: TextNode});
  }

  constructor(text: string = PAGE_COUNT_PLACEHOLDER, key?: NodeKey) {
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

/**
 * Import a counter from any element carrying its attribute: a formatted
 * counter exports as `<strong>`, `<em>` and so on rather than `<span>`. The
 * next rule (the core inline-format rule) imports the element as text with
 * the formatting its tag and styles imply; the counter takes that text's
 * format and style.
 */
function $withImportedFormat(
  counter: TextNode,
  $next: () => readonly LexicalNode[],
): LexicalNode[] {
  const text = $next().find($isTextNode);
  if (text !== undefined) {
    counter.setFormat(text.getFormat()).setStyle(text.getStyle());
  }
  return [counter];
}

const PageNumberImportRule = defineImportRule({
  $import: (_ctx, _element, $next) =>
    $withImportedFormat($createPageNumberNode(), $next),
  match: sel.any().attr(PAGE_NUMBER_ATTRIBUTE, true),
  name: '@lexical/playground/page-number',
});
const PageCountImportRule = defineImportRule({
  $import: (_ctx, _element, $next) =>
    $withImportedFormat($createPageCountNode(), $next),
  match: sel.any().attr(PAGE_COUNT_ATTRIBUTE, true),
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
 * Replace a counter's text. `setTextContent` leaves the selection alone, so
 * a caret that sat at the end of the old text (right after inserting the
 * `##` placeholder, say) would point past the end of a shorter value and
 * strand the next keystroke; keep such a caret at the end of the new text.
 */
function $setCounterText(node: TextNode, value: string): void {
  if (node.getTextContent() === value) {
    return;
  }
  node.setTextContent(value);
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  const key = node.getKey();
  for (const point of [selection.anchor, selection.focus]) {
    if (
      point.type === 'text' &&
      point.key === key &&
      point.offset > value.length
    ) {
      point.set(key, value.length, 'text');
    }
  }
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
    $setCounterText(node, String(pageNumber));
  }
  for (const node of $nodesOfType(PageCountNode)) {
    $setCounterText(node, String(pageCount));
  }
}

/**
 * A copy of a serialized header/footer with every counter's text reset to
 * its placeholder. The live editor shows the numbers of the page it is
 * opened on; storing those would make the document depend on which page
 * the header was last edited from.
 */
export function normalizeCounterText<T extends SerializedEditorState>(
  state: T,
): T {
  const visit = (node: unknown): unknown => {
    if (typeof node !== 'object' || node === null) {
      return node;
    }
    const record = node as {children?: unknown[]; type?: unknown};
    const copy: Record<string, unknown> = {...record};
    if (record.type === PAGE_NUMBER_TYPE) {
      copy.text = PAGE_NUMBER_PLACEHOLDER;
    } else if (record.type === PAGE_COUNT_TYPE) {
      copy.text = PAGE_COUNT_PLACEHOLDER;
    }
    if (Array.isArray(record.children)) {
      copy.children = record.children.map(visit);
    }
    return copy;
  };
  return {...state, root: visit(state.root)} as T;
}
