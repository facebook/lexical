/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
import {
  type AbstractStruct,
  ContentFormat,
  type ContentString,
  type ContentType,
  createID,
  getItemCleanStart,
  Item,
  type Node as YNode,
  type Transaction,
} from '@y/y';

import {
  formatsAfterItem,
  isMoveItem,
  type Rec,
  type Shown,
  viewZone,
  type ZoneView,
} from './Moves';

/*
 * Anchored editing of a Y.Node's children.
 *
 * Y.Node#insert/delete/format take an index and walk the children from the
 * start of the type on every call (the delta position starts at `_start`), so
 * in a container that holds a whole document every keystroke would cost time
 * proportional to its position. This cursor starts from an item the binding
 * already knows (the marker of the previous line) and performs the same
 * operations with the same format semantics as Yjs' own text positions
 * (`ItemTextListPosition`, `insertContent`, `deleteText` in Yjs' ynode.js,
 * MIT licensed), which are not exported. Only the parts this binding needs are
 * implemented: no renderer (attribution) support.
 */

export type Formats = Map<string, unknown>;

export const equalFormatValue = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }
  // Yjs compares format values one level deep (object.equalFlat).
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) {
    return false;
  }
  for (const k of ak) {
    if (
      (a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]
    ) {
      return false;
    }
  }
  return true;
};

const isFormat = (item: Item): boolean => item.content instanceof ContentFormat;

/** A live countable item: text, a child node, an embed. */
export const isLiveContent = (item: Item): boolean =>
  !item.deleted && item.countable;

export class Cursor {
  left: Item | null;
  right: Item | null;
  formats: Formats;
  /**
   * Content the editor does not show (remote content while composing, and
   * the content of other zones when the container holds moves): not
   * counted, not deleted.
   */
  hidden: Shown | null = null;
  constructor(
    readonly tr: Transaction,
    readonly parent: YNode,
    left: Item | null,
    formats: Formats,
  ) {
    this.left = left;
    this.right = left === null ? parent._start : left.right;
    this.formats = formats;
    // Index search markers would not follow these item-level edits.
    if (parent._searchMarker !== null) {
      parent._searchMarker.length = 0;
    }
  }

  /** Whether the cursor entered or left an inline range (see `forward`). */
  jumped = false;

  /**
   * Step over `right`, tracking formats. With moves, stepping onto an inline
   * record (a join) enters its range: the cursor goes on at the range's
   * start, in the record's zone; stepping over the range's last item leaves
   * it: the cursor goes on right after the record. An insert is never put
   * after a range's last item (it would be outside the range). Formats are
   * positional: after a jump they are the formats physically there.
   */
  forward(): void {
    const item = this.right!;
    const view = viewZone(this.hidden);
    const r = view === null ? null : this.entersAt(view, item);
    if (r !== null) {
      view!.zone = r.item;
      this.left = r.s;
      this.right = r.s === null ? this.parent._start : r.s.right;
      this.formats = formatsAfterItem(this.parent, r.s);
      this.jumped = true;
      return;
    }
    if (!item.deleted && isFormat(item)) {
      const {key, value} = item.content as ContentFormat;
      if (value === null) {
        this.formats.delete(key);
      } else {
        this.formats.set(key, value);
      }
    }
    this.left = item;
    this.right = item.right;
    if (view !== null) {
      this.settle();
    }
  }

  private entersAt(view: ZoneView, item: Item): Rec | null {
    return isMoveItem(item) ? view.zones.entersAt(view.zone, item) : null;
  }

  /** Leave the inline ranges whose last item is `left` (see `forward`). */
  settle(): void {
    const view = viewZone(this.hidden);
    if (view === null) {
      return;
    }
    for (let guard = 0; this.left !== null && guard < 64; guard++) {
      const r = view.zones.inlineRec(view.zone);
      if (r === null || this.left !== r.e) {
        return;
      }
      view.zone = view.zones.ownerOf(r.item);
      this.left = r.item;
      this.right = r.item.right;
      this.formats = formatsAfterItem(this.parent, r.item);
      this.jumped = true;
    }
  }

