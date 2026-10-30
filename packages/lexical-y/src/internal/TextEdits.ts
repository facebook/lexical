/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
import {
  $getNodeByKey,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type EditorState,
  type LexicalNode,
  type NodeKey,
  type NodeMap,
} from 'lexical';

import {
  diffStrings,
  diffWords,
  graphemeStarts,
  readsGraphemes,
  snapToWords,
  wordCut,
  wordsAround,
} from './Inline';
import {$isWrapper} from './Schema';

const __DEV__ = process.env.NODE_ENV !== 'production';

// Which characters of a line a commit kept. Lexical records, while the
// binding is attached, every change of a text node's text (a splice with its
// offsets, as typing and deleting make them; a split; a merge; a text set
// whole), every node the selection deletes, and every node inserted into or
// removed from an element's children, in order (EditorState#_textEdits).
// Replayed over the previous state, they give each character of each line
// its identity: an old character, or new.
//
// In flat storage, a node's type, format, link and segment key are
// attributes of its characters: which node holds a character is not its
// identity, its place in the line is.
//
// Invariant: an edit the record places exactly (a splice, a node the
// selection deletes) is written where it was made: the text it inserts is
// new, the text it deletes is gone. The old characters the record keeps in
// place, in order, pin the line; between two pins, what the record does not
// place (a node removed, made, replaced, moved, wrapped or unwrapped by app
// code or a transform; a text set whole, whose offsets are not known) is
// resolved by the diff a write makes without the record (see stretch): the
// text that left there and the text that arrived, aligned by their common
// start and end, in whole words, anchored at the caret. Why: transforms
// swap nodes without changing the line's text (a hashtag or keyword made of
// a part and made plain again, an entity grown by its neighbour's text, a
// range wrapped in a link), which says nothing of which characters the new
// nodes hold, and a guess per node lost characters next to equal text, so a
// peer's concurrent delete there came back. Where the record does not
// explain a line's text, the line has no identities, and the writer diffs it
// as before the record.
//
// Text entity transforms also record text they move into the previous node
// (a move) and text they remake in a node of another type (a retype): that
// text keeps its identities there, as an edit the record places does.

export type TextEditLog =
  NonNullable<EditorState['_textEdits']> extends WeakMap<NodeMap, infer L>
    ? L
    : never;

/**
 * A run of a node's characters by identity: characters `start` to `end` of
 * old node `key` (an old text node's text, or the one character of an old
 * line break or inline node), or, with `key` null, the new `text`.
 */
export type Segment = {
  readonly key: NodeKey | null;
  readonly start: number;
  readonly end: number;
  readonly text: string;
};

/** Characters of an old node. */
const OLD = 0;
/** Text a splice inserted (typed): new, where it was made. */
const NEW = 1;
/** Text that arrived otherwise (a node made, a text set): placed by place. */
const LOOSE = 2;
/** Characters whose text the record does not give. */
const UNKNOWN = 3;

/**
 * Characters `start` to `end` of `src` (an old node's key, or the id of text
 * inserted in this commit), whose text is `base`; `gone` once they left
 * their place, `dead` (text that arrived) once deleted (see stretch).
 */
type Run = {
  readonly src: string;
  readonly start: number;
  readonly end: number;
  readonly kind: number;
  readonly base: string;
  readonly gone?: true;
  readonly dead?: true;
  /**
   * Text a text set whole put in place of old characters (or of such text):
   * which characters it is, the record does not say (see stretch).
   */
  readonly set?: true;
  /**
   * The index of the move entry that split this run's history from the rest
   * of its node's, or joined it with another node's (see the move entry).
   */
  readonly moved?: number;
};

/**
 * A child of an element, in a list linked both ways: a node (`runs` null),
 * or the runs a node removed from there held, where it was.
 */
type Entry = {
  readonly key: NodeKey;
  runs: Run[] | null;
  prev: Entry | null;
  next: Entry | null;
  /** Taken out of its list (see adopt, takeBetween, dropGone). */
  out?: true;
  /** What the node removed from there held then (see adopt). */
  held?: Run[];
};

/** Element `key`'s children (see Entry), and its nodes by key. */
type List = {
  readonly key: NodeKey;
  head: Entry | null;
  tail: Entry | null;
  readonly live: Map<NodeKey, Entry>;
};

/**
 * A run of a line, in order: of node `node` (null for runs that left), at
 * offset `at` of its text, inside text node `owner` (null for what a removed
 * node held, then left `from` that removed node's place).
 */
type Item = {
  readonly run: Run;
  readonly node: NodeKey | null;
  readonly at: number;
  readonly owner: NodeKey | null;
  readonly from?: Entry;
};

/**
 * Text that left a stretch: at old position `at` (see resolve), `from` the
 * place of the removed node that held it (null: a text set replaced it).
 */
type Left = {
  readonly run: Run;
  readonly from: Entry | null;
  at: number;
  /**
   * The old line it was in and where in that line's old text (see
   * oldText), or null where not known.
   */
  readonly old: readonly [NodeKey, number] | null;
};

/**
 * A stretch of a line between two pins (see resolve): its runs in the new
 * line (`live`, with text that arrived and was deleted), and the text that
 * left it, in order.
 */
type Stretch = {live: Item[]; left: Left[]; unknown?: true};

/**
 * A line's text, with where its graphemes start (see graphemeStarts): read
 * at many places, so segmented once.
 */
type LineText = {text: string; starts: Uint8Array | null};

/**
 * A line's text after the commit (see keepWords), leaving out what is
 * deleted, and where each item of it starts in it (`at`).
 */
type LineView = LineText & {at: Map<Item, number>};

/**
 * Characters `a` to `a + n` of the text that arrived in a stretch (in line
 * order) are characters `o` to `o + n` of the text that left it.
 */
type Block = {readonly a: number; readonly n: number; readonly o: number};

/** Item `x` of what arrived: its characters `a` to `a + n`. */
type Span = {readonly a: number; readonly n: number; readonly x: Item};

type Kind = 'text' | 'break' | 'wrapper' | 'atom' | 'block';

const OBJ = '\ufffc';
const UNKNOWN_RUN: Run = {base: '', end: 0, kind: UNKNOWN, src: '', start: 0};

/** How a node is laid out in a line, as $pushInline (Inline.ts) lays it. */
function kindOf(node: LexicalNode | null | undefined): Kind | null {
  if (node === null || node === undefined) {
    return null;
  }
  if ($isTextNode(node)) {
    return 'text';
  }
  if ($isLineBreakNode(node)) {
    return 'break';
  }
  if ($isElementNode(node)) {
    return !node.isInline() ? 'block' : $isWrapper(node) ? 'wrapper' : 'atom';
  }
  return $isDecoratorNode(node) && !node.isInline() ? 'block' : 'atom';
}

const textOf = (r: Run): string => r.base.slice(r.start, r.end);
const goneOf = (r: Run): Run => (r.gone || r.dead ? r : {...r, gone: true});
const length = (r: Run): number => r.end - r.start;
/** Whether run `r` is text in its place (not gone, not deleted). */
const isLive = (r: Run): boolean => r.gone !== true && r.dead !== true;
/**
 * Run `r` deleted by an edit the record places: gone, but text that arrived
 * stays as deleted, so that what it stood for is deleted (see stretch).
 */
const deadOf = (r: Run): Run[] =>
  !isLive(r) ? [r] : r.kind === LOOSE ? [{...r, dead: true}] : [];

/** Runs `runs` cut at live offset `at` (a run gone there goes first). */
function cut(runs: readonly Run[], at: number): [Run[], Run[]] {
  const a: Run[] = [];
  const b: Run[] = [];
  let pos = 0;
  for (const r of runs) {
    if (!isLive(r)) {
      (pos <= at && b.length === 0 ? a : b).push(r);
      continue;
    }
    const n = length(r);
    if (pos + n <= at) {
      a.push(r);
    } else if (pos >= at) {
      b.push(r);
    } else {
      a.push({...r, end: r.start + at - pos});
      b.push({...r, start: r.start + at - pos});
    }
    pos += n;
  }
  return [a, b];
}

const liveText = (runs: readonly Run[]): string => {
  let text = '';
  for (const r of runs) {
    if (isLive(r)) {
      text += textOf(r);
    }
  }
  return text;
};

/** The identity of run `r` as a Segment. */
const segmentOf = (r: Run): Segment =>
  r.kind === OLD
    ? {end: r.end, key: r.src, start: r.start, text: textOf(r)}
    : {end: length(r), key: null, start: 0, text: textOf(r)};

/** Append, joining with the last segment where they continue each other. */
function push(out: Segment[], s: Segment): void {
  if (s.end <= s.start) {
    return;
  }
  const last = out[out.length - 1];
  if (last !== undefined && last.key === s.key) {
    if (s.key === null) {
      const text = last.text + s.text;
      out[out.length - 1] = {end: text.length, key: null, start: 0, text};
      return;
    }
    if (last.end === s.start) {
      out[out.length - 1] = {
        end: s.end,
        key: s.key,
        start: last.start,
        text: last.text + s.text,
      };
      return;
    }
  }
  out.push(s);
}

/** Unlink `e` from `list`. */
function unlink(list: List, e: Entry): void {
  if (e.out === true) {
    return;
  }
  e.out = true;
  if (e.prev === null) {
    list.head = e.next;
  } else {
    e.prev.next = e.next;
  }
  if (e.next === null) {
    list.tail = e.prev;
  } else {
    e.next.prev = e.prev;
  }
}

