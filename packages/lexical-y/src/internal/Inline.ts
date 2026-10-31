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
  FIELD_PREFIX,
  isMergeableText,
  MARKER,
  RUN_END,
  SEGMENT_KEY,
  stableStringify,
  TYPE_KEY,
  WRAPPER_PREFIX,
} from './Schema';
import {isGone, unheldLength} from './Seen';

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
// Inserts at the edge of a token or segmented run

type ID = {client: number; clock: number};

const holds = (it: Item, id: ID | null): boolean =>
  id !== null &&
  it.id.client === id.client &&
  it.id.clock <= id.clock &&
  id.clock < it.id.clock + it.length;

type Store = {getItem(id: ID): unknown};

const storeOf = (it: Item): Store =>
  (it.parent as unknown as {doc: {store: Store}}).doc.store;

/**
 * The item a redo copied `it` from, or `it` itself. A redo inserts its copy
 * of a deleted format item right before it, so the copy's right origin is a
 * deleted format item of the same key and value (Yjs's own record of the
 * copy, `redone`, is not shared with other clients).
 */
function original(it: Item, store: Store): Item {
  for (let item = it, n = 0; n < 64; n++) {
    const from =
      item.rightOrigin === null
        ? null
        : (store.getItem(item.rightOrigin) as Item | undefined);
    if (
      from === null ||
      from === undefined ||
      !from.deleted ||
      !(from.content instanceof ContentFormat) ||
      !(item.content instanceof ContentFormat) ||
      from.content.key !== item.content.key ||
      !equalValues(from.content.value, item.content.value)
    ) {
      return item;
    }
    item = from;
  }
  return it;
}

const equalValues = (a: unknown, b: unknown): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The content item an opening (`next`: right origins) or closing (origins)
 * format item of a run was inserted next to, through the format items it was
 * inserted next to: the run's first or last character, as it was written
 * (before a redo copied the format item next to text typed there since).
 */
function besideFormats(it: Item, next: boolean): ID | null {
  const store = storeOf(it);
  let id = next ? original(it, store).rightOrigin : original(it, store).origin;
  for (let n = 0; id !== null && n < 64; n++) {
    const item = store.getItem(id) as Item | undefined;
    if (item === undefined || !(item.content instanceof ContentFormat)) {
      return id;
    }
    id = next
      ? original(item, store).rightOrigin
      : original(item, store).origin;
  }
  return id;
}

/** Format keys and the values an edge insert shows for them. */
type EdgeValues = Map<string, unknown>;

/**
 * Text a collaborator inserts at the edge of a node Lexical keeps apart
 * (token or segmented text: a run of its own segment key, see SEGMENT_KEY)
 * at the same time as another client makes that node from existing text
 * (makes a word token text) lands inside the run or outside it by the order
 * Yjs gives the two inserts, and inside it would take the run's mode: the
 * mention would hold the collaborator's words (#9639). Such text is shown
 * with the values of the run's keys on its side of the run instead.
 *
 * The run's opening format items were inserted right before its first
 * character, and its closing ones right after its last, so text between the
 * opening items and that first character, or between that last character
 * and the closing items, was inserted at an edge: by a writer that did not
 * know them, or later, next to such text. Only the keys the run's own write
 * set there are shown as on the other side (the mode and segment key): the
 * text's other formats and comments are its own. The closing items are the
 * last ones that end the run on its line (a write inside an edge can close
 * and reopen it around its own text), and a redo's copy of an opening or
 * closing item stands where the item it copies stood. A run whose characters
 * were written with it (typed after its opening items) has no such edges,
 * and neither has a node that was already one of its own (an unmergeable
 * text node) made token text: its mode items sit next to its segment key's.
 * Fed every item a reader shows of a sequence, in order, after `prime`.
 */
export class RunEdges {
  private groupFirst: Item | null = null;
  private groupBefore: Formats | null = null;
  // The edge items of the runs from one a line opens to the line's end,
  // found in one pass (see lineEdges), and those runs' segment keys: a run
  // opened where none of them is starts the next pass.
  private edges: Map<Item, EdgeValues> | null = null;
  private runs: Set<unknown> = new Set();

