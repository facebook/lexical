/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Hidden} from './Hidden';
import type {Item} from '@y/y';

import {ContentFormat, ContentString, ContentType} from '@y/y';
import {
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {type Formats, isLiveContent} from './Cursor';
import {
  $foreignFlatKeys,
  $isWrapper,
  $lineBreakAttrs,
  $textAttrs,
  $wrapperAttrs,
  type Attrs,
  decodeFormatValue,
  isMergeableText,
  MARKER,
  RUN_END,
  SEGMENT_KEY,
  stableStringify,
  TYPE_KEY,
  WRAPPER_PREFIX,
} from './Schema';
import {isGone} from './Unread';

// Inline content as atoms, the form both the editor's side ($pushInline)
// and the shared side (readAtoms) are compared in: one atom per content unit
// of the shared sequence (a character, or a child node), with runs of equal
// attributes. The writer diffs two atom sequences (see diffAtoms), whole
// words where text is replaced (see snapToWords).
//
// Invariant: the atoms of what the editor holds equal the atoms a reader
// reads from what is stored, or the author reads its content again (see
// DesiredContext.flattened). Why: the author shows what every reader shows.
//
// A sequence of atoms: `text` holds one UTF-16 unit per atom, with OBJ in
// place of every child node; `specials` describes those.

const OBJ = '\ufffc';

type Special =
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
  /**
   * The text nodes the text comes from, with their ranges (desired atoms
   * with origins only): what Writer#$sameTextLineage checks.
   */
  textNodes: [number, number, NodeKey][] = [];
  /**
   * The line breaks and inline nodes, with their atoms (desired atoms with
   * origins only): see Writer#$exactAtoms.
   */
  nodes: [number, NodeKey][] = [];
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

type SegmentKeys = {
  get(key: NodeKey): string | undefined;
  /** A new segment key, or null where none may be made (see $checkWrite). */
  create(key: NodeKey): string | null;
};

export type DesiredContext = {
  segments: SegmentKeys;
  /** Selection point to bias the diff with: node key and offset. */
  cursor: {key: NodeKey; offset: number; type: 'text' | 'element'} | null;
  /** Atom offset of the cursor, filled in when reached. */
  cursorAt: number;
  /** Origin ranges of a text node's text (relative), see Atoms.origins. */
  originOf?: ((node: TextNode) => [number, number, string][]) | null;
  /**
   * Set when the content is stored, and read, otherwise than the editor
   * holds it: a wrapper nested in a wrapper of its own type (a link in a
   * link), as the formats store one per type, the inner one; two adjacent
   * text nodes that store the same attributes (that Lexical did not merge,
   * because of NodeState it compares by reference), as one text node. The
   * author then reads the content again, to show what every reader shows.
   */
  flattened?: boolean;
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
  // The stored attributes of the text node before, when it has no segment
  // key (see DesiredContext.flattened).
  let prevText: string | null = null;
  for (const node of nodes) {
    const afterText: string | null = prevText;
    prevText = null;
    if (node === PENDING_LINE_BREAK) {
      out.pushText('\n', {...wrapperAttrs});
    } else if ($isTextNode(node)) {
      const text = node.getTextContent();
      const segment = isMergeableText(node)
        ? null
        : (ctx.segments.get(node.getKey()) ??
          ctx.segments.create(node.getKey()));
      const attrs = {...wrapperAttrs, ...$textAttrs(node, segment)};
      // (Not around the node being composed: Lexical holds its merges back
      // until the composition ends, see DEFER_COMPOSITION_MERGE_TAG.)
      if (segment === null && text !== '' && !node.isComposing()) {
        prevText = stableStringify(attrs);
        if (prevText === afterText) {
          ctx.flattened = true;
        }
      }
      // A node whose NodeState JSON a reader lays out otherwise (see
      // $foreignFlatKeys): the author reads it back too.
      if ($foreignFlatKeys(node) !== null) {
        ctx.flattened = true;
      }
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
        if (text.length > 0) {
          out.textNodes.push([
            out.length,
            out.length + text.length,
            node.getKey(),
          ]);
        }
      }
      out.pushText(text, attrs);
    } else if ($isLineBreakNode(node)) {
      if (ctx.originOf) {
        out.nodes.push([out.length, node.getKey()]);
      }
      out.pushText('\n', $lineBreakAttrs(node, wrapperAttrs));
    } else if ($isWrapper(node)) {
      if (WRAPPER_PREFIX + node.getType() in wrapperAttrs) {
        ctx.flattened = true;
      }
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
      if (ctx.originOf) {
        out.nodes.push([out.length, node.getKey()]);
      }
      out.pushSpecial({key: node.getKey(), kind: 'inline', node}, wrapperAttrs);
    }
  }
}

