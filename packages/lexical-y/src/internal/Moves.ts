/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Hidden} from './Hidden';

import {
  ContentFormat,
  ContentType,
  createID,
  type Doc,
  Item,
  type Node as YNode,
} from '@y/y';

import {isBlockNodeType, MARKER, RUN_END} from './Schema';

/*
 * Moves.
 *
 * A container's units (lines, nodes, runs) live in one sequence. A move
 * keeps the moved items where they are and inserts a move record (a child
 * `Y.Node` named MOVE) where the units now show. The record names a range of
 * its container's sequence: the items strictly after `s` (null: from the
 * start) up to and including `e`, by item id. Items inserted later inside
 * the range (a peer typing in the moved line, an Enter in it) are in it too.
 *
 * Ownership is computed when reading, never stored: an item belongs to the
 * active record of highest priority whose range holds it (its zone), or to
 * the container itself (the native zone, null). Every walk of a zone skips
 * the content of other zones (formats stay positional: a format item applies
 * to what follows it physically, whatever zone it is in), and a record in a
 * zone shows the units of its range there. A record whose position is inside
 * its own range, directly or through other records, is not active (two peers
 * moving overlapping ranges into each other); the order in which records are
 * tried (priority, then client, then clock) makes this a function of the
 * document, so every client agrees without writing anything.
 *
 * This ports the semantics of Yjs' experimental range move (ContentMove,
 * priority wins, loops broken) to the binding's own records.
 */

export const MOVE = '\u21b7';
/** Record attributes: range start (exclusive), end (inclusive), priority. */
export const MOVE_START_KEY = 's';
export const MOVE_END_KEY = 'e';
export const MOVE_PRIORITY_KEY = 'p';
/**
 * The record a record was written again from (it keeps its rank among
 * records of equal priority): absent on a record written for a move.
 */
export const MOVE_ORIGIN_KEY = 'o';
/**
 * An inline record (`j` = 1, written for a join): its range shows at its
 * position, inside the text around it, instead of before the line its item
 * is in. Joining a line with the line it shows after when the two live in
 * different ranges keeps both lines' items: the joined line is the first
 * line's text, the record (showing the second line's text) and the first
 * line's marker; the second line's marker is deleted. Two peers making the
 * same join write two records of the same range: one shows it, the other
 * shows nothing, so the joined text is never copied or duplicated.
 */
export const MOVE_INLINE_KEY = 'j';

/** A zone: the record item owning a range, or null for the container. */
export type Zone = Item | null;

export function isMoveItem(it: Item): boolean {
  return it.content instanceof ContentType && it.content.type.name === MOVE;
}

/**
 * Whether `it` is an inline record (written for a join), active or not: a
 * client that does not have a record's range yet still keeps it inside its
 * line.
 */
export function isInlineRecordItem(it: Item): boolean {
  return (
    isMoveItem(it) &&
    ((it.content as ContentType).type as YNode).getAttr(MOVE_INLINE_KEY) === 1
  );
}

type IdRef = [number, number];

function readId(value: unknown): IdRef | null {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isInteger(value[0]) &&
    Number.isInteger(value[1]) &&
    (value[0] as number) >= 0 &&
    (value[1] as number) >= 0
  ) {
    return [value[0] as number, value[1] as number];
  }
  return null;
}

/** The id an attribute stores for the last unit of `item`. */
export function idRef(item: Item): IdRef {
  return [item.id.client, item.id.clock + item.length - 1];
}

/** The struct holding `ref`, if it is an item of `parent`. */
function resolve(doc: Doc, ref: IdRef, parent: YNode): Item | null {
  const [client, clock] = ref;
  const store = doc.store;
  if (store.getClock(client) <= clock) {
    return null;
  }
  const s = store.getItem(createID(client, clock));
  if (!(s instanceof Item) || s.parent !== parent || s.parentSub !== null) {
    return null;
  }
  return s;
}

export type Rec = {
  readonly item: Item;
  readonly s: Item | null;
  readonly e: Item;
  readonly p: number;
  sOrd: number;
  eOrd: number;
  /** The anchors' ids (to notice an anchor merged into another item). */
  sRef?: IdRef | null;
  eRef?: IdRef;
  /** The rank among records of equal priority (the original record's id). */
  o?: IdRef;
  /** Shows its range at its position (a join), see MOVE_INLINE_KEY. */
  inline?: boolean;
  /** The anchors' items when the index was built (see liveAnchors). */
  e0?: Item;
  s0?: Item | null;
};