/** Link `e` into `list` before `at` (at the end when null). */
function linkBefore(list: List, e: Entry, at: Entry | null): void {
  e.next = at;
  e.prev = at === null ? list.tail : at.prev;
  if (e.prev === null) {
    list.head = e;
  } else {
    e.prev.next = e;
  }
  if (at === null) {
    list.tail = e;
  } else {
    at.prev = e;
  }
}

/**
 * The text of runs `left` (in order) but those `skip` marks, and where each
 * of its runs starts there and in the text of all of them, with its length.
 */
function textLeft(
  left: readonly Left[],
  skip: Uint8Array,
): [string, [number, number, number][]] {
  let w = '';
  const at: [number, number, number][] = [];
  for (let k = 0, pos = 0; k < left.length; k++) {
    const n = length(left[k].run);
    if (skip[k] === 0) {
      at.push([w.length, pos, n]);
      w += textOf(left[k].run);
    }
    pos += n;
  }
  return [w, at];
}

/**
 * Blocks `blocks` of a text of runs (see textLeft: `at` are its runs) as
 * blocks of the text of all runs, cut where a run ends.
 */
function inAll(
  blocks: readonly Block[],
  at: readonly (readonly [number, number, number])[],
): Block[] {
  const out: Block[] = [];
  let r = 0;
  for (const b of blocks) {
    while (r < at.length && at[r][0] + at[r][2] <= b.o) {
      r++;
    }
    for (let k = r; k < at.length && at[k][0] < b.o + b.n; k++) {
      const [o0, p0, n] = at[k];
      const lo = Math.max(b.o, o0);
      const hi = Math.min(b.o + b.n, o0 + n);
      out.push({a: b.a + lo - b.o, n: hi - lo, o: p0 + lo - o0});
    }
  }
  return out;
}

/**
 * The identities of the characters of a commit's lines (see the header),
 * replayed from its record over the previous state, inside a read of the new
 * state; each line resolved on first use.
 */
export class TextReplay {
  /** Each text node the record names: its runs, null where not known. */
  private readonly texts = new Map<NodeKey, Run[] | null>();
  /**
   * Each element whose children the record changed: its children, with what
   * a node removed from there held where it was; null where not known.
   */
  private readonly lists = new Map<NodeKey, List | null>();
  /** Where what each removed node held was left (see dropGone). */
  private readonly goneAt = new Map<NodeKey, [List, Entry][]>();
  /** The parent of each node the record inserted or removed (null: none). */
  private readonly parents = new Map<NodeKey, NodeKey | null>();
  /** Nodes the selection removed with what they held: a delete. */
  private readonly deleted = new Set<NodeKey>();
  /** Each line's (or inline container's) identities (see resolve). */
  private readonly resolved = new Map<
    NodeKey,
    Map<NodeKey, Segment[]> | null
  >();
  /** Old characters in a node of the new state, sorted (see notLive). */
  private live: Map<string, [number, number][]> | null = null;
  /** The old text and layout of each line read so far (see oldText). */
  private oldTexts = new Map<NodeKey, LineText>();
  private oldLayouts = new Map<NodeKey, Map<string, number>>();
  /** An entry this binding does not know: nothing is known. */
  private broken = false;
  private ids = 0;
  /** The index of the entry being replayed. */
  private at = 0;
  /** Moves replayed as the text sets they stand for (see the move entry). */
  private readonly unsafe = new Set<number>();
  /** The moves found unsafe in this replay (see the move entry). */
  private restart: number[] | null = null;

  constructor(
    log: TextEditLog | null,
    private readonly prevMap: NodeMap,
    /** The caret of the new state, where it is in a text node. */
    private readonly caret: {key: NodeKey; offset: number} | null,
    private readonly composing: boolean,
  ) {
    if (log !== null) {
      // Where a text set reaches text whose history a move split or joined,
      // or a removed node still holds such text at the end (its text is
      // aligned with a set's whole or not at all, see stretch), the replay
      // starts over with that move as the text sets it stands for (see the
      // move entry): at most once per move.
      for (;;) {
        for (let i = 0; i < log.length && this.restart === null; i++) {
          this.at = i;
          this.apply(log[i]);
        }
        if (this.restart === null) {
          // (Only where the node it was removed from is in the new state:
          // what a node removed with it held is aligned with that node.)
          const moves = new Set<number>();
          for (const gone of this.goneAt.values()) {
            for (const [list, entry] of gone) {
              const owner = $getNodeByKey(list.key);
              if (
                entry.out !== true &&
                entry.runs !== null &&
                this.lists.get(list.key) === list &&
                owner !== null &&
                owner.isAttached()
              ) {
                this.marks(entry.runs).forEach(m => moves.add(m));
              }
            }
          }
          if (moves.size > 0) {
            this.restart = [...moves];
          }
        }
        const moves = this.restart;
        if (moves === null) {
          break;
        }
        for (const m of moves) {
          this.unsafe.add(m);
        }
        this.restart = null;
        this.texts.clear();
        this.lists.clear();
        this.goneAt.clear();
        this.parents.clear();
        this.deleted.clear();
        this.broken = false;
        this.ids = 0;
      }
    }
  }

  /**
   * The identities of the characters of text node `key` of the new state (or
   * of the one character of a line break or inline node), in order; null
   * where the record does not explain the text of its line.
   */
  idsOf(key: NodeKey): readonly Segment[] | null {
    const node = $getNodeByKey(key);
    let holder = node === null ? null : node.getParent();
    while (holder !== null && $isWrapper(holder)) {
      holder = holder.getParent();
    }
    if (holder === null) {
      return null;
    }
    const at = holder.getKey();
    let map = this.resolved.get(at);
    if (map === undefined) {
      map = this.broken ? null : this.resolve(at);
      this.resolved.set(at, map);
    }
    return map === null ? null : (map.get(key) ?? []);
  }

  private apply(e: TextEditLog[number]): void {
    if (this.restart !== null) {
      return;
    }
    switch (e[0]) {
      case 'splice': {
        const [, key, offset, del, text, before] = e;
        const runs = this.text(key, before);
        if (runs !== null) {
          const [a, rest] = cut(runs, offset);
          const [mid, b] = cut(rest, del);
          // What it deleted is gone; text that left there before stays.
          const out = a.concat(mid.flatMap(deadOf));
          if (text !== '') {
            out.push(this.inserted(text, NEW));
          }
          this.texts.set(key, out.concat(b));
        }
        break;
      }
      case 'split': {
        const [, key, parts, starts, before] = e;
        let runs = this.text(key, before);
        if (!parts.includes(key)) {
          // Segmented: replaced by its parts.
          this.texts.set(key, []);
        }
        parts.forEach((part, i) => {
          if (runs === null || i + 1 === parts.length) {
            this.texts.set(part, runs);
          } else {
            const [a, b] = cut(runs, starts[i + 1] - starts[i]);
            this.texts.set(part, a);
            runs = b;
          }
        });
        break;
      }
      case 'merge': {
        const [, key, target, isBefore, text, targetText] = e;
        const a = this.text(key, text);
        const b = this.text(target, targetText);
        // What left from between the two is between their texts now.
        const between = isBefore
          ? this.takeBetween(target, key)
          : this.takeBetween(key, target);
        this.texts.set(
          key,
          a === null || b === null
            ? null
            : isBefore
              ? b.concat(between, a)
              : a.concat(between, b),
        );
        this.texts.set(target, []);
        break;
      }
      case 'set': {
        // Offsets not known: all of its text left, and the new text arrived
        // in its place (see stretch).
        const [, key, before, after] = e;
        let runs = this.text(key, before);
        if (runs !== null) {
          const moves = this.marks(runs);
          if (moves.length > 0) {
            this.restart = moves;
            break;
          }
          if (runs.some(r => r.dead === true)) {
            runs = this.compose(runs);
          }
          const out = runs.map(goneOf);
          if (after !== '') {
            // In place of old characters (or of text a set put in their
            // place), it may be (some of) them, or old characters that left
            // next to it; in place of new text only (a node made and set),
            // it is new, as made.
            const run = this.inserted(after, LOOSE);
            out.push(
              runs.some(r => isLive(r) && (r.kind === OLD || r.set === true))
                ? {...run, set: true}
                : run,
            );
          }
          this.texts.set(key, out);
        }
        break;
      }
      case 'delete':
        // What it holds is deleted where it is (see collect), as a splice
        // deletes.
        this.deleted.add(e[1]);
        break;
      case 'move': {
        // The first characters of a node moved to the end of its previous
        // sibling (an entity grown over the text after it): where both texts
        // are the ones replayed, the moved runs keep their identities there.
        // Text that left a node earlier in the commit, and what arrived in
        // its place (a set, typed text deleted again), are aligned with each
        // other when that node is set whole again (see compose and stretch),
        // and a removed node's text is aligned with a set's whole or not at
        // all (see stretch). Where the move splits such a history between
        // the two nodes, or joins two, those runs are marked with it,
        // wherever they go; where a text set later in the commit reaches
        // one, or a removed node still holds one at the end, the replay
        // starts over with the move as the two text sets it stands for.
        const [, from, to, count, fromText, toText] = e;
        const a = this.text(to, toText);
        const b = this.text(from, fromText);
        if (a !== null && b !== null && !this.unsafe.has(this.at)) {
          const [head, rest] = cut(b, count);
          const ofHistory = (r: Run) => !isLive(r) || r.set === true;
          const at = this.at;
          const mark =
            head.some(ofHistory) && (rest.some(ofHistory) || a.some(ofHistory))
              ? (runs: Run[]) =>
                  runs.map(r => (ofHistory(r) ? {...r, moved: at} : r))
              : (runs: Run[]) => runs;
          this.texts.set(to, mark(a).concat(mark(head)));
          this.texts.set(from, mark(rest));
          break;
        }
        this.apply(['set', to, toText, toText + fromText.slice(0, count)]);
        if (count < fromText.length) {
          // (Where it moved all of them, the node's removal follows.)
          this.apply(['set', from, fromText, fromText.slice(count)]);
        }
        break;
      }
      case 'retype': {
        const [, prev, next, text] = e;
        this.retype(prev, next, text);
        break;
      }
      case 'attach': {
        const [, key, parent, prev, next, text] = e;
        if (text !== null) {
          this.text(key, text);
        } else if (this.kindNow(key) === 'block') {
          // A block's place in its container is no character of a line.
          break;
        }
        this.parents.set(key, parent);
        const list = this.list(parent);
        if (list !== null) {
          this.attach(list, key, prev, next);
        }
        break;
      }
      case 'detach': {
        const [, key, parent] = e;
        this.parents.set(key, null);
        if (!this.texts.has(key) && this.kindNow(key) === 'block') {
          break;
        }
        const list = this.list(parent);
        if (list === null) {
          break;
        }
        const entry = list.live.get(key);
        if (entry === undefined) {
          this.lists.set(parent, null);
          break;
        }
        const runs: Run[] = [];
        this.collect(key, runs);
        entry.held = runs;
        entry.runs = runs.map(goneOf);
        list.live.delete(key);
        const gone = this.goneAt.get(key);
        if (gone === undefined) {
          this.goneAt.set(key, [[list, entry]]);
        } else {
          gone.push([list, entry]);
        }
        break;
      }
      default:
        this.broken = true;
    }
  }