  /**
   * Called before the first item when a read starts at `start` (under
   * `current`) rather than at its line's start: inside a token or segmented
   * run, that run's edges are found from the line's start (the reader reads
   * from where a change is; the run's opening items are before it).
   */
  prime(start: Item | null, current: Formats): void {
    if (start === null || !current.has(SEGMENT_KEY) || !isModeRun(current)) {
      return;
    }
    let first = start;
    while (first.left !== null && !endsLine(first.left)) {
      first = first.left;
    }
    if (first !== start) {
      const found = lineEdges(first, new Map());
      this.edges = found.edges;
      this.runs = found.runs;
    }
  }

  /** A live format item, before it is applied to `current`. */
  format(it: Item, current: Formats): void {
    if (this.groupFirst === null) {
      this.groupFirst = it;
      this.groupBefore = new Map(current);
    }
  }

  /**
   * A live content item under `current`: the formats to show it with
   * instead, or null.
   */
  content(it: Item, current: Formats): Formats | null {
    const first = this.groupFirst;
    if (first !== null) {
      const before = this.groupBefore!;
      this.groupFirst = null;
      this.groupBefore = null;
      const segment = current.get(SEGMENT_KEY) ?? null;
      if (
        segment !== null &&
        segment !== (before.get(SEGMENT_KEY) ?? null) &&
        !this.runs.has(segment) &&
        isModeRun(current)
      ) {
        const found = lineEdges(first, before);
        this.edges = found.edges;
        this.runs = found.runs;
      }
    }
    const values = this.edges === null ? undefined : this.edges.get(it);
    if (values === undefined) {
      return null;
    }
    const shown = new Map(current);
    values.forEach((v, k) => {
      if (v === undefined) {
        shown.delete(k);
      } else {
        shown.set(k, v);
      }
    });
    return shown;
  }
}

/**
 * Whether `formats` are those of token or segmented text: other runs of
 * their own segment key (a code highlight token, a tab) are left to their
 * own rules (a highlighter retypes its tokens).
 */
function isModeRun(formats: Formats): boolean {
  const mode = decodeFormatValue(formats.get(FIELD_PREFIX + 'mode') ?? null);
  return mode === 'token' || mode === 'segmented';
}

/** Whether `it` ends a line (or the inline content of a container). */
const endsLine = (it: Item): boolean =>
  it.content instanceof ContentType &&
  (it.content.type.name === MARKER || it.content.type.name === RUN_END);

type ModeRun = {
  /** Its opening segment key item: inserted before the run's first character. */
  opener: Item;
  /** The values its opening group's keys had before it. */
  opening: EdgeValues;
  /** The content items under its segment key (deleted ones too). */
  items: Item[];
  /** The closing items that end it (see RunEdges), or null. */
  close: {first: Item; end: number; values: EdgeValues} | null;
};

/**
 * The items of `group` written with `item` (by the same write: its client's,
 * linked to it by their origins), whose keys are the ones that write changed
 * there: other items of the group (a collaborator's bold or comment opening
 * at the same spot) keep their own.
 */
function sameWrite(group: Item[], item: Item): Item[] {
  // Linked through the items a redo copied them from, if it did.
  const store = storeOf(item);
  const from = new Map(group.map(g => [g, original(g, store)]));
  const chain = [item];
  for (let grew = true; grew; ) {
    grew = false;
    for (const g of group) {
      const og = from.get(g)!;
      if (
        !chain.includes(g) &&
        g.id.client === item.id.client &&
        chain.some(c => {
          const oc = from.get(c)!;
          return holds(oc, og.origin) || holds(og, oc.origin);
        })
      ) {
        chain.push(g);
        grew = true;
      }
    }
  }
  return chain;
}