/** Whether `item` holds the id `ref`. */
function holds(item: Item, ref: IdRef): boolean {
  return (
    item.id.client === ref[0] &&
    item.id.clock <= ref[1] &&
    ref[1] < item.id.clock + item.length
  );
}

/**
 * A record whose `s` and `e` are the items holding its anchor ids now: a
 * write that splits an anchor item (typing inside the last word of a range
 * whose end is text) keeps its range (positions, `sOrd` and `eOrd`, stay
 * those of the index).
 */
function liveAnchors(doc: Doc, r: Rec): Rec {
  let e = r.e;
  let s = r.s;
  const eRef = r.eRef!;
  const sRef = r.sRef ?? null;
  const at = (ref: IdRef): Item | null => {
    const found = doc.store.getItem(createID(ref[0], ref[1]));
    return found instanceof Item ? found : null;
  };
  const out: Rec = {
    ...r,
    get e(): Item {
      if (!holds(e, eRef)) {
        e = at(eRef) ?? e;
      }
      return e;
    },
    e0: r.e,
    get s(): Item | null {
      if (s !== null && sRef !== null && !holds(s, sRef)) {
        s = at(sRef) ?? s;
      }
      return s;
    },
    s0: r.s,
  };
  return out;
}

function comparePriority(a: Rec, b: Rec): number {
  if (a.p !== b.p) {
    return b.p - a.p;
  }
  const ao = a.o ?? [a.item.id.client, a.item.id.clock];
  const bo = b.o ?? [b.item.id.client, b.item.id.clock];
  if (ao[0] !== bo[0]) {
    return bo[0] - ao[0];
  }
  if (ao[1] !== bo[1]) {
    return bo[1] - ao[1];
  }
  if (a.item.id.client !== b.item.id.client) {
    return b.item.id.client - a.item.id.client;
  }
  return b.item.id.clock - a.item.id.clock;
}

/** The record attributes of a move record item (null: malformed). */
export function recordAttrs(
  item: Item,
): {s: IdRef | null; e: IdRef; p: number; o: IdRef; inline: boolean} | null {
  const y = (item.content as ContentType).type as YNode;
  const e = readId(y.getAttr(MOVE_END_KEY));
  const rawS = y.getAttr(MOVE_START_KEY);
  const s = rawS === null || rawS === undefined ? null : readId(rawS);
  const p = y.getAttr(MOVE_PRIORITY_KEY);
  if (
    e === null ||
    (rawS !== null && rawS !== undefined && s === null) ||
    typeof p !== 'number' ||
    !Number.isInteger(p) ||
    p < 0
  ) {
    return null;
  }
  const o = readId(y.getAttr(MOVE_ORIGIN_KEY)) ?? [
    item.id.client,
    item.id.clock,
  ];
  return {e, inline: y.getAttr(MOVE_INLINE_KEY) === 1, o, p, s};
}

/** Rebuild the order index after this many steps through unknown items. */
const STALE_WALK = 256;

/**
 * Ownership of the items of one container holding move records. Positions
 * are an order index of the items it saw when built; an item inserted later
 * takes the zone of the gap it was inserted in (found from the nearest known
 * item on its left), so the index stays valid until records change.
 */
export class Zones {
  private ord = new Map<Item, number>();
  /** The zone of each position (null: native), from the active records. */
  private own: (Rec | null)[] = [];
  /** Active records, highest priority first. */
  active: Rec[] = [];
  readonly byItem = new Map<Item, Rec>();
  /** Records in this container (live), active or not. */
  records: Item[] = [];
  /** The records whose ranges resolve, active or not, by priority. */
  candidates: Rec[] = [];
  /**
   * Some record names an item this client does not have yet (updates
   * delivered out of order): ownership changes when it arrives.
   */
  unresolved = false;
  stale = false;
  /** When it was last checked outside a transaction (see State#epoch). */
  checked: number | null = null;
  constructor(
    readonly doc: Doc,
    readonly y: YNode,
  ) {
    this.build();
  }

