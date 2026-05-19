/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ChildSchema} from './types';

import {
  $createParagraphNode,
  $isBlockElementNode,
  type ElementFormatType,
  type LexicalNode,
} from 'lexical';

/**
 * @internal
 *
 * Apply a {@link ChildSchema} to a flat list of children produced by
 * `$importChildren`. Walks the list once, partitions into accepted vs.
 * rejected runs, packages or drops rejected runs, then runs `finalize`.
 */
export function applySchema(
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
    if (schema.packageRun) {
      const packaged = schema.packageRun(rejected, parent, domParent);
      if (packaged.length > 0) {
        for (const n of packaged) {
          out.push(n);
        }
        return;
      }
    }
    // No packageRun (or it returned []) — apply onReject. 'drop' (default)
    // discards the run. 'hoist' lets it through unchanged at this level.
    if (schema.onReject === 'hoist') {
      for (const n of rejected) {
        out.push(n);
      }
    }
  };

  for (const child of children) {
    if (schema.accepts(child, parent)) {
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

  return schema.finalize ? schema.finalize(out, parent) : out;
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
  const paragraph = $createParagraphNode();
  const textAlign =
    domParent && (domParent as HTMLElement).style
      ? ((domParent as HTMLElement).style.textAlign as ElementFormatType)
      : ('' as ElementFormatType);
  if (textAlign) {
    paragraph.setFormat(textAlign);
  }
  paragraph.splice(0, 0, run);
  return [paragraph];
}

/**
 * Default schema for block-level positions (root of the document, the body
 * of a block element node). Accepts block lexical nodes; packages runs of
 * inline children into fresh paragraph nodes.
 *
 * @experimental
 */
export const BlockSchema: ChildSchema = {
  accepts: $isBlockElementNode,
  name: 'BlockSchema',
  packageRun: $paragraphPackageRun,
};

/**
 * Schema for inline-only positions (the body of an inline lexical node such
 * as a link). Accepts non-block lexical nodes; runs of block children are
 * dropped (`onReject: 'drop'` is the default).
 *
 * @experimental
 */
export const InlineSchema: ChildSchema = {
  accepts: child => !$isBlockElementNode(child),
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
  accepts: $isBlockElementNode,
  name: 'NestedBlockSchema',
  /**
   * Pass an inline run through unchanged. Because the schema iterator only
   * groups *maximal* rejected runs (each separated from the next by an
   * accepted block child), the legacy "linebreak between adjacent inline
   * groups" case never arises — adjacent inline siblings are already
   * coalesced into one run.
   */
  packageRun(run) {
    return run;
  },
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
  accepts: $isBlockElementNode,
  name: 'RootSchema',
  packageRun: $paragraphPackageRun,
};
