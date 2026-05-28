/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ChildSchema} from './types';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $isBlockElementNode,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  ArtificialNode__DO_NOT_USE,
  type ElementNode,
  isHTMLElement,
  type LexicalNode,
} from 'lexical';

import {isAlignmentValue} from './coreImportRules';

/**
 * True if the node fills a block slot at the root or inside another
 * block — covers both ElementNode-style blocks (paragraph, heading,
 * quote) and block-level DecoratorNodes (HorizontalRuleNode,
 * ImageNode-as-block, etc.). Used by {@link BlockSchema},
 * {@link RootSchema}, and {@link NestedBlockSchema}.
 *
 * @experimental
 */
export function $isBlockLevel(node: LexicalNode): boolean {
  return (
    $isBlockElementNode(node) || ($isDecoratorNode(node) && !node.isInline())
  );
}

/**
 * Distribute an inline wrapper (`LinkNode`, `MarkNode`, …) across a
 * heterogeneous run of children produced by `$importChildren`, lifting
 * any block children to the top level while keeping the wrapper around
 * the leaf inline content.
 *
 * Use from a rule whose DOM source is an inline element that the
 * browser permitted to enclose block elements — the canonical case is
 * `<a href="…"><h1>title</h1><div>body</div></a>`, which a link rule
 * wants to surface as two block siblings (heading + paragraph), each
 * with its own link wrapping the original inline content. Schemas
 * can't express this because they reason about a parent's children
 * only — they cannot lift the parent out of itself.
 *
 * For each top-level child:
 * - **Inline children** are collected into runs; each run is wrapped
 *   in a single fresh wrapper (from `$makeWrapper()`).
 * - **Block children** are descended into: their own children are
 *   recursively distributed with `$makeWrapper`, then re-attached so
 *   the block keeps its position at the top level.
 *
 * The returned list will contain a mix of blocks and wrapped inline
 * runs. The enclosing schema (typically {@link BlockSchema}) will
 * then package those inline wrappers into paragraphs as usual.
 *
 * @experimental
 */
export function $distributeInlineWrapper(
  children: readonly LexicalNode[],
  $makeWrapper: () => ElementNode,
): LexicalNode[] {
  const out: LexicalNode[] = [];
  let inlineRun: LexicalNode[] = [];

  const flushInline = () => {
    if (inlineRun.length === 0) {
      return;
    }
    out.push($makeWrapper().splice(0, 0, inlineRun));
    inlineRun = [];
  };

  for (const child of children) {
    if ($isBlockLevel(child)) {
      flushInline();
      // Recursively distribute the wrapper into the block's own
      // children. A block DecoratorNode (no children) is left alone.
      if ($isElementNode(child)) {
        const wrapped = $distributeInlineWrapper(
          child.getChildren(),
          $makeWrapper,
        );
        child.splice(0, child.getChildrenSize(), wrapped);
      }
      out.push(child);
    } else {
      inlineRun.push(child);
    }
  }
  flushInline();
  return out;
}

/**
 * Apply a {@link ChildSchema} to a flat list of children produced by
 * `$importChildren`. Walks the list once, partitions into accepted vs.
 * rejected runs, packages or drops rejected runs, then runs `$finalize`.
 *
 * @internal
 */
export function $applySchema(
  schema: ChildSchema,
  children: LexicalNode[],
  parent: LexicalNode | null,
  domParent: Node | null,
): LexicalNode[] {
  const out: LexicalNode[] = [];
  let run: LexicalNode[] | null = null;

  const flushRun = () => {
    if (run === null) {
      return;
    }
    const rejected = run;
    run = null;
    if (schema.$packageRun) {
      const packaged = schema.$packageRun(rejected, parent, domParent);
      if (packaged.length > 0) {
        for (const n of packaged) {
          out.push(n);
        }
        return;
      }
    }
    // No $packageRun (or it returned []) — apply onReject. 'drop' (default)
    // discards the run. 'hoist' lets it through unchanged at this level.
    if (schema.onReject === 'hoist') {
      for (const n of rejected) {
        out.push(n);
      }
    }
  };

  for (const child of children) {
    if (schema.$accepts(child, parent)) {
      flushRun();
      out.push(child);
    } else {
      if (run === null) {
        run = [];
      }
      run.push(child);
    }
  }
  flushRun();

  return schema.$finalize ? schema.$finalize(out, parent) : out;
}

