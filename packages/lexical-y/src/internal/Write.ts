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
  ContentString,
  ContentType,
  Item,
  iterateStructsByIdSet,
  Node as YNode,
  type Transaction,
} from '@y/y';
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type EditorState,
  ElementNode,
  getStaticNodeConfig,
  type Klass,
  type LexicalNode,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {Cursor, equalFormatValue, type Formats, isLiveContent} from './Cursor';
import {
  $pushInline,
  Atoms,
  countLive,
  type DesiredContext,
  diffAtoms,
  PENDING_LINE_BREAK,
  readAtoms,
  type Run,
} from './Inline';
import {
  $groupFields,
  $groupKeyAttrs,
  $isInlineChild,
  $isWrapper,
  $levelItemFields,
  $lineAttrs,
  $nestedGroupOf,
  $nodeAttrs,
  $textAttrs,
  type Attrs,
  BLOCK_PREFIX,
  equalValue,
  FIELD_PREFIX,
  getContainerGroupSpec,
  getGroupSpec,
  getLineSpec,
  GROUP_FIELD_PREFIX,
  GROUP_KEY,
  INLINE_PREFIX,
  isMergeableText,
  isOwnedTextKey,
  KIND_KEY,
  klassOf,
  LEVEL_KEY,
  MARKER,
  OUTER_KEY,
  RUN_END,
  stableStringify,
  STATE_PREFIX,
  storedTypeOf,
  TYPE_KEY,
  WRAPPER_FIELDS_KEY,
  WRAPPER_PREFIX,
} from './Schema';
import {
  type CS,
  EMPTY_FORMATS,
  isEndItem,
  isPartKey,
  nameOf,
  prevLiveEnd,
  type Roles,
  type State,
  typeOf,
  type Unit,
} from './State';

export type Desired = {
  kind: 'line' | 'node' | 'run';
  key: NodeKey | null;
  node: LexicalNode | null;
  nodes: LexicalNode[];
  marker: Attrs | null;
  /** Group context of a line, to compute its marker lazily. */
  ctx: {
    gattrs?: Attrs;
    level?: number;
    derived?: ReadonlySet<string>;
    outer?: Attrs[];
  } | null;
  sig: string;
  first: NodeKey;
  last: NodeKey;
  /**
   * For a part of a line that holds lines (see Writer#$pushLine): the
   * inline children of `node` this part holds. Its key is a part key.
   */
  part?: LexicalNode[];
};

/**
 * The key of part `i` of a line that holds lines (see Writer#$pushLine): no
 * Lexical node has it, so the line itself has no unit while it holds lines
 * and every write of it is a structure write of its container.
 */
const partKey = (key: NodeKey, i: number): NodeKey => key + '\u0001' + i;

/** Whether line `line` holds lines (see Writer#$pushLine). */
export function $holdsLines(roles: Roles, line: ElementNode): boolean {
  for (let c = line.getFirstChild(); c !== null; c = c.getNextSibling()) {
    if ($isElementNode(c) && roles.$role(c) === 'line') {
      return true;
    }
  }
  return false;
}

/**
 * Inline content as the node structure normalization reads it: inline nodes,
 * and the OverflowNode the character limit wraps around overflowing text
 * (kept in its paragraph although its `isInline()` is false).
 */
function $isHeldInline(n: LexicalNode): boolean {
  return $isInlineChild(n) || isOverflowKlass(klassOf(n));
}

function isOverflowKlass(klass: Klass<LexicalNode>): boolean {
  for (
    let k: Klass<LexicalNode> | null = klass;
    k !== null && k.prototype instanceof ElementNode;
    k = Object.getPrototypeOf(k) as Klass<LexicalNode> | null
  ) {
    if (getStaticNodeConfig(k).ownNodeType === 'overflow') {
      return true;
    }
  }
  return false;
}

/**
 * Whether `c`, a child of the line `line` that holds lines, is a plain
 * paragraph the normalization joins into `line` (see $joinParagraphs in
 * lexical).
 */
function $isJoinedParagraph(
  line: ElementNode,
  c: LexicalNode,
): c is ElementNode {
  return (
    $isParagraphNode(c) &&
    !c.isShadowRoot() &&
    !line.isShadowRoot() &&
    c.getChildren().every($isHeldInline)
  );
}

/** The inline children a desired line holds. */
function $lineChildren(d: Desired): LexicalNode[] {
  return d.part ?? (d.node as ElementNode).getChildren();
}

export type WritePlan = {
  structural: Set<NodeKey>;
  inline: Set<NodeKey>;
  lines: Set<NodeKey>;
  attrs: Set<NodeKey>;
  /** Text nodes removed in this update: their previous text. */
  removedText: Map<NodeKey, string>;
  /**
   * Nodes this update moved (Lexical's record of explicit moves): a reorder
   * rewrites these rather than the neighbours they passed.
   */
  moved?: ReadonlySet<NodeKey> | null;
};

export class Writer {
  /** Containers fully written in this transaction. */
  readonly written = new Set<NodeKey>();
  /** Lines and runs whose content was written (for the self-check). */
  readonly touched: {unit: Unit; d: Desired}[] = [];
  /**
   * Rewrite every line, changed or not (recovery after a failed write: the
   * shared content may lag the editor anywhere).
   */
  rewriteAll = false;
  /** Old document order of the text nodes being rewritten (see originOf). */
  private originOrder = new Map<string, number>();
  /** Removed text nodes already attributed in the current write. */
  private claimed = new Set<string>();
  /**
   * Text nodes removed in this update whose old text was in the content
   * being rewritten: the only candidates for the origin of merged text (text
   * from anywhere else has no old characters here to keep), so the cost per
   * merged node is proportional to what is rewritten, not to the update.
   */
  private localRemoved: [string, string][] = [];
  /** See $someLineHoldsLines. */
  private someHoldsLines: boolean | null = null;
  /** Containers where a group item's marker attributes were written. */
  readonly groupWrites = new Set<CS>();
  private readonly isKnownWrapper: (type: string) => boolean;
  constructor(
    readonly state: State,
    readonly roles: Roles,
    readonly tr: Transaction,
    readonly prevState: EditorState,
    readonly plan: WritePlan,
  ) {
    const nodes = state.editor._nodes;
    this.isKnownWrapper = type => nodes.has(type);
  }

  // -------------------------------------------------------------------------
  // Plan

  static $plan(
    roles: Roles,
    dirtyElements: Map<NodeKey, boolean>,
    dirtyLeaves: Set<NodeKey>,
    prevState: EditorState,
  ): WritePlan {
    const plan: WritePlan = {
      attrs: new Set(),
      inline: new Set(),
      lines: new Set(),
      removedText: new Map(),
      structural: new Set(),
    };
    const prevMap = prevState._nodeMap;
    for (const key of dirtyLeaves) {
      const prev = prevMap.get(key);
      if (prev !== undefined && $isTextNode(prev) && prev.__text !== '') {
        const now = $getNodeByKey(key);
        if (now === null || !now.isAttached()) {
          plan.removedText.set(key, prev.__text);
        }
      }
    }
    // Lexical marks nodes dirty for many reasons (the root on every update,
    // siblings whose links change): structure is read from the links.
    const moved = (node: LexicalNode): boolean => {
      const prev = prevMap.get(node.getKey());
      const now = node.getLatest();
      return (
        prev === undefined ||
        prev.__parent !== now.__parent ||
        prev.__prev !== now.__prev ||
        prev.__next !== now.__next
      );
    };
    const childrenChanged = (node: ElementNode): boolean => {
      const prev = prevMap.get(node.getKey());
      const now = node.getLatest();
      return (
        prev === undefined ||
        !$isElementNode(prev) ||
        prev.__first !== now.__first ||
        prev.__last !== now.__last ||
        prev.__size !== now.__size
      );
    };
    const markContainerOf = (node: LexicalNode) => {
      const parent = node.getParent();
      if (parent === null) {
        return;
      }
      const r = roles.$role(parent);
      if (r === 'root' || r === 'container') {
        (roles.$kind(parent) === 'b' ? plan.structural : plan.inline).add(
          parent.getKey(),
        );
      } else if (r === 'line') {
        plan.lines.add(parent.getKey());
      } else if (r === 'wrapper') {
        markOwner(node);
      } else {
        plan.structural.add(roles.$containerOf(parent).getKey());
      }
    };
    const markOwner = (node: LexicalNode) => {
      let p = node.getParent();
      while (p !== null && roles.$role(p) === 'wrapper') {
        p = p.getParent();
      }
      if (p === null) {
        return;
      }
      const r = roles.$role(p);
      if (r === 'line') {
        plan.lines.add(p.getKey());
      } else if (r === 'root' || r === 'container') {
        (roles.$kind(p) === 'b' ? plan.structural : plan.inline).add(
          p.getKey(),
        );
      } else {
        plan.structural.add(roles.$containerOf(p).getKey());
      }
    };
    for (const [key, intentional] of dirtyElements) {
      const node = $getNodeByKey(key);
      if (node === null || !node.isAttached()) {
        continue;
      }
      // Lexical marks an element unintentionally dirty when only a child
      // changed, but can leave that mark on an element that was also cloned
      // and changed (a list type change): skip only when it was not cloned.
      if (!intentional && prevMap.get(key) === node.getLatest()) {
        continue;
      }
      const role = roles.$role(node);
      if (role === 'root') {
        if (childrenChanged(node as ElementNode)) {
          plan.structural.add(key);
        }
        continue;
      }
      if (moved(node)) {
        markContainerOf(node);
      } else if (
        (role === 'wrapper' || role === 'container') &&
        (role === 'wrapper') === roles.state.yByKey.has(key)
      ) {
        // isInline() changed (a class may compute it from a field): a format
        // over its characters became a stored node or the reverse, so the
        // content that holds it is written again.
        markContainerOf(node);
      }
      if (role === 'container') {
        plan.attrs.add(key);
        if (childrenChanged(node as ElementNode)) {
          (roles.$kind(node as ElementNode) === 'b'
            ? plan.structural
            : plan.inline
          ).add(key);
        }
      } else if (role === 'line') {
        plan.lines.add(key);
        // A node that just became a line (an emptied list wrapper) has no
        // unit yet: its container's structure changed.
        if (
          !roles.state.unitByKey.has(key) ||
          $holdsLines(roles, node as ElementNode)
        ) {
          plan.structural.add(roles.$containerOf(node).getKey());
        }
      } else if (role === 'group' || role === 'level') {
        plan.structural.add(roles.$containerOf(node).getKey());
      } else if (role === 'wrapper') {
        markOwner(node);
      } else if (role === 'leaf') {
        plan.attrs.add(key);
      }
    }
    for (const key of dirtyLeaves) {
      const node = $getNodeByKey(key);
      if (node === null || !node.isAttached()) {
        continue;
      }
      const role = roles.$role(node);
      if (role === 'text') {
        markOwner(node);
      } else if (role === 'leaf') {
        plan.attrs.add(key);
        if (moved(node)) {
          markContainerOf(node);
        }
      }
    }
    return plan;
  }