  /**
   * Put node `key` between its siblings `prev` and `next` in `list`: where
   * it was, if it was removed from there (a node cut and put back, as a
   * split does), else right after `prev` (or before `next`).
   */
  private attach(
    list: List,
    key: NodeKey,
    prev: NodeKey | null,
    next: NodeKey | null,
  ): void {
    const lo = prev === null ? null : (list.live.get(prev) ?? null);
    const hi = next === null ? null : (list.live.get(next) ?? null);
    if ((prev !== null && lo === null) || (next !== null && hi === null)) {
      this.lists.set(list.key, null);
      return;
    }
    for (
      let e = lo === null ? list.head : lo.next;
      e !== null && e !== hi;
      e = e.next
    ) {
      if (e.key === key && e.runs !== null) {
        e.runs = null;
        list.live.set(key, e);
        this.dropGone(key);
        return;
      }
    }
    this.dropGone(key);
    const entry: Entry = {key, next: null, prev: null, runs: null};
    linkBefore(list, entry, lo !== null ? lo.next : hi);
    list.live.set(key, entry);
    this.adopt(list, entry);
  }

  /**
   * A node put where nodes were removed (a node swapped for another, as a
   * transform makes one again): where all the text it holds arrived (made)
   * and is the text the nodes removed right around it held, it holds what
   * they held, from now on, so that what the commit does to it later keeps
   * those characters (the rest is resolved at the end, see stretch).
   */
  private adopt(list: List, entry: Entry): void {
    const nodes: NodeKey[] = [];
    if (!this.madeTexts(entry.key, nodes)) {
      return;
    }
    const sizes = nodes.map(k => liveText(this.texts.get(k)!).length);
    const arrived = nodes.map(k => liveText(this.texts.get(k)!)).join('');
    if (arrived === '') {
      return;
    }
    const before: Entry[] = [];
    for (let e = entry.prev; e !== null && e.runs !== null; e = e.prev) {
      before.unshift(e);
    }
    const after: Entry[] = [];
    for (let e = entry.next; e !== null && e.runs !== null; e = e.next) {
      after.push(e);
    }
    for (const around of [before.concat(after), after, before]) {
      if (around.length === 0 || around.some(e => e.held === undefined)) {
        continue;
      }
      let held: Run[] = around.flatMap(e => e.held!);
      if (held.some(r => r.kind === UNKNOWN) || liveText(held) !== arrived) {
        continue;
      }
      nodes.forEach((k, i) => {
        if (i + 1 === nodes.length) {
          this.texts.set(k, held);
        } else {
          const [a, b] = cut(held, sizes[i]);
          this.texts.set(k, a);
          held = b;
        }
      });
      for (const e of around) {
        unlink(list, e);
        e.runs = [];
      }
      return;
    }
  }

  /**
   * The text nodes node `key` holds (itself, or below it), into `out`, when
   * all of their text arrived (made, set); false otherwise.
   */
  private madeTexts(key: NodeKey, out: NodeKey[]): boolean {
    const runs = this.texts.get(key);
    if (runs !== undefined) {
      if (runs === null || runs.some(r => isLive(r) && r.kind !== LOOSE)) {
        return false;
      }
      out.push(key);
      return true;
    }
    const list = this.lists.get(key);
    if (list === undefined || list === null || this.kindNow(key) === 'text') {
      return false;
    }
    for (let e = list.head; e !== null; e = e.next) {
      if (e.runs !== null || !this.madeTexts(e.key, out)) {
        return false;
      }
    }
    return true;
  }

  /** Text inserted in this commit, of kind `kind` (NEW or LOOSE). */
  private inserted(text: string, kind: number): Run {
    return {
      base: text,
      end: text.length,
      kind,
      src: '\u0000' + this.ids++,
      start: 0,
    };
  }

  /**
   * The runs of a text node about to be set whole again, where text that
   * arrived there (a set, a node made) was deleted since by an edit the
   * record places: the text that arrived is aligned with the text that left
   * the node before it, as a stretch is (see stretch), the old characters
   * the deleted text is aligned with are deleted, and the deleted text is
   * dropped. Why: once the set replaces it, where it was is not known, and
   * which old characters it stood for could not be told any more (a caret
   * delete in a set's text, then a set: the delete came back).
   */
  private compose(runs: readonly Run[]): Run[] {
    let d = '';
    let s = '';
    for (const r of runs) {
      if (r.gone === true ? r.kind !== LOOSE : r.kind === LOOSE) {
        if (r.gone === true) {
          d += textOf(r);
        } else {
          s += textOf(r);
        }
      }
    }
    const diff = diffStrings(d, s, -1);
    const {prefix, suffix} = snapToWords(
      d,
      s,
      diff.prefix,
      diff.suffix,
      this.composing,
    );
    // The characters of `d` aligned with deleted text, in order.
    const cuts: [number, number][] = [];
    for (let i = 0, pos = 0; i < runs.length; i++) {
      const r = runs[i];
      if (r.gone === true || r.kind !== LOOSE) {
        continue;
      }
      const n = length(r);
      if (r.dead === true) {
        const e = Math.min(pos + n, prefix);
        if (e > pos) {
          cuts.push([pos, e]);
        }
        const b = Math.max(pos, s.length - suffix);
        if (pos + n > b) {
          cuts.push([b - s.length + d.length, pos + n - s.length + d.length]);
        }
      }
      pos += n;
    }
    const out: Run[] = [];
    let c = 0;
    for (let i = 0, pos = 0; i < runs.length; i++) {
      const r = runs[i];
      if (r.dead === true) {
        continue;
      }
      if (r.gone !== true || r.kind === LOOSE) {
        out.push(r);
        continue;
      }
      const n = length(r);
      let at = pos;
      while (c < cuts.length && cuts[c][1] <= at) {
        c++;
      }
      for (let k = c; k < cuts.length && cuts[k][0] < pos + n; k++) {
        if (cuts[k][0] > at) {
          out.push({
            ...r,
            end: r.start + cuts[k][0] - pos,
            start: r.start + at - pos,
          });
        }
        at = Math.max(at, cuts[k][1]);
      }
      if (at < pos + n) {
        out.push({...r, start: r.start + at - pos});
      }
      pos += n;
    }
    return out;
  }

  /** A node's layout, from the previous state, else from the new one. */
  private kindNow(key: NodeKey): Kind | null {
    return kindOf(this.prevMap.get(key) ?? $getNodeByKey(key));
  }

  /** An old text node's runs: its whole old text. Null if not a text node. */
  private oldRuns(key: NodeKey): Run[] | null {
    const node = this.prevMap.get(key);
    if (!$isTextNode(node)) {
      return null;
    }
    const base = node.__text;
    return base === ''
      ? []
      : [{base, end: base.length, kind: OLD, src: key, start: 0}];
  }

  /**
   * The runs of text node `key` where the record says its text is `text`:
   * as replayed so far, else its old text, else (a node made in this
   * commit) that text arrived; null when not known, or not that text.
   */
  private text(key: NodeKey, text: string): Run[] | null {
    let runs = this.texts.get(key);
    if (runs === undefined) {
      if (this.prevMap.has(key)) {
        const old = this.oldRuns(key);
        runs = old !== null && liveText(old) === text ? old : null;
      } else {
        runs = text === '' ? [] : [this.inserted(text, LOOSE)];
      }
      this.texts.set(key, runs);
    } else if (runs !== null && liveText(runs) !== text) {
      runs = null;
      this.texts.set(key, null);
    }
    return runs;
  }