/**
 * The edge items (see RunEdges) of every token or segmented run from the
 * format group `start` begins (under `before`) to the end of its line, with
 * the values of the run's keys each shows: one pass along the line, each run
 * keeping its own state (a run can close and reopen, and another run can
 * sit inside it). The opening items of one write were inserted before the
 * same item (their right origin), and the first of its closing items after
 * the run's last character (its origin; the others follow it).
 */
function lineEdges(
  start: Item,
  before: Formats,
): {edges: Map<Item, EdgeValues>; runs: Set<unknown>} {
  const runs = new Map<unknown, ModeRun>();
  const formats = new Map(before);
  let group: Item[] = [];
  let groupBefore: Formats = formats;
  let segmentItem: Item | null = null;
  const endGroup = () => {
    if (group.length === 0) {
      return;
    }
    const from = groupBefore.get(SEGMENT_KEY) ?? null;
    const to = formats.get(SEGMENT_KEY) ?? null;
    if (from !== to && segmentItem !== null) {
      const closed = from === null ? undefined : runs.get(from);
      if (closed !== undefined) {
        const chain = sameWrite(group, segmentItem);
        const values: EdgeValues = new Map();
        for (const g of chain) {
          const k = (g.content as ContentFormat).key;
          values.set(k, formats.get(k));
        }
        // The first closing item of the write that closed the run.
        let first = segmentItem;
        for (;;) {
          const origin = first.origin;
          const prev = chain.find(g => holds(g, origin));
          if (prev === undefined) {
            break;
          }
          first = prev;
        }
        closed.close = {end: closed.items.length, first, values};
      }
      if (to !== null) {
        const reopened = runs.get(to);
        if (reopened !== undefined) {
          reopened.close = null;
        } else if (isModeRun(formats)) {
          const opening: EdgeValues = new Map();
          for (const g of sameWrite(group, segmentItem)) {
            const k = (g.content as ContentFormat).key;
            opening.set(k, groupBefore.get(k));
          }
          runs.set(to, {close: null, items: [], opener: segmentItem, opening});
        }
      }
    }
    group = [];
    segmentItem = null;
  };
  for (let p: Item | null = start; p !== null && !endsLine(p); p = p.right) {
    if (p.content instanceof ContentFormat) {
      if (isGone(p)) {
        continue;
      }
      if (group.length === 0) {
        groupBefore = new Map(formats);
      }
      group.push(p);
      const was = formats.get(SEGMENT_KEY) ?? null;
      applyFormat(formats, p.content);
      // The segment key item that changed the run (a later one of another
      // write that sets the same value again does not).
      if (
        p.content.key === SEGMENT_KEY &&
        (formats.get(SEGMENT_KEY) ?? null) !== was
      ) {
        segmentItem = p;
      }
      continue;
    }
    if (!isGone(p) && !p.countable) {
      continue;
    }
    endGroup();
    const segment = formats.get(SEGMENT_KEY) ?? null;
    const run = segment === null ? undefined : runs.get(segment);
    if (run !== undefined) {
      run.items.push(p);
    }
  }
  endGroup();
  const edges = new Map<Item, EdgeValues>();
  for (const run of runs.values()) {
    const close = run.close;
    if (close === null) {
      continue;
    }
    const {items} = run;
    const firstID = besideFormats(run.opener, true);
    const lastID = besideFormats(close.first, false);
    let first = -1;
    for (let k = 0; k < close.end && first === -1; k++) {
      if (holds(items[k], firstID)) {
        first = k;
      }
    }
    let last = -1;
    for (let k = close.end - 1; k >= 0 && last === -1; k--) {
      if (holds(items[k], lastID)) {
        last = k;
      }
    }
    if (first === -1 || last < first) {
      continue;
    }
    for (let k = 0; k < first; k++) {
      if (!isGone(items[k])) {
        edges.set(items[k], run.opening);
      }
    }
    for (let k = last + 1; k < close.end; k++) {
      if (!isGone(items[k])) {
        edges.set(items[k], close.values);
      }
    }
  }
  return {edges, runs: new Set(runs.keys())};
}

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
  // Whether `attrs` are an edge insert's (see RunEdges), for that item only.
  let edged = false;
  const edges = new RunEdges();
  edges.prime(start, shown);
  for (let it = start; it !== null && it !== stop; it = it.right) {
    if (isGone(it)) {
      continue;
    }
    const content = it.content;
    if (content instanceof ContentFormat) {
      if (shown === current || !hidden!.hides(it)) {
        edges.format(it, shown);
      }
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
    const edge = edges.content(it, shown);
    if (edge !== null) {
      attrs = Object.fromEntries(edge);
      edged = true;
    } else if (attrs === null || edged) {
      attrs = Object.fromEntries(shown);
      edged = false;
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
      n += unheldLength(it, hidden);
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

const ALNUM = /[\p{L}\p{N}\p{M}]/u;

/**
 * Whether the character the code unit at `i` is part of is a letter, a digit
 * or a combining mark, of a script written with spaces.
 */
const isAlnum = (s: string, i: number): boolean => {
  if (i < 0 || i >= s.length) {
    return false;
  }
  const c = String.fromCodePoint(s.codePointAt(charStart(s, i))!);
  return ALNUM.test(c) && !UNSPACED.test(c);
};

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

// More than spaces: a character that is not white space, or a line feed (a
// line break is a node of its own, not a separator).
const NOT_SPACE = /\S|\n/;

/**
 * The common start and end that text made in place of removed text (`b`,
 * see TextReplay#stretch) keeps of that text (`a`), as the characters they
 * were: the diff anchored at the caret (diffStrings).
 *
 * An insertion or a deletion keeps every other character, except inside a
 * word: an insertion between two letters or digits of one (`t9z` made again
 * as `t90z`), or a deletion with both ends inside words, changed those
 * words, which are then replaced whole, as by a replacement: a kept piece of
 * the old word would be a piece of the new one, and an edit computed before
 * this one that replaces the old word deletes exactly the old word's
 * characters, so it took that piece out of the new word. At a word's edge
 * (`foo` made again as `food`, `fooX.bar`) every character is kept. Where it
 * could be at several places (`t1z t|9z t2z` or `t1z |t9z t2z`), it goes
 * where the caret placed it, else at the last place inside no word.
 *
 * A replacement keeps whole words (snapToWords). A kept start or end that
 * is only spaces is written with it: a separator alone carries no word, and
 * the old one is the one a concurrent rewrite of the words around it
 * deletes (a node `Note: ` replaced by `Tip: ` while a collaborator rewrites
 * the line kept `Tip:` and lost the space).
 */
export function keptEnds(
  a: string,
  b: string,
  cursor: number,
  composing: boolean,
): {prefix: number; suffix: number} {
  const diff = diffStrings(a, b, cursor);
  const n = Math.min(a.length, b.length);
  if (diff.prefix + diff.suffix === n) {
    if (composing || a.length === b.length) {
      return diff;
    }
    // An insertion or a deletion of `m` characters at `k`: of `b` at
    // `[k, k + m)` (an insertion) or of `a` (a deletion).
    const m = Math.abs(b.length - a.length);
    const longer = b.length > a.length ? b : a;
    const splits = (s: string, i: number): boolean =>
      i > 0 &&
      i < s.length &&
      isHighSurrogate(s.charCodeAt(i - 1)) &&
      isLowSurrogate(s.charCodeAt(i));
    // Inside a word: between two letters or digits of one (`t9|z`), not
    // next to punctuation, an emoji or white space, and not in a script
    // written without spaces, where each character is a word.
    const inside = (i: number): boolean => isAlnum(a, i - 1) && isAlnum(a, i);
    const changesNoWord = (k: number): boolean => {
      if (splits(a, k) || splits(longer, k) || splits(longer, k + m)) {
        return false;
      }
      // An insertion inside a word, or a deletion with both ends inside
      // words, changed those words; at a word's edge (`foo` made again as
      // `food`, `fooX.bar`) it is a word's text typed or deleted there.
      return longer === b ? !inside(k) : !(inside(k) && inside(k + m));
    };
    // The places it could be: from the furthest the common end reaches to
    // the furthest the common start reaches (diffStrings takes the common
    // start first unless the caret stops it, at `diff.prefix`).
    const CHUNK = 256;
    let hi = diff.prefix;
    while (
      hi + CHUNK <= n &&
      a.substring(hi, hi + CHUNK) === b.substring(hi, hi + CHUNK)
    ) {
      hi += CHUNK;
    }
    while (hi < n && a.charCodeAt(hi) === b.charCodeAt(hi)) {
      hi++;
    }
    let end = diff.suffix;
    while (
      end + CHUNK <= n &&
      a.substring(a.length - end - CHUNK, a.length - end) ===
        b.substring(b.length - end - CHUNK, b.length - end)
    ) {
      end += CHUNK;
    }
    while (
      end < n &&
      a.charCodeAt(a.length - 1 - end) === b.charCodeAt(b.length - 1 - end)
    ) {
      end++;
    }
    // Where the caret placed it (it stopped the common start), there.
    const caretPlaced = diff.prefix < hi;
    if (changesNoWord(diff.prefix)) {
      return diff;
    }
    if (!caretPlaced) {
      for (let k = hi; k >= n - end; k--) {
        if (changesNoWord(k)) {
          return {prefix: k, suffix: n - k};
        }
      }
    }
    // It changed the word or words it is inside of: those are replaced
    // whole.
    const k = diff.prefix;
    if (longer.slice(k, k + m).includes('\ufffc')) {
      return diff;
    }
    let prefix = k;
    let suffix = n - k;
    if (inside(k)) {
      while (isAlnum(a, prefix - 1)) {
        prefix = charStart(a, prefix - 1);
      }
    }
    if (inside(a.length - suffix)) {
      while (suffix > 0 && isAlnum(a, a.length - suffix)) {
        const at = a.length - suffix;
        suffix -=
          at + 1 < a.length &&
          isHighSurrogate(a.charCodeAt(at)) &&
          isLowSurrogate(a.charCodeAt(at + 1))
            ? 2
            : 1;
      }
    }
    return {
      prefix: NOT_SPACE.test(a.slice(0, prefix)) ? prefix : 0,
      suffix: NOT_SPACE.test(a.slice(a.length - suffix)) ? suffix : 0,
    };
  }
  const {prefix, suffix} = snapToWords(
    a,
    b,
    diff.prefix,
    diff.suffix,
    composing,
  );
  return {
    prefix: NOT_SPACE.test(a.slice(0, prefix)) ? prefix : 0,
    suffix: NOT_SPACE.test(a.slice(a.length - suffix)) ? suffix : 0,
  };
}

/** White space other than a line feed (a line break is a node of its own). */
const isSeparator = (s: string, i: number): boolean =>
  s[i] !== '\n' && SPACE.test(s[i]);

/**
 * The words of `s` from `from` to `to`, as `[start, end)` pairs: runs of
 * word characters (see isWordChar), and single other characters that are not
 * white space (an object character, a line feed, a character of a script
 * written without spaces), each a whole character. White space between them
 * is no word: it is compared only between two kept words.
 */
function words(s: string, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  let i = from;
  while (i < to) {
    let j = i + 1;
    if (isWordChar(s, i)) {
      while (j < to && isWordChar(s, j)) {
        j++;
      }
    } else if (j < to && isLowSurrogate(s.charCodeAt(j))) {
      j++;
    }
    if (!isSeparator(s, i)) {
      out.push([i, j]);
    }
    i = j;
  }
  return out;
}

/**
 * The most edits the exact diff of a remade line's words looks for, among
 * the words both texts have (see commonWords). It finds the longest common
 * run of words in O((n + m) * EXACT_EDITS) time at most (about 30 ms for a
 * 5,000-word line); past it, only the common start and end are kept.
 */
const EXACT_EDITS = 2048;

/**
 * Myers' middle snake of `a[aLo, aHi)` and `b[bLo, bHi)` (both non-empty,
 * different first and last words): `[x, y, u, v]`, relative to `aLo` and
 * `bLo`, a run of equal words from (x, y) to (u, v) on a shortest edit
 * script, or null past `max` edits.
 */
function middleSnake(
  a: readonly number[],
  aLo: number,
  aHi: number,
  b: readonly number[],
  bLo: number,
  bHi: number,
  max: number,
): [number, number, number, number] | null {
  const n = aHi - aLo;
  const m = bHi - bLo;
  const delta = n - m;
  const odd = (delta & 1) !== 0;
  const half = Math.ceil((n + m) / 2);
  const off = half + 1;
  const vf = new Int32Array(2 * half + 3);
  const vb = new Int32Array(2 * half + 3);
  for (let d = 0; d <= half; d++) {
    if (2 * d - 1 > max) {
      return null;
    }
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && vf[off + k - 1] < vf[off + k + 1])
          ? vf[off + k + 1]
          : vf[off + k - 1] + 1;
      let y = x - k;
      const x0 = x;
      const y0 = y;
      while (x < n && y < m && a[aLo + x] === b[bLo + y]) {
        x++;
        y++;
      }
      vf[off + k] = x;
      const c = delta - k;
      if (odd && c >= -(d - 1) && c <= d - 1 && x + vb[off + c] >= n) {
        return [x0, y0, x, y];
      }
    }
    for (let c = -d; c <= d; c += 2) {
      let x =
        c === -d || (c !== d && vb[off + c - 1] < vb[off + c + 1])
          ? vb[off + c + 1]
          : vb[off + c - 1] + 1;
      let y = x - c;
      const x0 = x;
      const y0 = y;
      while (x < n && y < m && a[aHi - 1 - x] === b[bHi - 1 - y]) {
        x++;
        y++;
      }
      vb[off + c] = x;
      const k = delta - c;
      if (!odd && k >= -d && k <= d && x + vf[off + k] >= n) {
        return [n - x, m - y, n - x0, m - y0];
      }
    }
  }
  return null;
}

/**
 * The pairs of a longest common subsequence of `a[aLo, aHi)` and
 * `b[bLo, bHi)`, in order, into `out` (Myers' linear space diff); false
 * past `max` edits.
 */
function exactWords(
  a: readonly number[],
  aLo: number,
  aHi: number,
  b: readonly number[],
  bLo: number,
  bHi: number,
  max: number,
  out: [number, number][],
): boolean {
  while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) {
    out.push([aLo++, bLo++]);
  }
  let a1 = aHi;
  let b1 = bHi;
  while (a1 > aLo && b1 > bLo && a[a1 - 1] === b[b1 - 1]) {
    a1--;
    b1--;
  }
  if (aLo < a1 && bLo < b1) {
    const snake = middleSnake(a, aLo, a1, b, bLo, b1, max);
    if (snake === null) {
      return false;
    }
    const [x, y, u, v] = snake;
    exactWords(a, aLo, aLo + x, b, bLo, bLo + y, max, out);
    for (let i = 0; i < u - x; i++) {
      out.push([aLo + x + i, bLo + y + i]);
    }
    exactWords(a, aLo + u, a1, b, bLo + v, b1, max, out);
  }
  for (let i = 0; a1 + i < aHi; i++) {
    out.push([a1 + i, b1 + i]);
  }
  return true;
}