// ---------------------------------------------------------------------------
// Old atoms from Yjs

/**
 * Atoms of the shared items from `start` (inclusive) up to `stop`
 * (exclusive, null = end), with the formats in effect at `start`, as the
 * editor shows them: without what is held back (see Hidden). Returns the
 * formats stored at `stop`, held-back ones too (where a write cursor starts,
 * see Cursor).
 */
export function readAtoms(
  start: Item | null,
  stop: Item | null,
  formats: Formats,
  out: Atoms,
  hidden: Hidden | null = null,
): Formats {
  const current = new Map(formats);
  // The formats the editor shows: `current` without held-back ones.
  const shown = hidden === null ? current : new Map(formats);
  let attrs: Attrs | null = null;
  for (let it = start; it !== null && it !== stop; it = it.right) {
    if (isGone(it)) {
      continue;
    }
    const content = it.content;
    if (content instanceof ContentFormat) {
      applyFormat(current, content);
      if (shown !== current && !hidden!.hides(it)) {
        applyFormat(shown, content);
      }
      attrs = null;
      continue;
    }
    if (!it.countable) {
      continue;
    }
    if (attrs === null) {
      attrs = Object.fromEntries(shown);
    }
    if (hidden !== null) {
      const runs = hidden.runs(it);
      if (runs.length > 1 || runs[0][1]) {
        // Partly or wholly held back: only shown text counts (a held node
        // or marker is not there).
        if (content instanceof ContentString) {
          let pos = 0;
          for (const [len, isHidden] of runs) {
            if (!isHidden) {
              pushStoredText(out, content.str.slice(pos, pos + len), attrs);
            }
            pos += len;
          }
        }
        continue;
      }
    }
    if (content instanceof ContentString) {
      pushStoredText(out, content.str, attrs);
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

function applyFormat(formats: Formats, content: ContentFormat): void {
  if (content.value === null) {
    formats.delete(content.key);
  } else {
    formats.set(content.key, content.value);
  }
}

/**
 * Stored text under its formats, as the reader shows it: a node type key
 * (`t`, with the segment key `k`) applies to the characters that type
 * stores only, a tab's `"\t"`; other text under it (a tab's opener left
 * open by a delete that bypassed the writer) is plain text. So the writer
 * does not close and reopen such an opener around text it writes, and the
 * self-check compares what the reader shows.
 */
function pushStoredText(out: Atoms, text: string, attrs: Attrs): void {
  if (
    attrs[TYPE_KEY] === undefined ||
    decodeFormatValue(attrs[TYPE_KEY]) !== 'tab' ||
    /^\t+$/.test(text)
  ) {
    out.pushText(text, attrs);
    return;
  }
  const plain: Attrs = {...attrs};
  delete plain[TYPE_KEY];
  delete plain[SEGMENT_KEY];
  for (const run of text.match(/\t+|[^\t]+/g) || []) {
    out.pushText(run, run[0] === '\t' ? attrs : plain);
  }
}

/** Live content items from `start` up to `stop` (exclusive). */
export function countLive(
  start: Item | null,
  stop: Item | null,
  hidden: Hidden | null = null,
): number {
  let n = 0;
  for (let it = start; it !== null && it !== stop; it = it.right) {
    if (isLiveContent(it)) {
      n += hidden === null ? it.length : hidden.shownLength(it);
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Diff

type AtomMatch = (oldAt: number, newAt: number) => boolean;

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

/** Common prefix and suffix of two strings, the prefix limited by a cursor. */
export function diffStrings(
  a: string,
  b: string,
  cursor: number,
): {prefix: number; suffix: number} {
  const max = Math.min(a.length, b.length);
  const CHUNK = 256;
  const forward = (from: number, to: number) => {
    let i = from;
    while (
      i + CHUNK <= to &&
      a.substring(i, i + CHUNK) === b.substring(i, i + CHUNK)
    ) {
      i += CHUNK;
    }
    while (i < to && a.charCodeAt(i) === b.charCodeAt(i)) {
      i++;
    }
    return i;
  };
  // The caret is after inserted text and at the start of deleted text:
  // with a run of equal characters (a space typed next to a space), place
  // the change before the caret, where the user made it.
  // That holds only while the text after the caret is unchanged.
  const delta = b.length - a.length;
  const limit =
    cursor >= 0 &&
    cursor <= b.length &&
    cursor - delta >= 0 &&
    b.substring(cursor) === a.substring(cursor - delta)
      ? Math.max(0, Math.min(cursor - Math.max(0, delta), max))
      : max;
  let prefix = forward(0, limit);
  let suffix = 0;
  const count = max - prefix;
  while (
    suffix + CHUNK <= count &&
    a.substring(a.length - suffix - CHUNK, a.length - suffix) ===
      b.substring(b.length - suffix - CHUNK, b.length - suffix)
  ) {
    suffix += CHUNK;
  }
  while (
    suffix < count &&
    a.charCodeAt(a.length - 1 - suffix) === b.charCodeAt(b.length - 1 - suffix)
  ) {
    suffix++;
  }
  prefix = forward(prefix, max - suffix);
  // Never split a surrogate pair.
  if (prefix > 0 && isHighSurrogate(a.charCodeAt(prefix - 1))) {
    prefix--;
  }
  if (suffix > 0 && isLowSurrogate(a.charCodeAt(a.length - suffix))) {
    suffix--;
  }
  return {prefix, suffix};
}

const SPACE = /\s/;
// Scripts written without spaces between words: each character is a word of
// its own here, so a replacement in such text is not widened.
const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/**
 * The first code unit of the character (code point) that the code unit at
 * `i` is part of: `i`, or `i - 1` for the second half of a surrogate pair.
 */
const charStart = (s: string, i: number): number =>
  i > 0 &&
  isLowSurrogate(s.charCodeAt(i)) &&
  isHighSurrogate(s.charCodeAt(i - 1))
    ? i - 1
    : i;

/**
 * Whether the character the code unit at `i` is part of is in a word: the
 * whole character is classified (a Han character beyond U+FFFF is a
 * surrogate pair, neither half of which is Han by itself).
 */
const isWordChar = (s: string, i: number): boolean => {
  if (i < 0 || i >= s.length || s.charCodeAt(i) === 0xfffc) {
    return false;
  }
  const start = charStart(s, i);
  const c = String.fromCodePoint(s.codePointAt(start)!);
  return !SPACE.test(c) && !UNSPACED.test(c);
};

/**
 * The common start and end of `a` and `b` in whole words, compared whole
 * (see wordCut: a run of letters, digits and connectors, or a single other
 * character, each with the marks and joined characters that go with it);
 * with `endFirst`, the common end is taken first. As character counts. The
 * diff of text whose edits are not known (text of nodes made again): a word
 * is kept only where it is there whole, so a word that gained or lost
 * letters (`t1z` written as `t91z`) is new, and a word next to an equal one
 * cannot lend it a letter (the common start of `t68z ` pasted before `t50z`
 * takes no `t` of `t50z`).
 */
export function diffWords(
  a: string,
  b: string,
  endFirst = false,
): {prefix: number; suffix: number} {
  // The end of the word starting at `i`, and the start of the one ending at
  // `j` (graphemes of each text read once).
  const startsA = graphemes(a);
  const startsB = graphemes(b);
  const end = (s: string, starts: Uint8Array | null, i: number): number => {
    let k = i + charLength(s, i);
    while (k < s.length && !wordCut(s, k, starts)) {
      k += charLength(s, k);
    }
    return k;
  };
  const start = (s: string, starts: Uint8Array | null, j: number): number => {
    let k = charStart(s, j - 1);
    while (k > 0 && !wordCut(s, k, starts)) {
      k = charStart(s, k - 1);
    }
    return k;
  };
  const max = Math.min(a.length, b.length);
  // Where the two texts part, from the start and from the end. A word cut
  // reads the character after it and, before it, only runs of characters
  // that join (see wordCut), so before where they part from the start, and
  // after the first character that joins nothing in the common end, the
  // texts have the same cuts: the walks below start from there.
  let same = 0;
  while (same < max && a.charCodeAt(same) === b.charCodeAt(same)) {
    same++;
  }
  // (Where they part inside a character, they part where it starts.)
  if (same > 0 && isHighSurrogate(a.charCodeAt(same - 1))) {
    same--;
  }
  let sameEnd = 0;
  while (
    sameEnd < max &&
    a.charCodeAt(a.length - 1 - sameEnd) ===
      b.charCodeAt(b.length - 1 - sameEnd)
  ) {
    sameEnd++;
  }
  let plain = a.length - sameEnd;
  while (plain < a.length && joins(a, plain)) {
    plain++;
  }
  const fromStart = (limit: number): number => {
    let p = Math.min(limit, same - 1);
    while (p > 0 && !(wordCut(a, p, startsA) && wordCut(b, p, startsB))) {
      p = charStart(a, p - 1);
    }
    p = Math.max(p, 0);
    while (p < limit) {
      const e = end(a, startsA, p);
      if (
        e > limit ||
        end(b, startsB, p) !== e ||
        a.slice(p, e) !== b.slice(p, e)
      ) {
        break;
      }
      p = e;
    }
    return p;
  };
  const fromEnd = (limit: number): number => {
    let q = Math.min(limit, a.length - plain - 2);
    while (
      q > 0 &&
      !(wordCut(a, a.length - q, startsA) && wordCut(b, b.length - q, startsB))
    ) {
      q -= charLength(a, a.length - q);
    }
    q = Math.max(q, 0);
    while (q < limit) {
      const n = a.length - q - start(a, startsA, a.length - q);
      if (
        q + n > limit ||
        b.length - q - start(b, startsB, b.length - q) !== n ||
        a.slice(a.length - q - n, a.length - q) !==
          b.slice(b.length - q - n, b.length - q)
      ) {
        break;
      }
      q += n;
    }
    return q;
  };
  if (endFirst) {
    const suffix = fromEnd(max);
    return {prefix: fromStart(max - suffix), suffix};
  }
  const prefix = fromStart(max);
  return {prefix, suffix: fromEnd(max - prefix)};
}

// Whether the character at `i` of `s` may join what is before it or after
// it, or is part of a character (a low surrogate): a run a word cut reads
// back through (see wordCut, diffWords).
const joins = (s: string, i: number): boolean => {
  if (isLowSurrogate(s.charCodeAt(i))) {
    return true;
  }
  const c = String.fromCodePoint(s.codePointAt(i)!);
  return (
    GOES_WITH_PREVIOUS.test(c) ||
    JOINER.test(c) ||
    REGIONAL.test(c) ||
    PICTOGRAPHIC.test(c)
  );
};

/**
 * The range of whole words (see wordCut) that covers characters `from` to
 * `to` of `s`.
 */
export function wordsAround(
  s: string,
  from: number,
  to: number,
): [number, number] {
  const starts = graphemes(s);
  while (!wordCut(s, from, starts)) {
    from = charStart(s, from - 1);
  }
  while (!wordCut(s, to, starts)) {
    to += charLength(s, to);
  }
  return [from, to];
}

/**
 * Whether two words of `s` meet at code unit `at` (true at either end of
 * `s`). A word is a run of letters, digits and connectors (`_`), or any
 * single other character (a space, punctuation, a character of a script
 * written without spaces, an emoji), each whole: with its marks, the
 * characters a joiner or a stacking sign joins to it, and the second of
 * two regional indicators. So a changed word or character is never kept in
 * part: neither a letter of `t1z` in `t91z`, nor `\u200dار` of a word
 * whose first letter changed, nor the mark of a kana or the stacked
 * consonant of a Khmer conjunct whose base changed. `starts` is where the
 * graphemes of `s` start (see graphemeStarts), for a text read often.
 */
export function wordCut(
  s: string,
  at: number,
  starts: Uint8Array | null = graphemes(s),
): boolean {
  if (at <= 0 || at >= s.length) {
    return true;
  }
  if (
    isLowSurrogate(s.charCodeAt(at)) &&
    isHighSurrogate(s.charCodeAt(at - 1))
  ) {
    return false;
  }
  if (starts !== null && starts[at] !== 1) {
    return false;
  }
  const prev = charStart(s, at - 1);
  const c = String.fromCodePoint(s.codePointAt(at)!);
  const b = String.fromCodePoint(s.codePointAt(prev)!);
  if (GOES_WITH_PREVIOUS.test(c) || (REGIONAL.test(b) && REGIONAL.test(c))) {
    return false;
  }
  // A joiner joins across the marks after it (a coeng, a vowel sign, the
  // next consonant).
  for (let k = prev; ; k = charStart(s, k - 1)) {
    const p = String.fromCodePoint(s.codePointAt(k)!);
    if (JOINER.test(p)) {
      return false;
    }
    if (k === 0 || !GOES_WITH_PREVIOUS.test(p)) {
      break;
    }
  }
  return !(isLetter(s, prev) && isLetter(s, at));
}

let segmenter: Intl.Segmenter | null | undefined;
const seen: [string, Uint8Array | null][] = [];

/**
 * Whether the platform reads graphemes (`Intl.Segmenter`): without it,
 * text of nodes made keeps no removed node's text in part (see TextReplay
 * invariant 4), as the rules of wordCut alone do not know every grapheme.
 */
export function readsGraphemes(): boolean {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl === 'object' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, {granularity: 'grapheme'})
        : null;
  }
  return segmenter !== null;
}

/**
 * Where the graphemes of `s` start (1 at each start and at its end), as the
 * platform's `Intl.Segmenter` reads them; null where there is none (the
 * rules of wordCut alone apply then).
 */
export function graphemeStarts(s: string): Uint8Array | null {
  if (!readsGraphemes() || segmenter === null || segmenter === undefined) {
    return null;
  }
  const starts = new Uint8Array(s.length + 1);
  for (const {index} of segmenter.segment(s)) {
    starts[index] = 1;
  }
  starts[s.length] = 1;
  return starts;
}

/**
 * graphemeStarts, keeping the last texts read: a diff reads the same two
 * again and again. (A line read often keeps its own, see wordCut.)
 */
const graphemes = (s: string): Uint8Array | null => {
  for (let k = 0; k < seen.length; k++) {
    if (seen[k][0] === s) {
      const hit = seen[k];
      seen.splice(k, 1);
      seen.unshift(hit);
      return hit[1];
    }
  }
  const starts = graphemeStarts(s);
  seen.unshift([s, starts]);
  if (seen.length > 4) {
    seen.pop();
  }
  return starts;
};

const LETTER = /[\p{L}\p{M}\p{N}\p{Pc}]/u;
// What is one character (one grapheme) with the character before it: what
// extends a grapheme (marks, joiners, tags, the halfwidth kana sound
// marks), emoji modifiers, and the vowel signs AM of Thai and Lao (letters
// by category, yet spacing marks of the consonant). Also what a word reads
// through: a soft hyphen, a word joiner, and an inline node (OBJ), whose
// own text may go on the word.
const GOES_WITH_PREVIOUS =
  /^(?:\p{M}|\p{Grapheme_Extend}|\p{Emoji_Modifier}|\u200d|\u0e33|\u0eb3|\u00ad|\u2060|\ufeff|\ufffc)$/u;
// What is one character with the character after it: a joiner, the signs
// that join the next consonant to the one before (the Khmer coeng, the
// Myanmar virama, the Thai phinthu and Lao Pali virama, which Pali uses
// so, and the viramas Unicode's grapheme rules join conjuncts with), the
// prepend characters of those rules (signs written before what they go
// with), and what a word reads through (see above).
const JOINER =
  /^(?:\u200c|\u200d|\u17d2|\u1039|\u0e3a|\u0eba|\u00ad|\u2060|\ufeff|\ufffc|[\u0600-\u0605]|\u06dd|\u070f|\u0890|\u0891|\u08e2|\u0d4e|\u{110bd}|\u{110cd}|\u{111c2}|\u{111c3}|\u{1193f}|\u{11941}|\u{11a3a}|[\u{11a84}-\u{11a89}]|\u{11d46}|\u{11f02}|\u{113d1}|\u094d|\u09cd|\u0acd|\u0b4d|\u0c4d|\u0d4d)$/u;
const REGIONAL = /\p{Regional_Indicator}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/** Whether the character at `i` is in a run of letters (see wordCut). */
const isLetter = (s: string, i: number): boolean => {
  if (i < 0 || i >= s.length) {
    return false;
  }
  const c = String.fromCodePoint(s.codePointAt(charStart(s, i))!);
  return LETTER.test(c) && !UNSPACED.test(c);
};

/** The length in code units of the character that starts at `i`. */
const charLength = (s: string, i: number): number =>
  i + 1 < s.length &&
  isHighSurrogate(s.charCodeAt(i)) &&
  isLowSurrogate(s.charCodeAt(i + 1))
    ? 2
    : 1;

/**
 * Snap a replacement's common prefix and suffix back to word boundaries, so
 * that replaced words are replaced whole. Character-level diffs keep the
 * letters a rewritten line happens to share with the old one (`R` of `Risk`
 * and `Rewritten`, a digit of a number), and a peer's concurrent typing in
 * the replaced text then lands inside the new words.
 *
 * Applies to a replacement (text both removed and inserted): a rewrite, a
 * paste or typing over a selection, an autocorrected word. Two concurrent
 * replacements of one word then both keep their new word whole, instead of
 * each keeping a different part of the old one, which the other deletes.
 * Typing and deleting keep the exact diff, and so does an IME composition
 * (`composing`), which replaces the text being composed on every key.
 * Whitespace, child nodes and every character of a script written without
 * spaces (Han, kana, Thai, ...) are boundaries: the snap never passes a child
 * node or widens into such text, and never splits a surrogate pair.
 */
export function snapToWords(
  a: string,
  b: string,
  prefix: number,
  suffix: number,
  composing = false,
): {prefix: number; suffix: number} {
  const delEnd = a.length - suffix;
  const insEnd = b.length - suffix;
  if (
    delEnd <= prefix ||
    insEnd <= prefix ||
    composing ||
    // A replacement that brings or removes a child node (a paste of
    // formatted content, lines merged around an inline node) is not a word
    // rewrite: its exact diff keeps every character it shares.
    a.slice(prefix, delEnd).includes('\ufffc') ||
    b.slice(prefix, insEnd).includes('\ufffc')
  ) {
    return {prefix, suffix};
  }
  // A word runs across the end of the prefix: drop its kept start, a whole
  // character at a time.
  if (
    isWordChar(a, prefix - 1) &&
    (isWordChar(a, prefix) || isWordChar(b, prefix))
  ) {
    while (isWordChar(a, prefix - 1)) {
      prefix = charStart(a, prefix - 1);
    }
  }
  // A word runs across the start of the suffix: drop its kept end, a whole
  // character at a time.
  if (
    isWordChar(a, a.length - suffix) &&
    (isWordChar(a, a.length - suffix - 1) ||
      isWordChar(b, b.length - suffix - 1))
  ) {
    while (suffix > 0 && isWordChar(a, a.length - suffix)) {
      const at = a.length - suffix;
      suffix -=
        at + 1 < a.length &&
        isHighSurrogate(a.charCodeAt(at)) &&
        isLowSurrogate(a.charCodeAt(at + 1))
          ? 2
          : 1;
    }
  }
  return {prefix, suffix};
}

const isHighSurrogate = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;