  /** An element's children, from the previous state on first use. */
  private list(key: NodeKey): List | null {
    let list = this.lists.get(key);
    if (list === undefined) {
      list = {head: null, key, live: new Map(), tail: null};
      const old = this.prevMap.get(key);
      if ($isElementNode(old)) {
        for (let c = old.__first; c !== null; ) {
          const node = this.prevMap.get(c);
          if (node === undefined) {
            list = null;
            break;
          }
          const e: Entry = {key: c, next: null, prev: null, runs: null};
          linkBefore(list, e, null);
          list.live.set(c, e);
          c = node.__next;
        }
      }
      this.lists.set(key, list);
    }
    return list;
  }

  /**
   * The moves not yet replayed as text sets that split or joined history
   * runs `runs` hold (see the move entry).
   */
  private marks(runs: readonly Run[]): number[] {
    const moves: number[] = [];
    for (const r of runs) {
      if (r.moved !== undefined && !this.unsafe.has(r.moved)) {
        moves.push(r.moved);
      }
    }
    return moves;
  }

  /**
   * Node `next` replaced node `prev`, remade with its text `text` (a retype,
   * see the record): where all of next's text arrived (made) and is what
   * prev held when it was removed, next holds what prev held, from now on,
   * and nothing of it is gone where prev was. Otherwise nothing changes (the
   * rest is resolved at the end, see stretch).
   */
  private retype(prev: NodeKey, next: NodeKey, text: string): void {
    const runs = this.texts.get(next);
    const gone = this.goneAt.get(prev);
    if (
      runs === undefined ||
      runs === null ||
      gone === undefined ||
      liveText(runs) !== text ||
      runs.some(r => isLive(r) && r.kind !== LOOSE)
    ) {
      return;
    }
    const [list, entry] = gone[gone.length - 1];
    const held = entry.held;
    if (
      held === undefined ||
      entry.runs === null ||
      entry.out === true ||
      liveText(held) !== text ||
      held.some(r => r.kind === UNKNOWN)
    ) {
      return;
    }
    this.texts.set(next, held);
    unlink(list, entry);
    entry.runs = [];
  }

  /**
   * A node put back somewhere: what it held is no longer gone where it was
   * removed (it holds it where it is).
   */
  private dropGone(key: NodeKey): void {
    const gone = this.goneAt.get(key);
    if (gone !== undefined) {
      for (const [list, entry] of gone) {
        if (entry.runs !== null) {
          unlink(list, entry);
          entry.runs = [];
        }
      }
      this.goneAt.delete(key);
    }
  }

  /**
   * The runs gone from between siblings `a` and `b` (`a` first) in their
   * parent's children, taken out of there (see the merge entry).
   */
  private takeBetween(a: NodeKey, b: NodeKey): Run[] {
    const p = this.parents.get(a);
    const old = this.prevMap.get(a);
    const parent =
      p !== undefined ? p : old === undefined ? null : old.__parent;
    const list = parent === null ? undefined : this.lists.get(parent);
    const lo = list ? list.live.get(a) : undefined;
    const hi = list ? list.live.get(b) : undefined;
    if (!list || lo === undefined || hi === undefined) {
      return [];
    }
    const out: Run[] = [];
    const taken: Entry[] = [];
    for (let e = lo.next; e !== hi; e = e.next) {
      if (e === null || e.runs === null) {
        return [];
      }
      taken.push(e);
    }
    for (const e of taken) {
      for (const r of e.runs!) {
        out.push(r);
      }
      unlink(list, e);
      e.runs = [];
    }
    return out;
  }

  /** The one character of a line break or inline node `key`, as it is. */
  private atom(key: NodeKey, kind: Kind | null): Run {
    const old = kindOf(this.prevMap.get(key));
    if (old !== null && old === kind) {
      return {
        base: kind === 'break' ? '\n' : OBJ,
        end: 1,
        kind: OLD,
        src: key,
        start: 0,
      };
    }
    // Made in this commit: a line break may be a line feed made again (see
    // stretch), any other node is new.
    return kind === 'break'
      ? this.inserted('\n', LOOSE)
      : this.inserted(OBJ, NEW);
  }

  /**
   * The runs node `key` holds now (wrappers flattened), during the replay:
   * of a node the selection deleted, deleted (see deadOf).
   */
  private collect(key: NodeKey, out: Run[]): void {
    if (this.deleted.has(key)) {
      const all: Run[] = [];
      this.deleted.delete(key);
      this.collect(key, all);
      this.deleted.add(key);
      for (const r of all) {
        for (const d of deadOf(r)) {
          out.push(d);
        }
      }
      return;
    }
    const kind = this.kindNow(key);
    if (this.texts.has(key) || kind === 'text') {
      const runs = this.texts.has(key)
        ? this.texts.get(key)!
        : this.oldRuns(key);
      if (runs === null) {
        out.push(UNKNOWN_RUN);
      } else {
        for (const r of runs) {
          out.push(r);
        }
      }
    } else if (
      this.prevMap.has(key) &&
      (kind === 'break' || kind === 'atom' || kind === 'block')
    ) {
      out.push(this.atom(key, kind));
    } else {
      // A wrapper, or a node made in this commit: what it holds, as far as
      // the record says (nothing, for a line break or inline node made and
      // removed again).
      const list = kind === 'wrapper' ? this.list(key) : this.lists.get(key);
      if (list === undefined && !this.prevMap.has(key)) {
        return;
      }
      if (list === null || list === undefined) {
        out.push(UNKNOWN_RUN);
        return;
      }
      for (let e = list.head; e !== null; e = e.next) {
        if (e.runs !== null) {
          for (const r of e.runs) {
            out.push(r);
          }
        } else {
          this.collect(e.key, out);
        }
      }
    }
  }

  /**
   * The runs of line (or inline container) `key` in the new state, those
   * that left where they left, into `out`; false where the record does not
   * explain them (its children are not the ones it replays, or a text
   * node's text is not the one it gives).
   */
  private flatten(key: NodeKey, out: Item[]): boolean {
    const node = $getNodeByKey(key);
    if (!$isElementNode(node)) {
      return false;
    }
    const children = node.getChildren();
    const list = this.lists.get(key);
    if (list === null) {
      return false;
    }
    let entries: (Entry | NodeKey)[];
    if (list === undefined) {
      entries = children.map(c => c.getKey());
    } else {
      entries = [];
      let k = 0;
      for (let e = list.head; e !== null; e = e.next) {
        if (e.runs === null) {
          if (k >= children.length || children[k].getKey() !== e.key) {
            return false;
          }
          k++;
          entries.push(e.key);
        } else {
          entries.push(e);
        }
      }
      if (k !== children.length) {
        return false;
      }
    }
    for (const x of entries) {
      if (typeof x !== 'string') {
        for (const run of x.runs!) {
          out.push({at: 0, from: x, node: null, owner: null, run});
        }
        continue;
      }
      const child = $getNodeByKey(x)!;
      const kind = kindOf(child);
      if (kind === 'text') {
        const text = child.getTextContent();
        let runs = this.texts.get(x);
        if (runs === undefined) {
          runs = this.prevMap.has(x)
            ? this.oldRuns(x)
            : text === ''
              ? []
              : [this.inserted(text, LOOSE)];
        }
        if (runs === null || liveText(runs) !== text) {
          return false;
        }
        let at = 0;
        for (const run of runs) {
          if (!isLive(run)) {
            out.push({at: 0, node: null, owner: x, run});
          } else {
            out.push({at, node: x, owner: x, run});
            at += length(run);
          }
        }
      } else if (kind === 'wrapper') {
        if (!this.flatten(x, out)) {
          return false;
        }
      } else {
        out.push({at: 0, node: x, owner: null, run: this.atom(x, kind)});
      }
    }
    return true;
  }

  /**
   * Where each old text node, line break and inline node of line `key`
   * started in its old content (wrappers flattened), by key.
   */
  private oldLayout(key: NodeKey): Map<string, number> {
    const known = this.oldLayouts.get(key);
    if (known !== undefined) {
      return known;
    }
    const out = new Map<string, number>();
    this.oldLayouts.set(key, out);
    let pos = 0;
    const walk = (k: NodeKey) => {
      const el = this.prevMap.get(k);
      if (!$isElementNode(el)) {
        return;
      }
      for (let c = el.__first; c !== null; ) {
        const node = this.prevMap.get(c);
        if (node === undefined) {
          return;
        }
        const kind = kindOf(node);
        out.set(c, pos);
        if (kind === 'text') {
          pos += (node as LexicalNode & {__text: string}).__text.length;
        } else if (kind === 'wrapper') {
          walk(c);
        } else {
          pos += 1;
        }
        c = node.__next;
      }
    };
    walk(key);
    return out;
  }

  /**
   * The old line an old run that left from another line was in, and where
   * in that line's old text (see oldText); null where not known.
   */
  private oldPlace(r: Run): readonly [NodeKey, number] | null {
    if (r.kind !== OLD) {
      return null;
    }
    const line = this.oldLine(r.src);
    const at = line === null ? undefined : this.oldLayout(line).get(r.src);
    return line === null || at === undefined ? null : [line, at + r.start];
  }