/**
 * Inline-context equivalent of `wrapContinuousInlines` from the legacy
 * `$generateNodesFromDOM`: when a block container's imported children
 * mix inline runs with block descendants (typically
 * {@link ArtificialNode__DO_NOT_USE} stand-ins emitted by transparent
 * block rules like the `<div>` rule), wrap each inline run in its own
 * artificial node, insert a {@link $createLineBreakNode} between every
 * pair of adjacent artificials, and finally unwrap each artificial in
 * place. The net effect on a list item or table cell is the legacy
 * `<li>1<div>2</div>3</li>` → `<li>1<br>2<br>3</li>` shape — no
 * paragraph wrappers, just the surrounding text/element children with
 * line breaks marking the former block boundaries.
 *
 * Block containers ({@link ListItemRule}, {@link TableCellRule}, the
 * blockquote rule, etc.) pipe `$importChildren(...)` through this
 * helper after their own format/style processing. No-op when the
 * imported children are exclusively inlines (the typical case) or
 * exclusively blocks (no inline runs to flush).
 *
 * @experimental
 */
export function $insertLineBreaksBetweenBlockArtificials(
  children: LexicalNode[],
): LexicalNode[] {
  // Fast-path: nothing to do unless the run contains at least one
  // ArtificialNode stand-in *and* at least one neighbor (either another
  // ArtificialNode or a non-block sibling) that warrants a separator.
  let hasArtificial = false;
  for (const child of children) {
    if (child instanceof ArtificialNode__DO_NOT_USE) {
      hasArtificial = true;
      break;
    }
  }
  if (!hasArtificial) {
    return children;
  }
  // Wrap each maximal run of non-block siblings around the artificials
  // in fresh ArtificialNodes so the gap walk only has to consider
  // ArtificialNode pairs.
  const wrapped: LexicalNode[] = [];
  let inlineRun: LexicalNode[] | null = null;
  const flushInlineRun = () => {
    if (inlineRun && inlineRun.length > 0) {
      const wrapper = new ArtificialNode__DO_NOT_USE();
      wrapper.splice(0, 0, inlineRun);
      wrapped.push(wrapper);
    }
    inlineRun = null;
  };
  for (const child of children) {
    if (
      child instanceof ArtificialNode__DO_NOT_USE ||
      $isBlockElementNode(child)
    ) {
      flushInlineRun();
      wrapped.push(child);
    } else {
      if (inlineRun === null) {
        inlineRun = [];
      }
      inlineRun.push(child);
    }
  }
  flushInlineRun();
  // Insert a LineBreakNode between adjacent ArtificialNodes (legacy
  // `$unwrapArtificialNodes`, pass 1), then unwrap each artificial in
  // place (pass 2).
  const withBreaks: LexicalNode[] = [];
  for (let i = 0; i < wrapped.length; i++) {
    const node = wrapped[i];
    withBreaks.push(node);
    const next = wrapped[i + 1];
    if (
      node instanceof ArtificialNode__DO_NOT_USE &&
      next instanceof ArtificialNode__DO_NOT_USE
    ) {
      withBreaks.push($createLineBreakNode());
    }
  }
  const final: LexicalNode[] = [];
  for (const node of withBreaks) {
    if (node instanceof ArtificialNode__DO_NOT_USE) {
      for (const grand of node.getChildren()) {
        final.push(grand);
      }
    } else {
      final.push(node);
    }
  }
  return final;
}

/**
 * Apply a parent DOM element's `text-align` (when set to one of the
 * supported {@link ElementFormatType} values) to each block-level child
 * Lexical node that does not yet have its own format.
 *
 * Mirrors the part of the legacy `wrapContinuousInlines` that wrote
 * `node.setFormat(textAlign)` onto pre-existing block children when the
 * DOM parent carried `style.textAlign`. Pair with
 * {@link $paragraphPackageRun} (which carries the same propagation onto
 * paragraphs synthesized around inline runs) to fully replicate the
 * legacy behavior on a run of mixed children.
 *
 * @experimental
 */