  /**
   * Whether stepping over `right` keeps the cursor inside its zone's range:
   * past the range's last item, an insert would be outside the range. Nor
   * does it enter an inline range (only content counting does).
   */
  private mayPass(): boolean {
    const view = viewZone(this.hidden);
    return (
      view === null ||
      (this.right !== view.zoneEnd() &&
        (this.right === null || this.entersAt(view, this.right) === null))
    );
  }

  /** At a place where `forward` enters or leaves an inline range. */
  private atJump(): boolean {
    const view = viewZone(this.hidden);
    if (view === null || this.right === null) {
      return false;
    }
    if (this.entersAt(view, this.right) !== null) {
      return true;
    }
    // Past the range's last item the walk leaves the range: a last item that
    // is content (a piece of a line, see Writer#unitPieces) is passed first.
    const r = view.zones.inlineRec(view.zone);
    return r !== null && this.right === r.e && !isLiveContent(r.e);
  }

  /**
   * Step over the move records right after the cursor (with any deleted,
   * format or other zones' items among them): a record shows its units
   * before the line its item is in, so content written at the start of that
   * line goes after the records.
   */
  skipRecords(): void {
    const view = viewZone(this.hidden);
    let last: Item | null = null;
    for (let p = this.right; p !== null; p = p.right) {
      const foreign = view !== null && view.foreign(p);
      if (
        !foreign &&
        !p.deleted &&
        isMoveItem(p) &&
        (view === null || view.zones.entersAt(view.zone, p) === null)
      ) {
        last = p;
        continue;
      }
      if (p.deleted || !p.countable || foreign) {
        if (view !== null && p === view.zoneEnd()) {
          break;
        }
        continue;
      }
      break;
    }
    if (last === null) {
      return;
    }
    while (this.right !== null && this.left !== last) {
      this.forward();
    }
  }

  /** Step over format items and deleted items (never over live content). */
  skipNonContent(): void {
    while (
      this.right !== null &&
      !isLiveContent(this.right) &&
      this.mayPass()
    ) {
      this.forward();
    }
  }

  /**
   * Whether `item` (live content) counts: split it so that it is all hidden
   * or all shown, and answer whether it is shown.
   */
  private counts(item: Item): boolean {
    if (!isLiveContent(item) || isMoveItem(item)) {
      return false;
    }
    const hidden = this.hidden;
    if (hidden === null) {
      return true;
    }
    const [len, isHidden] = hidden.runs(item)[0];
    if (len < item.length) {
      getItemCleanStart(this.tr, createID(item.id.client, item.id.clock + len));
    }
    return !isHidden;
  }

  /**
   * Advance by `n` content units, splitting an item if needed. Format items
   * just before the target position are not passed.
   */
  advance(n: number): void {
    while (n > 0 && this.right !== null) {
      const item = this.right;
      if (this.counts(item)) {
        if (n < item.length) {
          getItemCleanStart(
            this.tr,
            createID(item.id.client, item.id.clock + n),
          );
        }
        n -= item.length;
      }
      this.forward();
    }
    invariant(n <= 0, '@lexical/y: cursor advanced past the end');
  }

  /**
   * Inserting right before another zone's items would put the new item in
   * that zone's range (its start is the item on the left): step over them,
   * so that the insert lands after the range, in this cursor's zone. Never
   * past the end of the cursor's own zone.
   */
  private hopForeign(): void {
    const view = viewZone(this.hidden);
    if (view === null) {
      return;
    }
    while (
      this.right !== null &&
      view.foreign(this.right) &&
      !view.outside(this.right)
    ) {
      this.forward();
    }
  }

  private newItem(
    content: ContentFormat | ContentString | ContentType,
    hop = true,
  ): Item {
    if (hop) {
      this.hopForeign();
    }
    const doc = this.tr.doc;
    const client = doc.clientID;
    const left = this.left;
    const right = this.right;
    const item = new Item(
      createID(client, doc.store.getClock(client)),
      left,
      left && left.lastId,
      right,
      right && right.id,
      this.parent,
      null,
      content,
    );
    item.integrate(this.tr, 0);
    return item;
  }

  private minimizeFormatChanges(formats: Record<string, unknown>): void {
    while (this.right !== null && this.mayPass()) {
      const r = this.right;
      if (r.deleted) {
        if (r.countable) {
          // a deleted content item has no length: step over it
        }
      } else if (
        isFormat(r) &&
        equalFormatValue(
          formats[(r.content as ContentFormat).key] ?? null,
          (r.content as ContentFormat).value,
        )
      ) {
        // a format that already matches
      } else {
        break;
      }
      this.forward();
    }
  }

