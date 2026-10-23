/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*
 * Repairs of shapes that concurrent edits can leave and that Lexical would
 * normalize, while remote reads skip Lexical's transforms:
 *
 * - a ragged table (row insert ‖ column insert): short rows are padded with
 *   empty cells marked as padding, and an empty padding cell at the end of a
 *   row wider than the table (its column went away, e.g. an undo of the
 *   column insert) is removed again;
 * - two equal lists stored as nodes side by side (two peers adding a list to
 *   one list item): the second one's content is appended to the first, and
 *   the second is deleted.
 *
 * Every client that sees such a shape repairs it, so no particular client
 * has to be online. A repair is a pure function of the shared content: its
 * inputs are read from Yjs (never from the editor), described in a form
 * independent of how the items happen to be split, and its output is
 * computed from that description alone. It is written under a client id
 * derived from the repair version, that description and the encoded output
 * (written to a scratch document), so clients with the same inputs write the
 * same items under the same id (Yjs keeps one), and clients with different
 * inputs never share an id (at worst both repairs apply; they never corrupt
 * each other).
 */

import {
  ContentFormat,
  ContentString,
  ContentType,
  Doc,
  encodeStateAsUpdate,
  type Item,
  Node as YNode,
  type Transaction,
} from '@y/y';

import {Cursor, type Formats, isLiveContent} from './Cursor';
import {isMoveItem} from './Moves';
import {
  BLOCK_PREFIX,
  FIELD_PREFIX,
  INLINE_PREFIX,
  KIND_KEY,
  MARKER,
  stableStringify,
} from './Schema';

/** Bump when a repair's output for the same inputs changes. */
export const REPAIR_VERSION = 1;

/** Attribute of a table cell a repair added to pad a row. */
export const PAD_KEY = 'pad';

// BLOCK_PREFIX + type (literals, so that the module has no side effects).
const TABLE = 'b:table';
const ROW = 'b:tablerow';
const CELL = 'b:tablecell';
// TableCellHeaderStates.ROW
const HEADER_ROW = 1;

/** One repair: what it depends on (`seed`), and the write. */
export type Repair = {
  readonly seed: string;
  readonly write: (tr: Transaction) => void;
};

const nameOf = (it: Item): string =>
  it.content instanceof ContentType ? String(it.content.type.name ?? '') : '';

const typeOf = (it: Item): YNode => (it.content as ContentType).type as YNode;

function liveItems(y: YNode): Item[] {
  const out: Item[] = [];
  for (let it = y._start; it !== null; it = it.right) {
    if (isLiveContent(it)) {
      out.push(it);
    }
  }
  return out;
}

function lastStruct(y: YNode): Item | null {
  let last: Item | null = null;
  for (let it = y._start; it !== null; it = it.right) {
    last = it;
  }
  return last;
}

const lastIdOf = (it: Item | null): string =>
  it === null ? '-' : `${it.lastId.client}.${it.lastId.clock}`;

const idOf = (it: Item): string => `${it.id.client}.${it.id.clock}`;

function formatsAtEnd(y: YNode): Formats {
  const formats = new Map<string, unknown>();
  for (let it = y._start; it !== null; it = it.right) {
    if (!it.deleted && it.content instanceof ContentFormat) {
      const {key, value} = it.content;
      if (value === null) {
        formats.delete(key);
      } else {
        formats.set(key, value);
      }
    }
  }
  return formats;
}

/** A node's attributes, sorted (values are plain JSON). */
function attrsOf(y: YNode): [string, unknown][] {
  const attrs = y.getAttrs() as Record<string, unknown>;
  return Object.keys(attrs)
    .sort()
    .map(k => [k, attrs[k]]);
}

// ---------------------------------------------------------------------------
// Logical content (independent of item splits)

type Piece =
  | {kind: 'text'; text: string; formats: Record<string, unknown>}
  | {
      kind: 'node';
      name: string;
      attrs: [string, unknown][];
      children: Piece[];
      formats: Record<string, unknown>;
    };

/**
 * The live content of a container: text runs with the formats in effect
 * (adjacent text with equal formats is one run, however it is split into
 * items) and child nodes with their attributes and content. Also appends
 * the coalesced id ranges of that content to `ids`.
 */