  build(): void {
    this.stale = false;
    this.unresolved = false;
    const ord = new Map<Item, number>();
    const records: Item[] = [];
    let i = 0;
    for (let it = this.y._start; it !== null; it = it.right) {
      ord.set(it, i++);
      if (!it.deleted && isMoveItem(it)) {
        records.push(it);
      }
    }
    this.ord = ord;
    this.records = records;
    const candidates: Rec[] = [];
    for (const item of records) {
      const attrs = recordAttrs(item);
      if (attrs === null) {
        continue;
      }
      const e = resolve(this.doc, attrs.e, this.y);
      const s = attrs.s === null ? null : resolve(this.doc, attrs.s, this.y);
      if (e === null || (attrs.s !== null && s === null)) {
        const store = this.doc.store;
        if (
          store.getClock(attrs.e[0]) <= attrs.e[1] ||
          (attrs.s !== null && store.getClock(attrs.s[0]) <= attrs.s[1])
        ) {
          this.unresolved = true;
        }
        continue;
      }
      const sOrd = s === null ? -1 : ord.get(s)!;
      const eOrd = ord.get(e)!;
      if (sOrd === undefined || eOrd === undefined || sOrd >= eOrd) {
        continue;
      }
      candidates.push(
        liveAnchors(this.doc, {
          e,
          eOrd,
          eRef: attrs.e,
          inline: attrs.inline,
          item,
          o: attrs.o,
          p: attrs.p,
          s,
          sOrd,
          sRef: attrs.s,
        }),
      );
    }
    candidates.sort(comparePriority);
    this.candidates = candidates;
    const {active, own} = activate(candidates, i, it => ord.get(it)!);
    this.active = active;
    this.byItem.clear();
    for (const r of active) {
      this.byItem.set(r.item, r);
    }
    this.own = own;
  }

  private ordOf(it: Item): number {
    const k = this.ord.get(it);
    return k === undefined ? -2 : k;
  }

  /** The zone of `it` (positional: deleted and format items too). */
  ownerOf(it: Item): Zone {
    if (this.active.length === 0) {
      return null;
    }
    const k = this.ord.get(it);
    if (k !== undefined) {
      const r = this.own[k];
      return r === null ? null : r.item;
    }
    // Inserted after the index was built: the zone of the gap after the
    // nearest known item on the left (the gap after position k is in the
    // ranges that hold position k + 1).
    let steps = 0;
    for (let p = it.left; p !== null; p = p.left) {
      const pk = this.ord.get(p);
      if (pk !== undefined) {
        if (p === it.left && continues(p, it)) {
          // The rest of a known item a write split since: the item's zone,
          // up to the last item of its range.
          const r = this.own[pk];
          if (r !== null && inSplitRange(r, p, it)) {
            return r.item;
          }
        }
        const r = pk + 1 < this.own.length ? this.own[pk + 1] : null;
        return r === null ? null : r.item;
      }
      if (++steps > STALE_WALK) {
        this.build();
        return this.ownerOf(it);
      }
    }
    const r = this.own.length > 0 ? this.own[0] : null;
    return r === null ? null : r.item;
  }

  /** Whether `it` is inside the range of `zone` (positionally). */
  inRange(zone: Item, it: Item): boolean {
    const r = this.byItem.get(zone);
    if (r === undefined) {
      return false;
    }
    let k = this.ord.get(it);
    if (k === undefined) {
      // Unknown: inside if the gap it is in is.
      for (let p = it.left; ; p = p.left) {
        if (p === null) {
          return r.sOrd < 0 && r.eOrd >= 0;
        }
        const pk = this.ord.get(p);
        if (pk !== undefined) {
          k = pk;
          if (p === it.left && continues(p, it)) {
            // The rest of a known item a write split since (see ownerOf).
            return r.sOrd < k && k <= r.eOrd && inSplitRange(r, p, it);
          }
          return r.sOrd <= k && k < r.eOrd;
        }
      }
    }
    return r.sOrd < k && k <= r.eOrd;
  }

  /**
   * A range that this write is moving (its record is written later in the
   * same write): it owns its items from now on, so that no other write of
   * the container touches them. `id` names the zone (the unit's end item).
   */
  addPending(s: Item | null, e: Item, id: Item, inline = false): void {
    const sOrd = s === null ? -1 : this.ordOf(s);
    const eOrd = this.ordOf(e);
    if ((s !== null && sOrd < 0) || eOrd < 0 || sOrd >= eOrd) {
      return;
    }
    const r: Rec = {e, eOrd, inline, item: id, p: Infinity, s, sOrd};
    this.active.unshift(r);
    this.byItem.set(id, r);
    for (let k = sOrd + 1; k <= eOrd; k++) {
      this.own[k] = r;
    }
  }