  /** The old line node `key` was in (past wrappers), or null. */
  private oldLine(key: NodeKey): NodeKey | null {
    const node = this.prevMap.get(key);
    let line = node === undefined ? null : node.__parent;
    while (line !== null) {
      const parent = this.prevMap.get(line);
      if (parent === undefined || kindOf(parent) !== 'wrapper') {
        break;
      }
      line = parent.__parent;
    }
    return line;
  }

  /**
   * The old text of line `key`, as oldLayout counts it: a text node's text,
   * a line feed for a line break, and OBJ for any other inline node; with
   * where its graphemes start.
   */
  private oldText(key: NodeKey): LineText {
    const known = this.oldTexts.get(key);
    if (known !== undefined) {
      return known;
    }
    let out = '';
    const walk = (k: NodeKey) => {
      const el = this.prevMap.get(k);
      if (!$isElementNode(el)) {
        return;
      }
      for (let c = el.__first; c !== null; ) {
        const node = this.prevMap.get(c);
        if (node === undefined) {
          return;
        }
        const kind = kindOf(node);
        if (kind === 'text') {
          out += (node as LexicalNode & {__text: string}).__text;
        } else if (kind === 'wrapper') {
          walk(c);
        } else {
          out += kind === 'break' ? '\n' : OBJ;
        }
        c = node.__next;
      }
    };
    walk(key);
    const text = {starts: graphemeStarts(out), text: out};
    this.oldTexts.set(key, text);
    return text;
  }

  /**
   * The identities of the characters of line `key` (see the header): the
   * old characters in place, in order, are theirs, and each stretch between
   * them is resolved by place (see stretch): what arrived there in the new
   * line, and what left from between them in the old line (text that left
   * and was no old character of the line, where it left).
   */
  private resolve(key: NodeKey): Map<NodeKey, Segment[]> | null {
    const items: Item[] = [];
    if (!this.flatten(key, items)) {
      return null;
    }
    const layout = this.oldLayout(key);
    const oldAt = (r: Run): number => {
      const at = r.kind === OLD ? layout.get(r.src) : undefined;
      return at === undefined ? -1 : at + r.start;
    };
    // The old characters in place: the live old runs of this line, in
    // order in both (each a stretch's end).
    const anchors: number[] = [];
    const ends: number[] = [];
    let last = -1;
    items.forEach((x, k) => {
      const at = x.node === null ? -1 : oldAt(x.run);
      if (at > last) {
        anchors.push(k);
        ends.push(at);
        last = at + length(x.run) - 1;
      }
    });
    const stretches: Stretch[] = [];
    for (let s = 0; s <= anchors.length; s++) {
      stretches.push({left: [], live: []});
    }
    // The line's text in both states, built where a stretch first needs it.
    let view: LineView | null = null;
    const lineView = (): LineView => {
      if (view === null) {
        const at = new Map<Item, number>();
        let text = '';
        for (const x of items) {
          if (x.node !== null && x.run.dead !== true) {
            at.set(x, text.length);
            text += textOf(x.run);
          }
        }
        view = {at, starts: graphemeStarts(text), text};
      }
      return view;
    };
    // The stretch an old position is in.
    const byOld = (at: number): number => {
      let lo = 0;
      let hi = ends.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (ends[mid] <= at) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      return lo;
    };
    let s = 0;
    let lastOld = -1;
    items.forEach((x, k) => {
      if (s < anchors.length && anchors[s] === k) {
        s++;
        lastOld = ends[s - 1];
        return;
      }
      if (x.run.kind === UNKNOWN) {
        stretches[s].unknown = true;
      } else if (x.node !== null || x.run.dead === true) {
        stretches[s].live.push(x);
      } else if (x.run.gone === true && x.run.kind !== LOOSE) {
        // (Text that arrived and left again in this commit is neither
        // state's: what it stood for left too.)
        for (const run of this.notLive(x.run)) {
          const at = oldAt(run);
          const t = at < 0 ? s : byOld(at);
          if (t === s && at >= 0) {
            lastOld = at;
          }
          stretches[t].left.push({
            at: at < 0 ? lastOld : at,
            from: x.from ?? null,
            old: at >= 0 ? [key, at] : this.oldPlace(run),
            run,
          });
        }
      }
    });
    const out = new Map<NodeKey, Segment[]>();
    const add = (node: NodeKey, seg: Segment) => {
      let list = out.get(node);
      if (list === undefined) {
        list = [];
        out.set(node, list);
      }
      push(list, seg);
    };
    s = 0;
    items.forEach((x, k) => {
      if (s < anchors.length && anchors[s] === k) {
        if (!this.stretch(stretches[s], add, lineView)) {
          s = -Infinity;
        }
        add(x.node!, segmentOf(x.run));
        s++;
      }
    });
    if (s < 0 || !this.stretch(stretches[anchors.length], add, lineView)) {
      return null;
    }
    return out;
  }