/**
 * The words equal in `a` and `b` that a remade line keeps, as pairs of
 * indexes in increasing order of both: a longest common subsequence of the
 * two (exactWords), found among the words both texts have (a word only one
 * has is never kept, and leaving it out keeps the diff short). Past
 * EXACT_EDITS edits among those, none.
 */
function commonWords(
  a: readonly number[],
  b: readonly number[],
): [number, number][] {
  const inA = new Set(a);
  const inB = new Set(b);
  const fa: number[] = [];
  const fb: number[] = [];
  for (let x = 0; x < a.length; x++) {
    if (inB.has(a[x])) {
      fa.push(x);
    }
  }
  for (let y = 0; y < b.length; y++) {
    if (inA.has(b[y])) {
      fb.push(y);
    }
  }
  const sa = fa.map(x => a[x]);
  const sb = fb.map(y => b[y]);
  const pairs: [number, number][] = [];
  if (!exactWords(sa, 0, sa.length, sb, 0, sb.length, EXACT_EDITS, pairs)) {
    return [];
  }
  return pairs.map(([x, y]) => [fa[x], fb[y]]);
}

/**
 * What text made in place of removed text (`b`, see TextReplay#stretch)
 * keeps of that text (`a`), as ranges `[x0, x1, dx]` of `b` whose character
 * `x` was character `x + dx` of `a`, in order: the common start and end
 * (keptEnds), and between them, where `b` replaced text, every run of whole
 * words that a shortest word-by-word edit script of the rest keeps, with the
 * white space around it that both texts share (`t1z t2z t3z t4z` made again
 * as `t1z n9z t3z n8z` keeps ` t3z `), so that only the changed words are
 * written: a character a collaborator deletes in an unchanged word between
 * two changed ones stays deleted, and a letter it types there stays in that
 * word. White space alone is never kept between two changes, as at the ends.
 */