  /**
   * Whether an anchor was merged into another item (Yjs merges deleted
   * items when it collects garbage): positions must be rebuilt.
   */
  anchorsMoved(): boolean {
    const store = this.doc.store;
    for (const r of this.active) {
      if (r.p === Infinity) {
        continue;
      }
      if (
        r.eRef !== undefined &&
        store.getItem(createID(r.eRef[0], r.eRef[1])) !== (r.e0 ?? r.e)
      ) {
        return true;
      }
      if (
        r.sRef !== undefined &&
        r.sRef !== null &&
        store.getItem(createID(r.sRef[0], r.sRef[1])) !== (r.s0 ?? r.s)
      ) {
        return true;
      }
    }
    return false;
  }

  /** The priority a new record over `items` needs to own them. */
  priorityOver(items: Item[]): number {
    let p = 0;
    for (const it of items) {
      const k = this.ord.get(it);
      if (k === undefined) {
        continue;
      }
      for (const r of this.active) {
        if (r.p !== Infinity && r.sOrd < k && k <= r.eOrd && r.p >= p) {
          p = r.p + 1;
        }
      }
    }
    return p === 0 ? 1 : p;
  }

  rec(zone: Zone): Rec | undefined {
    return zone === null ? undefined : this.byItem.get(zone);
  }

  /** The record of `zone` when it shows inline (a join), else null. */
  inlineRec(zone: Zone): Rec | null {
    if (zone === null) {
      return null;
    }
    const r = this.byItem.get(zone);
    return r !== undefined && r.inline === true ? r : null;
  }

  /**
   * The inline record `it` is, when it is active and a walk of `zone` shows
   * its range in its place (null otherwise).
   */
  entersAt(zone: Zone, it: Item): Rec | null {
    if (it.deleted || !(it.content instanceof ContentType)) {
      return null;
    }
    const r = this.byItem.get(it);
    if (r === undefined || r.inline !== true) {
      return null;
    }
    return this.ownerOf(it) === zone ? r : null;
  }

  isActive(item: Item): boolean {
    return this.byItem.has(item);
  }

  /**
   * Whether the same records would be active with record `moved`'s item at
   * position `pos` of the physical order instead (a half position is the
   * gap after an item): a record inside another one's range shows where
   * that one shows, and one that reaches its own range that way is inactive
   * (two records inside each other's ranges), so moving a record's item can
   * change which records show anything.
   */
  sameActiveWith(moved: Item, pos: number): boolean {
    // A half position is in the ranges that hold the position after it.
    const at = Math.ceil(pos);
    const {active} = activate(this.candidates, this.own.length, x =>
      x === moved ? at : (this.ord.get(x) ?? -2),
    );
    return (
      active.length === this.active.length &&
      active.every(r => this.byItem.has(r.item))
    );
  }

  /** Physical order of two items of the container (unknown: -2). */
  order(it: Item): number {
    return this.ordOf(it);
  }

  /** The number of positions (items known when it was built). */
  get size(): number {
    return this.own.length;
  }
}

/**
 * Whether `it` is the rest of `p`, split off after the index was built: the
 * next ids of the same client, right after it.
 */
function continues(p: Item, it: Item): boolean {
  return p.id.client === it.id.client && p.id.clock + p.length === it.id.clock;
}

/**
 * Whether the rest `it` of item `p` (see continues) is still inside the
 * range of `r`, which holds `p`: unless `p` was the range's last item and
 * the range ended before `it`.
 */
function inSplitRange(r: Rec, p: Item, it: Item): boolean {
  if ((r.e0 ?? r.e) !== p) {
    return true;
  }
  const ref = r.eRef ?? idRef(p);
  return ref[0] === it.id.client && ref[1] >= it.id.clock;
}

/**
 * Owners of `n` positions, painted range by range (`s` exclusive, `e`
 * inclusive): a position keeps the first range that holds it. The next
 * unpainted position is found through path-halving links, so painting is
 * linear in the positions.
 */