  /**
   * Resolve a stretch of a line between two pins (old characters the record
   * keeps in place, in order): the text that left it (a removed node's
   * text, the text a set replaced) and the text that arrived there (a text
   * set, a node made), each in line order, are aligned by the diff a write
   * makes without the record (see diffStrings and snapToWords: their common
   * start and end, in whole words, anchored at the caret where it is in the
   * text aligned and in a node that was there before; a node made in this
   * commit has the caret where whatever made it put it). What it aligns
   * keeps its identity; the rest that arrived is new, and the rest that
   * left is deleted. Invariants:
   * 1. Only pins split a line. Text an edit the record places inserted
   *    (typed) is new where it is, and old characters it deleted are gone:
   *    neither is in a stretch's text, nor splits it (the record does not
   *    order a node made and a node removed in one place).
   * 2. Set text an edit the record places deleted later in the commit stays
   *    in the text that arrived, where it is: the old characters aligned
   *    with it are deleted (see compose, where a set replaces it again).
   * 3. A set replaces what the record placed in the node before it: typed
   *    text it replaced left (it stays in the text that left, where it was,
   *    and is new: no old character is aligned with it), and nothing is
   *    pinned there any more.
   * 4. A removed node's text is aligned with a set's text whole or not at
   *    all (a set's text has the node's own old text to keep, and takes a
   *    removed neighbour's where all of it is there: an entity grown over
   *    it). The text of nodes made in the stretch also keeps a removed
   *    node's text that continues the common start or end in part, in whole
   *    words of both whole lines, the new one after the update and the old
   *    one (a word that gained or lost letters is a new word, and so is one
   *    a neighbour's text runs into, or ran into before), besides what it
   *    keeps otherwise; where the platform reads graphemes (see
   *    readsGraphemes). Why: aligned with the end of a removed
   *    neighbour (`. ` of `will verify timing. `), a set's text moved a
   *    peer's concurrent typing to the start of an agent's rewritten line;
   *    aligned whole or not at all, a block's nodes made again from their
   *    JSON with one word changed wrote every character again, so a peer's
   *    concurrent letter in an unchanged word moved out of it.
   * Priority: the diff runs over all that arrived, in line order, and text
   * that goes on a node's text (a set) keeps what it is aligned with; set
   * text still new is then aligned with what is left between what is kept,
   * and the text of nodes made last, keeping only what the diff that takes
   * the common end first keeps too (where it could be either of two equal
   * runs, neither); then the text of nodes made still new, with the text of
   * removed nodes invariant 4 lets it keep. False where a text in it is not
   * known.
   */
  private stretch(
    st: Stretch,
    add: (node: NodeKey, s: Segment) => void,
    lineView: () => LineView,
  ): boolean {
    if (st.unknown === true) {
      return false;
    }
    st.left.sort((x, y) => x.at - y.at);
    // Text that arrived, also where an edit the record places deleted it
    // (what it stood for is deleted).
    const arrived = (x: Item) => x.run.kind === LOOSE;
    const ids: (Segment[] | null)[] = st.live.map(() => null);
    const d = st.left.map(x => textOf(x.run)).join('');
    if (d !== '') {
      const all: Span[] = [];
      const sets: Span[] = [];
      const made: Span[] = [];
      let s = '';
      let cursor = -1;
      for (const x of st.live) {
        if (arrived(x)) {
          const n = length(x.run);
          // (The caret says where an edit was made in text that was there
          // before: in a node made in this commit, whatever made it put it.)
          const caret = this.caret;
          if (
            caret !== null &&
            caret.key === x.node &&
            this.prevMap.has(caret.key) &&
            caret.offset >= x.at &&
            caret.offset <= x.at + n
          ) {
            cursor = s.length + caret.offset - x.at;
          }
          if (n > 0) {
            const span = {a: s.length, n, x};
            all.push(span);
            (x.run.set === true ? sets : made).push(span);
          }
          s += textOf(x.run);
        }
      }
      if (s !== '') {
        // A removed node's text is aligned whole or not at all with all that
        // arrived (see invariant 4): where the common start of the two texts
        // meets one it does not cover whole, the common start stops there;
        // where the common end meets one it does not cover whole, that text
        // is deleted and the common end goes on past it; and text the common
        // start stopped at that the common end does not cover either is
        // deleted. The text left is `w`; each of its runs starts at
        // `at[k][0]` there and `at[k][1]` in `d`.
        const left = st.left;
        const drop = new Uint8Array(left.length);
        const removed = left.some(x => x.from !== null);
        const group = (k: number, back: boolean): [number, string] => {
          let g = k;
          let t = '';
          const from = left[back ? k - 1 : k].from;
          do {
            const r = left[back ? g - 1 : g].run;
            t = back ? textOf(r) + t : t + textOf(r);
            g += back ? -1 : 1;
          } while (
            from !== null &&
            (back ? g > 0 : g < left.length) &&
            left[back ? g - 1 : g].from === from
          );
          return [g, t];
        };
        // The length of the common start of `t` and `s` from `j` on (end,
        // with `back`, before `j`), not past `lim`.
        const same = (t: string, j: number, lim: number, back: boolean) => {
          const n = Math.min(t.length, back ? j - lim : lim - j);
          const CHUNK = 256;
          let m = 0;
          if (back) {
            while (
              m + CHUNK <= n &&
              t.substring(t.length - m - CHUNK, t.length - m) ===
                s.substring(j - m - CHUNK, j - m)
            ) {
              m += CHUNK;
            }
            while (
              m < n &&
              t.charCodeAt(t.length - 1 - m) === s.charCodeAt(j - 1 - m)
            ) {
              m++;
            }
          } else {
            while (
              m + CHUNK <= n &&
              t.substring(m, m + CHUNK) === s.substring(j + m, j + m + CHUNK)
            ) {
              m += CHUNK;
            }
            while (m < n && t.charCodeAt(m) === s.charCodeAt(j + m)) {
              m++;
            }
          }
          return m;
        };
        let pk = removed ? 0 : left.length;
        let pj = 0;
        // A removed node's text the common start meets and does not cover
        // whole stops it there: the common end may still cover it, and it
        // is deleted only where that does not either. Why: text that
        // arrived before it (a line break made in front of a split tail that
        // the transform made again in nodes of other types) left the tail's
        // text, equal to what arrived after the break, all deleted and
        // written again.
        let blocked = -1;
        // The group the common end did not take as text there twice.
        let twice = -1;
        while (pk < left.length && pj < s.length) {
          const [g, t] = group(pk, false);
          if (left[pk].from === null) {
            const m = same(t, pj, s.length, false);
            pj += m;
            if (m < t.length) {
              break;
            }
          } else if (s.startsWith(t, pj)) {
            pj += t.length;
          } else {
            blocked = g;
            break;
          }
          pk = g;
        }
        let back = left.length;
        for (let j = s.length; back > pk && j > pj; ) {
          const [g, t] = group(back, true);
          if (left[back - 1].from === null) {
            const m = same(t, j, pj, true);
            j -= m;
            if (m < t.length) {
              break;
            }
          } else if (j - t.length >= pj && s.startsWith(t, j - t.length)) {
            // The text the common start stopped at is taken only where it
            // is there once: equal text twice could be either.
            if (g !== pk || blocked < 0 || s.indexOf(t, pj) === j - t.length) {
              j -= t.length;
            } else {
              drop.fill(1, g, back);
              twice = g;
            }
          } else {
            drop.fill(1, g, back);
          }
          back = g;
        }
        if (blocked >= 0 && back >= blocked) {
          drop.fill(1, pk, blocked);
        }
        const [w, at] = textLeft(left, drop);
        // The priority (see above).
        const aligned = this.align(
          made,
          w,
          s,
          this.align(
            sets,
            w,
            s,
            this.align(all, w, s, [], cursor, x => x.x.run.set === true),
            cursor,
          ),
          cursor,
          undefined,
          {at, text: d},
        );
        let kept = inAll(aligned, at);
        if (made.length > 0 && removed && readsGraphemes()) {
          // The text of nodes made here also keeps a removed node's text
          // the walks above dropped, where it continues the common start or
          // end in part (see invariant 4): the same walks again, taking a
          // removed node's text in part, as set text, and passing over one
          // that shares nothing there (it is deleted). The text the common
          // end did not take as there twice is taken only where the whole
          // words it is in are there once (a piece of a word a highlighter
          // split off, made again after pasted text that holds it too, but
          // not a word an app made a copy of).
          const once = (from: number, to: number) => {
            const [x, y] = wordsAround(s, from, to);
            const t = s.slice(x, y);
            return s.indexOf(t) === x && s.lastIndexOf(t) === x;
          };
          const more = drop.slice();
          // The groups the common start passed over are the common end's
          // to take still.
          let lo = 0;
          let j = 0;
          for (let k = 0; k < left.length && j < s.length; ) {
            const [g, t] = group(k, false);
            const m = same(t, j, s.length, false);
            if (m > 0 || left[k].from === null) {
              if (k === twice && !once(j, j + m)) {
                break;
              }
              more.fill(0, k, g);
              lo = g;
              j += m;
              if (m < t.length) {
                break;
              }
            }
            k = g;
          }
          for (let e = left.length, i = s.length; e > lo && i > j; ) {
            const [g, t] = group(e, true);
            const m = same(t, i, j, true);
            if (m > 0 || left[e - 1].from === null) {
              if (g === twice && !once(i - m, i)) {
                break;
              }
              more.fill(0, g, e);
              i -= m;
              if (m < t.length) {
                break;
              }
            }
            e = g;
          }
          // Where the group refused as there twice is in `d`.
          let t0 = 0;
          let t1 = 0;
          if (twice >= 0) {
            for (let k = 0; k < twice; k++) {
              t0 += textOf(left[k].run).length;
            }
            t1 = t0;
            for (
              let k = twice;
              k < left.length && left[k].from === left[twice].from;
              k++
            ) {
              t1 += textOf(left[k].run).length;
            }
          }
          // Where each character of `s` is in the new line (-1: deleted
          // again in this commit), and each of `d` in the old one (-1: not
          // known, text that came from elsewhere).
          const view = lineView();
          const inLine = new Int32Array(s.length).fill(-1);
          for (const x of all) {
            const start = view.at.get(x.x);
            if (start !== undefined) {
              for (let k = 0; k < x.n; k++) {
                inLine[x.a + k] = start + k;
              }
            }
          }
          // Where each character of `d` was in its old line's text (the
          // text in `oldIn`; null: not known).
          const oldOf = new Int32Array(d.length).fill(-1);
          const oldIn: (LineText | null)[] = new Array(d.length).fill(null);
          // (And the removed node each character left from: see keepWords.)
          const fromIn: (Entry | null)[] = new Array(d.length).fill(null);
          for (let k = 0, o = 0; k < left.length; k++) {
            const n = length(left[k].run);
            const place = left[k].old;
            const text = place !== null ? this.oldText(place[0]) : null;
            for (let t = 0; t < n; t++) {
              fromIn[o + t] = left[k].from;
              if (place !== null) {
                oldOf[o + t] = place[1] + t;
                oldIn[o + t] = text;
              }
            }
            o += n;
          }
          kept = this.keepWords(
            s,
            made,
            textLeft(left, more),
            d,
            kept,
            view,
            inLine,
            [oldIn, oldOf, fromIn],
            [t0, t1],
          );
        }
        if (__DEV__) {
          let a = 0;
          let o = 0;
          for (const k of kept) {
            invariant(
              k.n > 0 &&
                k.a >= a &&
                k.o >= o &&
                d.slice(k.o, k.o + k.n) === s.slice(k.a, k.a + k.n),
              '@lexical/y: a stretch keeps an old character out of order or for another character',
            );
            a = k.a + k.n;
            o = k.o + k.n;
          }
        }
        this.place(
          st,
          arrived,
          st.left.map(x => x.run),
          kept,
          ids,
        );
      }
    }

    st.live.forEach((x, k) => {
      if (x.node === null) {
        return;
      }
      const segs = ids[k];
      if (segs !== null) {
        for (const seg of segs) {
          add(x.node, seg);
        }
      } else {
        // Typed (new where it is), or arrived and not placed (new).
        add(x.node, segmentOf(arrived(x) ? {...x.run, kind: NEW} : x.run));
      }
    });
    return true;
  }