export function keptStretches(
  a: string,
  b: string,
  cursor: number,
  composing: boolean,
): [number, number, number][] {
  const {prefix, suffix} = keptEnds(a, b, cursor, composing);
  const shift = a.length - b.length;
  const ends: [number, number, number][] = [
    [0, prefix, 0],
    [b.length - suffix, b.length, shift],
  ];
  const a1 = a.length - suffix;
  const b1 = b.length - suffix;
  if (composing || a1 <= prefix || b1 <= prefix) {
    return ends;
  }
  const wa = words(a, prefix, a1);
  const wb = words(b, prefix, b1);
  const ids = new Map<string, number>();
  const id = (text: string, [x0, x1]: [number, number]): number => {
    const t = text.slice(x0, x1);
    let x = ids.get(t);
    if (x === undefined) {
      x = ids.size;
      ids.set(t, x);
    }
    return x;
  };
  const pairs = commonWords(
    wa.map(w => id(a, w)),
    wb.map(w => id(b, w)),
  );
  const out: [number, number, number][] = [ends[0]];
  let lastA = prefix;
  let lastB = prefix;
  for (let i = 0; i < pairs.length; ) {
    // Words kept one after the other with the same white space between
    // them in both texts are one stretch.
    let j = i + 1;
    while (
      j < pairs.length &&
      pairs[j][0] === pairs[j - 1][0] + 1 &&
      pairs[j][1] === pairs[j - 1][1] + 1 &&
      a.slice(wa[pairs[j - 1][0]][1], wa[pairs[j][0]][0]) ===
        b.slice(wb[pairs[j - 1][1]][1], wb[pairs[j][1]][0])
    ) {
      j++;
    }
    let ax = wa[pairs[i][0]][0];
    let bx = wb[pairs[i][1]][0];
    let bEnd = wb[pairs[j - 1][1]][1];
    let aEnd = ax + bEnd - bx;
    // With the white space around it that is the same in both texts (up to
    // the stretch before it), as the start and end keep theirs: only the
    // changed words are written.
    while (
      ax > lastA &&
      bx > lastB &&
      a.charCodeAt(ax - 1) === b.charCodeAt(bx - 1) &&
      isSeparator(a, ax - 1)
    ) {
      ax--;
      bx--;
    }
    while (
      aEnd < a1 &&
      bEnd < b1 &&
      a.charCodeAt(aEnd) === b.charCodeAt(bEnd) &&
      isSeparator(a, aEnd)
    ) {
      aEnd++;
      bEnd++;
    }
    out.push([bx, bEnd, ax - bx]);
    lastA = aEnd;
    lastB = bEnd;
    i = j;
  }
  out.push(ends[1]);
  return out;
}

const isHighSurrogate = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;
