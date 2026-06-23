/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CompiledMdast, LexicalNode, MdastNode} from './types';
import type {
  Blockquote,
  Code,
  Heading,
  List,
  Nodes as AnyMdastNode,
  Parent,
  PhrasingContent,
} from 'mdast';

import {fromMarkdown} from 'mdast-util-from-markdown';

import {createNodeImporter} from './MdastImport';

/** mdast inline types that this engine can turn into a markdown shortcut. */
const INLINE_CONSTRUCTS = new Set<string>([
  'delete',
  'emphasis',
  'inlineCode',
  'link',
  'strong',
]);

/** mdast block types that this engine can turn into a markdown shortcut. */
const BLOCK_CONSTRUCTS = new Set<string>([
  'blockquote',
  'code',
  'heading',
  'list',
]);

export type MdastBlockMatch =
  | {kind: 'heading'; node: Heading; markerLength: number}
  | {kind: 'blockquote'; node: Blockquote; markerLength: number}
  | {kind: 'list'; node: List; markerLength: number}
  | {kind: 'code'; node: Code; markerLength: number};

/**
 * Returns the offset of the first content character inside `node`, i.e. the
 * length of the leading block marker (`"## "`, `"- "`, `"> "`, ...). When the
 * construct has no content yet (the user has only typed the marker) the whole
 * `line` is the marker.
 */
function contentStartOffset(node: AnyMdastNode, line: string): number {
  let current: AnyMdastNode | undefined = node;
  while (current) {
    if ('value' in current && current.position) {
      return current.position.start.offset ?? line.length;
    }
    const parent = current as Parent;
    if (parent.children && parent.children.length > 0) {
      current = parent.children[0] as AnyMdastNode;
      continue;
    }
    break;
  }
  return line.length;
}

/**
 * `MarkdownStreamScanner` is the streaming heart of the shortcut engine. Each
 * keystroke feeds the growing line/inline buffer back through micromark (via
 * `mdast-util-from-markdown`), so shortcut recognition uses the *exact* same
 * grammar — and the same enabled extensions — as full-document import. There
 * is no second, divergent set of regular expressions to keep in sync.
 *
 * It is constructed from the {@link CompiledMdast} registry assembled by
 * {@link MdastExtension}, so it stays in lock-step with whatever feature
 * extensions are enabled.
 */
export class MarkdownStreamScanner {
  private readonly compiled: CompiledMdast;

  constructor(compiled: CompiledMdast) {
    this.compiled = compiled;
  }

  private parse(value: string) {
    return fromMarkdown(value, {
      extensions: this.compiled.micromarkExtensions,
      mdastExtensions: this.compiled.mdastExtensions,
    });
  }

  /**
   * Materializes an mdast inline node into Lexical nodes using the same
   * import handlers as the full-document importer.
   */
  importInline(node: MdastNode): LexicalNode[] {
    const {$importNode} = createNodeImporter(this.compiled, '');
    return $importNode(node, 0);
  }

  /**
   * Recognizes a block-level construct at the start of `line`. Returns the
   * matched construct together with the marker length, or `null`.
   */
  scanBlock(line: string): MdastBlockMatch | null {
    if (line.trim() === '') {
      return null;
    }
    const first = this.parse(line).children[0];
    if (!first || !BLOCK_CONSTRUCTS.has(first.type)) {
      return null;
    }
    const markerLength = contentStartOffset(first as AnyMdastNode, line);
    switch (first.type) {
      case 'heading':
        return {kind: 'heading', markerLength, node: first};
      case 'blockquote':
        return {kind: 'blockquote', markerLength, node: first};
      case 'list':
        return {kind: 'list', markerLength, node: first};
      case 'code':
        return {kind: 'code', markerLength, node: first};
      default:
        return null;
    }
  }

  /**
   * Recognizes an inline construct (emphasis, strong, strikethrough, inline
   * code, link) whose closing delimiter falls exactly at the end of `value`
   * (the text up to the caret). Returns the mdast node, or `null`.
   */
  scanInline(value: string): PhrasingContent | null {
    if (value.length === 0) {
      return null;
    }
    const tree = this.parse(value);
    const lastBlock = tree.children[tree.children.length - 1];
    if (!lastBlock || lastBlock.type !== 'paragraph') {
      return null;
    }
    const last = lastBlock.children[lastBlock.children.length - 1];
    if (
      !last ||
      !last.position ||
      last.position.end.offset !== value.length ||
      !INLINE_CONSTRUCTS.has(last.type)
    ) {
      return null;
    }
    // Guard against firing mid-delimiter: while typing `**bold*` the parser
    // briefly sees emphasis (`*bold*`) closing at the caret with a stray `*`
    // in front. If the opening delimiter is immediately preceded by the same
    // delimiter character, defer until the user finishes the longer run.
    const start = last.position.start.offset ?? 0;
    const openChar = value[start];
    if (
      start > 0 &&
      value[start - 1] === openChar &&
      (openChar === '*' ||
        openChar === '_' ||
        openChar === '~' ||
        openChar === '`')
    ) {
      return null;
    }
    return last;
  }
}