  /**
   * Blocks `kept` (in order, of the text that left `d`, see Block), with
   * the text of nodes made in stretch `st` (spans `made` of what arrived,
   * `s`) that they leave new aligned with the text left `w` (its runs at
   * `at` in `d`, see textLeft) by the common start and end of the two in
   * whole words, as both the diff that takes the common start first and
   * the one that takes the common end first keep them (see diffWords). What
   * a block keeps already, and what is not in order with it, is left out;
   * so is a run it would add to that does not hold whole words of both
   * lines: in the new line (`line`, the stretch's text there, where
   * character `i` of `s` is character `inLine[i]`) and in all the text that
   * left (`d`, with what `w` leaves out), a run's end inside a word goes on
   * there only with the characters it keeps, or into the same pin. Why:
   * `w` leaves out text deleted whole, so a word cut from its neighbour
   * there (`one` of `onex`) reads as whole in it.
   */
  private keepWords(
    s: string,
    made: readonly Span[],
    [w, at]: [string, [number, number, number][]],
    d: string,
    kept: readonly Block[],
    view: LineView,
    inLine: Int32Array,
    [oldIn, oldOf, fromIn]: [
      readonly (LineText | null)[],
      Int32Array,
      readonly (Entry | null)[],
    ],
    [t0, t1]: [number, number] = [0, 0],
  ): Block[] {
    const shift = w.length - s.length;
    const ranges: [number, number, number][] = [];
    const startFirst = diffWords(w, s);
    const endFirst = diffWords(w, s, true);
    for (const [x0, x1, dx] of [
      [0, startFirst.prefix, 0],
      [s.length - startFirst.suffix, s.length, shift],
    ]) {
      for (const [y0, y1, dy] of [
        [0, endFirst.prefix, 0],
        [s.length - endFirst.suffix, s.length, shift],
      ]) {
        if (dx === dy && Math.min(x1, y1) > Math.max(x0, y0)) {
          ranges.push([Math.max(x0, y0), Math.min(x1, y1), dx]);
        }
      }
    }
    if (ranges.length === 0) {
      return kept as Block[];
    }
    // Character `k` of `w` is character `inD[k]` of `d`.
    const inD = new Int32Array(w.length);
    for (const [w0, d0, n] of at) {
      for (let k = 0; k < n; k++) {
        inD[w0 + k] = d0 + k;
      }
    }
    // Character `i` of `s` keeps character `of[i]` of `d` (-1: none), and
    // `taken[o]` says whether a block keeps character `o` already.
    const of = new Int32Array(s.length).fill(-1);
    const taken = new Uint8Array(d.length);
    for (const k of kept) {
      for (let t = 0; t < k.n; t++) {
        of[k.a + t] = k.o + t;
        taken[k.o + t] = 1;
      }
    }
    const isMade = new Uint8Array(s.length);
    for (const x of made) {
      isMade.fill(1, x.a, x.a + x.n);
    }
    // Added only where in order with what is kept around it.
    const next = new Int32Array(s.length + 1).fill(d.length);
    for (let i = s.length - 1; i >= 0; i--) {
      next[i] = of[i] >= 0 ? of[i] : next[i + 1];
    }
    const want = new Int32Array(s.length).fill(-1);
    for (const [x0, x1, dx] of ranges) {
      for (let i = x0; i < x1; i++) {
        want[i] = inD[i + dx];
      }
    }
    const added = new Uint8Array(s.length);
    let prev = -1;
    for (let i = 0; i < s.length; i++) {
      const o = want[i];
      if (of[i] >= 0) {
        prev = of[i];
      } else if (
        o >= 0 &&
        isMade[i] === 1 &&
        taken[o] === 0 &&
        o > prev &&
        o < next[i + 1]
      ) {
        of[i] = o;
        added[i] = 1;
        prev = o;
      }
    }
    // Added text of the group refused as there twice (`d` from `t0` to
    // `t1`, see stretch) stays only where the whole words it is in are
    // there once.
    for (let i0 = 0; i0 < s.length; ) {
      if (added[i0] === 0 || of[i0] < t0 || of[i0] >= t1) {
        i0++;
        continue;
      }
      let i1 = i0 + 1;
      while (
        i1 < s.length &&
        added[i1] === 1 &&
        of[i1] === of[i1 - 1] + 1 &&
        of[i1] < t1
      ) {
        i1++;
      }
      const [x, y] = wordsAround(s, i0, i1);
      const t = s.slice(x, y);
      if (s.indexOf(t) !== x || s.lastIndexOf(t) !== x) {
        for (let i = i0; i < i1; i++) {
          of[i] = -1;
          added[i] = 0;
        }
      }
      i0 = i1;
    }
    // Whether a run of `s` from `i0` to `i1`, keeping `d` from `o0` to
    // `o1`, holds whole words of both lines at each end (see wordCut): read
    // in all of the new line and all of the old line each end was in, so
    // that a word or a character that goes on past the stretch is seen
    // whole. (An end in text whose old place is not known holds only inside
    // `d`.)
    const whole = (i0: number, i1: number, o0: number, o1: number) => {
      // (Characters deleted again in this commit are not in the line.)
      let first = i0;
      while (first < i1 && inLine[first] < 0) {
        first++;
      }
      let last = i1 - 1;
      while (last >= first && inLine[last] < 0) {
        last--;
      }
      const a = oldIn[o0];
      const b = oldIn[o1 - 1];
      return (
        (first === i1 ||
          (wordCut(view.text, inLine[first], view.starts) &&
            wordCut(view.text, inLine[last] + 1, view.starts))) &&
        (a !== null
          ? wordCut(a.text, oldOf[o0], a.starts)
          : o0 > 0 && wordCut(d, o0)) &&
        (b !== null
          ? wordCut(b.text, oldOf[o1 - 1] + 1, b.starts)
          : o1 < d.length && wordCut(d, o1))
      );
    };
    // Whether every island of a run from `i0` to `i1` that holds an added
    // character holds whole words of both lines too (see whole): an island
    // is a part of the run whose characters' old places follow each other
    // in one old line (text whose old place is not known, typed before it
    // was removed, goes with the island it is in or follows, and bridges
    // old characters that followed each other). Removed text from other
    // places, read as one, must not make a piece of an old word look whole,
    // nor join a different word or character of the new line.
    const islands = (i0: number, i1: number) => {
      let j0 = i0;
      let first = -1;
      let last = -1;
      let fresh = false;
      const holds = (j1: number) => {
        if (!fresh) {
          return true;
        }
        if (first < 0) {
          return whole(j0, j1, of[j0], of[j1 - 1] + 1);
        }
        // (Its edges are its first and last characters with a known old
        // place that are in the line: text typed at an edge is not old
        // text, so it does not make the old text start or end a word.)
        let x = first;
        while (x <= last && (inLine[x] < 0 || oldIn[of[x]] === null)) {
          x++;
        }
        let y = last;
        while (y >= x && (inLine[y] < 0 || oldIn[of[y]] === null)) {
          y--;
        }
        const a = oldIn[of[first]];
        const b = oldIn[of[last]];
        return (
          (x > last ||
            (wordCut(view.text, inLine[x], view.starts) &&
              wordCut(view.text, inLine[y] + 1, view.starts))) &&
          a !== null &&
          b !== null &&
          wordCut(a.text, oldOf[of[first]], a.starts) &&
          wordCut(b.text, oldOf[of[last]] + 1, b.starts)
        );
      };
      // (Text with no known old place bridges two old characters that
      // followed each other only where all three left from one removed
      // node, the text between them there: typed exactly between them.)
      let gap = false;
      let bridged = true;
      for (let i = i0; i < i1; i++) {
        const o = of[i];
        const c = oldIn[o];
        if (c !== null) {
          if (
            last >= 0 &&
            (oldIn[of[last]] !== c ||
              oldOf[o] !== oldOf[of[last]] + 1 ||
              (gap && (!bridged || fromIn[o] !== fromIn[of[last]])))
          ) {
            if (!holds(i)) {
              return false;
            }
            j0 = i;
            first = -1;
            fresh = false;
          }
          if (first < 0) {
            first = i;
          }
          last = i;
          gap = false;
          bridged = true;
        } else if (last >= 0) {
          gap = true;
          bridged =
            bridged && fromIn[o] !== null && fromIn[o] === fromIn[of[last]];
        }
        fresh = fresh || added[i] === 1;
      }
      return holds(i1);
    };
    // Runs that do not hold whole words lose what was added to them, until
    // every run that was added to does.
    for (let again = true; again; ) {
      again = false;
      for (let i0 = 0; i0 < s.length; ) {
        if (of[i0] < 0) {
          i0++;
          continue;
        }
        let i1 = i0 + 1;
        let any = added[i0] === 1;
        while (i1 < s.length && of[i1] === of[i1 - 1] + 1) {
          any = any || added[i1] === 1;
          i1++;
        }
        if (
          any &&
          (!whole(i0, i1, of[i0], of[i1 - 1] + 1) || !islands(i0, i1))
        ) {
          for (let i = i0; i < i1; i++) {
            if (added[i] === 1) {
              of[i] = -1;
              added[i] = 0;
            }
          }
          again = true;
        }
        i0 = i1;
      }
    }
    const out: Block[] = [];
    for (let i = 0; i < s.length; i++) {
      const o = of[i];
      if (o < 0) {
        continue;
      }
      const last = out[out.length - 1];
      if (
        last !== undefined &&
        last.a + last.n === i &&
        last.o + last.n === o
      ) {
        out[out.length - 1] = {a: last.a, n: last.n + 1, o: last.o};
      } else {
        out.push({a: i, n: 1, o});
      }
    }
    return out;
  }