  $run(): void {
    const {state, plan} = this;
    // A line without a unit (it holds lines, see $pushLine, or is one of
    // them) is written with its container's structure.
    for (const key of plan.lines) {
      const node = $getNodeByKey(key);
      if (
        $isElementNode(node) &&
        node.isAttached() &&
        this.roles.$role(node) === 'line' &&
        (!state.unitByKey.has(key) || $holdsLines(this.roles, node))
      ) {
        plan.structural.add(this.roles.$containerOf(node).getKey());
      }
    }
    for (const key of plan.structural) {
      const cs = state.csByKey.get(key);
      const node = $getNodeByKey(key);
      if (cs === undefined || !$isElementNode(node) || this.written.has(key)) {
        continue;
      }
      this.$writeContainer(cs, node);
    }
    for (const key of plan.inline) {
      const cs = state.csByKey.get(key);
      const node = $getNodeByKey(key);
      if (cs === undefined || !$isElementNode(node) || this.written.has(key)) {
        continue;
      }
      this.$writeContainer(cs, node);
    }
    for (const key of plan.lines) {
      const unit = state.unitByKey.get(key);
      const node = $getNodeByKey(key);
      if (
        unit === undefined ||
        !$isElementNode(node) ||
        this.written.has(unit.cs.key) ||
        (unit.end !== null && unit.end.deleted)
      ) {
        continue;
      }
      const d = this.$lineDesired(node);
      if (unit.kind === 'implicit' || this.$contentChanged(key)) {
        this.$writeLineAlone(unit, d);
      } else {
        this.$writeMarker(unit.end!, this.$marker(d));
        unit.sig = d.sig;
        this.touched.push({d, unit});
      }
    }
    for (const key of plan.attrs) {
      const y = state.yByKey.get(key);
      const node = $getNodeByKey(key);
      if (y === undefined || node === null || (y._item && y._item.deleted)) {
        continue;
      }
      this.$writeNodeAttrs(y, node);
    }
    this.unmapDeleted();
  }

