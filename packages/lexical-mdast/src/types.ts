/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalNode} from 'lexical';
import type {
  BlockContent,
  Nodes as MdastNode,
  Parent as MdastParent,
  PhrasingContent,
} from 'mdast';
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

// The mdast `data` fields this package uses to round-trip the original
// Markdown syntax. Declared through interface merging — mdast's sanctioned
// extension point — so no casts are needed to read or write them, and
// consumers see them typed on exported trees ($convertToMdast).
declare module 'mdast' {
  interface BreakData {
    /** The hard-break marker: `'\\'`, trailing spaces, or `''` for soft. */
    mdastBreak?: string;
  }
  interface CodeData {
    /** The literal fence the code block used (e.g. ``` or ~~~). */
    mdastFence?: string;
  }
  interface HeadingData {
    /** Present (true) when the heading was written in setext style. */
    mdastSetext?: boolean;
  }
  interface LinkData {
    /** The syntax the link was written in. */
    mdastLinkStyle?: 'autolink' | 'inline' | 'literal';
  }
  interface ListData {
    /** The bullet character an unordered list used (`-`, `*`, `+`). */
    mdastBullet?: '*' | '+' | '-';
    /** The delimiter an ordered list used (`.` or `)`). */
    mdastBulletOrdered?: ')' | '.';
  }
  interface ThematicBreakData {
    /** The marker character the thematic break used (`-`, `*`, `_`). */
    mdastRule?: string;
  }
}

/**
 * The context passed to {@link MdastImportHandler}s while an mdast tree is
 * being walked and converted into Lexical nodes.
 * @experimental
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
   * The original Markdown source being imported, or `''` when importing a
   * pre-parsed mdast tree. Handlers slice this by `node.position` to recover
   * the literal syntax (list marker, code fence, hard-break style) for
   * round-trip preservation.
   */
  readonly source: string;
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
   * Create text nodes for `value` with the current (or supplied) format
   * bitmask; `\n` becomes a `LineBreakNode` and `\t` a `TabNode`.
   */
  createText(value: string, format?: number): LexicalNode[];
  /**
   * Resolves a link/image reference `identifier` (already normalized by
   * mdast) against the document's definitions (`[id]: url "title"`).
   */
  getDefinition(
    identifier: string,
  ): {url: string; title?: string | null} | undefined;
}

/**
 * Converts an mdast node of a particular `type` into one or more Lexical
 * nodes. Returning `null` defers to the next registered handler.
 * @experimental
 */
export type MdastImportHandler<T extends MdastNode = MdastNode> = (
  node: T,
  context: MdastImportContext,
) => LexicalNode | LexicalNode[] | null;

/**
 * The context passed to {@link MdastExportHandler}s while a Lexical tree is
 * converted back into an mdast tree.
 * @experimental
 */
export interface MdastExportContext {
  /**
   * Convert the children of `source` into mdast nodes by dispatching each
   * child through the registered export handlers. `source` is an element
   * (its `getChildren()` are exported) or an explicit list of nodes — e.g.
   * a `DOMExportOutput.$getChildNodes()` override, which is defined as
   * replacing `node.getChildren()` for export.
   */
  exportChildren(source: ElementNode | readonly LexicalNode[]): MdastNode[];
  /**
   * Convert the inline children of `source` (an element or an explicit node
   * list, as in {@link MdastExportContext.exportChildren}) into mdast
   * phrasing content, grouping bare line breaks as mdast `break` nodes.
   */
  exportInline(source: ElementNode | readonly LexicalNode[]): PhrasingContent[];
  /**
   * Convert the inline children of `source` (an element or an explicit node
   * list, as in {@link MdastExportContext.exportChildren}) into one or more
   * mdast block nodes (paragraphs), splitting on hard line breaks. Used by
   * containers such as block quotes and list items whose Lexical children
   * are inline but whose mdast children must be block-level.
   */
  exportBlocks(source: ElementNode | readonly LexicalNode[]): BlockContent[];
  /**
   * Whether `node` belongs in the current export: always `true` for a
   * whole-document export; during a selection export, `true` when the node
   * or any descendant is selected. The `exportChildren`/`exportInline`/
   * `exportBlocks` walks apply this automatically — handlers only need it
   * when they iterate children manually (e.g. list items, table rows) to
   * skip structural children the selection does not reach.
   */
  isIncluded(node: LexicalNode): boolean;
}

/**
 * Converts a Lexical node into one or more mdast nodes. Returning `null`
 * defers to the next registered handler.
 * @experimental
 */
export type MdastExportHandler<T extends LexicalNode = LexicalNode> = (
  node: T,
  context: MdastExportContext,
) => MdastNode | MdastNode[] | null;

/**
 * A single import mapping: which mdast node `type` it handles and how. The
 * unit an extension contributes (alongside the micromark/mdast extensions that
 * tokenize the construct) to {@link MdastImportExtension}'s `importRules` config.
 * @experimental
 */
export interface MdastImportRule {
  /** The mdast node `type` this rule handles (e.g. `'heading'`). */
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $import: MdastImportHandler<any>;
}

/**
 * A single export mapping: which Lexical node `getType()` it handles and how.
 * @experimental
 */
export interface MdastExportRule {
  /** The Lexical node `getType()` this rule handles (e.g. `'heading'`). */
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $export: MdastExportHandler<any>;
}

/**
 * The compiled registry produced from {@link MdastConfig} at editor build
 * time and consumed by the importer, exporter, and shortcut scanner.
 * @experimental
 */
export interface CompiledMdast {
  importHandlers: Map<string, MdastImportHandler>;
  exportHandlers: Map<string, MdastExportHandler>;
  micromarkExtensions: MicromarkExtension[];
  mdastExtensions: FromMarkdownExtension[];
  toMarkdownExtensions: ToMarkdownExtension[];
  /** mdast inline `type`s eligible for streaming shortcut materialization. */
  inlineShortcutTypes: Set<string>;
  /** Characters that can close an inline construct and trigger a re-scan. */
  inlineShortcutTriggers: Set<string>;
}