export function painter<T>(n: number): {
  own: (T | null)[];
  paint: (s: number, e: number, owner: T) => void;
} {
  const own = new Array<T | null>(n).fill(null);
  const next = new Int32Array(n + 1);
  for (let k = 0; k <= n; k++) {
    next[k] = k;
  }
  const find = (k: number): number => {
    while (next[k] !== k) {
      next[k] = next[next[k]];
      k = next[k];
    }
    return k;
  };
  const paint = (s: number, e: number, owner: T): void => {
    const last = Math.min(e, n - 1);
    for (let k = find(Math.max(s + 1, 0)); k <= last; k = find(k)) {
      own[k] = owner;
      next[k] = k + 1;
    }
  };
  return {own, paint};
}

/**
 * The active records among `candidates` (in priority order), and the zone
 * of each of the `n` positions. A record shows where its item is or, when
 * its item is inside the range of a record of higher priority, where that
 * one shows; reaching its own range that way is a loop, and the record is
 * not active. Each active record paints the positions of its range that no
 * record before it painted, so the owner of a position is one lookup.
 */
function activate(
  candidates: Rec[],
  n: number,
  ordOf: (it: Item) => number,
): {active: Rec[]; own: (Rec | null)[]} {
  const {own, paint} = painter<Rec>(n);
  const active: Rec[] = [];
  for (const r of candidates) {
    let x: Item = r.item;
    let ok = true;
    for (let guard = 0; guard <= active.length + 1; guard++) {
      const k = ordOf(x);
      if (r.sOrd < k && k <= r.eOrd) {
        ok = false;
        break;
      }
      const owner = k >= 0 && k < n ? own[k] : null;
      if (owner === null) {
        break;
      }
      x = owner.item;
    }
    if (ok) {
      active.push(r);
      paint(r.sOrd, r.eOrd, r);
    }
  }
  return {active, own};
}

/** What a walk of one zone shows (the Hidden interface). */
export interface Shown {
  runs(item: Item): [number, boolean][];
  shownLength(item: Item): number;
  shownBefore(item: Item, offset: number): number;
  unitAt(item: Item, shown: number): number;
}

/**
 * The view of one zone: content of other zones is hidden (not counted, not
 * deleted, never written), on top of what the editor hides while composing.
 */
export class ZoneView implements Shown {
  constructor(
    readonly zones: Zones,
    /** The zone walked: it changes as a walk enters and leaves inline ranges. */
    public zone: Zone,
    readonly hidden: Hidden | null,
  ) {}

  /** A view of the same zone that a walk can move on its own. */
  copy(): ZoneView {
    return new ZoneView(this.zones, this.zone, this.hidden);
  }

  foreign(item: Item): boolean {
    return this.zones.ownerOf(item) !== this.zone;
  }

  /** The last item of this view's range (null: the container's zone). */
  zoneEnd(): Item | null {
    const r = this.zones.rec(this.zone);
    return r === undefined ? null : r.e;
  }

  /** Whether `item` is past the end of this view's zone (or before it). */
  outside(item: Item): boolean {
    return this.zone !== null && !this.zones.inRange(this.zone, item);
  }

  runs(item: Item): [number, boolean][] {
    if (this.foreign(item) || isMoveItem(item)) {
      return [[item.length, true]];
    }
    return this.hidden === null
      ? [[item.length, false]]
      : this.hidden.runs(item);
  }

  shownLength(item: Item): number {
    if (this.foreign(item) || isMoveItem(item)) {
      return 0;
    }
    return this.hidden === null ? item.length : this.hidden.shownLength(item);
  }

  shownBefore(item: Item, offset: number): number {
    if (this.foreign(item)) {
      return 0;
    }
    return this.hidden === null
      ? offset
      : this.hidden.shownBefore(item, offset);
  }

  unitAt(item: Item, shown: number): number {
    if (this.foreign(item)) {
      return 0;
    }
    return this.hidden === null ? shown : this.hidden.unitAt(item, shown);
  }
}

/** The zone a view shows (null view: the container, no moves). */
export function viewZone(view: Shown | null): ZoneView | null {
  return view instanceof ZoneView ? view : null;
}

/*
 * Walking a zone in the order it shows. A walk visits the items of its zone
 * physically, except that an inline record of the zone shows its range in
 * its place: stepping onto it enters its range (the walk continues at the
 * range's first item, in the record's zone), and stepping past the range's
 * last item leaves it (the walk continues after the record, in the zone it
 * is in). Formats stay positional: an item's formats are the format items
 * before it physically, so readers take the formats again after a jump.
 */

