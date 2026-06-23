/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, Klass, LexicalNode, TextNode} from 'lexical';
import type {Nodes as MdastNode, Parent as MdastParent} from 'mdast';
import type {Extension as FromMarkdownExtension} from 'mdast-util-from-markdown';
import type {Options as ToMarkdownExtension} from 'mdast-util-to-markdown';
import type {Extension as MicromarkExtension} from 'micromark-util-types';

export type {
  FromMarkdownExtension,
  MdastNode,
  MdastParent,
  MicromarkExtension,
  ToMarkdownExtension,
};

/**
 * The context passed to {@link MdastImportHandler}s while an mdast tree is
 * being walked and converted into Lexical nodes.
 */
export interface MdastImportContext {
  /**
   * The accumulated text-format bitmask for the current inline position
   * (e.g. inside `strong` > `emphasis` this carries the bold + italic bits).
   * Block handlers can ignore this; inline handlers should pass it along to
   * {@link createText} and the recursion helpers.
   */
  readonly format: number;
  /**
   * Convert every child of `parent` into Lexical nodes, optionally layering an
   * additional text-format bitmask on top of the current {@link format}.
   */
  importChildren(parent: MdastParent, format?: number): LexicalNode[];
  /**
   * Convert a single mdast node (and its descendants) into Lexical nodes.
   */
  importNode(node: MdastNode, format?: number): LexicalNode[];
  /**
   * Create a {@link TextNode} for `value`, splitting on `\n` into separate
   * lines joined by `LineBreakNode`s and applying the current (or supplied)
   * format bitmask.
   */
  createText(value: string, format?: number): LexicalNode[];
}

/**
 * Converts an mdast node of a particular `type` into one or more Lexical
 * nodes. Returning `null` defers to the next registered handler (and
 * ultimately to the fallback handler).
 */
export type MdastImportHandler<T extends MdastNode = MdastNode> = (
  node: T,
  context: MdastImportContext,
) => LexicalNode | LexicalNode[] | null;

/**
 * The context passed to {@link MdastExportHandler}s while a Lexical tree is
 * converted back into an mdast tree.
 */
export interface MdastExportContext {
  /**
   * Convert the children of `node` into mdast nodes by dispatching each child
   * through the registered export handlers. The returned list mixes block and
   * inline content; handlers are responsible for placing it in a valid spot.
   */
  exportChildren(node: ElementNode): MdastNode[];
  /**
   * Convert the inline children of `node` into mdast phrasing content,
   * grouping bare line breaks as mdast `break` nodes.
   */
  exportInline(node: ElementNode): MdastNode[];
  /**
   * Convert the inline children of `node` into one or more mdast block nodes
   * (paragraphs), splitting on hard line breaks. Used by containers such as
   * block quotes and list items whose Lexical children are inline but whose
   * mdast children must be block-level.
   */
  exportBlocks(node: ElementNode): MdastNode[];
}

/**
 * Converts a Lexical node into one or more mdast nodes. Returning `null`
 * defers to the next registered handler.
 */
export type MdastExportHandler<T extends LexicalNode = LexicalNode> = (
  node: T,
  context: MdastExportContext,
) => MdastNode | MdastNode[] | null;

/**
 * A `MdastTransformer` is the unit of composition for this package. It bundles
 * the three layers needed to round-trip a Markdown feature:
 *
 * 1. the micromark syntax extension(s) that tokenize it,
 * 2. the `mdast-util-from-markdown` / `mdast-util-to-markdown` extension(s)
 *    that map those tokens to and from the mdast tree, and
 * 3. the Lexical node mapping (`importHandlers` / `exportHandlers`).
 *
 * Bundling all three together means enabling a Markdown feature (GFM tables,
 * footnotes, directives, ...) is a single entry in a transformer list.
 */
export interface MdastTransformer {
  /** A stable identifier, useful for debugging and de-duplication. */
  name: string;
  /** micromark syntax extensions (the tokenizer layer). */
  micromarkExtensions?: readonly MicromarkExtension[];
  /** `mdast-util-from-markdown` extensions (tokens -> mdast). */
  mdastExtensions?: readonly FromMarkdownExtension[];
  /** `mdast-util-to-markdown` extensions (mdast -> Markdown string). */
  toMarkdownExtensions?: readonly ToMarkdownExtension[];
  /** Lexical node classes required by the import/export handlers. */
  dependencies?: readonly Klass<LexicalNode>[];
  /** mdast node `type` -> handler, used while importing. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importHandlers?: Readonly<Record<string, MdastImportHandler<any>>>;
  /** Lexical node `getType()` -> handler, used while exporting. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportHandlers?: Readonly<Record<string, MdastExportHandler<any>>>;
}

/**
 * The compiled form of a list of {@link MdastTransformer}s, with the micromark
 * / mdast extensions flattened and the handler lookups indexed. Produced by
 * `compileTransformers`.
 */
export interface CompiledMdastTransformers {
  micromarkExtensions: MicromarkExtension[];
  mdastExtensions: FromMarkdownExtension[];
  toMarkdownExtensions: ToMarkdownExtension[];
  importHandlers: Map<string, MdastImportHandler>;
  exportHandlers: Map<string, MdastExportHandler>;
  dependencies: Klass<LexicalNode>[];
}

export type {ElementNode, Klass, LexicalNode, TextNode};