export function $propagateTextAlignToBlockChildren(
  children: LexicalNode[],
  domParent: Node | null,
): LexicalNode[] {
  if (!isHTMLElement(domParent)) {
    return children;
  }
  const textAlign = domParent.style.textAlign;
  if (!isAlignmentValue(textAlign)) {
    return children;
  }
  for (const child of children) {
    if ($isBlockElementNode(child) && child.getFormatType() === '') {
      child.setFormat(textAlign);
    }
  }
  return children;
}

/**
 * Wrap a run of inline lexical nodes in a fresh paragraph, propagating the
 * `text-align` of `domParent` as the paragraph's format type (matching the
 * legacy `wrapContinuousInlines` behavior).
 */
function $paragraphPackageRun(
  run: LexicalNode[],
  _parent: LexicalNode | null,
  domParent: Node | null,
): LexicalNode[] {
  // Mirror the legacy `$wrapInlineNodes` (driven by
  // `selection.insertNodes`) shortcut where a lone `<br>` at this
  // level (a `LineBreakNode` is the only thing in the rejected run)
  // becomes an *empty* paragraph rather than a paragraph wrapping a
  // visible line break — that's the form clipboard pastes ending in a
  // trailing `<br>` (Google Docs, Gmail, …) rely on for the editor's
  // "extra trailing empty line" expectation.
  if (run.length === 1 && $isLineBreakNode(run[0])) {
    run = [];
  }
  const paragraph = $createParagraphNode();
  if (isHTMLElement(domParent)) {
    const textAlign = domParent.style.textAlign;
    if (isAlignmentValue(textAlign)) {
      paragraph.setFormat(textAlign);
    }
  }
  return [paragraph.splice(0, 0, run)];
}

/**
 * Default schema for block-level positions (root of the document, the body
 * of a block element node). Accepts block lexical nodes; packages runs of
 * inline children into fresh paragraph nodes.
 *
 * @experimental
 */
export const BlockSchema: ChildSchema = {
  $accepts: $isBlockLevel,
  $packageRun: $paragraphPackageRun,
  name: 'BlockSchema',
};

/**
 * Schema for inline-only positions (the body of an inline lexical node such
 * as a link). Accepts non-block lexical nodes; runs of block children are
 * dropped (`onReject: 'drop'` is the default).
 *
 * @experimental
 */
export const InlineSchema: ChildSchema = {
  $accepts: child => !$isBlockLevel(child),
  name: 'InlineSchema',
};

/**
 * Schema for nested block positions — the equivalent of the legacy
 * `ArtificialNode__DO_NOT_USE` flow used when a block DOM element appears
 * inside another block lexical ancestor. Accepts block nodes; runs of inline
 * children are emitted with a line break between consecutive runs (instead
 * of being wrapped in a paragraph, which would introduce an extra level of
 * nesting).
 *
 * @experimental
 */
export const NestedBlockSchema: ChildSchema = {
  $accepts: $isBlockLevel,
  /**
   * Pass an inline run through unchanged. Because the schema iterator only
   * groups *maximal* rejected runs (each separated from the next by an
   * accepted block child), the legacy "linebreak between adjacent inline
   * groups" case never arises — adjacent inline siblings are already
   * coalesced into one run.
   */
  $packageRun: run => run,
  name: 'NestedBlockSchema',
};

/**
 * Schema for the topmost level of `$generateNodesFromDOM`. Identical to
 * {@link BlockSchema}; aliased for clarity at the entry point and so it can
 * be overridden separately in the future (e.g. to synthesize a `ListNode`
 * around runs of orphan `ListItemNode`s).
 *
 * @experimental
 */
export const RootSchema: ChildSchema = {
  $accepts: $isBlockLevel,
  $packageRun: $paragraphPackageRun,
  name: 'RootSchema',
};