  /**
   * Stored nodes this write deleted and did not give a new shared node (a
   * node-stored list that became a level of its group, for example) lose
   * their mapping, so that no later write goes into a deleted shared node,
   * where Yjs drops everything inserted.
   */
  private unmapDeleted(): void {
    const state = this.state;
    const drop = (y: YNode) => {
      const key = state.keyByY.get(y);
      if (key === undefined || state.yByKey.get(key) !== y) {
        return;
      }
      state.keyByY.delete(y);
      state.yByKey.delete(key);
      const cs = state.containers.get(y);
      if (cs !== undefined) {
        state.containers.delete(y);
        if (state.csByKey.get(key) === cs) {
          state.csByKey.delete(key);
        }
        for (const u of cs.units) {
          state.dropUnit(u);
        }
      }
      for (let it = y._start; it !== null; it = it.right) {
        if (it.content instanceof ContentType) {
          drop(it.content.type as YNode);
        }
      }
    };
    iterateStructsByIdSet(this.tr, this.tr.deleteSet, s => {
      if (s instanceof Item && s.content instanceof ContentType) {
        drop(s.content.type as YNode);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Containers

  $writeContainer(cs: CS, node: ElementNode): void {
    this.written.add(cs.key);
    if (cs.kind === 'i') {
      this.$writeInline(cs, node);
    } else {
      this.$writeStructure(cs, node);
    }
  }

  private $writeInline(cs: CS, node: ElementNode): void {
    const atoms = new Atoms();
    const oldOrigins = this.oldInlineOrigins(cs.key);
    this.setOriginOrder(oldOrigins);
    const ctx = this.$ctx(true);
    $pushInline(atoms, node.getChildren(), ctx);
    this.$writeSeq(
      cs.y,
      null,
      EMPTY_FORMATS,
      null,
      atoms,
      ctx.cursorAt,
      oldOrigins,
    );
  }

  /**
   * The origins of the old atoms of `units` (their text nodes in the
   * previous state, in order), or null when they cannot be known.
   */
  private oldOrigins(units: Unit[]): [number, number, string][] | null {
    const map = this.prevState._nodeMap;
    const out: [number, number, string][] = [];
    let pos = 0;
    const visit = (key: NodeKey) => {
      const node = map.get(key);
      if (node === undefined || !$isElementNode(node)) {
        return;
      }
      for (let c = node.__first; c !== null; ) {
        const child = map.get(c);
        if (child === undefined) {
          break;
        }
        if ($isTextNode(child)) {
          const len = child.__text.length;
          if (len > 0) {
            out.push([pos, pos + len, c]);
          }
          pos += len;
        } else if (
          $isElementNode(child) &&
          !this.state.yByKey.has(c) &&
          $isWrapper(child)
        ) {
          visit(c);
        } else {
          pos += 1;
        }
        c = child.__next;
      }
    };
    for (const u of units) {
      if (
        u.key === null ||
        isPartKey(u.key) ||
        (u.kind !== 'line' && u.kind !== 'implicit')
      ) {
        return null;
      }
      visit(u.key);
      if (u.end !== null) {
        pos += 1;
      }
    }
    out.push([pos, pos, '']);
    return out;
  }

  /** The origins of an inline container's old atoms (see oldOrigins). */
  private oldInlineOrigins(key: NodeKey): [number, number, string][] | null {
    const map = this.prevState._nodeMap;
    if (!map.has(key)) {
      return null;
    }
    const out: [number, number, string][] = [];
    let pos = 0;
    const visit = (k: NodeKey) => {
      const node = map.get(k);
      if (node === undefined || !$isElementNode(node)) {
        return;
      }
      for (let c = node.__first; c !== null; ) {
        const child = map.get(c);
        if (child === undefined) {
          break;
        }
        if ($isTextNode(child)) {
          const len = child.__text.length;
          if (len > 0) {
            out.push([pos, pos + len, c]);
          }
          pos += len;
        } else if (
          $isElementNode(child) &&
          !this.state.yByKey.has(c) &&
          $isWrapper(child)
        ) {
          visit(c);
        } else {
          pos += 1;
        }
        c = child.__next;
      }
    };
    visit(key);
    out.push([pos, pos, '']);
    return out;
  }

  private setOriginOrder(origins: [number, number, string][] | null): void {
    this.claimed = new Set();
    this.originOrder = new Map();
    this.localRemoved = [];
    if (origins !== null) {
      origins.forEach(([, , k], i) => {
        this.originOrder.set(k, i);
        const t = this.plan.removedText.get(k);
        if (t !== undefined && t.length > 0) {
          this.localRemoved.push([k, t]);
        }
      });
    }
  }

  /**
   * Origin ranges of a text node's text (see Atoms.origins). Lexical merges
   * adjacent text nodes (a join, an unlink), so the text of a node that
   * existed before can hold the text of nodes removed in this update. From
   * the end, a removed node takes the part its old text ends with when that
   * part is longer than what the node's own old text ends with there (or
   * equal, at the very end, if it is the removed node's whole text and it
   * came later before); then the same from the start; the rest is the
   * node's own.
   */
  private originOf(node: TextNode): [number, number, string][] {
    const key = node.getKey();
    const text = node.getTextContent();
    const prev = this.prevState._nodeMap.get(key);
    if (prev === undefined || !$isTextNode(prev)) {
      // New in this update (a split): free to keep old characters.
      return text.length > 0 ? [[0, text.length, key]] : [];
    }
    const own = prev.__text;
    const removed = this.localRemoved.filter(([k]) => k !== key);
    const order = (k: string) => this.originOrder.get(k) ?? -1;
    // A removed node's text goes to one node only.
    const used = this.claimed;
    const commonSuffix = (a: number, b: number, t: string) => {
      let n = 0;
      while (
        n < b - a &&
        n < t.length &&
        text[b - 1 - n] === t[t.length - 1 - n]
      ) {
        n++;
      }
      return n;
    };
    const commonPrefix = (a: number, b: number, t: string) => {
      let n = 0;
      while (n < b - a && n < t.length && text[a + n] === t[n]) {
        n++;
      }
      return n;
    };
    // After a deletion that joined text (a range delete, Backspace or
    // Delete across lines) the caret sits at the join: the node's own text
    // stops there and a removed node's text follows.
    const sel = $getSelection();
    if (
      $isRangeSelection(sel) &&
      sel.isCollapsed() &&
      sel.anchor.key === key &&
      sel.anchor.type === 'text'
    ) {
      const cut = sel.anchor.offset;
      const rest = text.slice(cut);
      if (
        cut <= own.length &&
        rest.length > 0 &&
        text.startsWith(own.slice(0, cut)) &&
        !own.slice(cut).endsWith(rest)
      ) {
        let from: string | null = null;
        let len = -1;
        for (const [k, t] of this.localRemoved) {
          if (k !== key && !this.claimed.has(k) && t.endsWith(rest)) {
            // Prefer the removed text that is the most of what follows.
            if (len < 0 || t.length < len) {
              from = k;
              len = t.length;
            }
          }
        }
        if (
          from === null &&
          this.plan.removedText.size > this.localRemoved.length
        ) {
          // Text removed elsewhere follows the join (no old characters of
          // it here).
          from = FOREIGN_ORIGIN;
        }
        if (from !== null) {
          this.claimed.add(from);
          return [
            ...(cut > 0 ? ([[0, cut, key]] as [number, number, string][]) : []),
            [cut, text.length, from],
          ];
        }
      }
    }
    const head: [number, number, string][] = [];
    const tail: [number, number, string][] = [];
    let start = 0;
    let end = text.length;
    const claim = (atEnd: boolean, edge: boolean): boolean => {
      const common = atEnd ? commonSuffix : commonPrefix;
      const mine = common(start, end, own);
      if (
        commonSuffix(start, end, own) === end - start ||
        commonPrefix(start, end, own) === end - start
      ) {
        // The node's own old text explains all that is left.
        return false;
      }
      let best = 0;
      let at: string | null = null;
      let whole = false;
      for (const [k, t] of removed) {
        if (used.has(k)) {
          continue;
        }
        const n = common(start, end, t);
        if (
          n > best ||
          (n === best &&
            n > 0 &&
            at !== null &&
            (atEnd ? order(k) > order(at) : order(k) < order(at)))
        ) {
          best = n;
          at = k;
          whole = n === t.length;
        }
      }
      if (at === null || best === 0) {
        return false;
      }
      const wins =
        best > mine ||
        (edge &&
          whole &&
          best === mine &&
          (atEnd ? order(at) > order(key) : order(at) < order(key)));
      if (!wins) {
        return false;
      }
      used.add(at);
      if (atEnd) {
        tail.unshift([end - best, end, at]);
        end -= best;
      } else {
        head.push([start, start + best, at]);
        start += best;
      }
      return true;
    };
    for (let edge = true; end > start && claim(true, edge); edge = false) {
      // keep claiming from the end
    }
    for (let edge = true; end > start && claim(false, edge); edge = false) {
      // keep claiming from the start
    }
    const middle: [number, number, string][] = [];
    if (end > start) {
      // Text removed elsewhere (another line or container than the one
      // being rewritten) can have been merged in too: it has no old
      // characters here. What the node's own old text does not explain at
      // either end is then new text, never built from equal old characters.
      const foreign = this.plan.removedText.size > this.localRemoved.length;
      const p = foreign ? commonPrefix(start, end, own) : end - start;
      const q =
        foreign && p < end - start ? commonSuffix(start + p, end, own) : 0;
      if (p + q >= end - start) {
        middle.push([start, end, key]);
      } else {
        if (p > 0) {
          middle.push([start, start + p, key]);
        }
        middle.push([start + p, end - q, FOREIGN_ORIGIN]);
        if (q > 0) {
          middle.push([end - q, end, key]);
        }
      }
    }
    return [...head, ...middle, ...tail];
  }

  $ctx(withOrigins = false): DesiredContext {
    const selection = $getSelection();
    let cursor: DesiredContext['cursor'] = null;
    if ($isRangeSelection(selection) && selection.isCollapsed()) {
      cursor = {
        key: selection.anchor.key,
        offset: selection.anchor.offset,
        type: selection.anchor.type,
      };
    }
    const state = this.state;
    return {
      cursor,
      cursorAt: -1,
      originOf: withOrigins ? node => this.originOf(node) : null,
      segments: {
        create: key => state.newSegment(key),
        get: key => state.segments.get(key),
      },
    };
  }

  // -------------------------------------------------------------------------
  // Desired units

  $desiredUnits(container: ElementNode): Desired[] {
    const out: Desired[] = [];
    let run: LexicalNode[] = [];
    const flush = () => {
      if (run.length > 0) {
        out.push({
          ctx: null,
          first: run[0].getKey(),
          key: null,
          kind: 'run',
          last: run[run.length - 1].getKey(),
          marker: null,
          node: null,
          nodes: run,
          sig: '',
        });
        run = [];
      }
    };
    for (
      let child = container.getFirstChild();
      child !== null;
      child = child.getNextSibling()
    ) {
      const role = this.roles.$role(child);
      if (role === 'line') {
        flush();
        if (this.$someLineHoldsLines()) {
          this.$pushLine(out, this.$lineDesired(child as ElementNode));
        } else {
          out.push(this.$lineDesired(child as ElementNode));
        }
      } else if (role === 'group') {
        flush();
        this.$flattenGroup(child as ElementNode, 0, child.getKey(), out);
      } else if (!$isInlineChild(child)) {
        flush();
        const key = child.getKey();
        out.push({
          ctx: null,
          first: key,
          key,
          kind: 'node',
          last: key,
          marker: null,
          node: child,
          nodes: [],
          sig: '',
        });
      } else {
        run.push(child);
      }
    }
    flush();
    return out;
  }

  private $flattenGroup(
    group: ElementNode,
    level: number,
    top: NodeKey,
    out: Desired[],
    outer: Attrs[] = [],
  ): void {
    const spec = getGroupSpec(klassOf(group))!;
    const gattrs = $groupKeyAttrs(group, spec);
    const gsig = groupKeySig(gattrs, outer);
    const fields = $groupFields(group, spec);
    for (
      let item = group.getFirstChild();
      item !== null;
      item = item.getNextSibling()
    ) {
      const nested = $nestedGroupOf(item, spec);
      if (nested !== null && this.roles.$role(item) === 'level') {
        this.$flattenGroup(nested, level + 1, top, out, [
          ...outer,
          {
            ...fields,
            [WRAPPER_FIELDS_KEY]: $levelItemFields(item as ElementNode, spec),
          },
        ]);
      } else {
        const d = this.$lineDesired(
          item as ElementNode,
          gattrs,
          level,
          spec.derived,
          top,
          gsig,
          outer,
        );
        if (this.$someLineHoldsLines()) {
          this.$pushLine(out, d);
        } else {
          out.push(d);
        }
      }
    }
  }

  /**
   * Whether a line of the editor may hold lines (see $pushLine): one this
   * write changes does, or one a write stored as the lines it holds still
   * does. Computed once per write: most writes have none.
   */
  private $someLineHoldsLines(): boolean {
    if (this.someHoldsLines === null) {
      const holders = this.state.holders;
      for (const key of holders) {
        const node = $getNodeByKey(key);
        if (
          !$isElementNode(node) ||
          !node.isAttached() ||
          !$holdsLines(this.roles, node)
        ) {
          holders.delete(key);
        }
      }
      this.someHoldsLines = holders.size > 0;
      for (const key of this.plan.lines) {
        if (this.someHoldsLines) {
          break;
        }
        const node = $getNodeByKey(key);
        this.someHoldsLines =
          $isElementNode(node) &&
          node.isAttached() &&
          this.roles.$role(node) === 'line' &&
          $holdsLines(this.roles, node);
      }
    }
    return this.someHoldsLines;
  }

  /**
   * Push desired line `d`. A line that holds lines (an update without the
   * normalization wrote a heading inside a list item) is pushed as the
   * lines the normalization leaves: a plain paragraph it holds is joined
   * into it with line breaks, its inline children are split around each
   * other line it holds (empty runs left out), every run a part with the
   * line's marker, and each held line in its place (recursively). Its text keeps
   * its items when the normalization then lifts the held lines out (the
   * structure it writes is the same lines), and a held line is never stored
   * as a node of its own (see Roles).
   */
  private $pushLine(out: Desired[], d: Desired): void {
    const line = d.node as ElementNode;
    const key = line.getKey();
    // A line with a unit was written whole (a line holding lines has none,
    // its parts have part keys): unless its content changed, it holds none.
    if (
      (this.state.unitByKey.has(key) && !this.plan.lines.has(key)) ||
      !$holdsLines(this.roles, line)
    ) {
      out.push(d);
      return;
    }
    this.state.holders.add(key);
    let run: LexicalNode[] = [];
    let i = 0;
    const flush = () => {
      if (run.length > 0) {
        out.push({...d, key: partKey(line.getKey(), i++), part: run});
        run = [];
      }
    };
    // A plain paragraph becomes lines of the line holding it, joined to its
    // neighbours with line breaks (see $joinParagraphs in lexical): its
    // content goes into the part it is in, with the line breaks the
    // normalization inserts, so that the normalization then writes nothing
    // new there. Whatever follows each child, as $joinParagraphs sees it.
    let prev: 'none' | 'inline' | 'paragraph' | 'block' = 'none';
    for (const c of line.getChildren()) {
      if ($isJoinedParagraph(line, c)) {
        if (prev === 'inline' || prev === 'paragraph') {
          run.push(PENDING_LINE_BREAK);
        }
        run.push(...c.getChildren());
        const next = c.getNextSibling();
        if (next !== null && $isHeldInline(next)) {
          run.push(PENDING_LINE_BREAK);
        }
        prev = 'paragraph';
      } else if ($isElementNode(c) && this.roles.$role(c) === 'line') {
        flush();
        this.$pushLine(out, {
          ...this.$lineDesired(c),
          first: d.first,
          last: d.last,
        });
        prev = 'block';
      } else {
        run.push(c);
        prev = $isHeldInline(c) ? 'inline' : 'block';
      }
    }
    flush();
  }

  /** The desired unit of a line, its group context found from its parents. */
  $lineDesired(
    line: ElementNode,
    gattrs?: Attrs,
    level?: number,
    derived?: ReadonlySet<string>,
    top?: NodeKey,
    gsig?: string,
    outer?: Attrs[],
  ): Desired {
    if (gattrs === undefined) {
      // Find the group context by walking up.
      const parent = line.getParent();
      if (parent !== null && this.roles.$role(parent) === 'group') {
        const spec = getGroupSpec(klassOf(parent))!;
        let lvl = 0;
        let g: ElementNode = parent;
        let topNode: ElementNode = parent;
        const outers: Attrs[] = [];
        for (;;) {
          const levelItem = g.getParent();
          if (levelItem === null || this.roles.$role(levelItem) !== 'level') {
            break;
          }
          lvl++;
          g = levelItem.getParent() as ElementNode;
          const gspec = getGroupSpec(klassOf(g)) || spec;
          outers.unshift({
            ...$groupFields(g, gspec),
            [WRAPPER_FIELDS_KEY]: $levelItemFields(levelItem, gspec),
          });
          topNode = g;
        }
        return this.$lineDesired(
          line,
          $groupKeyAttrs(parent, spec),
          lvl,
          spec.derived,
          topNode.getKey(),
          undefined,
          outers,
        );
      }
      if (parent !== null) {
        const pspec = getContainerGroupSpec(klassOf(parent));
        if (pspec !== null) {
          derived = pspec.derived;
        }
      }
    }
    const sig =
      gattrs === undefined
        ? ''
        : groupSig(
            line.getType(),
            gsig ?? groupKeySig(gattrs, outer || []),
            level || 0,
          );
    const key = line.getKey();
    return {
      ctx: {derived, gattrs, level, outer},
      first: top || key,
      key,
      kind: 'line',
      last: top || key,
      marker: null,
      node: line,
      nodes: [],
      sig,
    };
  }

  /** The marker attributes of a desired line (computed when needed). */
  $marker(d: Desired): Attrs {
    if (d.marker === null) {
      const ctx = d.ctx || {};
      const marker = $lineAttrs(d.node as ElementNode, ctx.derived || null);
      if (ctx.gattrs !== undefined) {
        Object.assign(marker, ctx.gattrs);
        marker[LEVEL_KEY] = ctx.level || 0;
        if (ctx.outer !== undefined && ctx.outer.length > 0) {
          marker[OUTER_KEY] = ctx.outer;
        }
      }
      d.marker = marker;
    }
    return d.marker;
  }

  // -------------------------------------------------------------------------
  // Structure

  private $writeStructure(cs: CS, container: ElementNode): void {
    const desired = this.$desiredUnits(container);
    const old = cs.units;
    const oldIndex = new Map<NodeKey, number>();
    old.forEach((u, i) => {
      if (u.key !== null) {
        oldIndex.set(u.key, i);
      }
    });
    const matches: [number, number][] = [];
    desired.forEach((d, di) => {
      if (d.key === null) {
        return;
      }
      const oi = oldIndex.get(d.key);
      if (oi === undefined) {
        return;
      }
      const o = old[oi];
      if (
        (d.kind === 'line' && (o.kind === 'line' || o.kind === 'implicit')) ||
        (d.kind === 'node' &&
          o.kind === 'node' &&
          o.end !== null &&
          nameOf(o.end).startsWith(BLOCK_PREFIX) &&
          storedTypeOf(typeOf(o.end)) === d.node!.getType())
      ) {
        matches.push([di, oi]);
      }
    });
    // Keep as many blocks in place as possible (a moved unit is deleted and
    // written again, with any concurrent edit inside it). A list counts as
    // one block, however many lines it has. Between equal counts, keep what
    // costs most to rewrite: a block node (its whole subtree is copied, and
    // what peers write inside it meanwhile dropped) outweighs lines.
    const groupSize = new Map<NodeKey, number>();
    for (const d of desired) {
      groupSize.set(d.first, (groupSize.get(d.first) ?? 0) + 1);
    }
    const raw = matches.map(([di]) => unitCost(desired[di]));
    const lineTotal =
      raw.reduce(
        (a, c, k) => (desired[matches[k][0]].kind === 'node' ? a : a + c),
        0,
      ) + 1;
    const costs = raw.map((c, k) =>
      desired[matches[k][0]].kind === 'node' ? lineTotal + c : c,
    );
    const big = costs.reduce((a, b) => a + b, 0) + 1;
    const weightOf = new Map<number, number>();
    matches.forEach(([di], k) =>
      weightOf.set(di, big / groupSize.get(desired[di].first)! + costs[k]),
    );
    // Between choices that keep as many blocks and as much content in place
    // (an exact tie), what the user moved (Lexical's record of explicit
    // moves) is the one rewritten, not the block it passed. Otherwise the
    // cheaper rewrite wins: a long move rewrites the moved block rather than
    // every block it passed, and in an adjacent swap the smaller block is
    // re-created (a container being dragged keeps a peer's typing inside
    // it).
    const moved = this.plan.moved;
    if (moved !== null && moved !== undefined && moved.size > 0) {
      matches.forEach(([di]) => {
        const d = desired[di];
        if ((d.key !== null && moved.has(d.key)) || moved.has(d.first)) {
          weightOf.set(di, weightOf.get(di)! - 0.5);
        }
      });
    }
    const anchors = longestIncreasing(matches, ([di]) => weightOf.get(di)!);
    const n = anchors.length;
    // Changed line anchors join a neighbouring gap (the following one first)
    // so that a split or join diffs their characters with it.
    const gapNonEmpty = (k: number) => {
      const [pd, po] = k > 0 ? anchors[k - 1] : [-1, -1];
      const [nd, no] = k < n ? anchors[k] : [desired.length, old.length];
      return nd - pd > 1 || no - po > 1;
    };
    const changed = (k: number) => {
      const [di, oi] = anchors[k];
      const d = desired[di];
      const o = old[oi];
      return (
        d.kind === 'line' &&
        (o.kind === 'implicit' ||
          d.part !== undefined ||
          (this.plan.lines.has(d.key!) && this.$contentChanged(d.key!)))
      );
    };
    const attach: ('alone' | 'next' | 'prev')[] = [];
    for (let k = 0; k < n; k++) {
      attach.push(
        !changed(k)
          ? 'alone'
          : gapNonEmpty(k + 1)
            ? 'next'
            : gapNonEmpty(k)
              ? 'prev'
              : 'alone',
      );
    }
    const newUnits: Unit[] = [];
    let lastEnd: Item | null = null;
    const used = new Set<Unit>();
    for (let k = 0; k <= n; k++) {
      const [pd, po] = k > 0 ? anchors[k - 1] : [-1, -1];
      const [nd, no] = k < n ? anchors[k] : [desired.length, old.length];
      if (gapNonEmpty(k)) {
        const oldSeg: number[] = [];
        const newSeg: number[] = [];
        if (k > 0 && attach[k - 1] === 'next') {
          oldSeg.push(po);
          newSeg.push(pd);
        }
        for (let i = po + 1; i < no; i++) {
          oldSeg.push(i);
        }
        for (let i = pd + 1; i < nd; i++) {
          newSeg.push(i);
        }
        if (k < n && attach[k] === 'prev') {
          oldSeg.push(no);
          newSeg.push(nd);
        }
        lastEnd = this.$writeSegment(
          cs,
          old,
          oldSeg,
          desired,
          newSeg,
          lastEnd,
          newUnits,
          used,
        );
      }
      if (k < n && attach[k] === 'alone') {
        const [di, oi] = anchors[k];
        const d = desired[di];
        const u = old[oi];
        used.add(u);
        if (d.kind === 'line') {
          if (u.kind === 'implicit' || this.$changed(d)) {
            this.$writeLineAlone(u, d);
          } else if (u.sig !== d.sig || this.plan.lines.has(d.key!)) {
            // Only its attributes (or a derived field) may have changed.
            this.$writeMarker(u.end!, this.$marker(d));
            u.sig = d.sig;
            this.touched.push({d, unit: u});
          }
        }
        u.first = d.first;
        u.last = d.last;
        u.sig = d.sig;
        newUnits.push(u);
        lastEnd = u.end;
      }
    }
    for (const u of old) {
      if (!used.has(u)) {
        this.state.dropUnit(u);
      }
    }
    for (const u of newUnits) {
      this.state.setUnit(u);
    }
    cs.units = newUnits;
    this.$recomputeStarts(cs);
  }

  /**
   * Set every unit's start formats (the formats in effect where it starts)
   * from the shared items: deletes and inserts start from them, and a stale
   * value would leave a format open or close one early.
   */
  private $recomputeStarts(cs: CS): void {
    const formats = new Map<string, unknown>();
    let it: Item | null = cs.y._start;
    for (const u of cs.units) {
      u.start = formats.size > 0 ? new Map(formats) : null;
      if (u.end === null) {
        break;
      }
      for (; it !== null; it = it.right) {
        if (!it.deleted && it.content instanceof ContentFormat) {
          const {key, value} = it.content;
          if (value === null) {
            formats.delete(key);
          } else {
            formats.set(key, value);
          }
        }
        if (it === u.end) {
          it = it.right;
          break;
        }
      }
    }
  }

  /** After a line's own write, the start formats of the units after it. */
  private $fixStartsAfter(u: Unit): void {
    let unit: Unit | undefined = u;
    // Stops where the next unit's start already agrees (usually at once).
    while (unit !== undefined) {
      if (unit.end === null || unit.end.deleted) {
        return;
      }
      const left = prevLiveEnd(unit.end);
      const formats = new Map(unit.start || EMPTY_FORMATS);
      for (
        let it: Item | null = left === null ? unit.cs.y._start : left.right;
        it !== null;
        it = it.right
      ) {
        if (!it.deleted && it.content instanceof ContentFormat) {
          const {key, value} = it.content;
          if (value === null) {
            formats.delete(key);
          } else {
            formats.set(key, value);
          }
        }
        if (it === unit.end) {
          break;
        }
      }
      let next: Item | null = unit.end.right;
      while (next !== null && (next.deleted || !isEndItem(next))) {
        next = next.right;
      }
      const nextUnit: Unit | undefined =
        next === null ? undefined : this.state.unitByEnd.get(next);
      if (nextUnit === undefined || sameFormatMaps(nextUnit.start, formats)) {
        return;
      }
      nextUnit.start = formats.size > 0 ? formats : null;
      unit = nextUnit;
    }
  }

  /**
   * Whether desired line `d` has content to write: its line changed, or it
   * is a part of a line that holds lines (written in full, see $pushLine).
   */
  private $changed(d: Desired): boolean {
    return (
      d.part !== undefined ||
      (this.plan.lines.has(d.key!) && this.$contentChanged(d.key!))
    );
  }

  /**
   * Whether a line's inline content differs from the previous state (node
   * identity, so a line cloned only because a sibling moved is unchanged).
   */
  $contentChanged(key: NodeKey): boolean {
    if (this.rewriteAll) {
      return true;
    }
    const prevMap = this.prevState._nodeMap;
    const same = (k: NodeKey, top: boolean): boolean => {
      const before = prevMap.get(k);
      const now = $getNodeByKey(k);
      if (before === undefined || now === null) {
        return false;
      }
      if (!$isElementNode(before) || !$isElementNode(now)) {
        return before === now.getLatest();
      }
      // An inline element (a link) is cloned when its own properties change;
      // a change to its children alone does not clone it. The line itself is
      // compared by content only (its fields are on the marker).
      if (!top && before !== now.getLatest()) {
        return false;
      }
      let a = before.__first;
      let b = now.getLatest().__first;
      while (a !== null || b !== null) {
        if (a !== b || a === null || !same(a, false)) {
          return false;
        }
        const pa = prevMap.get(a)!;
        a = pa.__next;
        b = $getNodeByKey(b!)!.getLatest().__next;
      }
      return true;
    };
    return !same(key, true);
  }

  private $refreshGroupsOf(line: LexicalNode): void {
    for (let p = line.getParent(); p !== null; p = p.getParent()) {
      const role = this.roles.$role(p);
      if (role === 'group') {
        this.state.refresh.add(p.getKey());
      } else if (role !== 'level') {
        break;
      }
    }
  }

  /** Delete exactly the content of an old unit. */
  private $deleteUnit(old: Unit[], idx: number): void {
    const u = old[idx];
    if (u.kind === 'node') {
      if (u.end !== null && !u.end.deleted) {
        u.end.delete(this.tr);
      }
      return;
    }
    const left = unitLeft(old, idx);
    const stop = unitStop(old, idx);
    const startItem = left === null ? u.cs.y._start : left.right;
    const cursor = this.cursor(u.cs.y, left, u.start || EMPTY_FORMATS);
    cursor.delete(countLive(startItem, stop, this.state.hidden));
  }

  private $writeSegment(
    cs: CS,
    old: Unit[],
    oldSeg: number[],
    desired: Desired[],
    newSeg: number[],
    left: Item | null,
    newUnits: Unit[],
    used: Set<Unit>,
  ): Item | null {
    const remaining: number[] = [];
    for (const oi of oldSeg) {
      const u = old[oi];
      if (u.kind === 'node') {
        this.$deleteUnit(old, oi);
        continue;
      }
      // Every other unit of the segment is diffed with the new lines, by
      // identity of its items: text that moved to another line (a join, a
      // range delete across lines) keeps its items, so a peer's concurrent
      // edits and formats in it stay with it, and text a peer deleted is
      // not re-inserted. A removed line diffs to a deletion.
      remaining.push(oi);
    }
    const lines = newSeg.filter(di => desired[di].kind !== 'node');
    const startFormats =
      remaining.length > 0
        ? old[remaining[0]].start || EMPTY_FORMATS
        : this.formatsAfter(left);
    const startItem = left === null ? cs.y._start : left.right;
    const lineItems = new Map<number, Item>();
    if (remaining.length > 0 || lines.length > 0) {
      const oldStop =
        remaining.length > 0
          ? unitStop(old, remaining[remaining.length - 1])
          : startItem;
      const atoms = new Atoms();
      const oldOrigins = this.oldOrigins(remaining.map(oi => old[oi]));
      this.setOriginOrder(oldOrigins);
      const ctx = this.$ctx(true);
      const markerAt: number[] = [];
      // Old content that ends without a marker (text left before a block by
      // a concurrent edit) diffs against the new content without its last
      // end item, which is inserted after it: a trailing end item would
      // defeat the common suffix and rewrite that text.
      const openTail =
        remaining.length > 0 &&
        old[remaining[remaining.length - 1]].end === null &&
        lines.length > 0;
      lines.forEach((di, i) => {
        const d = desired[di];
        const last = openTail && i === lines.length - 1;
        if (d.kind === 'line') {
          $pushInline(atoms, $lineChildren(d), ctx);
          markerAt.push(atoms.length);
          if (!last) {
            atoms.pushSpecial({kind: 'marker', ref: d}, null);
          }
        } else {
          $pushInline(atoms, d.nodes, ctx);
          markerAt.push(atoms.length);
          if (!last) {
            atoms.pushSpecial({kind: 'runEnd', ref: d}, null);
          }
        }
      });
      const items = this.$writeSeq(
        cs.y,
        left,
        startFormats,
        oldStop,
        atoms,
        ctx.cursorAt,
        oldOrigins,
      );
      if (openTail) {
        const c = this.cursor(cs.y, left, startFormats);
        c.advance(atoms.length);
        const lastD = desired[lines[lines.length - 1]];
        items.set(
          atoms.length,
          c.insertPlain(
            new ContentType(
              new YNode(lastD.kind === 'line' ? MARKER : RUN_END),
            ),
          ),
        );
      }
      lines.forEach((di, i) => lineItems.set(di, items.get(markerAt[i])!));
    }
    // Units, in desired order, and new nodes after the preceding unit.
    const reuse = new Map<NodeKey, Unit>();
    for (const oi of remaining) {
      const u = old[oi];
      if (u.key !== null) {
        reuse.set(u.key, u);
      }
    }
    let after = left;
    for (const di of newSeg) {
      const d = desired[di];
      let end: Item;
      if (d.kind === 'node') {
        const cursor = this.cursor(cs.y, after, EMPTY_FORMATS);
        const y = new YNode(BLOCK_PREFIX + d.node!.getType());
        end = cursor.insertPlain(new ContentType(y));
        this.$fillNode(y, d.node!);
      } else {
        end = lineItems.get(di)!;
        if (d.kind === 'line') {
          this.$writeMarker(end, this.$marker(d));
        }
      }
      let u = d.key !== null ? reuse.get(d.key) : undefined;
      if (u !== undefined && !used.has(u)) {
        this.state.dropUnit(u);
        u.kind = d.kind;
        u.end = end;
        u.sig = d.sig;
      } else {
        u = {
          cs,
          end,
          first: d.first,
          key: d.key,
          kind: d.kind,
          last: d.last,
          sig: d.sig,
          start: startFormats.size > 0 ? startFormats : null,
        };
      }
      u.first = d.first;
      u.last = d.last;
      u.sig = d.sig;
      if (d.sig !== '') {
        // Groups whose items changed: let every client renumber them.
        this.$refreshGroupsOf(d.node!);
      }
      used.add(u);
      newUnits.push(u);
      if (d.kind !== 'node') {
        this.touched.push({d, unit: u});
      }
      after = end;
    }
    // Formats in effect at each unit start (a format can span a marker).
    if (lines.length > 0) {
      const byEnd = new Map<Item, Unit>();
      const segUnits = newUnits.slice(newUnits.length - newSeg.length);
      for (const u of segUnits) {
        if (u.end !== null) {
          byEnd.set(u.end, u);
        }
      }
      const current = new Map(startFormats);
      let pendingStart: Formats = new Map(current);
      let k = 0;
      for (
        let it = startItem;
        it !== null && k < segUnits.length;
        it = it.right
      ) {
        if (it.deleted) {
          continue;
        }
        if (it.content instanceof ContentFormat) {
          if (it.content.value === null) {
            current.delete(it.content.key);
          } else {
            current.set(it.content.key, it.content.value);
          }
          continue;
        }
        const u = byEnd.get(it);
        if (u !== undefined) {
          u.start = pendingStart.size > 0 ? pendingStart : null;
          pendingStart = new Map(current);
          k++;
        }
      }
    }
    // The unit after the segment starts with the formats in effect after it:
    // the segment's deletions and inserts may have removed or added format
    // items that span into it, and later writes start from that value.
    const formats = new Map(startFormats);
    let it: Item | null = startItem;
    if (after !== left) {
      for (; it !== null; it = it.right) {
        if (!it.deleted && it.content instanceof ContentFormat) {
          applyFormat(formats, it.content);
        }
        if (it === after) {
          it = it.right;
          break;
        }
      }
    }
    for (; it !== null; it = it.right) {
      if (it.deleted) {
        continue;
      }
      if (it.content instanceof ContentFormat) {
        applyFormat(formats, it.content);
      } else if (it.countable && isEndItem(it)) {
        const next = this.state.unitByEnd.get(it);
        if (
          next !== undefined &&
          !used.has(next) &&
          !sameFormatMaps(next.start, formats)
        ) {
          next.start = formats.size > 0 ? formats : null;
          this.$fixStartsAfter(next);
        }
        break;
      }
    }
    return after;
  }

  /** A write cursor after `left` that skips content the editor hides. */
  private cursor(y: YNode, left: Item | null, formats: Formats): Cursor {
    const c = new Cursor(this.tr, y, left, new Map(formats));
    c.hidden = this.state.hidden;
    return c;
  }

  /** Formats in effect right after `item` (an end item, or null). */
  private formatsAfter(item: Item | null): Formats {
    if (item === null) {
      return EMPTY_FORMATS;
    }
    const unit = this.state.unitByEnd.get(item);
    const start = prevLiveEnd(item);
    const atoms = new Atoms();
    return readAtoms(
      start === null ? (item.parent as YNode)._start : start.right,
      item.right,
      unit !== undefined && unit.start !== null ? unit.start : EMPTY_FORMATS,
      atoms,
      this.state.hidden,
    );
  }

  /** Rewrite one line (its content and marker) on its own. */
  $writeLineAlone(u: Unit, d: Desired): void {
    if (this.$writeTextEdit(u, d)) {
      return;
    }
    const old = u.cs.units;
    let left: Item | null;
    let stop: Item | null;
    if (u.end !== null) {
      left = prevLiveEnd(u.end);
      stop = u.end.right;
    } else {
      const idx = old.indexOf(u);
      left = unitLeft(old, idx);
      stop = unitStop(old, idx);
    }
    const atoms = new Atoms();
    const oldOrigins = this.oldOrigins([u]);
    this.setOriginOrder(oldOrigins);
    const ctx = this.$ctx(true);
    $pushInline(atoms, $lineChildren(d), ctx);
    const at = atoms.length;
    let end: Item;
    if (u.end === null) {
      // Text without a marker (left by a concurrent edit): diff the content
      // alone (a trailing marker would defeat the common suffix), then end
      // it with a marker.
      this.$writeSeq(
        u.cs.y,
        left,
        u.start || EMPTY_FORMATS,
        stop,
        atoms,
        ctx.cursorAt,
        oldOrigins,
      );
      const c = this.cursor(u.cs.y, left, u.start || EMPTY_FORMATS);
      c.advance(at);
      end = c.insertPlain(new ContentType(new YNode(MARKER)));
    } else {
      atoms.pushSpecial({kind: 'marker', ref: d}, null);
      const items = this.$writeSeq(
        u.cs.y,
        left,
        u.start || EMPTY_FORMATS,
        stop,
        atoms,
        ctx.cursorAt,
        oldOrigins,
      );
      end = items.get(at)!;
    }
    if (end !== u.end) {
      this.state.dropUnit(u);
      u.end = end;
      u.kind = 'line';
      this.state.setUnit(u);
    }
    this.$writeMarker(end, this.$marker(d));
    u.sig = d.sig;
    this.touched.push({d, unit: u});
    this.$fixStartsAfter(u);
  }

  /**
   * Fast path for the common keystroke: the line's children are the same
   * nodes as before except one plain text node of the line whose formats did
   * not change. Its old and new text are diffed alone and written at its
   * offset, so the cost is in the line's items and the changed text, not in
   * the line's length.
   */
  private $writeTextEdit(u: Unit, d: Desired): boolean {
    if (
      u.kind !== 'line' ||
      u.end === null ||
      u.end.deleted ||
      d.part !== undefined
    ) {
      return false;
    }
    const line = d.node as ElementNode;
    const prevMap = this.prevState._nodeMap;
    const before = prevMap.get(line.getKey());
    if (before === undefined || !$isElementNode(before)) {
      return false;
    }
    let changed: TextNode | null = null;
    let changedBefore: TextNode | null = null;
    let offset = 0;
    let a: NodeKey | null = before.__first;
    let b: LexicalNode | null = line.getFirstChild();
    while (a !== null || b !== null) {
      if (a === null || b === null || a !== b.getKey()) {
        return false;
      }
      const prev = prevMap.get(a);
      const now = b.getLatest();
      if (prev === undefined) {
        return false;
      }
      if (prev !== now) {
        if (
          changed !== null ||
          !$isTextNode(prev) ||
          !$isTextNode(now) ||
          prev.__type !== now.__type ||
          prev.__format !== now.__format ||
          prev.__style !== now.__style ||
          prev.__mode !== now.__mode ||
          prev.__detail !== now.__detail ||
          prev.__state !== now.__state ||
          !sameOwnFields(prev, now)
        ) {
          return false;
        }
        changed = now;
        changedBefore = prev;
      } else {
        // An element child (a link) is the same object when only its
        // children changed: its subtree must be unchanged too.
        if ($isElementNode(now) && !sameSubtree(now, prevMap)) {
          return false;
        }
        if (changed === null) {
          offset += $atomSize(now);
        }
      }
      a = prev.__next;
      b = b.getNextSibling();
    }
    if (changed === null || changedBefore === null) {
      return false;
    }
    const oldText = changedBefore.__text;
    const newText = changed.__text;
    const selection = $getSelection();
    let cursor = -1;
    if ($isRangeSelection(selection) && selection.isCollapsed()) {
      if (selection.anchor.key === changed.getKey()) {
        cursor = selection.anchor.offset;
      } else {
        // A caret right before or after the changed node (in a link ending
        // there) anchors the diff at that edge.
        const at = selection.anchor.getNode();
        if (at.isBefore(changed)) {
          cursor = 0;
        } else if (changed.isBefore(at)) {
          cursor = newText.length;
        }
      }
    }
    const {prefix, suffix} = diffStrings(oldText, newText, cursor);
    const del = oldText.length - prefix - suffix;
    const ins = newText.slice(prefix, newText.length - suffix);
    if (del > 0 || ins.length > 0) {
      const left = prevLiveEnd(u.end);
      const c = this.cursor(u.cs.y, left, u.start || EMPTY_FORMATS);
      c.advance(offset + prefix);
      if (del > 0) {
        c.delete(del);
      }
      if (ins.length > 0) {
        const segment = isMergeableText(changed)
          ? null
          : (this.state.segments.get(changed.getKey()) ??
            this.state.newSegment(changed.getKey()));
        c.insert(
          new ContentString(ins),
          this.inheritUnknown(c, $textAttrs(changed, segment)),
        );
      }
    }
    this.$writeMarker(u.end, this.$marker(d));
    u.sig = d.sig;
    this.touched.push({d, unit: u});
    return true;
  }

  // -------------------------------------------------------------------------
  // Sequences

  /**
   * Make the items after `left` up to `oldStop` (exclusive) hold `atoms`:
   * one contiguous delete and insert found by diffing atoms, then the
   * formats that differ. Returns the items of the marker and run-end atoms.
   */
  private $writeSeq(
    y: YNode,
    left: Item | null,
    startFormats: Formats,
    oldStop: Item | null,
    atoms: Atoms,
    cursorAt: number,
    oldOrigins: [number, number, string][] | null = null,
  ): Map<number, Item> {
    const startItem = left === null ? y._start : left.right;
    const old = new Atoms();
    readAtoms(startItem, oldStop, startFormats, old, this.state.hidden);
    const state = this.state;
    // Types of the new inline nodes (those without a shared node yet): a
    // replaced node of one of these types is kept by the new node of its own
    // type, not by another. A sibling that keeps its own shared node competes
    // for nothing.
    const newTypes = new Set<string>();
    atoms.specials.forEach(sp => {
      if (sp.kind === 'inline' && !state.yByKey.has(sp.key)) {
        newTypes.add(sp.node.getType());
      }
    });
    const matchSpecial = (i: number, j: number): boolean => {
      const a = old.specials.get(i)!;
      const b = atoms.specials.get(j)!;
      if (a.kind === 'marker' || a.kind === 'runEnd') {
        return a.kind === b.kind;
      }
      if (a.kind === 'oldNode' && b.kind === 'inline') {
        if (!a.name.startsWith(INLINE_PREFIX)) {
          return false;
        }
        const oy = typeOf(a.item);
        const oldKey = state.keyByY.get(oy);
        if (oldKey === b.key) {
          return storedTypeOf(oy) === b.node.getType();
        }
        // A node Lexical replaced in place by a new one ($setBlocksType, a
        // split that recreates it): keep the shared node (and its content,
        // where a peer may be typing). A node of another type records its
        // type in `t`; what it holds (inline or blocks) must not change.
        const prev = oldKey === undefined ? null : $getNodeByKey(oldKey);
        if (state.yByKey.has(b.key) || (prev !== null && prev.isAttached())) {
          return false;
        }
        const cs = state.containers.get(oy);
        if (
          storedTypeOf(oy) !== b.node.getType() &&
          newTypes.has(storedTypeOf(oy))
        ) {
          return false;
        }
        if ($isElementNode(b.node)) {
          return cs !== undefined && cs.kind === this.roles.$kind(b.node);
        }
        return cs === undefined && storedTypeOf(oy) === b.node.getType();
      }
      return false;
    };
    let {prefix, suffix} = diffAtoms(old, atoms, matchSpecial, cursorAt);
    // An old character is kept only for text of the same origin (the same
    // text node before this update, or a node new in it): text that moved
    // between nodes or lines is written as new text, never built from old
    // characters that happen to be equal.
    if (oldOrigins !== null && atoms.origins.length > 0) {
      const total = oldOrigins[oldOrigins.length - 1][1];
      if (total === old.length) {
        const oldKey = keysAt(oldOrigins, old.length);
        const newKey = keysAt(atoms.origins, atoms.length);
        const prevMap = this.prevState._nodeMap;
        // Where each origin last shows in the new atoms.
        const lastAt = new Map<string, number>();
        newKey.forEach((k, j) => {
          if (k !== undefined) {
            lastAt.set(k, j);
          }
        });
        const same = (i: number, j: number): boolean => {
          const b = newKey[j];
          if (b === undefined) {
            return true;
          }
          const a = oldKey[i];
          if (a === b) {
            return true;
          }
          if (b === FOREIGN_ORIGIN || prevMap.has(b)) {
            return false;
          }
          // Text of a node new in this update keeps an old character only
          // when that character's node is gone or ends before it (the tail
          // a split of the node made): while the old node still shows later
          // on, its characters are its own. A new node with equal text at
          // its start (a paragraph typed in front of a line) must not take
          // them, or a peer's concurrent rewrite of the old node's text
          // removes part of the new text with it.
          if (a === undefined) {
            return true;
          }
          const last = lastAt.get(a);
          return last === undefined || last < j;
        };
        for (let i = 0; i < prefix; i++) {
          if (!same(i, i)) {
            prefix = i;
            break;
          }
        }
        for (let t = 0; t < suffix; t++) {
          if (!same(old.length - 1 - t, atoms.length - 1 - t)) {
            suffix = t;
            break;
          }
        }
        // A cut on one side can let the other side grow back.
        const plain = (i: number, j: number) => {
          const si = old.specials.has(i);
          const sj = atoms.specials.has(j);
          if (si || sj) {
            return si && sj && matchSpecial(i, j);
          }
          return (
            old.text.charCodeAt(i) === atoms.text.charCodeAt(j) && same(i, j)
          );
        };
        const room = () => Math.min(old.length, atoms.length) - prefix - suffix;
        while (room() > 0 && plain(prefix, prefix)) {
          prefix++;
        }
        while (
          room() > 0 &&
          plain(old.length - 1 - suffix, atoms.length - 1 - suffix)
        ) {
          suffix++;
        }
        // Never split a surrogate pair.
        const high = (c: number) => c >= 0xd800 && c <= 0xdbff;
        if (prefix > 0 && high(atoms.text.charCodeAt(prefix - 1))) {
          prefix--;
        }
        if (
          suffix > 0 &&
          high(atoms.text.charCodeAt(atoms.length - suffix - 1))
        ) {
          suffix--;
        }
      }
    }
    const items = new Map<number, Item>();
    for (let i = 0; i < prefix; i++) {
      const it = old.items.get(i);
      if (it !== undefined && atoms.specials.has(i)) {
        items.set(i, it);
      }
    }
    for (let t = 0; t < suffix; t++) {
      const ni = atoms.length - suffix + t;
      const it = old.items.get(old.length - suffix + t);
      if (it !== undefined && atoms.specials.has(ni)) {
        items.set(ni, it);
      }
    }
    // Adopt shared nodes kept for replaced Lexical nodes.
    for (const [i, it] of items) {
      const special = atoms.specials.get(i);
      if (
        special !== undefined &&
        special.kind === 'inline' &&
        state.keyByY.get(typeOf(it)) !== special.key
      ) {
        this.$adoptNode(typeOf(it), special.node);
      }
    }
    const cursor = this.cursor(y, left, startFormats);
    cursor.advance(prefix);
    const del = old.length - prefix - suffix;
    if (del > 0) {
      cursor.delete(del);
    }
    const end = atoms.length - suffix;
    if (end > prefix) {
      this.$insertAtoms(cursor, atoms, prefix, end, items);
    }
    this.$formatPass(y, left, startFormats, atoms);
    return items;
  }

  private inheritUnknown(cursor: Cursor, attrs: Attrs): Attrs {
    let result = attrs;
    cursor.formats.forEach((v, k) => {
      if (!(k in attrs) && !isOwnedTextKey(k, this.isKnownWrapper)) {
        if (result === attrs) {
          result = {...attrs};
        }
        result[k] = v;
      }
    });
    return result;
  }

  private $insertAtoms(
    cursor: Cursor,
    atoms: Atoms,
    from: number,
    to: number,
    items: Map<number, Item>,
  ): void {
    const runs = atoms.runs;
    let r = 0;
    let i = from;
    while (i < to) {
      const special = atoms.specials.get(i);
      while (r < runs.length && runs[r].end <= i) {
        r++;
      }
      const run: Run | undefined =
        r < runs.length && runs[r].start <= i ? runs[r] : undefined;
      if (special !== undefined) {
        if (special.kind === 'marker' || special.kind === 'runEnd') {
          const y = new YNode(special.kind === 'marker' ? MARKER : RUN_END);
          items.set(i, cursor.insertPlain(new ContentType(y)));
        } else if (special.kind === 'inline') {
          const y = new YNode(INLINE_PREFIX + special.node.getType());
          cursor.insert(
            new ContentType(y),
            this.inheritUnknown(cursor, wrapperOnly(run ? run.attrs : {})),
          );
          this.$fillNode(y, special.node);
        }
        i++;
        continue;
      }
      let j = run ? Math.min(run.end, to) : i + 1;
      for (let k = i + 1; k < j; k++) {
        if (atoms.specials.has(k)) {
          j = k;
          break;
        }
      }
      cursor.insert(
        new ContentString(atoms.text.slice(i, j)),
        this.inheritUnknown(cursor, run ? run.attrs : {}),
      );
      i = j;
    }
  }

  /** Format the atoms after `left` whose owned formats differ. */
  private $formatPass(
    y: YNode,
    left: Item | null,
    startFormats: Formats,
    atoms: Atoms,
  ): void {
    const startItem = left === null ? y._start : left.right;
    const actual = new Atoms();
    readAtomsLimited(
      startItem,
      startFormats,
      atoms.length,
      actual,
      this.state.hidden,
    );
    const ops: {start: number; end: number; formats: Attrs; sig: string}[] = [];
    // A line break carries wrapper formats and its own NodeState; a child
    // node carries wrapper formats only.
    const owned = (k: string, wrappersOnly: boolean, isBreak: boolean) =>
      (!wrappersOnly ||
        k.startsWith(WRAPPER_PREFIX) ||
        (isBreak && k.startsWith(STATE_PREFIX))) &&
      isOwnedTextKey(k, this.isKnownWrapper);
    // Walk segments between run boundaries, child nodes and line breaks
    // (where only wrapper formats apply), not characters: the cost is in
    // runs, so a keystroke in a long line stays cheap.
    const text = atoms.text;
    const cuts: number[] = [0, atoms.length];
    for (const r of atoms.runs) {
      cuts.push(r.start, r.end);
    }
    for (const r of actual.runs) {
      cuts.push(r.start, r.end);
    }
    for (const at of atoms.specials.keys()) {
      cuts.push(at, at + 1);
    }
    for (
      let at = text.indexOf('\n');
      at !== -1;
      at = text.indexOf('\n', at + 1)
    ) {
      cuts.push(at, at + 1);
    }
    cuts.sort((a, b) => a - b);
    let ra = 0;
    let rb = 0;
    for (let c = 0; c < cuts.length - 1; c++) {
      const start = cuts[c];
      const end = Math.min(cuts[c + 1], atoms.length);
      if (end <= start) {
        continue;
      }
      const special = atoms.specials.get(start);
      if (
        special !== undefined &&
        (special.kind === 'marker' || special.kind === 'runEnd')
      ) {
        continue;
      }
      while (ra < atoms.runs.length && atoms.runs[ra].end <= start) {
        ra++;
      }
      while (rb < actual.runs.length && actual.runs[rb].end <= start) {
        rb++;
      }
      const want =
        ra < atoms.runs.length && atoms.runs[ra].start <= start
          ? atoms.runs[ra].attrs
          : {};
      const have =
        rb < actual.runs.length && actual.runs[rb].start <= start
          ? actual.runs[rb].attrs
          : {};
      const isBreak = special === undefined && text.charCodeAt(start) === 10;
      const wrappersOnly = special !== undefined || isBreak;
      let diff: Attrs | null = null;
      for (const k in want) {
        if (
          owned(k, wrappersOnly, isBreak) &&
          !equalFormatValue(want[k] ?? null, have[k] ?? null)
        ) {
          (diff || (diff = {}))[k] = want[k] ?? null;
        }
      }
      for (const k in have) {
        if (
          !(k in want) &&
          owned(k, wrappersOnly, isBreak) &&
          have[k] !== null
        ) {
          (diff || (diff = {}))[k] = null;
        }
      }
      if (diff !== null) {
        const sig = stableStringify(diff);
        const prev = ops[ops.length - 1];
        if (prev !== undefined && prev.end === start && prev.sig === sig) {
          prev.end = end;
        } else {
          ops.push({end, formats: diff, sig, start});
        }
      }
    }
    if (ops.length === 0) {
      return;
    }
    const cursor = this.cursor(y, left, startFormats);
    let pos = 0;
    for (const op of ops) {
      cursor.advance(op.start - pos);
      cursor.format(op.end - op.start, {...op.formats});
      pos = op.end;
    }
  }

  // -------------------------------------------------------------------------
  // Markers and nodes

  private $writeMarker(item: Item, desired: Attrs): void {
    const y = typeOf(item);
    const current = y.getAttrs() as Attrs;
    let changed = false;
    for (const k in desired) {
      if (!equalValue(current[k], desired[k])) {
        y.setAttr(k, desired[k]);
        changed = true;
      }
    }
    const types = [
      desired[TYPE_KEY] ?? 'paragraph',
      current[TYPE_KEY] ?? 'paragraph',
    ];
    for (const k in current) {
      if (!(k in desired) && this.isOwnedMarkerKey(k, types)) {
        y.deleteAttr(k);
        changed = true;
      }
    }
    if (changed && (GROUP_KEY in desired || GROUP_KEY in current)) {
      const cs = this.state.containers.get(item.parent as YNode);
      if (cs !== undefined) {
        this.groupWrites.add(cs);
      }
    }
  }

  isOwnedMarkerKey(key: string, types: unknown[]): boolean {
    if (
      key === TYPE_KEY ||
      key === GROUP_KEY ||
      key === LEVEL_KEY ||
      key === OUTER_KEY ||
      key.startsWith(GROUP_FIELD_PREFIX) ||
      key.startsWith(STATE_PREFIX)
    ) {
      return true;
    }
    if (key.startsWith(FIELD_PREFIX)) {
      const f = key.slice(FIELD_PREFIX.length);
      for (const t of types) {
        const info =
          typeof t === 'string' ? this.state.editor._nodes.get(t) : undefined;
        const spec = info ? getLineSpec(info.klass) : null;
        if (spec !== null && spec.fields.has(f)) {
          return true;
        }
      }
    }
    return false;
  }

  $writeNodeAttrs(y: YNode, node: LexicalNode): void {
    const desired = $nodeAttrs(node);
    const current = y.getAttrs() as Attrs;
    if (String(y.name).slice(2) !== node.getType()) {
      desired[TYPE_KEY] = node.getType();
    } else if (TYPE_KEY in current) {
      y.deleteAttr(TYPE_KEY);
    }
    for (const k in desired) {
      if (!equalValue(current[k], desired[k])) {
        y.setAttr(k, desired[k]);
      }
    }
    for (const k in current) {
      if (
        !(k in desired) &&
        (k.startsWith(FIELD_PREFIX) || k.startsWith(STATE_PREFIX))
      ) {
        y.deleteAttr(k);
      }
    }
  }

  /** Map a kept shared node to the Lexical node that replaced its node. */
  private $adoptNode(y: YNode, node: LexicalNode): void {
    const state = this.state;
    const oldKey = state.keyByY.get(y);
    if (oldKey !== undefined) {
      state.yByKey.delete(oldKey);
      state.csByKey.delete(oldKey);
    }
    state.mapNode(node.getKey(), y);
    this.$writeNodeAttrs(y, node);
    const cs = state.containers.get(y);
    if ($isElementNode(node) && cs !== undefined) {
      this.written.add(node.getKey());
      if (cs.kind === 'i') {
        this.$writeInline(cs, node);
      } else {
        this.$writeStructure(cs, node);
      }
    }
  }

  /** Write a new stored node: attributes, and its container. */
  $fillNode(y: YNode, node: LexicalNode): void {
    const key = node.getKey();
    const attrs = $nodeAttrs(node);
    for (const k in attrs) {
      y.setAttr(k, attrs[k]);
    }
    this.state.mapNode(key, y);
    if ($isElementNode(node)) {
      const kind = this.roles.$kind(node);
      y.setAttr(KIND_KEY, kind);
      const cs = this.state.newCS(y, key, kind);
      this.written.add(key);
      if (kind === 'i') {
        this.$writeInline(cs, node);
      } else {
        this.$writeStructure(cs, node);
      }
    }
  }
}

/** Whether an element's descendants are the objects of the previous state. */
function sameSubtree(
  node: ElementNode,
  prevMap: Map<NodeKey, LexicalNode>,
): boolean {
  for (const c of node.getChildren()) {
    const now = c.getLatest();
    if (prevMap.get(c.getKey()) !== now) {
      return false;
    }
    if ($isElementNode(now) && !sameSubtree(now, prevMap)) {
      return false;
    }
  }
  const prev = prevMap.get(node.getKey());
  return (
    prev !== undefined &&
    $isElementNode(prev) &&
    prev.__size === node.getChildrenSize()
  );
}

/** Atoms a node occupies in its line (wrappers are transparent). */
function $atomSize(node: LexicalNode): number {
  if ($isTextNode(node)) {
    return node.getTextContentSize();
  }
  if ($isElementNode(node) && $isWrapper(node)) {
    let n = 0;
    for (const c of node.getChildren()) {
      n += $atomSize(c);
    }
    return n;
  }
  return 1;
}

/** Common prefix and suffix of two strings, the prefix limited by a cursor. */
const NOT_FIELDS = new Set([
  '__text',
  '__key',
  '__parent',
  '__prev',
  '__next',
  '__state',
  '__cachedText',
]);

/** Whether two versions of a node have the same own fields (but text). */
function sameOwnFields(prev: LexicalNode, now: LexicalNode): boolean {
  const a = prev as unknown as Record<string, unknown>;
  const b = now as unknown as Record<string, unknown>;
  for (const k of Object.keys(b)) {
    if (k.startsWith('__') && !NOT_FIELDS.has(k) && a[k] !== b[k]) {
      return false;
    }
  }
  return true;
}

function sameFormatMaps(a: Formats | null, b: Formats): boolean {
  const x = a || EMPTY_FORMATS;
  if (x.size !== b.size) {
    return false;
  }
  for (const [k, v] of x) {
    if (!b.has(k) || !equalFormatValue(v, b.get(k))) {
      return false;
    }
  }
  return true;
}

function diffStrings(
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

const isHighSurrogate = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;

function wrapperOnly(attrs: Attrs): Attrs {
  const out: Attrs = {};
  for (const k in attrs) {
    if (k.startsWith(WRAPPER_PREFIX)) {
      out[k] = attrs[k];
    }
  }
  return out;
}

/** The live end item before an old unit (after earlier deletions too). */
/** The signature of a group item: what decides its place in the groups. */
/** The signature of a group item's group: its key and its outer keys. */
export function groupKeySig(gattrs: Attrs, outer: Attrs[]): string {
  const sig = stableStringify(gattrs);
  return outer.length === 0 ? sig : sig + '\u0000' + stableStringify(outer);
}

export function groupSig(type: string, gsig: string, level: number): string {
  return type + '\u0000' + gsig + '\u0000' + level;
}

/** The live end item before an old unit (after earlier deletions too). */
export function unitLeft(units: Unit[], idx: number): Item | null {
  const u = units[idx];
  if (u.end !== null) {
    return prevLiveEnd(u.end);
  }
  let e = idx > 0 ? units[idx - 1].end : null;
  while (e !== null && e.deleted) {
    e = prevLiveEnd(e);
  }
  return e;
}

/** The item right after an old unit (exclusive stop), or null. */
export function unitStop(units: Unit[], idx: number): Item | null {
  const u = units[idx];
  if (u.end !== null) {
    return u.end.right;
  }
  const next = units[idx + 1];
  return next !== undefined && next.end !== null && next.kind === 'node'
    ? next.end
    : null;
}

/** Read exactly `limit` atoms from `start`. */
function readAtomsLimited(
  start: Item | null,
  formats: Formats,
  limit: number,
  out: Atoms,
  hidden: Hidden | null,
): void {
  let stop: Item | null = start;
  let n = 0;
  while (stop !== null && n < limit) {
    if (isLiveContent(stop)) {
      n += hidden === null ? stop.length : hidden.shownLength(stop);
    }
    stop = stop.right;
  }
  readAtoms(start, stop, formats, out, hidden);
}

/** Longest strictly increasing subsequence on the second coordinate. */
/** The origin key at each atom position (undefined outside text). */
function keysAt(
  ranges: [number, number, string][],
  length: number,
): (string | undefined)[] {
  const out = new Array<string | undefined>(length);
  for (const [a, b, k] of ranges) {
    if (k === '') {
      continue;
    }
    for (let i = a; i < b && i < length; i++) {
      out[i] = k;
    }
  }
  return out;
}

/** What rewriting a unit costs, roughly (its text and nodes). */
function unitCost(d: Desired): number {
  if (d.node === null || d.node === undefined) {
    return 1;
  }
  let n = 1 + d.node.getTextContentSize();
  if (d.kind === 'node' && $isElementNode(d.node)) {
    const stack: LexicalNode[] = [d.node];
    while (stack.length > 0) {
      const e = stack.pop()!;
      n++;
      if ($isElementNode(e)) {
        stack.push(...e.getChildren());
      }
    }
  }
  return n;
}

/**
 * The heaviest subsequence of `pairs` (in order of their first index) whose
 * second indices increase: O(n log n) with a Fenwick tree of maxima.
 */
export function longestIncreasing(
  pairs: [number, number][],
  weight: (pair: [number, number]) => number = () => 1,
): [number, number][] {
  const n = pairs.length;
  if (n === 0) {
    return [];
  }
  let size = 0;
  for (const [, v] of pairs) {
    size = Math.max(size, v + 1);
  }
  const treeBest = new Array<number>(size + 1).fill(0);
  const treeAt = new Array<number>(size + 1).fill(-1);
  const best = new Array<number>(n).fill(0);
  const prev = new Array<number>(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const v = pairs[i][1];
    // Best chain ending at a second index < v.
    let b = 0;
    let at = -1;
    for (let k = v; k > 0; k -= k & -k) {
      if (treeBest[k] > b) {
        b = treeBest[k];
        at = treeAt[k];
      }
    }
    best[i] = b + weight(pairs[i]);
    prev[i] = at;
    for (let k = v + 1; k <= size; k += k & -k) {
      if (best[i] > treeBest[k]) {
        treeBest[k] = best[i];
        treeAt[k] = i;
      }
    }
  }
  let end = 0;
  for (let i = 1; i < n; i++) {
    if (best[i] > best[end]) {
      end = i;
    }
  }
  const out: [number, number][] = [];
  for (let i = end; i !== -1; i = prev[i]) {
    out.push(pairs[i]);
  }
  return out.reverse();
}

export {isEndItem};

/** The origin of merged text whose old characters are not in the rewrite. */
const FOREIGN_ORIGIN = '\u0000foreign';

function applyFormat(formats: Map<string, unknown>, f: ContentFormat): void {
  if (f.value === null) {
    formats.delete(f.key);
  } else {
    formats.set(f.key, f.value);
  }
}
