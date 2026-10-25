/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Formats} from './Cursor';
import type {Parsed} from './Read';

import {ContentFormat, type Item} from '@y/y';

import {
  formatsAfterItem,
  isInlineRecordItem,
  isMoveItem,
  painter,
  type Rec,
  type Zone,
  type Zones,
} from './Moves';
import {parseRange} from './Read';
import {stableStringify} from './Schema';
import {
  type CS,
  EMPTY_FORMATS,
  isEndItem,
  prevBoundary,
  type State,
  type Unit,
} from './State';

/*
 * Reading a change of a container holding move records without reading the
 * whole container.
 *
 * A container's units show in the order of its zones' walks: the native
 * zone's walk, where each active record shows the walk of its range. When
 * records are added or removed (a move, its undo or redo, received or local),
 * ownership changes only inside the ranges of the records that changed
 * (added, removed, another range, or now showing in another zone): outside
 * them, every item keeps its zone. So the walk of each zone that exists
 * before and after (a stable zone) changes only around the items whose zone
 * changed, the records that show (or showed) in it and changed, and the
 * other items the change inserted or deleted (an Enter, a join): a window
 * from the last end item before them that the zone owns before and after
 * (and the change did not insert) to the first such one after them.
 *
 * Each window is parsed again with the new ownership (the records shown in
 * it with their whole ranges), and its units replace the ones it showed
 * before: a contiguous run of the container's units, since a walk shows a
 * record's units in one place. Units whose content did not change (a moved
 * line) keep their node and content and are only placed again. Groups next
 * to a window are built again.
 *
 * What cannot be read so (`fullReadReason`: format items inserted or
 * deleted, records naming items not received, anchors merged by garbage
 * collection, an ownership the editor shows that is not known; or a window
 * of a record that showed nothing) is read in full: the plan is the reason.
 */

const START = 'start';
const END = 'end';

type RecOrd = {item: Item; s: number; e: number};

type ZoneWindow = {
  zone: Zone;
  left: Item | typeof START;
  right: Item | typeof END;
  /** The old units it replaces: [from, to) in the container's units. */
  from: number;
  to: number;
  entries: Parsed[];
};

export type MovePlan = {
  /** The new units, in order: kept units, or entries to read. */
  units: (Unit | Parsed)[];
  /** Positions in `units` that a window produced (read or placed). */
  changed: Set<number>;
  /** Positions in `units` where a window that shows nothing now was. */
  gaps: number[];
  /** Units whose content did not change, and the zone they show in now. */
  moved: Map<Unit, Zone>;
  /** Old units the windows replaced (some come back in `units`). */
  replaced: Unit[];
};

/** Counters of how receiving record changes was read (tests, benchmarks). */
export const moveReadStats = {
  full: 0,
  incremental: 0,
  reasons: {} as Record<string, number>,
};

function fullRead(reason: string): string {
  moveReadStats.full++;
  moveReadStats.reasons[reason] = (moveReadStats.reasons[reason] ?? 0) + 1;
  return reason;
}

function sameFormats(a: Formats, b: Formats): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [k, v] of a) {
    if (stableStringify(b.get(k)) !== stableStringify(v)) {
      return false;
    }
  }
  return true;
}

/**
 * Why a change cannot be read where it changes (null: it can). `before` is
 * the ownership the container's units show (null: it held no record),
 * `after` the ownership now, built after the change.
 */
export function fullReadReason(
  before: Zones | null,
  after: Zones,
  changedRecords: Item[],
  edits: Item[],
): string | null {
  for (const it of edits) {
    if (it.content instanceof ContentFormat) {
      // Formats are positional: the start of every later unit may change.
      return 'formats';
    }
  }
  // Inline records (joins) show a range inside a line, so a line can span
  // zones: the windows below assume lines of one zone.
  if (
    after.active.some(r => r.inline === true) ||
    (before !== null && before.active.some(r => r.inline === true)) ||
    changedRecords.some(it => isInlineRecordItem(it))
  ) {
    return 'inline-record';
  }
  if (after.unresolved || (before !== null && before.unresolved)) {
    return 'unresolved';
  }
  if (before === null) {
    return null;
  }
  if (before.anchorsMoved()) {
    return 'anchors-moved';
  }
  // The ownership the units show is older than this change: it does not
  // know a record the change inserted, and knew a record it deleted as live.
  for (const it of changedRecords) {
    if (
      before.order(it) !== -2 &&
      (!it.deleted || !before.records.includes(it))
    ) {
      return 'zones-after-change';
    }
  }
  for (const r of before.active) {
    if (r.p === Infinity) {
      return 'pending';
    }
    // Its anchors are items the new index knows.
    if ((r.s !== null && after.order(r.s) === -2) || after.order(r.e) === -2) {
      return 'unknown-anchor';
    }
  }
  return null;
}