  private insertFormats(formats: Record<string, unknown>): Formats {
    const negated: Formats = new Map();
    for (const key in formats) {
      const val = formats[key];
      const current = this.formats.get(key) ?? null;
      if (!equalFormatValue(current, val)) {
        negated.set(key, current);
        this.right = this.newItem(new ContentFormat(key, val as object));
        this.forward();
      }
    }
    return negated;
  }

  private insertNegatedFormats(negated: Formats, hop = true): void {
    const view = viewZone(this.hidden);
    while (
      this.right !== null &&
      (view === null || !view.foreign(this.right)) &&
      this.mayPass() &&
      (this.right.deleted ||
        (isFormat(this.right) &&
          equalFormatValue(
            negated.get((this.right.content as ContentFormat).key),
            (this.right.content as ContentFormat).value,
          )))
    ) {
      if (!this.right.deleted) {
        negated.delete((this.right.content as ContentFormat).key);
      }
      this.forward();
    }
    // Before another zone's items, restore right here (never inside or
    // after their range).
    const atForeign =
      view !== null && this.right !== null && view.foreign(this.right);
    for (const [key, val] of negated) {
      this.right = this.newItem(
        new ContentFormat(key, val as object),
        hop && !atForeign,
      );
      this.forward();
    }
  }

  /**
   * Insert content with exactly `formats` (keys of current formats that
   * `formats` leaves out are removed for the inserted content). Returns the
   * content item.
   */
  insert(
    content: ContentString | ContentType,
    formats: Record<string, unknown>,
  ): Item {
    const f: Record<string, unknown> = {...formats};
    this.formats.forEach((_v, key) => {
      if (!(key in f)) {
        f[key] = null;
      }
    });
    // Settle the insert position before comparing formats: stepping over
    // deleted or matching format items can reach another zone's items, and
    // hopping over them passes their format items (formats are positional).
    const view = viewZone(this.hidden);
    for (let guard = 0; guard < 64; guard++) {
      this.hopForeign();
      this.minimizeFormatChanges(f);
      if (
        view === null ||
        this.right === null ||
        !view.foreign(this.right) ||
        view.outside(this.right)
      ) {
        break;
      }
    }
    this.formats.forEach((_v, key) => {
      if (!(key in f)) {
        f[key] = null;
      }
    });
    const negated = this.insertFormats(f);
    const item = this.newItem(content);
    this.right = item;
    this.forward();
    this.insertNegatedFormats(negated);
    return item;
  }

  /**
   * Insert content with the formats current at the cursor (no format items).
   */
  insertPlain(content: ContentString | ContentType): Item {
    const item = this.newItem(content);
    this.right = item;
    this.forward();
    return item;
  }

  /** Delete `n` content units. Returns the number of format items removed. */
  delete(n: number): void {
    const start = this.right;
    const startFormats = new Map(this.formats);
    this.jumped = false;
    while (n > 0 && this.right !== null) {
      const item = this.right;
      if (this.counts(item)) {
        if (n < item.length) {
          getItemCleanStart(
            this.tr,
            createID(item.id.client, item.id.clock + n),
          );
        }
        n -= item.length;
        item.delete(this.tr);
      }
      this.forward();
    }
    if (start !== null && this.jumped) {
      // The deletion entered or left an inline range: formats are
      // positional, take them where the cursor is.
      this.cleanupFormattingGap(start, startFormats);
      this.formats = formatsAfterItem(this.parent, this.left);
    } else if (start !== null) {
      this.cleanupFormattingGap(start, startFormats);
      // The cleanup can remove format items the cursor already passed:
      // recompute the formats in effect at the cursor.
      const formats = new Map(startFormats);
      for (
        let it: Item | null = start;
        it !== null && it !== this.right;
        it = it.right
      ) {
        if (!it.deleted && isFormat(it)) {
          const cf = it.content as ContentFormat;
          if (cf.value === null) {
            formats.delete(cf.key);
          } else {
            formats.set(cf.key, cf.value);
          }
        }
      }
      this.formats = formats;
    }
  }