/**
 * `it`, or the first item of the ranges of the inline records it enters;
 * null when that first item is `stop` and ends a unit of the zone entered
 * (a block a peer inserted at the start of a joined line's second part).
 */
export function enterZone(
  view: ZoneView,
  y: YNode,
  it: Item | null,
  stop: Item | null = null,
): Item | null {
  const zones = view.zones;
  for (let guard = 0; it !== null && guard < 64; guard++) {
    const r = zones.entersAt(view.zone, it);
    if (r === null) {
      return it;
    }
    view.zone = r.item;
    it = r.s === null ? y._start : r.s.right;
    if (
      it !== null &&
      it === stop &&
      !it.deleted &&
      isUnitEnd(it) &&
      zones.ownerOf(it) === view.zone
    ) {
      return null;
    }
  }
  return it;
}

/** A line marker, a run terminator or a block node. */
function isUnitEnd(it: Item): boolean {
  if (!(it.content instanceof ContentType)) {
    return false;
  }
  const type = it.content.type;
  const name = type.name;
  return name === MARKER || name === RUN_END || isBlockNodeType(type);
}

/**
 * The item after `it` in the walk of `view` (which follows the walk), or
 * null at the end of what is walked. Leaving an inline range continues
 * after its record. Two ways to end:
 * - `stop` (exclusive): a unit's end item ends the walk where the walk
 *   reaches it as an item of its own zone (it can pass it physically, as
 *   another zone's item, before); any other item ends it where the walk
 *   reaches it physically, except right after entering an inline range
 *   (whose first item can physically be `stop`);
 * - `last` (inclusive): the walk ends after it, where the walk is in
 *   `lastZone` (by default: where it is its own). The last item of a range
 *   shown before a line can also be the last item of an inline range shown
 *   inside it: a walk of the first range leaves the inline one there.
 */
export function stepZone(
  view: ZoneView,
  y: YNode,
  it: Item,
  stop: Item | null,
  last: Item | null = null,
  lastZone?: Zone,
): Item | null {
  const zones = view.zones;
  if (
    it === last &&
    (lastZone === undefined ? !view.foreign(it) : view.zone === lastZone)
  ) {
    return null;
  }
  let cur = it;
  for (let guard = 0; guard < 64; guard++) {
    const r = zones.inlineRec(view.zone);
    if (r === null || cur !== r.e) {
      break;
    }
    if (cur.right === stop && !cur.deleted && !view.foreign(cur)) {
      // The walk ends with the range's last item (a line that ends there).
      return null;
    }
    cur = r.item;
    view.zone = zones.ownerOf(r.item);
  }
  const next = cur.right;
  if (next === null) {
    return null;
  }
  if (
    next === stop &&
    (next.deleted || !isUnitEnd(next) || zones.ownerOf(next) === view.zone)
  ) {
    return null;
  }
  return enterZone(view, y, next, stop);
}

/**
 * The item before `it` in the walk of `view` (leftwards: an inline record
 * is entered from its range's last item, and left at its range's start).
 */
export function stepZoneBack(view: ZoneView, it: Item): Item | null {
  const zones = view.zones;
  let cur = it;
  for (let guard = 0; guard < 64; guard++) {
    const r = zones.inlineRec(view.zone);
    if (r === null || cur.left !== r.s) {
      break;
    }
    cur = r.item;
    view.zone = zones.ownerOf(r.item);
  }
  let p = cur.left;
  for (let guard = 0; p !== null && guard < 64; guard++) {
    const r = zones.entersAt(view.zone, p);
    if (r === null) {
      break;
    }
    view.zone = r.item;
    p = r.e;
  }
  return p;
}

/** Formats in effect right before `it` (positional: physically). */
export function formatsBefore(y: YNode, it: Item): Map<string, unknown> {
  return formatsAfterItem(y, it.left);
}

/**
 * Physical formats right after `item` (null: at the start) in its
 * container: every format item before it applies, whatever its zone.
 */
export function formatsAfterItem(
  y: YNode,
  item: Item | null,
): Map<string, unknown> {
  const formats = new Map<string, unknown>();
  if (item === null) {
    return formats;
  }
  for (let it = y._start; it !== null; it = it.right) {
    if (!it.deleted && it.content instanceof ContentFormat) {
      const {key, value} = it.content;
      if (value === null) {
        formats.delete(key);
      } else {
        formats.set(key, value);
      }
    }
    if (it === item) {
      break;
    }
  }
  return formats;
}
