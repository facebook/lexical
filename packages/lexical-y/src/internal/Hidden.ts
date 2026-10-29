/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {NodeKey} from 'lexical';

import {type Item} from '@y/y';

/*
 * Remote content not yet shown in the editor.
 *
 * While the local editor is composing (IME), a remote insert into the
 * composing line is applied to Yjs but not to the line's Lexical nodes:
 * rewriting them would move the browser's composition. The inserted ids are
 * kept here; every reader and writer of that line skips them (the line is
 * the editor's view of Yjs minus these ids), and the line is read again
 * when the composition ends. Items can be split or merged by Yjs, so this
 * works on id ranges, not items.
 */
export class Hidden {
  /** Sorted, merged [start, end) clock ranges per client. */
  private readonly ranges = new Map<number, [number, number][]>();
  constructor(readonly ownerKey: NodeKey) {}

  /** Each hidden [start, end) clock range of `client`. */
  forEachRange(fn: (client: number, start: number, end: number) => void) {
    this.ranges.forEach((list, client) => {
      for (const [start, end] of list) {
        fn(client, start, end);
      }
    });
  }

  add(client: number, clock: number, len: number): void {
    let list = this.ranges.get(client);
    if (list === undefined) {
      list = [];
      this.ranges.set(client, list);
    }
    list.push([clock, clock + len]);
    list.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const r of list) {
      const last = merged[merged.length - 1];
      if (last !== undefined && r[0] <= last[1]) {
        last[1] = Math.max(last[1], r[1]);
      } else {
        merged.push([r[0], r[1]]);
      }
    }
    this.ranges.set(client, merged);
  }

  /**
   * The runs of `item` (offsets within it), alternating hidden and shown:
   * `[length, hidden]` pairs that add up to the item's length.
   */
  runs(item: Item): [number, boolean][] {
    const list = this.ranges.get(item.id.client);
    const start = item.id.clock;
    const end = start + item.length;
    if (list === undefined) {
      return [[item.length, false]];
    }
    const out: [number, boolean][] = [];
    let pos = start;
    for (const [rs, re] of list) {
      if (re <= pos) {
        continue;
      }
      if (rs >= end) {
        break;
      }
      if (rs > pos) {
        out.push([rs - pos, false]);
      }
      const e = Math.min(re, end);
      out.push([e - Math.max(rs, pos), true]);
      pos = e;
    }
    if (pos < end) {
      out.push([end - pos, false]);
    }
    return out;
  }

  /** The length of `item` the editor shows. */
  shownLength(item: Item): number {
    let n = 0;
    for (const [len, hidden] of this.runs(item)) {
      if (!hidden) {
        n += len;
      }
    }
    return n;
  }

  /** The shown offset (within the item) of the item's unit at `offset`. */
  shownBefore(item: Item, offset: number): number {
    let n = 0;
    let pos = 0;
    for (const [len, hidden] of this.runs(item)) {
      if (pos >= offset) {
        break;
      }
      if (!hidden) {
        n += Math.min(len, offset - pos);
      }
      pos += len;
    }
    return n;
  }

  /** The unit offset (within the item) of the `shown`-th shown unit. */
  unitAt(item: Item, shown: number): number {
    let pos = 0;
    for (const [len, hidden] of this.runs(item)) {
      if (!hidden) {
        if (shown < len) {
          return pos + shown;
        }
        shown -= len;
      }
      pos += len;
    }
    return pos;
  }
}

/** The length of an item the editor shows (live content only). */
export function shownLength(item: Item, hidden: Hidden | null): number {
  if (item.deleted || !item.countable) {
    return 0;
  }
  return hidden === null ? item.length : hidden.shownLength(item);
}