  /**
   * Remove format items made redundant by a deletion, bounded by the gap
   * (Yjs' cleanupFormattingGap).
   */
  private cleanupFormattingGap(start: Item, startFormats: Formats): void {
    let end: Item | null = start;
    const endFormats = new Map<string, ContentFormat>();
    while (end !== null && (!end.countable || end.deleted)) {
      if (!end.deleted && isFormat(end)) {
        const cf = end.content as ContentFormat;
        endFormats.set(cf.key, cf);
      }
      end = end.right;
    }
    let reachedCurr = false;
    let s: Item | null = start;
    while (s !== null && s !== end) {
      if (s === this.right) {
        reachedCurr = true;
      }
      if (!s.deleted && isFormat(s)) {
        const content = s.content as ContentFormat;
        const {key, value} = content;
        const startValue = startFormats.get(key) ?? null;
        if (endFormats.get(key) !== content || startValue === value) {
          s.delete(this.tr);
          if (
            !reachedCurr &&
            (this.formats.get(key) ?? null) === value &&
            startValue !== value
          ) {
            if (startValue === null) {
              this.formats.delete(key);
            } else {
              this.formats.set(key, startValue);
            }
          }
        }
      }
      s = s.right;
    }
  }

  /** Apply `formats` to the next `n` content units. */
  format(n: number, formats: Record<string, unknown>): void {
    const view = viewZone(this.hidden);
    for (;;) {
      n = this.formatRun(n, formats);
      if (n <= 0 || view === null) {
        return;
      }
      // Another zone's items: they keep their formats. Step over them and
      // format the rest after them. At an inline range's start or end, the
      // formats were restored before it: go on in or after the range.
      const before = this.right;
      if (this.atJump()) {
        this.forward();
        continue;
      }
      this.hopForeign();
      if (this.right === null || this.right === before) {
        return;
      }
    }
  }

  /**
   * Format up to `n` units, stopping before another zone's items (their
   * formats are not this write's): returns the units left.
   */
  private formatRun(n: number, formats: Record<string, unknown>): number {
    const view = viewZone(this.hidden);
    const foreign = (r: Item) => view !== null && view.foreign(r);
    this.minimizeFormatChanges(formats);
    const negated = this.insertFormats(formats);
    let stopped = false;
    loop: while (
      this.right !== null &&
      (n > 0 ||
        (negated.size > 0 &&
          (this.right.deleted || isFormat(this.right)) &&
          this.mayPass()))
    ) {
      const r = this.right;
      if (foreign(r) || this.atJump()) {
        stopped = true;
        break;
      }
      if (!r.deleted) {
        if (isFormat(r)) {
          const {key, value} = r.content as ContentFormat;
          const attr = formats[key];
          if (attr !== undefined) {
            if (equalFormatValue(attr, value)) {
              negated.delete(key);
            } else {
              if (n === 0) {
                break loop;
              }
              negated.set(key, value);
            }
            r.delete(this.tr);
          } else {
            this.formats.set(key, value);
          }
        } else if (this.counts(r)) {
          if (n < r.length) {
            getItemCleanStart(this.tr, createID(r.id.client, r.id.clock + n));
          }
          n -= Math.min(n, r.length);
          const rec = view === null ? null : view.zones.inlineRec(view.zone);
          if (rec !== null && rec.e === r) {
            // The last item of an inline range is content (a piece of a
            // line): the formats are restored right after it, physically,
            // before the walk leaves the range.
            this.left = r;
            this.right = r.right;
            this.insertNegatedFormats(negated, true);
            // Leave the range: on after its record (see settle).
            view!.zone = view!.zones.ownerOf(rec.item);
            this.left = rec.item;
            this.right = rec.item.right;
            this.formats = formatsAfterItem(this.parent, rec.item);
            this.jumped = true;
            this.settle();
            return n;
          }
        }
      }
      this.forward();
    }
    // At another zone's items, the formats are restored right here (the
    // start of that range): what the range shows keeps its own formats.
    this.insertNegatedFormats(negated, !stopped);
    return stopped ? n : 0;
  }
}

/** The live content length of an item (0 for formats and deleted items). */
export const contentLength = (s: AbstractStruct | null): number =>
  s instanceof Item && isLiveContent(s) ? s.length : 0;
