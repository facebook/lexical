/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Block handles: the shortest prefix of a block id, at least
// MIN_BLOCK_HANDLE_LENGTH characters long, that no other id of the document
// starts with, like a short git hash. Handles are derived from the ids of one
// document and never stored. These helpers are pure: BlockIdExtension feeds
// them the ids and decides which blocks are live.

/**
 * The shortest handle, unless the id itself is shorter.
 *
 * @experimental
 */
export const MIN_BLOCK_HANDLE_LENGTH = 4;

/** The handles of a set of ids. */
export interface HandleTable {
  /** The distinct ids, in ascending UTF-16 code unit order. */
  readonly sorted: readonly string[];
  /** Id → its handle. */
  readonly handles: ReadonlyMap<string, string>;
}

function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) {
    i++;
  }
  return i;
}

/**
 * The handle of `id` between its neighbours in sorted order: long enough to
 * differ from both, so from every other id, capped at the id's length (an id
 * that is a prefix of another is its own handle, and resolves by exact match).
 */
function handleBetween(
  id: string,
  prev: string | undefined,
  next: string | undefined,
): string {
  let length = MIN_BLOCK_HANDLE_LENGTH;
  if (prev !== undefined) {
    length = Math.max(length, commonPrefixLength(id, prev) + 1);
  }
  if (next !== undefined) {
    length = Math.max(length, commonPrefixLength(id, next) + 1);
  }
  return length >= id.length ? id : id.slice(0, length);
}

/** The first index of `sorted` whose id is not below `value`. */
function lowerBound(sorted: readonly string[], value: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * The handles of `ids` (duplicates allowed), in O(n log n): after sorting,
 * only an id's neighbours can share a longer prefix with it than any other id.
 */
export function buildHandleTable(ids: Iterable<string>): HandleTable {
  const sorted = Array.from(new Set(ids)).sort();
  const handles = new Map<string, string>();
  for (let i = 0; i < sorted.length; i++) {
    handles.set(
      sorted[i],
      handleBetween(sorted[i], sorted[i - 1], sorted[i + 1]),
    );
  }
  return {handles, sorted};
}

/**
 * The handle of `id` against the ids of `table`, whether or not `id` is one
 * of them (a block named after the table was built).
 */
export function handleInTable(table: HandleTable, id: string): string {
  const known = table.handles.get(id);
  if (known !== undefined) {
    return known;
  }
  const {sorted} = table;
  const i = lowerBound(sorted, id);
  return handleBetween(id, sorted[i - 1], sorted[i]);
}

/** The ids of `table` that start with `prefix`, in sorted order. */
export function idsWithPrefix(table: HandleTable, prefix: string): string[] {
  const {sorted} = table;
  const result: string[] = [];
  for (
    let i = lowerBound(sorted, prefix);
    i < sorted.length && sorted[i].startsWith(prefix);
    i++
  ) {
    result.push(sorted[i]);
  }
  return result;
}
