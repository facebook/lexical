/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Hidden} from './Hidden';

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
  /** Remote content the editor does not show yet: not counted, not deleted. */
  hidden: Hidden | null = null;
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

  /** Step over `right`, tracking formats. */
  forward(): void {
    const item = this.right!;
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
  }

  /** Step over format items and deleted items (never over live content). */
  skipNonContent(): void {
    while (this.right !== null && !isLiveContent(this.right)) {
      this.forward();
    }
  }

  /**
   * Whether `item` (live content) counts: split it so that it is all hidden
   * or all shown, and answer whether it is shown.
   */
  private counts(item: Item): boolean {
    if (!isLiveContent(item)) {
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

  private newItem(content: ContentFormat | ContentString | ContentType): Item {
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
    while (this.right !== null) {
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

  private insertNegatedFormats(negated: Formats): void {
    while (
      this.right !== null &&
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
    for (const [key, val] of negated) {
      this.right = this.newItem(new ContentFormat(key, val as object));
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
    this.minimizeFormatChanges(f);
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
    if (start !== null) {
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
    this.minimizeFormatChanges(formats);
    const negated = this.insertFormats(formats);

    loop: while (
      this.right !== null &&
      (n > 0 ||
        (negated.size > 0 && (this.right.deleted || isFormat(this.right))))
    ) {
      const r = this.right;
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
        }
      }
      this.forward();
    }
    this.insertNegatedFormats(negated);
  }
}

/** The live content length of an item (0 for formats and deleted items). */
export const contentLength = (s: AbstractStruct | null): number =>
  s instanceof Item && isLiveContent(s) ? s.length : 0;