function piecesOf(y: YNode, ids: string[]): Piece[] {
  const out: Piece[] = [];
  const formats = new Map<string, unknown>();
  let run: {client: number; start: number; end: number} | null = null;
  const flushIds = () => {
    if (run !== null) {
      ids.push(`${run.client}:${run.start}-${run.end}`);
      run = null;
    }
  };
  for (let it = y._start; it !== null; it = it.right) {
    if (it.deleted) {
      continue;
    }
    const content = it.content;
    if (content instanceof ContentFormat) {
      if (content.value === null) {
        formats.delete(content.key);
      } else {
        formats.set(content.key, content.value);
      }
      continue;
    }
    if (!it.countable) {
      continue;
    }
    if (
      run !== null &&
      run.client === it.id.client &&
      run.end === it.id.clock
    ) {
      run.end = it.id.clock + it.length;
    } else {
      flushIds();
      run = {
        client: it.id.client,
        end: it.id.clock + it.length,
        start: it.id.clock,
      };
    }
    const f = Object.fromEntries(
      [...formats].sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    if (content instanceof ContentString) {
      const last = out[out.length - 1];
      if (
        last !== undefined &&
        last.kind === 'text' &&
        stableStringify(last.formats) === stableStringify(f)
      ) {
        last.text += content.str;
      } else {
        out.push({formats: f, kind: 'text', text: content.str});
      }
    } else if (content instanceof ContentType) {
      flushIds();
      const child = content.type as YNode;
      ids.push('[');
      const children = piecesOf(child, ids);
      ids.push(']');
      out.push({
        attrs: attrsOf(child),
        children,
        formats: f,
        kind: 'node',
        name: String(child.name ?? ''),
      });
    }
    // Other content (embeds) is never written by this binding inside the
    // containers repairs copy; it is left out.
  }
  flushIds();
  return out;
}

/** Write `pieces` after `left` in `parent` (each with exactly its formats). */
function writePieces(
  tr: Transaction,
  parent: YNode,
  left: Item | null,
  formats: Formats,
  pieces: Piece[],
): void {
  const cursor = new Cursor(tr, parent, left, new Map(formats));
  for (const p of pieces) {
    if (p.kind === 'text') {
      cursor.insert(new ContentString(p.text), p.formats);
    } else {
      const node = new YNode(p.name);
      cursor.insert(new ContentType(node), p.formats);
      for (const [k, v] of p.attrs) {
        node.setAttr(k, v as never);
      }
      writePieces(tr, node, null, new Map(), p.children);
    }
  }
}

/** The encoded result of writing `pieces` into an empty scratch container. */
function encodeOutput(parts: [string, Piece[]][]): string {
  const doc = new Doc({gc: false});
  doc.clientID = 1;
  doc.transact(tr => {
    for (const [name, pieces] of parts) {
      writePieces(tr, doc.get(name), null, new Map(), pieces);
    }
  });
  const bytes = encodeStateAsUpdate(doc);
  doc.destroy();
  let s = '';
  for (let i = 0; i < bytes.length; i += 4096) {
    s += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + 4096)),
    );
  }
  return s;
}

// ---------------------------------------------------------------------------
// Equal lists side by side

/**
 * Pairs of adjacent stored group nodes with equal key fields in `container`
 * (`keyOf` gives a node's group key, or null when it is not a group).
 */
export function findListMerges(
  container: YNode,
  keyOf: (node: YNode) => string | null,
): Repair[] {
  const out: Repair[] = [];
  const live = liveItems(container);
  // Units that moved (move records) show elsewhere than their items:
  // adjacency in the sequence is not adjacency on screen (checked once a
  // merge is found: most containers have none).
  let moved: boolean | null = null;
  // From the end, so that a run of three merges into the first.
  for (let k = live.length - 1; k > 0; k--) {
    const a = live[k - 1];
    const b = live[k];
    const an = nameOf(a);
    if (
      an === '' ||
      an !== nameOf(b) ||
      !(an.startsWith(INLINE_PREFIX) || an.startsWith(BLOCK_PREFIX))
    ) {
      continue;
    }
    const ka = keyOf(typeOf(a));
    if (ka === null || ka !== keyOf(typeOf(b))) {
      continue;
    }
    if (moved === null) {
      moved = live.some(isMoveItem);
    }
    if (moved) {
      return [];
    }
    out.push(listMerge(a, b));
    k--;
  }
  return out;
}

function listMerge(a: Item, b: Item): Repair {
  const ay = typeOf(a);
  const by = typeOf(b);
  const ids: string[] = [];
  const pieces = piecesOf(by, ids);
  const left = lastStruct(ay);
  const endFormats = formatsAtEnd(ay);
  // The first piece starts from no formats (the copied content had none in
  // effect at its start).
  const reset: Record<string, unknown> = {};
  for (const key of endFormats.keys()) {
    reset[key] = null;
  }
  const inputs = stableStringify({
    a: idOf(a),
    aEnd: lastIdOf(left),
    aFormats: [...endFormats].sort(([x], [y]) => (x < y ? -1 : 1)),
    b: idOf(b),
    bIds: ids,
    kind: 'list-merge',
  });
  return {
    seed: inputs + '\u0000' + encodeOutput([['b', pieces]]),
    write: tr => {
      writePieces(
        tr,
        ay,
        left,
        endFormats,
        pieces.map(p => ({...p, formats: {...reset, ...p.formats}})),
      );
      b.delete(tr);
    },
  };
}

// ---------------------------------------------------------------------------
// Ragged tables

