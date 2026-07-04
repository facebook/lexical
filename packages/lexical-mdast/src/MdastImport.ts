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
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSelection,
} from 'lexical';
import {fromMarkdown} from 'mdast-util-from-markdown';

import {$isBlockLevelNode} from './handlers';

/**
 * Splits `value` into a run of `TextNode`s: `\n` becomes a `LineBreakNode`
 * and `\t` a `TabNode` (matching how typed content is represented in the
 * editor), with `format` applied to each text segment. Empty segments are
 * dropped so a leading/trailing/standalone separator yields only its node.
 */
function $createTextNodes(value: string, format: number): LexicalNode[] {
  const out: LexicalNode[] = [];
  const segments = value.split(/(\n|\t)/);
  for (const segment of segments) {
    if (segment === '\n') {
      out.push($createLineBreakNode());
    } else if (segment === '\t') {
      out.push($createTabNode());
    } else if (segment.length > 0) {
      const textNode = $createTextNode(segment);
      if (format) {
        textNode.setFormat(format);
      }
      out.push(textNode);
    }
  }
  return out;
}

/** A resolved `[identifier]: url "title"` definition. */
export type ResolvedDefinition = {url: string; title?: string | null};

/**
 * Collects the document's definitions (`[id]: url "title"`) so link/image
 * references can be resolved during the import walk. Identifiers on mdast
 * `definition` nodes are already normalized.
 */
export function collectDefinitions(
  tree: MdastParent,
): Map<string, ResolvedDefinition> {
  const definitions = new Map<string, ResolvedDefinition>();
  const visit = (node: MdastNode | MdastParent): void => {
    if ('type' in node && node.type === 'definition') {
      const {identifier, title, url} = node as unknown as {
        identifier: string;
        title?: string | null;
        url: string;
      };
      // CommonMark: the FIRST definition of an identifier wins.
      if (!definitions.has(identifier)) {
        definitions.set(identifier, {title, url});
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child as MdastNode);
      }
    }
  };
  visit(tree);
  return definitions;
}

const NO_DEFINITIONS: ReadonlyMap<string, ResolvedDefinition> = new Map();

/**
 * Builds the recursive importer for a compiled set of transformers. The
 * returned function converts a single mdast node into Lexical nodes, threading
 * the accumulated text-format bitmask through inline marks.
 *
 * Exported so the streaming shortcut engine can reuse the exact same mdast ->
 * Lexical mapping when materializing an inline construct it detected.
 */
export function createNodeImporter(
  compiled: CompiledMdast,
  source = '',
  definitions: ReadonlyMap<string, ResolvedDefinition> = NO_DEFINITIONS,
) {
  const {importHandlers} = compiled;
  // The context only depends on the accumulated format bitmask, which takes a
  // handful of distinct values per document — cache instead of allocating one
  // (plus three closures) per visited node.
  const contextByFormat = new Map<number, MdastImportContext>();

  function getContext(format: number): MdastImportContext {
    let context = contextByFormat.get(format);
    if (context === undefined) {
      context = {
        createText: (value, fmt) =>
          $createTextNodes(value, fmt == null ? format : fmt),
        format,
        getDefinition: identifier => definitions.get(identifier),
        importChildren: (parent, extra) =>
          $importChildren(parent, format | (extra || 0)),
        importNode: (node, extra) => $importNode(node, format | (extra || 0)),
        source,
      };
      contextByFormat.set(format, context);
    }
    return context;
  }

  function $importNode(node: MdastNode, format: number): LexicalNode[] {
    const handler = importHandlers.get(node.type);
    if (handler) {
      const result = handler(node, getContext(format));
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
  return (markdown, node, tree) => {
    const root = node || $getRoot();
    root.clear();

    const mdastTree =
      tree ||
      fromMarkdown(markdown, {
        extensions: compiled.micromarkExtensions,
        mdastExtensions: compiled.mdastExtensions,
      });
    // When importing a pre-parsed tree we have no original source string to
    // recover literal syntax from, so syntax-preservation is skipped.
    const {$importNode} = createNodeImporter(
      compiled,
      tree ? '' : markdown,
      collectDefinitions(mdastTree),
    );

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
        if ($isBlockLevelNode(lexicalNode)) {
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
