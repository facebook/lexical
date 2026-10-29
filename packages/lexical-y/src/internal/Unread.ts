/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  ContentAny,
  ContentBinary,
  ContentType,
  createID,
  createIdSet,
  type IdSet,
  Item,
  Node as YNode,
  type Transaction,
} from '@y/y';

/*
 * A remote change the editor does not show yet, while the binding writes a
 * local update made before it.
 *
 * A provider can apply a remote change in the same task as a local update
 * made before any commit (see YBinding#commitsAtOnce): Yjs integrates the
 * change first, and the binding commits the local update, and writes it,
 * before it reads the change (see YBinding#commitPending). The local update
 * was made on the document as it was before the change, so it is written on
 * that document: the items the change inserted are not there, and the items
 * it deleted still are (a delete of one by this write deletes nothing more).
 * An attribute is set or deleted where it was before the change, so that
 * Yjs settles it with the change's value as it settles concurrent values.
 * Yjs then merges the write with the change as it merges any concurrent
 * changes, and the change is read after the write. Why: written on the
 * changed document, the update's offsets point at other text (a delete
 * before them shifts them), and what it rewrites (a line's text or formats,
 * a marker's attributes) brings back what the change deleted and removes
 * what it inserted.
 *
 * A binding sees the document this way from the moment Yjs starts applying
 * a change until the binding has read it (see YBinding#noteChange), in all
 * its work (see seenBy): the writes and the selections it takes in between
 * are its editor's, which shows none of the changes it has not read, its
 * own writes excepted. Another binding of the document sees it as its own
 * editor shows it, and only items under a binding's root are seen through
 * its view.
 */

/**
 * The document under a root as it was before the changes a binding has not
 * read yet.
 */
export interface Unread {
  /** The changes, in the order Yjs applied them (see noteChange). */
  readonly changes: Transaction[];
  /** The binding's root. */
  readonly root: YNode;
  /** What the changes deleted that the writes since deleted too. */
  readonly removed: IdSet;
  /** Whether each type is under the root (see viewOf). */
  readonly under: Map<YNode, boolean>;
}

/** The view of the binding whose work is running (see seenBy). */
let seer: (() => Unread | null) | null = null;

/** The document under `root` as it was before any change. */
export function emptyView(root: YNode): Unread {
  return {changes: [], removed: createIdSet(), root, under: new Map()};
}

/** Whether one of the changes of `view` inserted `item`. */
function inserted(view: Unread, item: Item): boolean {
  for (const change of view.changes) {
    if (change.insertSet.hasId(item.id)) {
      return true;
    }
  }
  return false;
}

/** Whether one of the changes of `view` deleted `item`. */
function deleted(view: Unread, item: Item): boolean {
  for (const change of view.changes) {
    if (change.deleteSet.hasId(item.id)) {
      return true;
    }
  }
  return false;
}

/**
 * Run `fn`, a binding's work, on the document as that binding's editor shows
 * it: `view()` is the changes it has not read yet, if any (it can change
 * while `fn` runs). Work of another binding nested in `fn` runs on that
 * binding's view.
 */
export function seenBy<T>(view: () => Unread | null, fn: () => T): T {
  const prev = seer;
  seer = view;
  try {
    return fn();
  } finally {
    seer = prev;
  }
}

/** The view the running work sees the items of `type` in, if any. */
function viewOf(type: YNode): Unread | null {
  const view = seer === null ? null : seer();
  if (view === null) {
    return null;
  }
  let under = view.under.get(type);
  if (under === undefined) {
    under = false;
    for (let t: YNode | null = type; t !== null; t = t.parent) {
      if (t === view.root) {
        under = true;
        break;
      }
    }
    view.under.set(type, under);
  }
  return under ? view : null;
}

/** Whether `item` is deleted, in the document the write sees. */
export function isGone(item: Item): boolean {
  const view = viewOf(item.parent as YNode);
  if (view === null) {
    return item.deleted;
  }
  if (inserted(view, item)) {
    return true;
  }
  if (!item.deleted) {
    return false;
  }
  return !deleted(view, item) || view.removed.hasId(item.id);
}

/**
 * Delete `item` (not gone, see isGone): an item an unread change deleted is
 * only noted as deleted by this write.
 */
export function deleteItem(item: Item, tr: Transaction): void {
  if (item.deleted) {
    const view = viewOf(item.parent as YNode);
    if (view !== null) {
      view.removed.add(item.id.client, item.id.clock, item.length);
      return;
    }
  }
  item.delete(tr);
}

/**
 * The item holding attribute `key` of `y` before the unread changes (the
 * current one, or one they replaced), or null.
 */
function attrItem(y: YNode, view: Unread, key: string): Item | null {
  let v: Item | null = y._map.get(key) ?? null;
  while (v !== null && inserted(view, v)) {
    v = v.left;
  }
  return v;
}

/** The value of attribute `key` of `y`, in the document the write sees. */
export function attrOf(y: YNode, key: string): unknown {
  const view = viewOf(y);
  if (view === null) {
    return y.getAttr(key);
  }
  const v = attrItem(y, view, key);
  if (v === null || isGone(v)) {
    return undefined;
  }
  const content = v.content.getContent();
  return content[content.length - 1];
}

/** The attributes of `y`, in the document the write sees. */
export function attrsOf(y: YNode): Record<string, unknown> {
  if (viewOf(y) === null) {
    return y.getAttrs() as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  y._map.forEach((_item, key) => {
    const value = attrOf(y, key);
    if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

/** Set attribute `key` of `y`, after its value in the document seen. */
export function setAttr(
  y: YNode,
  key: string,
  value: unknown,
  tr: Transaction,
): void {
  const view = viewOf(y);
  const left = view === null ? null : attrItem(y, view, key);
  if (view === null || left === (y._map.get(key) ?? null)) {
    y.setAttr(key, value as never);
    return;
  }
  // As Y.Node#setAttr, after the value the write sees.
  const doc = tr.doc;
  const content =
    value instanceof YNode
      ? new ContentType(value)
      : value instanceof Uint8Array
        ? new ContentBinary(value)
        : new ContentAny([value]);
  new Item(
    createID(doc.clientID, doc.store.getClock(doc.clientID)),
    left,
    left && left.lastId,
    null,
    null,
    y,
    key,
    content,
  ).integrate(tr, 0);
}

/** Delete attribute `key` of `y`: its value in the document seen. */
export function deleteAttr(y: YNode, key: string, tr: Transaction): void {
  const view = viewOf(y);
  if (view === null) {
    y.deleteAttr(key);
    return;
  }
  const v = attrItem(y, view, key);
  if (v !== null && !isGone(v)) {
    deleteItem(v, tr);
  }
}