/**
 * Plan the read of a change in `cs`: `before` is the ownership the
 * container's units show (null: it held no record), `after` the ownership
 * now (built after the change: its order index knows every item),
 * `changedRecords` the records inserted or deleted, `edits` the other items
 * inserted or deleted. Returns the plan, or the reason the container must
 * be read in full.
 */
export function planMoveRead(
  state: State,
  cs: CS,
  before: Zones | null,
  after: Zones,
  changedRecords: Item[],
  attrUnits?: ReadonlySet<Unit>,
  edits: Item[] = [],
): MovePlan | string {
  const reason = fullReadReason(before, after, changedRecords, edits);
  if (reason !== null) {
    return fullRead(reason);
  }
  const y = cs.y;
  // Other items inserted or deleted in the same change (typing, a split, a
  // join): the walks of their zones change around them.
  const edited = new Set<Item>(edits);
  // Positions: the new ownership's order index knows every item.
  const ord = (it: Item): number => after.order(it);
  const bRecs: RecOrd[] =
    before === null
      ? []
      : before.active.map(r => ({
          e: ord(r.e),
          item: r.item,
          s: r.s === null ? -1 : ord(r.s),
        }));
  // The old ownership by the new positions (painted once).
  let bOwn: (RecOrd | null)[] | null = null;
  const ownB = (it: Item): Zone => {
    if (bOwn === null) {
      const p = painter<RecOrd>(after.size);
      for (const r of bRecs) {
        p.paint(r.s, r.e, r);
      }
      bOwn = p.own;
    }
    const k = ord(it);
    const r = k >= 0 && k < bOwn.length ? bOwn[k] : null;
    return r === null ? null : r.item;
  };
  const aOwnerMemo = new Map<Item, Zone>();
  const ownA = (it: Item): Zone => {
    let z = aOwnerMemo.get(it);
    if (z === undefined) {
      z = after.ownerOf(it);
      aOwnerMemo.set(it, z);
    }
    return z;
  };
  const bRec = (z: Item) => (before === null ? undefined : before.rec(z));
  const aRec = (z: Item) => after.rec(z);

  // Records that changed: added, removed, another range, or showing in
  // another zone.
  const dirty = new Set<Item>();
  const all = new Set<Item>();
  if (before !== null) {
    for (const r of before.active) {
      all.add(r.item);
    }
  }
  for (const r of after.active) {
    all.add(r.item);
  }
  for (const it of all) {
    const rb = bRec(it);
    const ra = aRec(it);
    if (
      rb === undefined ||
      ra === undefined ||
      rb.s !== ra.s ||
      rb.e !== ra.e ||
      ownB(it) !== ownA(it)
    ) {
      dirty.add(it);
    }
  }
  if (dirty.size === 0 && attrUnits === undefined && edited.size === 0) {
    // Only records that show nothing (inactive) came or went.
    moveReadStats.incremental++;
    return {
      changed: new Set(),
      gaps: [],
      moved: new Map(),
      replaced: [],
      units: [...cs.units],
    };
  }
  const stable = (z: Zone): boolean =>
    z === null ||
    (bRec(z) !== undefined && aRec(z) !== undefined && !dirty.has(z));

  // Where stable zones' walks change: items whose zone changed, and records
  // that show (or showed) in them and changed.
  const positions = new Map<Zone, Set<Item>>();
  const addPos = (z: Zone, it: Item) => {
    if (!stable(z)) {
      return;
    }
    let set = positions.get(z);
    if (set === undefined) {
      set = new Set();
      positions.set(z, set);
    }
    set.add(it);
  };
  const visited = new Set<Item>();
  const scan = (s: Item | null, e: Item) => {
    for (
      let p: Item | null = s === null ? y._start : s.right;
      p !== null;
      p = p.right
    ) {
      if (!visited.has(p)) {
        visited.add(p);
        if (!p.deleted && p.countable) {
          const zb = ownB(p);
          const za = ownA(p);
          if (zb !== za) {
            addPos(zb, p);
            addPos(za, p);
          }
        }
      }
      if (p === e) {
        break;
      }
    }
  };
  for (const d of dirty) {
    const rb = bRec(d);
    const ra = aRec(d);
    if (rb !== undefined) {
      scan(rb.s, rb.e);
      addPos(ownB(d), d);
    }
    if (ra !== undefined) {
      scan(ra.s, ra.e);
      addPos(ownA(d), d);
    }
  }
  for (const it of edited) {
    addPos(ownB(it), it);
    addPos(ownA(it), it);
  }

  // Windows.
  const units = cs.units;
  let unitIndex: Map<Unit, number> | null = null;
  const idx = (u: Unit): number => {
    if (unitIndex === null) {
      unitIndex = new Map();
      units.forEach((x, i) => unitIndex!.set(x, i));
    }
    const i = unitIndex.get(u);
    return i === undefined ? -1 : i;
  };
  const isBoundary = (z: Zone, p: Item): boolean =>
    !p.deleted &&
    isEndItem(p) &&
    !edited.has(p) &&
    ownB(p) === z &&
    ownA(p) === z;
  const rangeOf = (z: Zone): [number, number] => {
    if (z === null) {
      return [-1, Infinity];
    }
    const r = aRec(z)!;
    return [r.sOrd, r.eOrd];
  };
  // Records' chains in the old ownership (the record a unit shows in, up to
  // the native zone).
  const holds = (z: Zone, outer: Item): boolean => {
    for (let k = 0; z !== null && k < 256; k++) {
      if (z === outer) {
        return true;
      }
      z = ownB(z);
    }
    return false;
  };
  const extentMemo = new Map<Item, [number, number] | null>();
  // The units a stable record showed before: [from, to).
  const extent = (z: Item): [number, number] | null => {
    if (extentMemo.has(z)) {
      return extentMemo.get(z)!;
    }
    let seed = -1;
    const r = aRec(z)!;
    for (
      let p: Item | null = r.s === null ? y._start : r.s.right;
      p !== null;
      p = p.right
    ) {
      if (!p.deleted && isEndItem(p) && holds(ownB(p), z)) {
        const u = state.unitByEnd.get(p);
        if (u !== undefined && u.cs === cs && holds(u.zone ?? null, z)) {
          seed = idx(u);
          if (seed >= 0) {
            break;
          }
        }
      }
      if (p === r.e) {
        break;
      }
    }
    if (seed < 0) {
      // Only units without an end item: look for one.
      for (let k = 0; k < units.length; k++) {
        if (holds(units[k].zone ?? null, z)) {
          seed = k;
          break;
        }
      }
    }
    let out: [number, number] | null = null;
    if (seed >= 0) {
      let a = seed;
      let b = seed + 1;
      while (a > 0 && holds(units[a - 1].zone ?? null, z)) {
        a--;
      }
      while (b < units.length && holds(units[b].zone ?? null, z)) {
        b++;
      }
      out = [a, b];
    }
    extentMemo.set(z, out);
    return out;
  };

  // Formats in effect right after an item (positional: every format item
  // before it physically, whatever its zone), from one walk of the
  // container.
  let fmtTable: Map<Item, Formats> | null = null;
  const formatsAfter = (x: Item | null): Formats => {
    if (x === null) {
      return EMPTY_FORMATS;
    }
    if (fmtTable === null) {
      fmtTable = new Map();
      let f: Formats = EMPTY_FORMATS;
      for (let it = y._start; it !== null; it = it.right) {
        if (!it.deleted && it.content instanceof ContentFormat) {
          const {key, value} = it.content;
          f = new Map(f);
          if (value === null) {
            f.delete(key);
          } else {
            f.set(key, value);
          }
        }
        fmtTable.set(it, f);
      }
    }
    return fmtTable.get(x) ?? formatsAfterItem(y, x);
  };

  const pz = (zone: Zone) => ({
    formatsAfter: (it: Item) => formatsAfter(it),
    startOf: (rec: Rec) => formatsAfter(rec.s),
    zone,
    zones: after,
  });

  const windows: ZoneWindow[] = [];
  for (const [zone, set] of positions) {
    const [lo, hi] = rangeOf(zone);
    const sorted = [...set].sort((a, b) => ord(a) - ord(b));
    let i = 0;
    while (i < sorted.length) {
      const x = sorted[i];
      let left: Item | typeof START = START;
      for (let p = x.left; p !== null; p = p.left) {
        if (ord(p) <= lo) {
          break;
        }
        if (isBoundary(zone, p)) {
          left = p;
          break;
        }
      }
      let right: Item | typeof END = END;
      for (let p = x.right; p !== null; p = p.right) {
        if (ord(p) > hi) {
          break;
        }
        if (isBoundary(zone, p)) {
          right = p;
          break;
        }
      }
      let j = i + 1;
      while (
        j < sorted.length &&
        (right === END || ord(sorted[j]) < ord(right))
      ) {
        j++;
      }
      i = j;
      // The old units it showed.
      let from: number;
      let to: number;
      const unitAt = (b: Item): number => {
        const u = state.unitByEnd.get(b);
        return u === undefined || u.cs !== cs || (u.zone ?? null) !== zone
          ? -1
          : idx(u);
      };
      const ext =
        zone === null ? ([0, units.length] as [number, number]) : extent(zone);
      if (left === START) {
        if (ext === null) {
          return fullRead('empty-zone');
        }
        from = ext[0];
      } else {
        const k = unitAt(left);
        if (k < 0) {
          return fullRead('boundary-unit');
        }
        from = k + 1;
      }
      if (right === END) {
        if (ext === null) {
          return fullRead('empty-zone');
        }
        to = ext[1];
      } else {
        const k = unitAt(right);
        if (k < 0) {
          return fullRead('boundary-unit');
        }
        to = k + 1;
      }
      if (to < from || (to === from && zone !== null)) {
        return fullRead('empty-window');
      }
      const r = zone === null ? undefined : aRec(zone)!;
      const startItem =
        left !== START
          ? left.right
          : r === undefined || r.s === null
            ? y._start
            : r.s.right;
      const stop =
        right !== END ? right.right : r === undefined ? null : r.e.right;
      const startFormats =
        left !== START
          ? formatsAfter(left)
          : r === undefined
            ? EMPTY_FORMATS
            : formatsAfter(r.s);
      // The window ends with its right bound (inclusive, where the walk of
      // its zone passes it: a walk can pass it physically elsewhere).
      const last = right !== END ? right : r === undefined ? null : r.e;
      const {parsed} = parseRange(
        startItem,
        last === null ? stop : null,
        startFormats,
        pz(zone),
        last,
      );
      windows.push({entries: parsed, from, left, right, to, zone});
    }
  }

  // The new units: the old ones, with each window's units in place of the
  // ones it showed. A window's parse shows the records whose items are in
  // it with their whole ranges, so a window of such a record (its old units
  // inside the other window's) is covered by it: only outermost windows
  // are put in place.
  const depth = (z: Zone): number => {
    let d = 0;
    for (; z !== null && d < 256; d++) {
      z = ownA(z);
    }
    return d;
  };
  windows.sort(
    (a, b) => a.from - b.from || b.to - a.to || depth(a.zone) - depth(b.zone),
  );
  const outer: ZoneWindow[] = [];
  for (const w of windows) {
    const last = outer[outer.length - 1];
    if (last !== undefined && w.from < last.to) {
      if (w.to > last.to) {
        return fullRead('overlapping-windows');
      }
      continue;
    }
    outer.push(w);
  }
  const out: (Unit | Parsed)[] = [];
  const changed = new Set<number>();
  const gaps: number[] = [];
  const replaced: Unit[] = [];
  let i = 0;
  for (const w of outer) {
    for (; i < w.from; i++) {
      out.push(units[i]);
    }
    for (let k = w.from; k < w.to; k++) {
      replaced.push(units[k]);
    }
    const first = out.length;
    for (const e of w.entries) {
      changed.add(out.length);
      out.push(e);
    }
    // Its edges: groups next to it are built again (they may merge, or
    // lose items).
    gaps.push(first, out.length);
    i = Math.max(i, w.to);
  }
  for (; i < units.length; i++) {
    out.push(units[i]);
  }

  // Entries whose unit's content did not change keep it (and its node).
  const moved = new Map<Unit, Zone>();
  const movedFrom = new Map<Unit, Parsed>();
  const used = new Set<Unit>();
  for (const k of changed) {
    const e = out[k];
    if ('cs' in e) {
      continue;
    }
    const p = e;
    if (p.end === null || p.kind === 'implicit') {
      continue;
    }
    const u = state.unitByEnd.get(p.end);
    if (u === undefined || u.cs !== cs || used.has(u) || u.kind !== p.kind) {
      continue;
    }
    if (
      p.kind === 'node' ||
      unchangedContent(u, p, ownB, ownA, cs, after, before, edited)
    ) {
      if (sameFormats(u.start || EMPTY_FORMATS, p.start)) {
        used.add(u);
        moved.set(u, p.zone);
        movedFrom.set(u, p);
        out[k] = u;
      }
    }
  }
  // Lines whose marker attributes changed too are read again.
  if (attrUnits !== undefined) {
    const at = new Map<Unit, number>();
    out.forEach((e, k) => {
      if ('cs' in e) {
        at.set(e, k);
      }
    });
    for (const u of attrUnits) {
      const k = at.get(u);
      if (k === undefined || u.end === null || u.end.deleted) {
        continue;
      }
      const from = movedFrom.get(u);
      if (from !== undefined) {
        moved.delete(u);
        out[k] = from;
        continue;
      }
      const b = prevBoundary(after, u.end);
      out[k] = {
        end: u.end,
        kind: u.kind,
        start: u.start || EMPTY_FORMATS,
        startItem: b === null ? y._start : b.right,
        startZone: u.zone ?? null,
        stop: u.end,
        zone: u.zone ?? null,
      };
      changed.add(k);
    }
  }
  moveReadStats.incremental++;
  return {changed, gaps, moved, replaced, units: out};
}