/** The tables (stored as `b:table`) that contain any of `nodes`. */
export function tablesOf(nodes: Iterable<YNode>): Set<YNode> {
  const out = new Set<YNode>();
  for (const start of nodes) {
    for (
      let y: YNode | null = start;
      y !== null;
      y = y._item === null ? null : (y._item.parent as YNode)
    ) {
      if (y.name === TABLE) {
        out.add(y);
        break;
      }
    }
  }
  return out;
}

const span = (cell: YNode, field: 'colSpan' | 'rowSpan'): number => {
  const v = cell.getAttr(FIELD_PREFIX + field);
  return typeof v === 'number' && v >= 1 ? Math.min(v, 1000) : 1;
};

function isEmptyPad(cell: YNode): boolean {
  if (cell.getAttr(PAD_KEY) !== true) {
    return false;
  }
  const live = liveItems(cell);
  return (
    live.length === 1 &&
    nameOf(live[0]) === MARKER &&
    Object.keys(typeOf(live[0]).getAttrs()).length === 0
  );
}

/** The repair of a ragged table, or null when every row has one width. */
export function tableRepair(table: YNode): Repair | null {
  const all = liveItems(table);
  const rows = all.filter(it => nameOf(it) === ROW);
  // Moved rows show in another order than their items: row spans cannot
  // be followed in item order (a table with moved rows and row spans is
  // left as it is).
  if (
    all.some(isMoveItem) &&
    rows.some(row =>
      liveItems(typeOf(row)).some(
        it => nameOf(it) === CELL && span(typeOf(it), 'rowSpan') > 1,
      ),
    )
  ) {
    return null;
  }
  const widths = rows.map(() => 0);
  const carried = rows.map(() => 0);
  const padTail = rows.map(() => 0);
  const desc: unknown[] = [];
  rows.forEach((row, r) => {
    const cells = liveItems(typeOf(row)).filter(it => nameOf(it) === CELL);
    const cdesc: unknown[] = [];
    for (const it of cells) {
      const cell = typeOf(it);
      const cols = span(cell, 'colSpan');
      const down = span(cell, 'rowSpan');
      widths[r] += cols;
      for (let k = 1; k < down && r + k < rows.length; k++) {
        carried[r + k] += cols;
      }
      cdesc.push([
        idOf(it),
        cols,
        down,
        cell.getAttr(FIELD_PREFIX + 'headerState') ?? 0,
        isEmptyPad(cell) ? 1 : 0,
      ]);
    }
    for (let k = cells.length - 1; k >= 0; k--) {
      const cell = typeOf(cells[k]);
      if (
        span(cell, 'colSpan') !== 1 ||
        span(cell, 'rowSpan') !== 1 ||
        !isEmptyPad(cell)
      ) {
        break;
      }
      padTail[r]++;
    }
    desc.push([idOf(row), lastIdOf(lastStruct(typeOf(row))), cdesc]);
  });
  const total = widths.map((w, r) => w + carried[r]);
  const width = Math.max(0, ...total.map((t, r) => t - padTail[r]));
  type Plan = {row: Item; add: number; remove: Item[]; header: number};
  const plans: Plan[] = [];
  rows.forEach((row, r) => {
    if (total[r] === width) {
      return;
    }
    const cells = liveItems(typeOf(row)).filter(it => nameOf(it) === CELL);
    const last = cells[cells.length - 1];
    const hs =
      last === undefined
        ? 0
        : typeOf(last).getAttr(FIELD_PREFIX + 'headerState');
    const header = typeof hs === 'number' ? hs & HEADER_ROW : 0;
    const remove =
      total[r] > width ? cells.slice(cells.length - (total[r] - width)) : [];
    plans.push({add: Math.max(0, width - total[r]), header, remove, row});
  });
  if (plans.length === 0) {
    return null;
  }
  const cellPieces = (header: number): Piece => ({
    attrs: [
      [KIND_KEY, 'b'],
      ...(header !== 0
        ? ([[FIELD_PREFIX + 'headerState', header]] as [string, unknown][])
        : []),
      [PAD_KEY, true],
    ].sort(([x], [y]) => ((x as string) < (y as string) ? -1 : 1)) as [
      string,
      unknown,
    ][],
    children: [
      {attrs: [], children: [], formats: {}, kind: 'node', name: MARKER},
    ],
    formats: {},
    kind: 'node',
    name: CELL,
  });
  const outputs: [string, Piece[]][] = plans.map((p, i) => [
    'row' + i,
    Array.from({length: p.add}, () => cellPieces(p.header)),
  ]);
  const inputs = stableStringify({
    kind: 'table',
    plans: plans.map(p => [idOf(p.row), p.add, p.remove.map(idOf)]),
    rows: desc,
    table: table._item === null ? '-' : idOf(table._item),
  });
  return {
    seed: inputs + '\u0000' + encodeOutput(outputs),
    write: tr => {
      plans.forEach((p, i) => {
        for (const it of p.remove) {
          it.delete(tr);
        }
        if (p.add > 0) {
          const ry = typeOf(p.row);
          writePieces(tr, ry, lastStruct(ry), new Map(), outputs[i][1]);
        }
      });
    },
  };
}
