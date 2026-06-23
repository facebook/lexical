/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CompiledMdast,
  MdastImportContext,
  MdastNode,
  MdastParent,
} from './types';
import type {ElementNode, LexicalNode} from 'lexical';
import type {Root} from 'mdast';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
} from 'lexical';
import {fromMarkdown} from 'mdast-util-from-markdown';

/**
 * Splits `value` on `\n` into a run of `TextNode`s separated by
 * `LineBreakNode`s, applying `format` to each text node. Empty segments are
 * dropped so a leading/trailing/standalone newline yields only line breaks.
 */
function $createTextNodes(value: string, format: number): LexicalNode[] {
  const out: LexicalNode[] = [];
  const segments = value.split('\n');
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      out.push($createLineBreakNode());
    }
    const segment = segments[i];
    if (segment.length > 0) {
      const textNode = $createTextNode(segment);
      if (format) {
        textNode.setFormat(format);
      }
      out.push(textNode);
    }
  }
  return out;
}

function $isBlockNode(node: LexicalNode): boolean {
  return $isElementNode(node) && !node.isInline();
}

/**
 * Builds the recursive importer for a compiled set of transformers. The
 * returned function converts a single mdast node into Lexical nodes, threading
 * the accumulated text-format bitmask through inline marks.
 *
 * Exported so the streaming shortcut engine can reuse the exact same mdast ->
 * Lexical mapping when materializing an inline construct it detected.
 */
export function createNodeImporter(compiled: CompiledMdast) {
  const {importHandlers} = compiled;

  function makeContext(format: number): MdastImportContext {
    return {
      createText: (value, fmt) =>
        $createTextNodes(value, fmt == null ? format : fmt),
      format,
      importChildren: (parent, extra) =>
        $importChildren(parent, format | (extra || 0)),
      importNode: (node, extra) => $importNode(node, format | (extra || 0)),
    };
  }

  function $importNode(node: MdastNode, format: number): LexicalNode[] {
    const handler = importHandlers.get(node.type);
    const context = makeContext(format);
    if (handler) {
      const result = handler(node, context);
      if (result == null) {
        return [];
      }
      return Array.isArray(result) ? result : [result];
    }
    // Fallback: unwrap unknown containers, render unknown literals as text, and
    // drop anything else so no content silently corrupts the tree.
    if ('children' in node && Array.isArray(node.children)) {
      return $importChildren(node as MdastParent, format);
    }
    if ('value' in node && typeof node.value === 'string') {
      return $createTextNodes(node.value, format);
    }
    return [];
  }

  function $importChildren(parent: MdastParent, format: number): LexicalNode[] {
    const out: LexicalNode[] = [];
    for (const child of parent.children) {
      out.push(...$importNode(child as MdastNode, format));
    }
    return out;
  }

  return {$importChildren, $importNode};
}

/**
 * Creates a reusable importer that converts a Markdown string (or a pre-parsed
 * mdast `Root`) into Lexical nodes appended to the root (or a supplied
 * element).
 */
export function createMdastImport(
  compiled: CompiledMdast,
): (markdown: string, node?: ElementNode, tree?: Root) => void {
  const {$importNode} = createNodeImporter(compiled);

  return (markdown, node, tree) => {
    const root = node || $getRoot();
    root.clear();

    const mdastTree =
      tree ||
      fromMarkdown(markdown, {
        extensions: compiled.micromarkExtensions,
        mdastExtensions: compiled.mdastExtensions,
      });

    // Top-level mdast children should produce block-level Lexical nodes. Any
    // stray inline content (e.g. from a fallback) is wrapped in a paragraph so
    // the root only ever contains valid block children.
    let pendingParagraph: ElementNode | null = null;
    const flushPending = () => {
      if (pendingParagraph) {
        root.append(pendingParagraph);
        pendingParagraph = null;
      }
    };
    for (const child of mdastTree.children) {
      for (const lexicalNode of $importNode(child, 0)) {
        if ($isBlockNode(lexicalNode)) {
          flushPending();
          root.append(lexicalNode);
        } else {
          if (!pendingParagraph) {
            pendingParagraph = $createParagraphNode();
          }
          pendingParagraph.append(lexicalNode);
        }
      }
    }
    flushPending();

    if (root.getChildrenSize() === 0) {
      root.append($createParagraphNode());
    }

    if ($getSelection() !== null) {
      root.selectStart();
    }
  };
}
