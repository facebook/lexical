/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Item, Node as YNode} from '@y/y';

import {ContentFormat, ContentString, ContentType} from '@y/y';
import {
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {type Formats, isLiveContent} from './Cursor';
import {
  enterZone,
  formatsBefore,
  isMoveItem,
  type Shown,
  stepZone,
  viewZone,
} from './Moves';
import {
  $isWrapper,
  $lineBreakAttrs,
  $textAttrs,
  $wrapperAttrs,
  type Attrs,
  INLINE_PREFIX,
  isMergeableText,
  MARKER,
  RUN_END,
  stableStringify,
  WRAPPER_PREFIX,
} from './Schema';

/*
 * A sequence of atoms: one per content unit of the shared sequence (a
 * character, or a child node). `text` holds one UTF-16 unit per atom, with
 * OBJ in place of every child node; `specials` describes those.
 */

export const OBJ = '\ufffc';

export type Special =
  | {readonly kind: 'inline'; readonly key: NodeKey; readonly node: LexicalNode}
  | {readonly kind: 'marker'; readonly ref: unknown}
  | {readonly kind: 'runEnd'; readonly ref: unknown}
  | {readonly kind: 'oldNode'; readonly item: Item; readonly name: string};

export type Run = {start: number; end: number; attrs: Attrs};

export class Atoms {
  text = '';
  specials = new Map<number, Special>();
  runs: Run[] = [];
  /** The old items of marker / run-end atoms (old atoms only). */
  items = new Map<number, Item>();
  /**
   * Where each text range comes from (desired atoms only): the text node it
   * was in before this update. The diff keeps an old character only for the
   * same origin, so text that moved between nodes or lines is never built
   * from old characters that happen to be equal.
   */
  origins: [number, number, string][] = [];
  pushText(s: string, attrs: Attrs): void {
    if (s.length === 0) {
      return;
    }
    const start = this.text.length;
    this.text += s;
    this.pushRun(start, this.text.length, attrs);
  }
  pushSpecial(special: Special, attrs: Attrs | null, item?: Item): void {
    const at = this.text.length;
    this.text += OBJ;
    this.specials.set(at, special);
    if (item !== undefined) {
      this.items.set(at, item);
    }
    if (attrs !== null) {
      this.pushRun(at, at + 1, attrs);
    }
  }
  private pushRun(start: number, end: number, attrs: Attrs): void {
    const last = this.runs[this.runs.length - 1];
    if (last !== undefined && last.end === start && last.attrs === attrs) {
      last.end = end;
    } else {
      this.runs.push({attrs, end, start});
    }
  }
  get length(): number {
    return this.text.length;
  }
}

// ---------------------------------------------------------------------------
// Desired atoms from Lexical

export type SegmentKeys = {
  get(key: NodeKey): string | undefined;
  create(key: NodeKey): string;
};

export type DesiredContext = {
  segments: SegmentKeys;
  /** Selection point to bias the diff with: node key and offset. */
  cursor: {key: NodeKey; offset: number; type: 'text' | 'element'} | null;
  /** Atom offset of the cursor, filled in when reached. */
  cursorAt: number;
  /** Origin ranges of a text node's text (relative), see Atoms.origins. */
  originOf?: ((node: TextNode) => [number, number, string][]) | null;
};

/**
 * Stands for a line break the normalization inserts and the editor does not
 * hold yet, in the inline content of a part of a line that holds lines (see
 * Writer#$pushLine): written as the `\n` a fresh LineBreakNode is.
 */
export const PENDING_LINE_BREAK: LexicalNode = {
  pendingLineBreak: true,
} as unknown as LexicalNode;

/**
 * Push the inline content `nodes` (children of a line, a run, or an inline
 * container): text, line breaks, wrappers flattened into formats, every other
 * node as one inline child.
 */
export function $pushInline(
  out: Atoms,
  nodes: readonly LexicalNode[],
  ctx: DesiredContext,
  wrapperAttrs: Attrs = {},
): void {
  for (const node of nodes) {
    if (ctx.cursor !== null && ctx.cursorAt < 0) {
      // element point before this child
    }
    if (node === PENDING_LINE_BREAK) {
      out.pushText('\n', {...wrapperAttrs});
    } else if ($isTextNode(node)) {
      const text = node.getTextContent();
      const segment = isMergeableText(node)
        ? null
        : (ctx.segments.get(node.getKey()) ??
          ctx.segments.create(node.getKey()));
      const attrs = {...wrapperAttrs, ...$textAttrs(node, segment)};
      if (
        ctx.cursor !== null &&
        ctx.cursor.type === 'text' &&
        ctx.cursor.key === node.getKey()
      ) {
        ctx.cursorAt = out.length + ctx.cursor.offset;
      }
      if (ctx.originOf) {
        for (const [a, b, k] of ctx.originOf(node)) {
          out.origins.push([out.length + a, out.length + b, k]);
        }
      }
      out.pushText(text, attrs);
    } else if ($isLineBreakNode(node)) {
      out.pushText('\n', $lineBreakAttrs(node, wrapperAttrs));
    } else if ($isWrapper(node)) {
      const attrs = {...wrapperAttrs};
      // An instance key tells this wrapper apart from an equal one right
      // before it (kept once given, so the value stays stable).
      let instance = ctx.segments.get(node.getKey()) ?? null;
      const prev = node.getPreviousSibling();
      if (
        instance === null &&
        prev !== null &&
        $isWrapper(prev) &&
        prev.getType() === node.getType()
      ) {
        const a: Attrs = {};
        const b: Attrs = {};
        $wrapperAttrs(prev as ElementNode, a);
        $wrapperAttrs(node as ElementNode, b);
        if (stableStringify(a) === stableStringify(b)) {
          instance = ctx.segments.create(node.getKey());
        }
      }
      $wrapperAttrs(node as ElementNode, attrs, instance);
      $pushInline(out, (node as ElementNode).getChildren(), ctx, attrs);
    } else {
      out.pushSpecial({key: node.getKey(), kind: 'inline', node}, wrapperAttrs);
    }
  }
}

// ---------------------------------------------------------------------------
// Old atoms from Yjs

/**
 * Atoms of the shared items from `start` (inclusive) up to `stop`
 * (exclusive, null = end), with the formats in effect at `start`.
 */
export function readAtoms(
  start: Item | null,
  stop: Item | null,
  formats: Formats,
  out: Atoms,
  hidden: Shown | null = null,
  limit = Infinity,
  last: Item | null = null,
): Formats {
  let current = new Map(formats);
  let attrs: Attrs | null = null;
  // With moves, the walk of a zone enters the ranges inline records show
  // (formats are taken again after a jump: they are positional).
  const view = viewZone(hidden);
  const walk = view === null ? null : view.copy();
  if (walk !== null) {
    hidden = walk;
  }
  const y = start === null ? null : (start.parent as YNode);
  let prev: Item | null = null;
  for (
    let it =
      start === stop
        ? null
        : walk === null
          ? start
          : enterZone(walk, y!, start, stop);
    it !== null && (walk !== null || it !== stop) && out.length < limit;
    prev = it,
      it =
        walk === null
          ? it === last
            ? null
            : it.right
          : stepZone(walk, y!, it, stop, last)
  ) {
    if (walk !== null && (prev === null ? it !== start : it !== prev.right)) {
      current = formatsBefore(y!, it);
      attrs = null;
    }
    if (it.deleted || isMoveItem(it)) {
      // Move records are not content (they show other units).
      continue;
    }
    if (hidden !== null && it.countable) {
      const runs = hidden.runs(it);
      if (runs.length > 1 || runs[0][1]) {
        // Partly or wholly hidden: only shown text counts.
        if (it.content instanceof ContentString) {
          if (attrs === null) {
            attrs = Object.fromEntries(current);
          }
          let pos = 0;
          for (const [len, isHidden] of runs) {
            if (!isHidden) {
              out.pushText(it.content.str.slice(pos, pos + len), attrs);
            }
            pos += len;
          }
        }
        continue;
      }
    }
    const content = it.content;
    if (content instanceof ContentFormat) {
      if (content.value === null) {
        current.delete(content.key);
      } else {
        current.set(content.key, content.value);
      }
      attrs = null;
      continue;
    }
    if (!it.countable) {
      continue;
    }
    if (attrs === null) {
      attrs = Object.fromEntries(current);
    }
    if (content instanceof ContentString) {
      out.pushText(content.str, attrs);
    } else if (content instanceof ContentType) {
      const name = content.type.name as string;
      if (name === MARKER) {
        out.pushSpecial({kind: 'marker', ref: it}, attrs, it);
      } else if (name === RUN_END) {
        out.pushSpecial({kind: 'runEnd', ref: it}, attrs, it);
      } else {
        out.pushSpecial({item: it, kind: 'oldNode', name}, attrs, it);
      }
    } else {
      // Embeds and other content this binding does not write: kept as
      // opaque atoms (never equal to anything we write).
      for (let i = 0; i < it.length; i++) {
        out.pushSpecial({item: it, kind: 'oldNode', name: ''}, attrs, it);
      }
    }
  }
  return current;
}

/** Live content items from `start` up to `stop` (exclusive). */
export function countLive(
  start: Item | null,
  stop: Item | null,
  hidden: Shown | null = null,
  last: Item | null = null,
): number {
  let n = 0;
  const view = viewZone(hidden);
  const walk = view === null ? null : view.copy();
  if (walk !== null) {
    hidden = walk;
  }
  const y = start === null ? null : (start.parent as YNode);
  for (
    let it =
      start === stop
        ? null
        : walk === null
          ? start
          : enterZone(walk, y!, start, stop);
    it !== null && (walk !== null || it !== stop);
    it =
      walk === null
        ? it === last
          ? null
          : it.right
        : stepZone(walk, y!, it, stop, last)
  ) {
    if (isLiveContent(it) && !isMoveItem(it)) {
      n += hidden === null ? it.length : hidden.shownLength(it);
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Diff

export type AtomMatch = (oldAt: number, newAt: number) => boolean;

/**
 * Common prefix and suffix of two atom sequences, with the prefix limited
 * by the cursor (so typing a character equal to its neighbour lands where
 * the cursor is).
 */
export function diffAtoms(
  a: Atoms,
  b: Atoms,
  match: AtomMatch,
  cursor: number,
): {prefix: number; suffix: number} {
  const at = a.text;
  const bt = b.text;
  const max = Math.min(at.length, bt.length);
  const eq = (i: number, j: number) => {
    const c = at.charCodeAt(i);
    if (c !== bt.charCodeAt(j)) {
      return false;
    }
    if (c !== 0xfffc) {
      return !a.specials.has(i) && !b.specials.has(j);
    }
    const sa = a.specials.has(i);
    const sb = b.specials.has(j);
    if (!sa && !sb) {
      return true;
    }
    return sa && sb && match(i, j);
  };
  // Equal chunks without child nodes are skipped with native string
  // comparisons, so the cost of a small change in a long line is not a
  // JavaScript loop over every character.
  const CHUNK = 256;
  const forward = (from: number, to: number): number => {
    let i = from;
    while (i + CHUNK <= to) {
      const chunk = at.substring(i, i + CHUNK);
      if (chunk !== bt.substring(i, i + CHUNK) || chunk.includes(OBJ)) {
        break;
      }
      i += CHUNK;
    }
    while (i < to && eq(i, i)) {
      i++;
    }
    return i;
  };
  const backward = (count: number): number => {
    let n = 0;
    while (n + CHUNK <= count) {
      const chunk = at.substring(at.length - n - CHUNK, at.length - n);
      if (
        chunk !== bt.substring(bt.length - n - CHUNK, bt.length - n) ||
        chunk.includes(OBJ)
      ) {
        break;
      }
      n += CHUNK;
    }
    while (n < count && eq(at.length - 1 - n, bt.length - 1 - n)) {
      n++;
    }
    return n;
  };
  // Prefix up to the cursor first, then the suffix, then the rest of the
  // prefix (as simpleDiffWithCursor does).
  // The cursor is after inserted text (and at the start of deleted text).
  // That holds only while the text after the cursor is unchanged: after a
  // join or a paste the cursor sits before the new text, and a plain
  // prefix-first diff keeps the old line's end where it was.
  const delta = bt.length - at.length;
  const limit =
    cursor >= 0 &&
    cursor <= bt.length &&
    cursor - delta >= 0 &&
    bt.substring(cursor) === at.substring(cursor - delta)
      ? Math.max(0, Math.min(cursor - Math.max(0, delta), max))
      : max;
  let prefix = forward(0, limit);
  let suffix = backward(max - prefix);
  prefix = forward(prefix, max - suffix);
  // Never split a surrogate pair (a diff inside one would write half a
  // character).
  if (prefix > 0 && isHighSurrogate(at.charCodeAt(prefix - 1))) {
    prefix--;
  }
  if (suffix > 0 && isLowSurrogate(at.charCodeAt(at.length - suffix))) {
    suffix--;
  }
  return {prefix, suffix};
}

const isHighSurrogate = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;

/** Split a text node list into runs of non-text nodes and texts. */
export function isTextLike(node: LexicalNode): boolean {
  return $isTextNode(node) || $isLineBreakNode(node);
}

export function isInlineNodeName(name: string): boolean {
  return name.startsWith(INLINE_PREFIX);
}

export function isWrapperKey(key: string): boolean {
  return key.startsWith(WRAPPER_PREFIX);
}

export const $isStoredLeaf = (node: LexicalNode): boolean =>
  $isDecoratorNode(node) || ($isElementNode(node) && !$isWrapper(node));

export type {TextNode};