/** The item a unit's content starts after, in an ownership (zone walk). */
function boundaryOf(
  end: Item,
  zone: Zone,
  own: (it: Item) => Zone,
  rangeStart: number,
  ord: (it: Item) => number,
): Item | null {
  for (let p = end.left; p !== null; p = p.left) {
    if (zone !== null && ord(p) <= rangeStart) {
      return p;
    }
    if (own(p) !== zone) {
      continue;
    }
    if (!p.deleted && isEndItem(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Whether a unit shows the same items in its new zone as before: the same
 * start, and every item between shown in both or in neither.
 */
function unchangedContent(
  u: Unit,
  p: Parsed,
  ownB: (it: Item) => Zone,
  ownA: (it: Item) => Zone,
  cs: CS,
  after: Zones,
  before: Zones | null,
  edited: ReadonlySet<Item>,
): boolean {
  const end = u.end!;
  const oldZone = u.zone ?? null;
  const newZone = p.zone;
  const ord = (it: Item) => after.order(it);
  const bRange = (z: Zone) => {
    if (z === null || before === null) {
      return -1;
    }
    const r = before.rec(z);
    return r === undefined || r.s === null ? -1 : ord(r.s);
  };
  const aRange = (z: Zone) => {
    if (z === null) {
      return -1;
    }
    const r = after.rec(z);
    return r === undefined || r.s === null ? -1 : r.sOrd;
  };
  const oldB = boundaryOf(end, oldZone, ownB, bRange(oldZone), ord);
  const newB = boundaryOf(end, newZone, ownA, aRange(newZone), ord);
  const oldStart = oldB === null ? cs.y._start : oldB.right;
  if (oldStart !== p.startItem || (oldB !== null && edited.has(oldB))) {
    return false;
  }
  const newStart = newB === null ? cs.y._start : newB.right;
  if (newStart !== p.startItem) {
    return false;
  }
  for (let it = p.startItem; it !== null && it !== end; it = it.right) {
    if (edited.has(it)) {
      return false;
    }
    if (it.deleted || !it.countable || isMoveItem(it)) {
      continue;
    }
    if ((ownB(it) === oldZone) !== (ownA(it) === newZone)) {
      return false;
    }
  }
  return true;
}