  /**
   * Blocks `blocks` (in order, see Block), with the text of spans `spans`
   * (items of what arrived, `s`, in order) that lies between two of them (or
   * one and an end of the stretch) aligned with the text that left between
   * them (of `d`), as one text, by the diff (see stretch): anchored at the
   * caret (`cursor`, in `s`) where it is in that text. With `sure`, only what
   * the diff that takes the common end first keeps too: where the text could
   * be either of two equal runs, neither. That diff reads `d`, and also the
   * text that left as it was (`sure.text`, of which `d` holds the runs
   * `sure.at` says, see stretch), with the text deleted whole still in
   * place; what either reading keeps as the diff does is kept. Why: read
   * without that text, the characters on its two sides are next to each
   * other, which makes the diff's alignment one of two where the line had
   * one (a line made again as one node with one word changed, where that
   * word was a node of its own, wrote the end of the word before it again,
   * and a peer's concurrent edit of the changed word landed inside that
   * word).
   */
  private align(
    spans: readonly Span[],
    d: string,
    s: string,
    blocks: readonly Block[],
    cursor: number,
    keeps: (x: Span) => boolean = () => true,
    sure: {
      readonly at: readonly (readonly [number, number, number])[];
      readonly text: string;
    } | null = null,
  ): Block[] {
    // The run of `d` (see `sure`) that character `at` of it is in.
    const runOf = (at: number): readonly [number, number, number] => {
      const runs = sure!.at;
      let lo = 0;
      let hi = runs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (runs[mid][0] <= at) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      return runs[lo];
    };
    // Where character `at` of `d` was in the text that left.
    const old = (at: number): number => {
      const run = runOf(at);
      return run[1] + at - run[0];
    };
    const out: Block[] = [];
    let k = 0;
    for (let i = 0; i <= blocks.length; i++) {
      const prev = i > 0 ? blocks[i - 1] : null;
      const next = i < blocks.length ? blocks[i] : null;
      if (prev !== null) {
        out.push(prev);
      }
      const a0 = prev === null ? 0 : prev.a + prev.n;
      const o0 = prev === null ? 0 : prev.o + prev.n;
      const a1 = next === null ? s.length : next.a;
      const o1 = next === null ? d.length : next.o;
      if (a1 <= a0 || o1 <= o0) {
        continue;
      }
      const parts: number[] = [];
      let text = '';
      let caret = -1;
      while (k < spans.length && spans[k].a + spans[k].n <= a0) {
        k++;
      }
      for (let j = k; j < spans.length && spans[j].a < a1; j++) {
        const p0 = Math.max(spans[j].a, a0);
        const p1 = Math.min(spans[j].a + spans[j].n, a1);
        if (cursor >= p0 && cursor <= p1) {
          caret = text.length + cursor - p0;
        }
        parts.push(p0, p1, j);
        text += s.slice(p0, p1);
      }
      if (text === '') {
        continue;
      }
      const w = d.slice(o0, o1);
      const diff = diffStrings(w, text, caret);
      const {prefix, suffix} = snapToWords(
        w,
        text,
        diff.prefix,
        diff.suffix,
        this.composing,
      );
      // What it keeps, as ranges of `text` and how far on in `w` each is.
      const tl = text.length;
      const shift = w.length - tl;
      let keep: [number, number, number][] = [
        [0, prefix, 0],
        [tl - suffix, tl, shift],
      ];
      if (sure !== null) {
        // Only what the diff that takes the common end first keeps too (see
        // `sure`): in `w`, and where text that left was deleted whole in
        // this part, also in the text that left as it was, from right after
        // the character before it to the character after it; what either
        // reading keeps as the diff does is kept.
        const endFirst = (was: string): [number, number] => {
          const max = Math.min(was.length, tl);
          let q = 0;
          while (
            q < max &&
            was.charCodeAt(was.length - 1 - q) === text.charCodeAt(tl - 1 - q)
          ) {
            q++;
          }
          let p = 0;
          while (p < max - q && was.charCodeAt(p) === text.charCodeAt(p)) {
            p++;
          }
          const snapped = snapToWords(was, text, p, q, this.composing);
          return [snapped.prefix, snapped.suffix];
        };
        const both: [number, number, number][] = [];
        // Character `i` of `text` is character `i + dy` of `w`.
        const [p, q] = endFirst(w);
        const other: [number, number, number][] = [
          [0, p, 0],
          [tl - q, tl, shift],
        ];
        for (const [x0, x1, dx] of keep) {
          for (const [y0, y1, dy] of other) {
            if (dx === dy && Math.min(x1, y1) > Math.max(x0, y0)) {
              both.push([Math.max(x0, y0), Math.min(x1, y1), dx]);
            }
          }
        }
        const from = o0 === 0 ? 0 : old(o0 - 1) + 1;
        const to = o1 === d.length ? sure.text.length : old(o1);
        const was = sure.text.slice(from, to);
        if (was !== w) {
          // Character `i` of `text` is character `i + c` of the text that
          // left; in the diff's reading, the run of `w` it is in says.
          const [op, oq] = endFirst(was);
          const olds: [number, number, number][] = [
            [0, op, from],
            [tl - oq, tl, from + was.length - tl],
          ];
          for (const [x0, x1, dx] of keep) {
            for (let x = x0; x < x1; ) {
              const run = runOf(o0 + x + dx);
              const end = Math.min(x1, run[0] + run[2] - o0 - dx);
              const c = o0 + dx + run[1] - run[0];
              for (const [y0, y1, cy] of olds) {
                if (c === cy && Math.min(end, y1) > Math.max(x, y0)) {
                  both.push([Math.max(x, y0), Math.min(end, y1), dx]);
                }
              }
              x = end;
            }
          }
        }
        both.sort((x, y) => x[0] - y[0]);
        keep = [];
        for (const r of both) {
          const last = keep[keep.length - 1];
          if (last !== undefined && last[2] === r[2] && r[0] <= last[1]) {
            last[1] = Math.max(last[1], r[1]);
          } else {
            keep.push(r);
          }
        }
      }
      for (let j = 0, t = 0; j < parts.length; j += 3) {
        const p0 = parts[j];
        const n = parts[j + 1] - p0;
        if (keeps(spans[parts[j + 2]])) {
          for (const [x0, x1, dx] of keep) {
            const lo = Math.max(t, x0);
            const hi = Math.min(t + n, x1);
            if (hi > lo) {
              out.push({a: p0 + lo - t, n: hi - lo, o: o0 + lo + dx});
            }
          }
        }
        t += n;
      }
    }
    return out;
  }

  /**
   * Give the arrived items of stretch `st` (`isArrived`, in order) the
   * identities of runs `left` of the text that left it (in order), as
   * blocks `blocks` say (see Block); the rest that arrived is new, and the
   * rest that left is deleted. Into `ids`, by item.
   */
  private place(
    st: Stretch,
    isArrived: (x: Item) => boolean,
    left: readonly Run[],
    blocks: readonly Block[],
    ids: (Segment[] | null)[],
  ): void {
    // A cursor into `left`, moving forward only.
    let li = 0;
    let lpos = 0;
    const take = (p: number, q: number, out: Segment[]) => {
      while (li < left.length && lpos + length(left[li]) <= p) {
        lpos += length(left[li]);
        li++;
      }
      for (let i = li, pos = lpos; i < left.length && pos < q; i++) {
        const r = left[i];
        const n = length(r);
        const s = Math.max(p, pos);
        const e = Math.min(q, pos + n);
        if (e > s) {
          push(
            out,
            segmentOf({...r, end: r.start + e - pos, start: r.start + s - pos}),
          );
        }
        pos += n;
      }
    };
    let pos = 0;
    let b = 0;
    st.live.forEach((x, k) => {
      if (!isArrived(x)) {
        return;
      }
      const out: Segment[] = [];
      const text = textOf(x.run);
      const end = pos + text.length;
      let at = pos;
      const fresh = (to: number) => {
        if (to > at) {
          const t = text.slice(at - pos, to - pos);
          push(out, {end: t.length, key: null, start: 0, text: t});
        }
      };
      while (b < blocks.length && blocks[b].a + blocks[b].n <= pos) {
        b++;
      }
      for (let i = b; i < blocks.length && blocks[i].a < end; i++) {
        const {a, n, o} = blocks[i];
        const s0 = Math.max(a, pos);
        const s1 = Math.min(a + n, end);
        fresh(s0);
        take(o + s0 - a, o + s1 - a, out);
        at = s1;
      }
      fresh(end);
      ids[k] = out;
      pos = end;
    });
  }

  /**
   * The parts of run `r`, which left its place, that no node of the new
   * state holds: a node removed and put back elsewhere, or split and merged
   * into another, holds them there.
   */
  private notLive(r: Run): Run[] {
    if (this.live === null) {
      const live = new Map<string, [number, number][]>();
      const add = (src: string, a: number, b: number) => {
        const list = live.get(src);
        if (list === undefined) {
          live.set(src, [[a, b]]);
        } else {
          list.push([a, b]);
        }
      };
      for (const [key, runs] of this.texts) {
        const node = $getNodeByKey(key);
        if (node === null || !node.isAttached()) {
          continue;
        }
        if (runs === null) {
          // Not known which of its old characters it holds: all of them.
          add(key, 0, Infinity);
        } else {
          for (const x of runs) {
            if (isLive(x)) {
              add(x.src, x.start, x.end);
            }
          }
        }
      }
      for (const list of live.values()) {
        list.sort((x, y) => x[0] - y[0]);
      }
      this.live = live;
    }
    if (r.kind === OLD && !this.texts.has(r.src)) {
      // An old line break or inline node: live where it is attached.
      const node = $getNodeByKey(r.src);
      if (node !== null && !$isTextNode(node) && node.isAttached()) {
        return [];
      }
    }
    const list = this.live.get(r.src);
    if (list === undefined) {
      return [r];
    }
    // The first interval that may overlap (they do not overlap each other).
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid][1] <= r.start) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const out: Run[] = [];
    let at = r.start;
    for (let i = lo; i < list.length && list[i][0] < r.end; i++) {
      if (list[i][0] > at) {
        out.push({...r, end: list[i][0], start: at});
      }
      at = Math.max(at, list[i][1]);
    }
    if (at < r.end) {
      out.push({...r, start: at});
    }
    return out;
  }
}
