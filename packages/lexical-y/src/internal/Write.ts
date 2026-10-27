/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
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
  type ElementNode,
  type LexicalNode,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {pushAll} from './Arrays';
import {$withoutLevelId, innerBlockIds, NO_IDS} from './BlockIds';
import {Cursor, equalFormatValue, type Formats} from './Cursor';
import {groupKeySig, groupSig} from './Groups';
import {
  $pushInline,
  Atoms,
  countLive,
  type DesiredContext,
  diffAtoms,
  diffStrings,
  PENDING_LINE_BREAK,
  readAtoms,
  type Run,
  snapToWords,
} from './Inline';
import {
  enterZone,
  formatsAfterItem,
  idRef,
  isInlineRecordItem,
  isMoveItem,
  MOVE,
  MOVE_END_KEY,
  MOVE_INLINE_KEY,
  MOVE_ORIGIN_KEY,
  MOVE_PRIORITY_KEY,
  MOVE_START_KEY,
  type Shown,
  stepZone,
  type Zone,
  Zones,
  ZoneView,
} from './Moves';
import {
  $groupFields,
  $isInlineChild,
  $isWrapper,
  $levelItemFields,
  $lineAttrs,
  $nestedGroupOf,
  $nodeAttrs,
  $stateAttrs,
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
  groupAttrsOf,
  type GroupSpec,
  INLINE_PREFIX,
  isMergeableText,
  isOwnedTextKey,
  isTextFieldKey,
  KIND_KEY,
  klassOf,
  LEVEL_KEY,
  MARKER,
  OUTER_KEY,
  outerWithoutTextFields,
  RUN_END,
  stableStringify,
  STATE_PREFIX,
  storedTypeOf,
  TYPE_KEY,
  UNIT_KEY,
  WRAPPER_FIELDS_KEY,
  WRAPPER_PREFIX,
} from './Schema';
import {$writeSlots} from './Slots';
import {
  type CS,
  EMPTY_FORMATS,
  isBlockNodeItem,
  isEndItem,
  isPartKey,
  lineStart,
  nameOf,
  nextZoneEnd,
  physicalStarts,
  prevBoundary,
  prevLiveEnd,
  type Roles,
  startItemAfter,
  type State,
  typeOf,
  type Unit,
} from './State';
import {$isHeldInline} from './Structure';
import {type Segment, type TextEditLog, TextReplay} from './TextEdits';

// Writer: the editor to Yjs, for one commit. $plan finds what the commit
// changed (structure, inline content, lines, attributes); $run writes it
// into the shared sequences, from items the binding already knows (see
// Cursor), so a keystroke costs the line it changed, not the document.
//
// Invariant: what a commit did not change keeps its items, and text keeps an
// old item only if it comes from the same Lexical text node as before (see
// originOf). Why: a collaborator's concurrent edit of that content merges
// instead of being lost, and text a peer deleted is never resurrected from
// equal characters.
//
// Invariant: a follow-up (no one's edit) may set attributes or delete, never
// insert (see followUp). Why: every client that has the commit makes it, so
// an insert would be written once per client.

const __DEV__ = process.env.NODE_ENV !== 'production';

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

/**
 * Whether a text node of a line stores the same attributes as a text node
 * next to it, both mergeable, not composing and not empty: every reader shows
 * them as one run (see DesiredContext.flattened). Lexical keeps two such nodes
 * apart while one is being composed, and where it compares their NodeState by
 * reference (equal objects parsed apart); the edit that ends the composition
 * changes the composed node alone, which the keystroke path (see
 * Writer#$writeTextEdit) would write without reading the author back.
 */
function $runsWithNeighbour(node: TextNode): boolean {
  if (
    !isMergeableText(node) ||
    node.isComposing() ||
    node.getTextContentSize() === 0
  ) {
    return false;
  }
  let attrs: string | null = null;
  for (const other of [node.getPreviousSibling(), node.getNextSibling()]) {
    if (
      $isTextNode(other) &&
      other.__type === node.__type &&
      other.__format === node.__format &&
      other.__style === node.__style &&
      isMergeableText(other) &&
      !other.isComposing() &&
      other.getTextContentSize() > 0
    ) {
      if (attrs === null) {
        attrs = stableStringify($textAttrs(node, null));
      }
      if (stableStringify($textAttrs(other, null)) === attrs) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Whether a text node is below element `el`, at any depth. Its textFormat
 * and textStyle are then derived: Lexical's reconciler sets them from the
 * first text it renders under the element, on each client that renders it.
 * Otherwise (empty, or holding only inline decorators or line breaks) they
 * are its own, stored: no client derives them, and Lexical sets them where
 * a delete empties the element (from the text removed). See
 * Writer#keepsStored.
 */
export function $holdsText(el: ElementNode): boolean {
  for (let c = el.getFirstChild(); c !== null; c = c.getNextSibling()) {
    if ($isTextNode(c) || ($isElementNode(c) && $holdsText(c))) {
      return true;
    }
  }
  return false;
}

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
 * Whether `c`, a child of the line `line` that holds lines, is a plain
 * paragraph the normalization joins into `line` (see isJoinableParagraph in
 * lexical's LexicalStructure.ts).
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

/**
 * The text node right after `node` in its line, through the inline elements
 * around and after it, or null.
 */
function $nextText(node: LexicalNode): TextNode | null {
  let at: LexicalNode = node;
  let next = at.getNextSibling();
  while (next === null) {
    const parent = at.getParent();
    if (!$isElementNode(parent) || !parent.isInline()) {
      return null;
    }
    at = parent;
    next = at.getNextSibling();
  }
  while ($isElementNode(next) && next.isInline()) {
    next = next.getFirstChild();
  }
  return $isTextNode(next) ? next : null;
}

/**
 * A join across ranges (see MOVE_INLINE_KEY): line `p` (anchor `k`) keeps
 * its first `keep` atoms and shows the next line `t` (old index `ti`) from
 * atom `from` on, through an inline record.
 */
type Join = {
  k: number;
  p: Unit;
  t: Unit;
  ti: number;
  keep: number;
  pLength: number;
  from: number;
  /** The start (exclusive) of the inline record's range: `t`'s start. */
  s: Item | null;
  /**
   * When `t` is not one range (see Writer#unitPieces): one inline record
   * per piece, in order.
   */
  pieces?: {s: Item | null; e: Item; items: Item[]}[];
};

/** What a zoned structure write passes to each gap's write. */
type MoveContext = {
  movedOf: Map<number, number>;
  groupOf: Map<
    number,
    {
      s: Item | null;
      e: Item;
      p: number;
      replaces: Item | null;
      record: Item | null;
    }
  >;
  contentLater: [Unit, Desired][];
  slotAfterItem: (
    z: Zone,
    item: Item | null,
  ) => {zone: Zone; left: Item | null};
};

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
  /**
   * Text nodes Lexical's normalization merged in this update, the node kept
   * and the nodes merged into it (the update's `normalizedNodes`): which
   * removed text nodes were merged rather than deleted (see $mergedOrigins).
   * Null when not known.
   */
  merged?: ReadonlySet<NodeKey> | null;
  /**
   * Text nodes a split made in this update (EditorState#_splitNodes): the
   * node each was split from and where in that node's text it starts (see
   * $splitTailOrigins). Null when not known.
   */
  splits?: ReadonlyMap<NodeKey, [NodeKey, number]> | null;
  /**
   * The text edits Lexical recorded in this update (EditorState#_textEdits):
   * where a text node's text was spliced, split, merged or set, and where
   * nodes were inserted and removed (see TextReplay). Null when not known.
   */
  textEdits?: TextEditLog | null;
  /**
   * Elements whose attributes this update changed where a follow-up cannot
   * write them (see Writer#$run): the textFormat or textStyle of a group, a
   * level or a wrapper item, and of a line or stored container with text
   * below it, where they are derived (see $holdsText, Writer#keepsStored),
   * and any field of a paragraph a read made around text in a quote that
   * holds paragraphs (stored nowhere).
   */
  unwritable?: Set<NodeKey>;
  /** A follow-up write that every client makes (list refresh, repair). */
  followUp?: boolean;
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
  /**
   * A follow-up of a commit (the binding's refresh, BlockIdExtension's
   * naming, the update that runs a newly registered transform over the
   * document), which every client that has the commit makes: it may set
   * attributes (of markers and stored nodes) and delete (units, and
   * children of a line or inline container), never insert content or
   * structure, which every client would insert again. A line without a
   * marker (text left by concurrent edits) has nowhere to keep its fields:
   * a change of them or of its content is not written (only a marker, an
   * insert, could keep the line as the editor shows it); readers derive its
   * block id (see Reader#$materialize). Any other change is not written:
   * its container is in `refused` (the binding reads it again), with a
   * warning in development.
   */
  followUp = false;
  /**
   * Containers where a follow-up's change was not written (see followUp),
   * or where the editor holds a block id that is not written (see
   * $levelFields): read again.
   */
  readonly refused = new Set<CS>();
  /**
   * Groups whose items this write rewrote, for the refresh after it (see
   * YBinding#flushRefresh).
   */
  readonly refreshGroups = new Set<NodeKey>();
  /** Whether a group's fields left out an outer group's id (see $levelFields). */
  private droppedOuterId = false;

  /** Old document order of the text nodes being rewritten (see originOf). */
  private originOrder = new Map<string, number>();
  /** The keys of originOrder, in that order. */
  private originKeys: string[] = [];
  /** Removed text nodes already attributed in the current write. */
  private claimed = new Set<string>();
  /** See $splitTailOrigins: computed on first use. */
  private splitTails: Map<NodeKey, number> | null = null;
  /** See idsOf: computed on first use. */
  private replay: TextReplay | null | undefined = undefined;
  /**
   * The old atom of each line break and inline node of the content whose
   * old origins (see oldOrigins) are the key: see $exactAtoms.
   */
  private readonly oldNodeAtoms = new WeakMap<
    [number, number, string][],
    Map<NodeKey, number>
  >();
  /**
   * Removed nodes whose whole old text a part split off them holds, with
   * that part (see setOriginOrder).
   */
  private reservedFor = new Map<string, NodeKey>();
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
  /**
   * Stored nodes written with a value that holds an array hole (see
   * hasArrayHole): stored as null, which readers parse as the class does
   * (see YBinding#$normalize).
   */
  readonly holed = new Set<NodeKey>();
  private readonly isKnownWrapper: (type: string) => boolean;
  /** Ownership used while a container's structure is written (moves). */
  private readonly zoneOverride = new Map<YNode, Zones>();
  /** The zone the current unit-level write is in. */
  private zone: Zone = null;
  /** Whether this write wrote a move record. */
  wroteRecord = false;
  /** Whether this write lifted a block in place (UNIT_KEY, layout 2). */
  wroteUnitMark = false;
  /** Containers written with move records (checked against a read). */
  zonedWrites = new Set<CS>();
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
    // A paragraph a read made around inline content in a shadow root (see
    // Reader's $inShadowRoot) is not stored yet: its line is written.
    const unstored = (p: ElementNode): boolean =>
      roles.$role(p) === 'container' &&
      !roles.state.csByKey.has(p.getKey()) &&
      !roles.state.yByKey.has(p.getKey()) &&
      prevMap.has(p.getKey());
    const markOwner = (node: LexicalNode) => {
      let p = node.getParent();
      while (p !== null && (roles.$role(p) === 'wrapper' || unstored(p))) {
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
      // A paragraph a read made around text in a quote that holds
      // paragraphs is stored nowhere: no unit, container or node.
      const runParagraph =
        $isParagraphNode(node) &&
        !roles.state.unitByKey.has(key) &&
        !roles.state.csByKey.has(key) &&
        !roles.state.yByKey.has(key);
      {
        const prev = prevMap.get(key);
        const now = node.getLatest();
        // A line's and a stored container's text fields are stored where no
        // text is below it, and derived elsewhere (see $holdsText): a
        // follow-up writes the stored ones (see Writer#keepsStored), not the
        // derived ones, nor those of a group, a level or a wrapper item.
        const storedText =
          ((role === 'line' && !runParagraph) || role === 'container') &&
          $isElementNode(now) &&
          !$holdsText(now);
        if (
          $isElementNode(prev) &&
          $isElementNode(now) &&
          (((prev.__textFormat !== now.__textFormat ||
            prev.__textStyle !== now.__textStyle) &&
            !storedText) ||
            (runParagraph && !sameAttrFields(prev, now)))
        ) {
          (plan.unwritable ??= new Set()).add(key);
        }
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
      if (this.followUp && cs.kind === 'b') {
        this.written.add(key);
        this.$writeFollowUp(cs, node);
      } else if (this.followUp && !this.$deletesOnly(key)) {
        this.written.add(key);
        this.refuse(cs, 'the content of', node);
      } else {
        this.$writeContainer(cs, node);
      }
    }
    for (const key of plan.inline) {
      const cs = state.csByKey.get(key);
      const node = $getNodeByKey(key);
      if (cs === undefined || !$isElementNode(node) || this.written.has(key)) {
        continue;
      }
      if (this.followUp && !this.$deletesOnly(key)) {
        this.refuse(cs, 'the content of', node);
      } else {
        this.$writeContainer(cs, node);
      }
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
      if (this.followUp) {
        // A follow-up writes nothing of a line in a container whose change
        // it does not write, nor of a line it moved to another container:
        // its group fields there come from a structure that is not stored.
        const now = node.isAttached()
          ? state.csByKey.get(this.roles.$containerOf(node).getKey())
          : undefined;
        if (this.refused.has(unit.cs) || now !== unit.cs) {
          this.refuse(unit.cs, 'the structure of', node);
          if (now !== undefined) {
            this.refused.add(now);
          }
          continue;
        }
      }
      this.droppedOuterId = false;
      const d = this.$lineDesired(node);
      if (this.droppedOuterId) {
        this.refused.add(unit.cs);
      }
      if (unit.end === null) {
        // A line without a marker is written (given one) only when this
        // update changed it (see $implicitChanged). A follow-up's change of
        // its content is refused: only a marker (an insert) could keep it.
        if (!this.followUp) {
          if (this.$implicitChanged(key)) {
            this.$writeLineAlone(unit, d);
          }
        } else if (this.$contentChanged(key) || this.$fieldsChanged(key)) {
          this.refuse(unit.cs, 'the content of', node);
        }
      } else if (this.$contentChanged(key)) {
        if (!this.followUp || this.$deletesOnly(key)) {
          this.$writeLineAlone(unit, d);
        } else {
          this.refuse(unit.cs, 'the content of', node);
        }
      } else {
        this.$writeMarker(unit.end, this.$marker(d), d.node);
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
    if (this.followUp && plan.unwritable !== undefined) {
      // A follow-up's change of the text format or style of an element where
      // they are derived (text below it), or that is not a line or stored
      // container, is not written (see keepsStored), and readers do not
      // derive them from the stored content; one of the paragraph a read
      // made around text in a quote would need that paragraph stored (an
      // insert): its container is read again, as for any change a follow-up
      // does not write. Before, the author kept them while every reader
      // showed none (soak S4-5).
      for (const key of plan.unwritable) {
        const node = $getNodeByKey(key);
        if (node !== null && node.isAttached()) {
          const cs = state.csByKey.get(this.roles.$containerOf(node).getKey());
          if (cs !== undefined) {
            this.refuse(cs, 'the text format of', node);
          }
        }
      }
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
    iterateStructsByIdSet(this.tr, this.tr.deleteSet, s => {
      if (s instanceof Item && s.content instanceof ContentType) {
        this.state.unmapTree(s.content.type as YNode);
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
    if (ctx.flattened === true) {
      this.refused.add(cs);
    }
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
    const nodeAtoms = new Map<NodeKey, number>();
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
          nodeAtoms.set(c, pos);
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
    this.oldNodeAtoms.set(out, nodeAtoms);
    return out;
  }

  /** The origins of an inline container's old atoms (see oldOrigins). */
  private oldInlineOrigins(key: NodeKey): [number, number, string][] | null {
    const map = this.prevState._nodeMap;
    if (!map.has(key)) {
      return null;
    }
    const out: [number, number, string][] = [];
    const nodeAtoms = new Map<NodeKey, number>();
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
          nodeAtoms.set(c, pos);
          pos += 1;
        }
        c = child.__next;
      }
    };
    visit(key);
    out.push([pos, pos, '']);
    this.oldNodeAtoms.set(out, nodeAtoms);
    return out;
  }

  private setOriginOrder(origins: [number, number, string][] | null): void {
    this.claimed = new Set();
    this.originOrder = new Map();
    this.originKeys = [];
    this.localRemoved = [];
    this.reservedFor = new Map();
    if (origins !== null) {
      origins.forEach(([, , k], i) => {
        this.originOrder.set(k, i);
        this.originKeys.push(k);
        const t = this.plan.removedText.get(k);
        if (t !== undefined && t.length > 0) {
          this.localRemoved.push([k, t]);
        }
      });
    }
    // A part Lexical split off a removed node of this content that holds
    // that node's whole old text keeps its characters, whatever was done to
    // the node's other parts (text typed in front of the cut, merged into
    // another node): reserved for it before any node claims them. Why:
    // typing at the start of a commented run after an equal word (`da ` then
    // a commented `da t2z`) leaves the typed text, cut off the comment, in
    // the word before, and that node claimed the start of the removed text
    // (`da t`) it begins with, so the words were deleted and inserted again:
    // `del "da" ins "da t30z"` for `t30z ` typed, which undid a peer's
    // concurrent delete there or moved its typing (soak S4-7). This and the
    // other attributions of originOf serve the diff of a line whose text
    // Lexical's record does not explain (see TextReplay).
    const splits = this.plan.splits;
    if (splits !== undefined && splits !== null && splits.size > 0) {
      const removed = new Map(this.localRemoved);
      const parts = new Map<string, NodeKey[]>();
      for (const [part, [from]] of splits) {
        const old = removed.get(from);
        if (old === undefined) {
          continue;
        }
        const node = $getNodeByKey(part);
        if (
          $isTextNode(node) &&
          node.isAttached() &&
          node.getTextContent() === old
        ) {
          let list = parts.get(from);
          if (list === undefined) {
            list = [];
            parts.set(from, list);
          }
          list.push(part);
        }
      }
      for (const [from, list] of parts) {
        // One such part only (two equal ones cannot both be the old text).
        if (list.length === 1) {
          this.reservedFor.set(from, list[0]);
          this.claimed.add(from);
        }
      }
    }
  }

  /**
   * The identities of a text node's characters (see TextReplay): null where
   * Lexical's record does not explain the text of its line.
   */
  private idsOf(node: TextNode): readonly Segment[] | null {
    const replay = this.textReplay();
    return replay === null ? null : replay.idsOf(node.getKey());
  }

  /** This update's identities (see idsOf), for an editor that records. */
  private textReplay(): TextReplay | null {
    if (this.replay === undefined) {
      const editor = this.state.editor;
      const selection = $getSelection();
      this.replay = editor._recordNodeMoves
        ? new TextReplay(
            this.plan.textEdits ?? null,
            this.prevState._nodeMap,
            $isRangeSelection(selection) &&
              selection.isCollapsed() &&
              selection.anchor.type === 'text'
              ? {key: selection.anchor.key, offset: selection.anchor.offset}
              : null,
            editor._compositionKey !== null,
          )
        : null;
    }
    return this.replay;
  }

  /**
   * The edits of a text node's own old text that give its text, from its
   * identities: [offset in the old text, characters deleted there, text
   * inserted there], in order. Null where its line's text is not explained
   * (see TextReplay), false where it holds another node's characters or its
   * own out of order (the line is written whole).
   */
  private exactEdits(
    node: TextNode,
    oldLength: number,
  ): [number, number, string][] | null | false {
    const ids = this.idsOf(node);
    if (ids === null) {
      return null;
    }
    const key = node.getKey();
    const out: [number, number, string][] = [];
    let at = 0;
    let ins = '';
    for (const s of ids) {
      if (s.key === null) {
        ins += s.text;
        continue;
      }
      if (s.key !== key || s.start < at || s.end > oldLength) {
        return false;
      }
      if (s.start > at || ins !== '') {
        out.push([at, s.start - at, ins]);
      }
      ins = '';
      at = s.end;
    }
    if (at < oldLength || ins !== '') {
      out.push([at, oldLength - at, ins]);
    }
    return out;
  }

  /**
   * Origin ranges of a text node's text (see Atoms.origins). Lexical merges
   * adjacent text nodes (a join, an unlink), so the text of a node that
   * existed before can hold the text of nodes removed in this update. A
   * merge that changed no text is found exactly (see $mergedOrigins).
   * Otherwise, from the end, a removed node takes the part its old text
   * ends with when that part is longer than what the node's own old text
   * ends with there (or equal, at the very end, if it is the removed node's
   * whole text and it came later before); then the same from the start; the
   * rest is the node's own.
   */
  private originOf(node: TextNode): [number, number, string][] {
    const key = node.getKey();
    const text = node.getTextContent();
    const prev = this.prevState._nodeMap.get(key);
    if (prev === undefined || !$isTextNode(prev)) {
      if (text.length === 0) {
        return [];
      }
      // New in this update (typed, or a split): free to keep old characters
      // (see $writeSeq), except a part split off a node this update deleted
      // (see $splitTailOrigins), which keeps that node's characters, not
      // equal ones of another node (`extract()` of `ab t7z l` from
      // `ab`|`t7z `|`la `: the `a ` left keeps the one of `la `).
      const rec = this.plan.splits ? this.plan.splits.get(key) : undefined;
      if (rec !== undefined && this.reservedFor.get(rec[0]) === key) {
        // The whole old text of the node it was split from (see
        // setOriginOrder).
        return [[0, text.length, rec[0]]];
      }
      if (rec !== undefined) {
        const [from, offset] = rec;
        const old = this.plan.removedText.get(from);
        const merged = this.plan.merged;
        if (
          old !== undefined &&
          !(merged && merged.has(from)) &&
          old.startsWith(text, offset)
        ) {
          return [[0, text.length, from]];
        }
      }
      return [[0, text.length, key]];
    }
    const own = prev.__text;
    const merged = this.$mergedOrigins(node, text, own);
    if (merged !== null) {
      return merged;
    }
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

  /**
   * The origins of a text node's text when it is its own old text followed
   * by the old texts of the text nodes that Lexical's normalization merged
   * into it in this update (see WritePlan#merged), in the old order, the last
   * one possibly cut where its rest starts the next text, a node new in this
   * update (Lexical split it there): what the normalization leaves when it
   * merges neighbours that store the same attributes into the first of them
   * (a comment, format or link removed, or the start of a node given the
   * formats of the run before it). A text node removed between them that the
   * normalization did not merge was deleted, and is skipped. Null when the
   * text is not that, or when which nodes were merged is not known. Why: such
   * a change touches formats only, so every character keeps its item; the
   * claims from the ends (see originOf) miss a removed text that the node's
   * own old text also ends with (" " after "…redanox " merged with
   * "…redapex"), and one that was cut, and the text was then deleted and
   * inserted again (soak S3-8).
   *
   * Invariant: a removed node counts as merged only when the normalization
   * merged it, never because its text matches. Why: a node deleted in the
   * same update as its equal neighbour is unformatted ("same " deleted, the
   * next "same " merged) would keep the deleted node's items, and a
   * collaborator's edits of the surviving text would be lost or moved.
   */
  private $mergedOrigins(
    node: TextNode,
    text: string,
    own: string,
  ): [number, number, string][] | null {
    const key = node.getKey();
    const merged = this.plan.merged;
    const at = this.originOrder.get(key);
    if (
      merged === undefined ||
      merged === null ||
      !merged.has(key) ||
      at === undefined
    ) {
      return null;
    }
    const split = this.$splitTailOrigins(text, own, key, merged, at);
    if (split !== null) {
      return split;
    }
    if (text.length <= own.length || !text.startsWith(own)) {
      return this.$cutMergedOrigins(node, text, own, merged, at);
    }
    const out: [number, number, string][] = [[0, own.length, key]];
    let pos = own.length;
    for (let i = at + 1; pos < text.length; i++) {
      const k = this.originKeys[i];
      const old =
        k === undefined || this.claimed.has(k)
          ? undefined
          : this.plan.removedText.get(k);
      if (old === undefined) {
        return null;
      }
      if (!merged.has(k)) {
        // Deleted, not merged: none of its text is here.
        continue;
      }
      const n = Math.min(old.length, text.length - pos);
      if (!text.startsWith(old.slice(0, n), pos)) {
        return this.$cutMergedOrigins(node, text, own, merged, at);
      }
      if (n < old.length) {
        const next = $nextText(node);
        if (
          next === null ||
          this.prevState._nodeMap.has(next.getKey()) ||
          !next.getTextContent().startsWith(old.slice(n))
        ) {
          return this.$cutMergedOrigins(node, text, own, merged, at);
        }
      }
      out.push([pos, pos + n, k]);
      pos += n;
    }
    // Every node the record has merged into it is in its text: one merged in
    // an update and deleted in a later one of the same commit is not, and
    // another node's equal text there is not its own (R14-A F1).
    for (let i = at + 1; i < this.originKeys.length; i++) {
      const k = this.originKeys[i];
      const old = this.claimed.has(k)
        ? undefined
        : this.plan.removedText.get(k);
      if (old === undefined) {
        break;
      }
      if (merged.has(k) && !out.some(o => o[2] === k)) {
        return null;
      }
    }
    for (let j = 1; j < out.length; j++) {
      this.claimed.add(out[j][2]);
    }
    return out;
  }

  /**
   * See $mergedOrigins: the part of a removed text node that Lexical split
   * off in this update and its normalization then merged into this node
   * (`t6z ` | *`t7z `* | `t8z `: `extract()` cuts `t8z ` into `t8` and a
   * new `z `, the app removes `t7z ` and `t8`, and `z ` is merged into
   * `t6z `). Lexical records the split (WritePlan#splits), so the merged
   * text is the removed node's old text from where the split cut it: the
   * node keeps a prefix of its own old text, then that rest, which keeps the
   * removed node's characters, then the whole old texts of the nodes merged
   * after it. Null when no such part was merged into this node, or the text
   * is not that. Why: the part is a node new in this update, with no old
   * text of its own, so the merged characters were written as new text
   * (`t7z t8z ` deleted, `z ` inserted), which undid or moved a peer's
   * concurrent edit of them (soak S4-1 through `extract()`).
   */
  private $splitTailOrigins(
    text: string,
    own: string,
    key: NodeKey,
    merged: ReadonlySet<NodeKey>,
    at: number,
  ): [number, number, string][] | null {
    const splits = this.plan.splits;
    if (splits === undefined || splits === null || splits.size === 0) {
      return null;
    }
    if (this.splitTails === null) {
      // For each node split in this update, where its first part that the
      // normalization merged away (into another node) starts.
      this.splitTails = new Map();
      for (const [k, [from, offset]] of splits) {
        const now = $getNodeByKey(k);
        if (merged.has(k) && (now === null || !now.isAttached())) {
          const first = this.splitTails.get(from);
          if (first === undefined || offset < first) {
            this.splitTails.set(from, offset);
          }
        }
      }
    }
    const tails = this.splitTails;
    if (tails.size === 0) {
      return null;
    }
    // The removed nodes after it, up to the first one kept: the split one
    // (deleted, not merged: its own part was removed), then the merged ones.
    let source: [NodeKey, string] | null = null;
    const after: [NodeKey, string][] = [];
    for (let i = at + 1; i < this.originKeys.length; i++) {
      const k = this.originKeys[i];
      const old = this.claimed.has(k)
        ? undefined
        : this.plan.removedText.get(k);
      if (old === undefined) {
        break;
      }
      if (merged.has(k)) {
        if (source === null) {
          return null;
        }
        after.push([k, old]);
      } else if (source === null && tails.has(k)) {
        source = [k, old];
      }
    }
    if (source === null) {
      return null;
    }
    const rest = source[1].slice(tails.get(source[0])!);
    if (rest.length === 0) {
      return null;
    }
    let fit: [number, number] | null = null;
    let whole = '';
    for (let m = 0; m <= after.length; m++) {
      if (m > 0) {
        whole += after[m - 1][1];
      }
      const x = text.length - rest.length - whole.length;
      if (
        x >= 1 &&
        x <= own.length &&
        text.startsWith(own.slice(0, x)) &&
        text.startsWith(rest, x) &&
        text.endsWith(whole)
      ) {
        if (fit !== null) {
          return null;
        }
        fit = [x, m];
      }
    }
    // Every node the record merged after the split one is in the text (the
    // F1 check of $mergedOrigins): one merged in an update and deleted in a
    // later one of the same commit, or by a transform, is not, and the
    // split tail there may be that node's equal text (R15-A). Then this
    // path declines, and the other attributions (with the caret) decide.
    // Nor when the node's own old text explains all that is left and a
    // caret in it is elsewhere than at the join: a split tail merged and
    // deleted again by a later caret delete leaves that (R15-B: `x z z ` |
    // `cut ` | `q z `, the tail `z ` of `q z ` merged, then removed, the
    // caret at the tail's end), and the deleted tail kept the items of the
    // node's own equal text, and deleted those. Without a caret (app code,
    // `extract()`), the split is taken (soak S4-1).
    const sel = $getSelection();
    const caret =
      $isRangeSelection(sel) &&
      sel.isCollapsed() &&
      sel.anchor.key === key &&
      sel.anchor.type === 'text'
        ? sel.anchor.offset
        : -1;
    // And where the fit keeps only part of the node's own old text, Lexical
    // cut the node there in this update (a split record, its tail gone), as
    // `extract()` does at the start of its range: without that cut, the
    // node's own text was never cut, and a tail merged after it and deleted
    // again would take the node's equal characters (R15-A T3: `x ` |
    // `t7z ` | `t8 `, the tail ` ` merged and deleted again by node edits,
    // kept the deleted space and deleted `x `'s).
    const cut =
      fit === null ||
      fit[0] >= own.length ||
      [...splits].some(
        ([part, [from, offset]]) =>
          from === key &&
          offset === fit![0] &&
          !(() => {
            const n = $getNodeByKey(part);
            return n !== null && n.isAttached();
          })(),
      );
    if (
      fit === null ||
      fit[1] < after.length ||
      !cut ||
      (own.startsWith(text) && caret >= 0 && caret !== fit[0])
    ) {
      return null;
    }
    const [x, m] = fit;
    const out: [number, number, string][] = [
      [0, x, key],
      [x, x + rest.length, source[0]],
    ];
    this.claimed.add(source[0]);
    let pos = x + rest.length;
    for (let f = 0; f < m; f++) {
      const [k, old] = after[f];
      out.push([pos, pos + old.length, k]);
      pos += old.length;
      this.claimed.add(k);
    }
    return out;
  }

  /**
   * See $mergedOrigins: a range delete across text nodes that Lexical then
   * merged (`t6z ` | *`t7z `* | `t8z `, `t7z t8` deleted: `t6z ` and `z `
   * merged into `t6z z `). The node keeps a part its old text starts with,
   * the first node merged into it a part its old text ends with, and the
   * nodes merged after that their whole old texts, which together make up
   * the text; the removed nodes between were deleted. Where more than one
   * split fits, the caret at the join (where a range delete leaves it)
   * picks one; with none, null (the diff decides). Why: from the text
   * alone, the merged characters went to the node's own old ones, or to an
   * equal run of another node, and the delete was written as a replacement
   * of the merged text, or deleted the wrong equal run, which undid a
   * peer's concurrent delete there, or moved its typing (soak S4-1).
   */
  private $cutMergedOrigins(
    node: TextNode,
    text: string,
    own: string,
    merged: ReadonlySet<NodeKey>,
    at: number,
  ): [number, number, string][] | null {
    const key = node.getKey();
    // The nodes merged into it, in order (a node kept between ends them).
    const followers: [NodeKey, string][] = [];
    for (let i = at + 1; i < this.originKeys.length; i++) {
      const k = this.originKeys[i];
      const old = this.claimed.has(k)
        ? undefined
        : this.plan.removedText.get(k);
      if (old === undefined) {
        break;
      }
      if (merged.has(k)) {
        followers.push([k, old]);
      }
    }
    if (followers.length === 0) {
      return null;
    }
    const firstOld = followers[0][1];
    // Every split: [x, the length taken from the first merged node, how
    // many merged nodes]. Lexical removes a node it emptied before it
    // merges, so the node keeps at least one character of its own.
    const splits: [number, number, number][] = [];
    for (let m = 1; m <= followers.length; m++) {
      let whole = '';
      for (let f = 1; f < m; f++) {
        whole += followers[f][1];
      }
      if (!text.endsWith(whole)) {
        break;
      }
      for (
        let x = Math.min(own.length, text.length - whole.length);
        x >= 1;
        x--
      ) {
        const part = text.length - whole.length - x;
        if (
          part >= 1 &&
          part <= firstOld.length &&
          text.startsWith(own.slice(0, x)) &&
          text.startsWith(firstOld.slice(firstOld.length - part), x)
        ) {
          splits.push([x, part, m]);
        }
      }
    }
    // Of several splits, the caret a range delete leaves at the join picks
    // one. Without one there, a split is not taken when the node's own old
    // text explains all that is left: the record spans every update of a
    // commit, so a node merged in one update and deleted again in a later
    // one (or by a transform) is in it too, and a split of the text alone
    // credited it with characters it never held (R14-A F1: `x ` | **`la `**
    // unbolded, then `la ` deleted, kept the deleted node's space and
    // deleted `x `'s).
    const sel = $getSelection();
    const caret =
      $isRangeSelection(sel) &&
      sel.isCollapsed() &&
      sel.anchor.key === key &&
      sel.anchor.type === 'text'
        ? sel.anchor.offset
        : -1;
    const atCaret = splits.filter(([x]) => x === caret);
    const chosen =
      atCaret.length === 1
        ? atCaret[0]
        : splits.length === 1 && caret < 0 && !own.startsWith(text)
          ? splits[0]
          : null;
    if (chosen === null) {
      return null;
    }
    const [x, part, m] = chosen;
    const out: [number, number, string][] = [
      [0, x, key],
      [x, x + part, followers[0][0]],
    ];
    let pos = x + part;
    for (let f = 1; f < m; f++) {
      const [k, old] = followers[f];
      out.push([pos, pos + old.length, k]);
      pos += old.length;
    }
    for (let f = 0; f < m; f++) {
      this.claimed.add(followers[f][0]);
    }
    return out;
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
    outerIds: ReadonlySet<string> = NO_IDS,
  ): void {
    const spec = getGroupSpec(klassOf(group))!;
    const fields = this.$levelFields(group, spec, outerIds);
    const gattrs = groupAttrsOf(group, fields);
    const gsig = groupKeySig(gattrs, outer);
    const innerIds = innerBlockIds(outerIds, fields);
    for (
      let item = group.getFirstChild();
      item !== null;
      item = item.getNextSibling()
    ) {
      const nested = $nestedGroupOf(item, spec);
      if (nested !== null && this.roles.$role(item) === 'level') {
        this.$flattenGroup(
          nested,
          level + 1,
          top,
          out,
          [
            ...outer,
            {
              ...fields,
              [WRAPPER_FIELDS_KEY]: $levelItemFields(item as ElementNode, spec),
            },
          ],
          innerIds,
        );
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
    // neighbours with line breaks (see isJoinableParagraph in lexical's
    // LexicalStructure.ts): its content goes into the part it is in, with
    // the line breaks the normalization inserts, so that the normalization
    // then writes nothing new there. Whatever follows each child, as the
    // normalization sees it.
    let prev: 'none' | 'inline' | 'paragraph' | 'block' = 'none';
    for (const c of line.getChildren()) {
      if ($isJoinedParagraph(line, c)) {
        if (prev === 'inline' || prev === 'paragraph') {
          run.push(PENDING_LINE_BREAK);
        }
        pushAll(run, c.getChildren());
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

  /**
   * A group's fields as stored on its items (see $withoutLevelId), as
   * readers read them (see BlockIdSettler#$placeUnit). An editor that holds
   * an id they leave out (set by an update that ran no transforms, see
   * $canonicalizeGroup) is read again where it was written (see
   * droppedOuterId), so that it shows what readers show.
   */
  private $levelFields(
    group: ElementNode,
    spec: GroupSpec,
    outerIds: ReadonlySet<string>,
  ): Attrs {
    const fields = $groupFields(group, spec);
    if ($withoutLevelId(fields, group, outerIds, this.state.blockIds)) {
      this.droppedOuterId = true;
    }
    return fields;
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
        // The outer levels, innermost first.
        const chain: [ElementNode, ElementNode][] = [];
        let g: ElementNode = parent;
        for (;;) {
          const levelItem = g.getParent();
          if (levelItem === null || this.roles.$role(levelItem) !== 'level') {
            break;
          }
          g = levelItem.getParent() as ElementNode;
          chain.push([g, levelItem]);
        }
        const outers: Attrs[] = [];
        let ids = NO_IDS;
        for (let c = chain.length - 1; c >= 0; c--) {
          const [og, levelItem] = chain[c];
          const gspec = getGroupSpec(klassOf(og)) || spec;
          const fields = this.$levelFields(og, gspec, ids);
          ids = innerBlockIds(ids, fields);
          outers.push({
            ...fields,
            [WRAPPER_FIELDS_KEY]: $levelItemFields(levelItem, gspec),
          });
        }
        return this.$lineDesired(
          line,
          groupAttrsOf(parent, this.$levelFields(parent, spec, ids)),
          chain.length,
          spec.derived,
          (chain.length > 0 ? chain[chain.length - 1][0] : parent).getKey(),
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
    this.droppedOuterId = false;
    const desired = this.$liftInPlace(cs, container);
    if (this.droppedOuterId) {
      this.refused.add(cs);
    }
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
          isBlockNodeItem(o.end) &&
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
          // With move records, what the user moved is the unit that gets
          // the record (its neighbours stay where they are).
          weightOf.set(
            di,
            this.state.moves
              ? weightOf.get(di)! / (big * 4)
              : weightOf.get(di)! - 0.5,
          );
        }
      });
    }
    const anchors = longestIncreasing(matches, ([di]) => weightOf.get(di)!);
    if (
      this.state.zonesOf(cs.y) !== null ||
      this.hasRecordMoves(old, matches, anchors)
    ) {
      this.$writeStructureZoned(cs, desired, old, matches, anchors);
      return;
    }
    const n = anchors.length;
    // Changed line anchors join a neighbouring gap (the following one first)
    // so that a split or join diffs their characters with it.
    const gapNonEmpty = (k: number) => {
      const [pd, po] = k > 0 ? anchors[k - 1] : [-1, -1];
      const [nd, no] = k < n ? anchors[k] : [desired.length, old.length];
      return nd - pd > 1 || no - po > 1;
    };
    // A line without a marker that this update did not change, and that
    // nothing follows, stays without one (see $implicitChanged); any other
    // is given one. Nothing may follow it before the update either: the
    // block node it ran up to, and what came after, are deleted by the
    // segment after it, which starts at its content's end only when a marker
    // ends it (with none, it started at the container's start, and deleted
    // everything before: R13-A P1).
    const keepsImplicit = (k: number) => {
      const [di, oi] = anchors[k];
      return (
        old[oi].kind === 'implicit' &&
        di === desired.length - 1 &&
        oi === old.length - 1 &&
        !this.$implicitChanged(desired[di].key!)
      );
    };
    const changed = (k: number) => {
      const [di, oi] = anchors[k];
      const d = desired[di];
      const o = old[oi];
      return (
        d.kind === 'line' &&
        (o.kind === 'implicit'
          ? !keepsImplicit(k)
          : d.part !== undefined ||
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
          if (u.kind === 'implicit' ? !keepsImplicit(k) : this.$changed(d)) {
            this.$writeLineAlone(u, d);
          } else if (u.kind === 'implicit') {
            // Left without a marker.
          } else if (u.sig !== d.sig || this.plan.lines.has(d.key!)) {
            // Only its attributes (or a derived field) may have changed.
            this.$writeMarker(u.end!, this.$marker(d), d.node);
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
   * Blocks lifted out of the line they were written in (a block a client
   * wrote inside a paragraph without the normalization, which then split the
   * paragraph around it) keep their shared node where it is: the node is
   * marked a unit of the container (UNIT_KEY), which splits the line's
   * content around it, and the line parts get the markers the editor's
   * split gave them. Nothing is copied: a peer typing in the block, or next
   * to it, keeps its text (the author of the write without the
   * normalization lifts it, see YBinding's author normalization). Handles the shapes Lexical's
   * normalization leaves ($liftOut): the block first (it goes before the
   * line), last (after it), the only child (it replaces the line) or in the
   * middle (the line is split, the rest in a copy). Anything else is written
   * as before. Returns the desired units.
   */
  private $liftInPlace(cs: CS, container: ElementNode): Desired[] {
    const state = this.state;
    this.$adoptLifted(cs, container);
    const zones = this.zonesFor(cs.y);
    const initial = this.$desiredUnits(container);
    // Only a block the editor shows in this container whose shared node is
    // still an inline node of a line can be lifted (most writes have none).
    if (
      !initial.some(d => {
        if (d.kind !== 'node' || d.key === null) {
          return false;
        }
        const y = state.yByKey.get(d.key);
        const it = y === undefined ? null : y._item;
        return (
          it !== null &&
          !it.deleted &&
          it.parent === cs.y &&
          nameOf(it).startsWith(INLINE_PREFIX) &&
          !isBlockNodeItem(it)
        );
      })
    ) {
      return initial;
    }
    // The lines the editor still shows in this container (no node lookup
    // per unit: a container can hold many lines).
    const shown = new Set<NodeKey>();
    for (const d of initial) {
      if (d.key !== null && d.part === undefined) {
        shown.add(d.key);
      }
    }
    // Per line: the stored inline nodes in it that the editor now shows as
    // blocks of this container.
    const byLine = new Map<Unit, {span: Item[]; lifted: Item[]}>();
    const keys: NodeKey[] = [];
    for (const u of cs.units) {
      if (
        (!(u.kind === 'line' && u.end !== null && !u.end.deleted) &&
          !(u.kind === 'implicit' && zones === null)) ||
        u.key === null
      ) {
        continue;
      }
      // Only lines whose content this write changes (a lifted block leaves
      // its line) or that the editor removed (a block replaced its line).
      if (
        shown.has(u.key) &&
        !this.plan.lines.has(u.key) &&
        !this.plan.structural.has(u.key)
      ) {
        continue;
      }
      const span = this.lineSpan(cs, u, zones);
      if (span === null) {
        continue;
      }
      const lifted: Item[] = [];
      for (const it of span) {
        if (
          it.deleted ||
          !(it.content instanceof ContentType) ||
          !nameOf(it).startsWith(INLINE_PREFIX) ||
          isBlockNodeItem(it)
        ) {
          continue;
        }
        const key = state.keyByY.get(it.content.type as YNode);
        const node = key === undefined ? null : $getNodeByKey(key);
        const parent = node === null ? null : node.getParent();
        if (
          node !== null &&
          parent !== null &&
          parent.is(container) &&
          !$isInlineChild(node)
        ) {
          lifted.push(it);
          keys.push(key!);
        }
      }
      if (lifted.length > 0) {
        byLine.set(u, {lifted, span});
      }
    }
    if (byLine.size === 0) {
      return initial;
    }
    for (const key of keys) {
      this.roles.keepAsNode(key, true);
    }
    let desired = this.$desiredUnits(container);
    const failed: Item[] = [];
    let any = false;
    byLine.forEach(({span, lifted}, u) => {
      if (this.$liftLine(cs, u, span, lifted, desired)) {
        any = true;
      } else {
        failed.push(...lifted);
      }
    });
    if (failed.length > 0) {
      for (const it of failed) {
        this.roles.keepAsNode(
          state.keyByY.get((it.content as ContentType).type as YNode)!,
          false,
        );
      }
      desired = this.$desiredUnits(container);
    }
    if (any) {
      this.wroteUnitMark = true;
      this.$recomputeStarts(cs);
    }
    return desired;
  }

  /**
   * A block lifted in place (UNIT_KEY) that Lexical replaced by a new node of
   * its type holding its children (Enter at the start of a heading replaces
   * the heading): the new node keeps the shared node and its content, as an
   * inline node replaced in place does, instead of copying it.
   */
  private $adoptLifted(cs: CS, container: ElementNode): void {
    const state = this.state;
    const prevMap = this.prevState._nodeMap;
    for (const u of cs.units) {
      if (
        u.kind !== 'node' ||
        u.end === null ||
        u.end.deleted ||
        u.key === null ||
        !nameOf(u.end).startsWith(INLINE_PREFIX) ||
        !isBlockNodeItem(u.end)
      ) {
        continue;
      }
      const current = $getNodeByKey(u.key);
      const prev = prevMap.get(u.key);
      if ((current !== null && current.isAttached()) || !$isElementNode(prev)) {
        continue;
      }
      const children = new Set<NodeKey>();
      for (let k = prev.__first; k !== null; ) {
        children.add(k);
        const c = prevMap.get(k);
        k = c === undefined ? null : c.__next;
      }
      let holder: ElementNode | null = null;
      for (const k of children) {
        const c = $getNodeByKey(k);
        if (c !== null && c.isAttached()) {
          holder = c.getParent();
          break;
        }
      }
      const y = typeOf(u.end);
      if (
        holder === null ||
        !holder.getParentOrThrow().is(container) ||
        holder.getType() !== storedTypeOf(y) ||
        state.yByKey.has(holder.getKey()) ||
        cs.units.some(x => x.key === holder!.getKey()) ||
        !holder.getChildren().every(c => children.has(c.getKey()))
      ) {
        continue;
      }
      const key = holder.getKey();
      state.yByKey.delete(u.key);
      state.csByKey.delete(u.key);
      state.mapNode(key, y);
      u.key = key;
      u.first = key;
      u.last = key;
      this.roles.keepAsNode(key, true);
      this.$writeNodeAttrs(y, holder);
      const ics = state.containers.get(y);
      if (ics !== undefined && ics.kind === 'i') {
        this.written.add(key);
        this.$writeInline(ics, holder);
      }
    }
  }

  /**
   * The items of line `u` in order, when they are all its zone's and hold
   * no move record (null otherwise: no lift in place there).
   */
  private lineSpan(cs: CS, u: Unit, zones: Zones | null): Item[] | null {
    if (u.end === null) {
      // Text no marker ends (containers without records only).
      const idx = cs.units.indexOf(u);
      const stop = unitStop(cs.units, idx, null);
      const out: Item[] = [];
      for (
        let p = this.firstAfter(cs.y, unitLeft(cs.units, idx, null));
        p !== null && p !== stop;
        p = p.right
      ) {
        if (isMoveItem(p) || (!p.deleted && isEndItem(p))) {
          return null;
        }
        out.push(p);
      }
      return out;
    }
    const {left, zone} = lineStart(zones, u.end!);
    if ((zone ?? null) !== (u.zone ?? null)) {
      return null;
    }
    const out: Item[] = [];
    for (
      let p = left === null ? cs.y._start : left.right;
      p !== null && p !== u.end;
      p = p.right
    ) {
      if (zones !== null && zones.ownerOf(p) !== zone) {
        continue;
      }
      if (isMoveItem(p) || (!p.deleted && isEndItem(p))) {
        return null;
      }
      out.push(p);
    }
    return out;
  }

  private firstAfter(y: YNode, left: Item | null): Item | null {
    return left === null ? y._start : left.right;
  }

  /**
   * Lift the blocks `lifted` out of line `u` in place (see $liftInPlace),
   * when the editor's units there are exactly what that gives: the line's
   * content split around the blocks, each non-empty part a line. False
   * (nothing written) otherwise.
   */
  private $liftLine(
    cs: CS,
    u: Unit,
    span: Item[],
    lifted: Item[],
    desired: Desired[],
  ): boolean {
    const state = this.state;
    const content = (p: Item) =>
      !p.deleted &&
      p.countable &&
      !(p.content instanceof ContentFormat) &&
      !isMoveItem(p);
    // Parts: the content before each block, and after the last one.
    const nonEmpty: boolean[] = [];
    let from = 0;
    for (const it of lifted) {
      const at = span.indexOf(it);
      nonEmpty.push(span.slice(from, at).some(content));
      from = at + 1;
    }
    nonEmpty.push(span.slice(from).some(content));
    const keyOf = (it: Item) =>
      state.keyByY.get((it.content as ContentType).type as YNode)!;
    // The units the editor must show there: [part] block [part] block ...
    const pattern: (NodeKey | null)[] = [];
    lifted.forEach((it, k) => {
      if (nonEmpty[k]) {
        pattern.push(null);
      }
      pattern.push(keyOf(it));
    });
    if (nonEmpty[lifted.length]) {
      pattern.push(null);
    }
    const first = desired.findIndex(d => d.key === keyOf(lifted[0]));
    if (first < 0) {
      return false;
    }
    const start = first - (nonEmpty[0] ? 1 : 0);
    if (start < 0 || start + pattern.length > desired.length) {
      return false;
    }
    const others = new Set(
      cs.units.filter(x => x !== u && x.key !== null).map(x => x.key),
    );
    const lines: Desired[] = [];
    for (let j = 0; j < pattern.length; j++) {
      const d = desired[start + j];
      const want = pattern[j];
      if (want === null) {
        if (d.kind !== 'line' || d.key === null || others.has(d.key)) {
          return false;
        }
        lines.push(d);
      } else if (d.kind !== 'node' || d.key !== want) {
        return false;
      }
    }
    // Write: the blocks become units where they are; each part before a
    // block gets a marker right before that block; the line's own marker
    // ends the last part, or goes when that part is empty.
    const units: Unit[] = [];
    const oldEnd = u.end;
    state.dropUnit(u);
    let li = 0;
    const lineUnit = (end: Item | null): Unit => {
      const d = lines[li++];
      if (end !== null) {
        this.$writeMarker(end, this.$marker(d), d.node);
      }
      const unit: Unit =
        units.length === 0 && li === 1
          ? u
          : {
              cs,
              end,
              first: null,
              key: null,
              kind: 'line',
              last: null,
              sig: '',
              start: null,
            };
      unit.end = end;
      unit.key = d.key;
      unit.first = d.first;
      unit.last = d.last;
      unit.kind = end === null ? 'implicit' : 'line';
      unit.zone = u.zone;
      return unit;
    };
    lifted.forEach((it, k) => {
      if (nonEmpty[k]) {
        const c = new Cursor(this.tr, cs.y, it.left, EMPTY_FORMATS);
        units.push(lineUnit(c.insertPlain(new ContentType(new YNode(MARKER)))));
      }
      typeOf(it).setAttr(UNIT_KEY, 1);
      const key = keyOf(it);
      units.push({
        cs,
        end: it,
        first: key,
        key,
        kind: 'node',
        last: key,
        sig: '',
        start: null,
        zone: u.zone,
      });
    });
    if (nonEmpty[lifted.length]) {
      units.push(lineUnit(oldEnd));
    } else if (oldEnd !== null) {
      oldEnd.delete(this.tr);
    }
    for (const x of units) {
      state.setUnit(x);
    }
    const i = cs.units.indexOf(u);
    cs.units = [...cs.units.slice(0, i), ...units, ...cs.units.slice(i + 1)];
    return true;
  }

  /**
   * Whether this write moves units that can keep their items (a move record
   * shows them at the new place): matched units that are not kept in
   * place and end with an item.
   */
  private hasRecordMoves(
    old: Unit[],
    matches: [number, number][],
    anchors: [number, number][],
  ): boolean {
    // Every matched unit kept in place: nothing moves (the common case).
    if (!this.state.moves || matches.length === anchors.length) {
      return false;
    }
    const kept = new Set(anchors.map(a => a[1]));
    return matches.some(
      ([, oi]) =>
        !kept.has(oi) &&
        old[oi].end !== null &&
        !old[oi].end!.deleted &&
        old[oi].kind !== 'implicit',
    );
  }

  /**
   * The structure write of a container whose units can show elsewhere than
   * their items (it holds move records, or this write moves units): units
   * that moved keep their items and get a move record at their new place;
   * the rest is written as in `$writeStructure`, each gap inside one zone.
   */
  private $writeStructureZoned(
    cs: CS,
    desired: Desired[],
    old: Unit[],
    matches: [number, number][],
    anchorsIn: [number, number][],
  ): void {
    let anchors = anchorsIn;
    this.zonedWrites.add(cs);
    const state = this.state;
    const y = cs.y;
    this.$normalizeRecords(y);
    const wz = new Zones(state.doc, y);
    this.zoneOverride.set(y, wz);
    const zoneOfUnit = (u: Unit): Zone => u.zone ?? null;
    // Where new units go right after a unit (in the new order): after its
    // end in its zone, or, after the last unit of a record's range, after
    // the record (never past the end of a range).
    const slotAfterItem = (
      z: Zone,
      item: Item | null,
    ): {zone: Zone; left: Item | null} => {
      let zone = z;
      let left = item;
      for (let guard = 0; guard < 64; guard++) {
        // Skip the items right after `left` that show elsewhere (a range of
        // another record that starts at `left`): an item inserted right
        // after a range's start is inside that range.
        for (
          let p = left === null ? y._start : left.right;
          p !== null;
          p = p.right
        ) {
          if (wz.ownerOf(p) === zone) {
            break;
          }
          if (zone !== null && !wz.inRange(zone, p)) {
            break;
          }
          left = p;
        }
        if (zone === null) {
          break;
        }
        const r = wz.rec(zone);
        if (r === undefined || left !== r.e) {
          break;
        }
        left = zone;
        zone = wz.ownerOf(zone);
      }
      return {left, zone};
    };
    // Records that show units (directly or through records they show). An
    // active record that shows nothing lost its range to another record:
    // this write deletes it, and `$normalizeRecords` leaves it where it is,
    // possibly between a line's characters.
    const showsUnits = new Set<Item>();
    for (const u of old) {
      for (
        let z: Zone = zoneOfUnit(u), guard = 0;
        z !== null && !showsUnits.has(z) && guard < 64;
        guard++
      ) {
        showsUnits.add(z);
        z = wz.ownerOf(z);
      }
    }
    // A unit whose items are not contiguous in its zone (a line joined
    // across another zone's range) cannot be one range: it is written again
    // at its new place, as without records.
    const contiguous = (u: Unit): boolean => {
      const z = zoneOfUnit(u);
      if (lineStart(wz, u.end!).zone !== z) {
        // It starts inside a range an inline record shows (a line split
        // after a join): not one range of its zone.
        return false;
      }
      let sawForeign = false;
      // A record that shows units before the line, left between its
      // characters (moved by a peer at the same time as a removal of the
      // line before it): the range would start at it and leave out the
      // line's characters before it.
      let sawRecord = false;
      for (let p = u.end!.left; p !== null; p = p.left) {
        if (wz.ownerOf(p) !== z) {
          if (z !== null && !wz.inRange(z, p)) {
            return true;
          }
          sawForeign = true;
          continue;
        }
        if (!p.deleted && isEndItem(p)) {
          return true;
        }
        if (
          !p.deleted &&
          isMoveItem(p) &&
          !isInlineRecordItem(p) &&
          (showsUnits.has(p) || !wz.isActive(p))
        ) {
          sawRecord = true;
          continue;
        }
        if (
          (sawForeign || sawRecord) &&
          !p.deleted &&
          p.countable &&
          !isMoveItem(p)
        ) {
          return false;
        }
      }
      return true;
    };
    // Where new units go after an anchor when no old unit of the gap marks
    // the place. Right after the anchor (slotAfterItem) only when that is a
    // line boundary: a record showing the anchor can lie between a line's
    // characters (a peer moved the block while another joined the lines
    // around the record, or removed the line before it), and units written
    // there would split that line. Otherwise right before the next anchor's
    // line, unless the anchor shows through a record inside that line (then
    // nothing can go between them): the anchor, when it is one range, is
    // then moved instead (written again with a record where it shows), so
    // that the new units go after its new record.
    const boundaryAt = (zone: Zone, left: Item | null): boolean => {
      if (zone !== null && isInlineRecordItem(zone)) {
        return false;
      }
      for (let p = left; p !== null; p = p.left) {
        if (wz.ownerOf(p) !== zone) {
          if (zone !== null && !wz.inRange(zone, p)) {
            return true;
          }
          continue;
        }
        if (
          p.deleted ||
          !p.countable ||
          (isMoveItem(p) && !isInlineRecordItem(p))
        ) {
          continue;
        }
        return isEndItem(p);
      }
      return true;
    };
    // The end item of the line a record's item shows in (through the inline
    // records it is inside).
    const lineOfRecord = (r: Item): Item | null => {
      let it = r;
      for (let guard = 0; guard < 64; guard++) {
        const owner = wz.ownerOf(it);
        if (owner === null || !isInlineRecordItem(owner)) {
          break;
        }
        it = owner;
      }
      return nextZoneEnd(wz, it);
    };
    const slotBefore = (oi: number): {zone: Zone; left: Item | null} => {
      const zone = unitStartOf(old, oi, wz).zone;
      return {left: afterRecords(wz, zone, y, unitLeft(old, oi, wz)), zone};
    };
    const gapSlots = new Map<string, {zone: Zone; left: Item | null}>();
    const matchedOld = new Set(matches.map(m => m[1]));
    const matchedNew = new Set(matches.map(m => m[0]));
    anchors = anchors.filter(([di, oi], k) => {
      const u = old[oi];
      const next = k + 1 < anchors.length ? anchors[k + 1] : null;
      const nextDi = next === null ? desired.length : next[0];
      const nextOi = next === null ? old.length : next[1];
      if (
        u.end === null ||
        u.end.deleted ||
        u.kind === 'implicit' ||
        nextDi === di + 1 ||
        // Only new units (moved ones find their place with their records).
        !desired
          .slice(di + 1, nextDi)
          .some((_, j) => !matchedNew.has(di + 1 + j)) ||
        // A changed anchor (a split) is written with the gap's content.
        (desired[di].kind === 'line' && this.$changed(desired[di])) ||
        (next !== null &&
          desired[nextDi].kind === 'line' &&
          this.$changed(desired[nextDi])) ||
        // An old unit left in the gap marks the place.
        old.slice(oi + 1, nextOi).some((_, j) => !matchedOld.has(oi + 1 + j))
      ) {
        return true;
      }
      const slot = slotAfterItem(zoneOfUnit(u), u.end);
      if (boundaryAt(slot.zone, slot.left)) {
        return true;
      }
      if (next !== null) {
        const before = slotBefore(nextOi);
        const nextEnd = old[nextOi].end;
        let inside = false;
        for (
          let z: Zone = zoneOfUnit(u), guard = 0;
          z !== null && guard < 64;
          z = wz.ownerOf(z), guard++
        ) {
          if (
            nextEnd !== null &&
            lineOfRecord(z) === nextEnd &&
            wz.order(z) > (before.left === null ? -1 : wz.order(before.left))
          ) {
            inside = true;
            break;
          }
        }
        if (!inside && boundaryAt(before.zone, before.left)) {
          gapSlots.set(oi + ':' + nextOi, before);
          return true;
        }
      }
      // Only a unit that is one range is moved this way (a line that spans
      // ranges keeps its place: its pieces would be written again).
      return !contiguous(u);
    });
    const anchorNew = new Set(anchors.map(a => a[0]));
    const movedOf = new Map<number, number>();
    // Moved units that are not one range (a line that starts inside a range
    // an inline record shows, a line split after a join, or whose items
    // another zone's items interrupt): their pieces (see unitPieces).
    const piecesOf = new Map<number, ReturnType<Writer['unitPieces']>>();
    if (state.moves) {
      for (const [di, oi] of matches) {
        const u = old[oi];
        if (
          anchorNew.has(di) ||
          u.end === null ||
          u.end.deleted ||
          u.kind === 'implicit'
        ) {
          continue;
        }
        if (contiguous(u)) {
          movedOf.set(di, oi);
        } else if (u.kind === 'line') {
          const pieces = this.unitPieces(wz, u);
          if (pieces !== null) {
            movedOf.set(di, oi);
            piecesOf.set(oi, pieces);
          }
        }
      }
    }
    const movedOld = new Set(movedOf.values());
    // The item right before a unit's items in its zone, with no item of
    // another zone in between (a new range must not hold another one). A
    // record this write deletes is no boundary: stopping there would leave
    // the line's characters before it out of the range.
    const rangeStart = (u: Unit): Item | null => {
      const z = zoneOfUnit(u);
      for (let p = u.end!.left; p !== null; p = p.left) {
        if (wz.ownerOf(p) !== z) {
          return p;
        }
        if (
          !p.deleted &&
          (isEndItem(p) ||
            (isMoveItem(p) &&
              !isInlineRecordItem(p) &&
              (showsUnits.has(p) || !wz.isActive(p))))
        ) {
          return p;
        }
      }
      return null;
    };
    // Moved units, grouped into ranges: consecutive in the new order and in
    // the old one, of one zone, and adjacent in the sequence.
    type Group = {
      ois: number[];
      s: Item | null;
      e: Item;
      p: number;
      replaces: Item | null;
      record: Item | null;
    };
    const groupOf = new Map<number, Group>();
    let current: Group | null = null;
    let prevDi = -2;
    for (let di = 0; di < desired.length; di++) {
      const oi = movedOf.get(di);
      if (oi === undefined) {
        current = null;
        continue;
      }
      const u = old[oi];
      const pieces = piecesOf.get(oi);
      const s =
        pieces !== undefined && pieces !== null
          ? pieces[pieces.length - 1].s
          : rangeStart(u);
      if (
        pieces === undefined &&
        current !== null &&
        prevDi === di - 1 &&
        current.ois[current.ois.length - 1] === oi - 1 &&
        zoneOfUnit(old[oi - 1]) === zoneOfUnit(u) &&
        s === current.e
      ) {
        current.ois.push(oi);
        current.e = u.end!;
      } else {
        current = {e: u.end!, ois: [oi], p: 0, record: null, replaces: null, s};
      }
      groupOf.set(di, current);
      prevDi = di;
    }
    const groups = [...new Set(groupOf.values())];
    for (const g of groups) {
      const z = zoneOfUnit(old[g.ois[0]]);
      const r = wz.rec(z);
      if (r !== undefined && !g.ois.some(oi => piecesOf.has(oi))) {
        // The whole range of a record moves on: the new record takes over
        // its range (anything a peer added in it moves too).
        const live = old.filter(u => zoneOfUnit(u) === z);
        // Only when the record still owns everything in its range and shows
        // nothing but these units: items of it that show with another record
        // (a peer moved them concurrently) must not move along with the new
        // record, and a record inside the range (units a peer moved into
        // it) would leave the new record inside its own range.
        let ownsRange = true;
        for (let p = r.s === null ? y._start : r.s.right; p !== null; ) {
          if (!p.deleted && (wz.ownerOf(p) !== z || isMoveItem(p))) {
            ownsRange = false;
            break;
          }
          if (p === r.e) {
            break;
          }
          p = p.right;
        }
        if (live.length === g.ois.length && ownsRange) {
          g.s = r.s;
          g.e = r.e;
          g.replaces = z;
        }
      }
      g.p = wz.priorityOver(g.ois.map(oi => old[oi].end!));
    }
    // The pieces of a moved unit before its last one: an inline record of
    // each at the start of the last piece, so that the unit's record (over
    // the last piece) shows the whole unit, in order, and every piece keeps
    // its items.
    piecesOf.forEach(pieces => {
      const last = pieces![pieces!.length - 1];
      const c = new Cursor(this.tr, y, last.s, EMPTY_FORMATS);
      for (const pc of pieces!.slice(0, -1)) {
        const ry = this.newRecordNode();
        const item = c.insertPlain(new ContentType(ry));
        ry.setAttr(MOVE_START_KEY, pc.s === null ? null : idRef(pc.s));
        ry.setAttr(MOVE_END_KEY, idRef(pc.e));
        ry.setAttr(MOVE_PRIORITY_KEY, wz.priorityOver(pc.items));
        ry.setAttr(MOVE_INLINE_KEY, 1);
        wz.addPending(pc.s, pc.e, item, true);
      }
    });
    for (const g of groups) {
      wz.addPending(g.s, g.e, old[g.ois[0]].end!);
    }

    // Joins across ranges: a changed line whose content is now its own
    // (or the start of it) followed by the next old line's (or the end of
    // it), where that line is removed and lives in another zone. Its text
    // keeps its items: an inline record shows them at the end of the first
    // line (see MOVE_INLINE_KEY), so two peers making the same join show
    // the text once.
    const joinOf =
      this.plan.followUp === true || !state.moves
        ? new Map<number, Join>()
        : this.$findJoins(
            wz,
            desired,
            old,
            matches,
            anchors,
            movedOld,
            contiguous,
            rangeStart,
          );
    const joinedOld = new Set<number>();
    joinOf.forEach(j => joinedOld.add(j.ti));

    // Gaps between anchors; a changed anchor joins a neighbouring gap of its
    // own zone (a split or join keeps its characters).
    const n = anchors.length;
    const gapOld = (k: number): number[] => {
      const po = k > 0 ? anchors[k - 1][1] : -1;
      const no = k < n ? anchors[k][1] : old.length;
      const out: number[] = [];
      for (let i = po + 1; i < no; i++) {
        if (!movedOld.has(i) && !joinedOld.has(i)) {
          out.push(i);
        }
      }
      return out;
    };
    const gapNew = (k: number): number[] => {
      const pd = k > 0 ? anchors[k - 1][0] : -1;
      const nd = k < n ? anchors[k][0] : desired.length;
      const out: number[] = [];
      for (let i = pd + 1; i < nd; i++) {
        out.push(i);
      }
      return out;
    };
    const gapZoneOk = (k: number, z: Zone): boolean =>
      gapOld(k).every(oi => zoneOfUnit(old[oi]) === z) &&
      gapNew(k).every(di => !movedOf.has(di));
    const gapNonEmpty = (k: number) =>
      gapOld(k).length > 0 || gapNew(k).length > 0;
    // Text no marker ends (left by concurrent edits) is ended by the
    // client that edits it, not by every client that writes the container
    // (each would add its own marker).
    const changed = (k: number) => {
      const [di] = anchors[k];
      const d = desired[di];
      return d.kind === 'line' && this.$changed(d);
    };
    const attach: ('alone' | 'next' | 'prev')[] = [];
    for (let k = 0; k < n; k++) {
      const z = zoneOfUnit(old[anchors[k][1]]);
      attach.push(
        !changed(k) || joinOf.has(k)
          ? 'alone'
          : gapNonEmpty(k + 1) && gapZoneOk(k + 1, z)
            ? 'next'
            : gapNonEmpty(k) &&
                gapZoneOk(k, z) &&
                (k === 0 ||
                  attach[k - 1] !== 'next' ||
                  zoneOfUnit(old[anchors[k - 1][1]]) === z)
              ? 'prev'
              : 'alone',
      );
    }
    const newUnits: Unit[] = [];
    const used = new Set<Unit>();
    const contentLater: [Unit, Desired][] = [];
    const prevZone = this.zone;
    try {
      for (let k = 0; k <= n; k++) {
        const oldSeg: number[] = [];
        const newSeg: number[] = [];
        if (k > 0 && attach[k - 1] === 'next') {
          oldSeg.push(anchors[k - 1][1]);
          newSeg.push(anchors[k - 1][0]);
        }
        oldSeg.push(...gapOld(k));
        newSeg.push(...gapNew(k));
        if (k < n && attach[k] === 'prev') {
          oldSeg.push(anchors[k][1]);
          newSeg.push(anchors[k][0]);
        }
        if (oldSeg.length > 0 || newSeg.length > 0) {
          // The zone of the gap: its first old unit's, or where new units go
          // after the anchor before it.
          let zone: Zone;
          let left: Item | null;
          const primary: number[] = [];
          if (oldSeg.length > 0) {
            zone = zoneOfUnit(old[oldSeg[0]]);
            for (const oi of oldSeg) {
              if (
                zoneOfUnit(old[oi]) === zone &&
                primary.length === oldSeg.indexOf(oi)
              ) {
                primary.push(oi);
              }
            }
            // After the records showing before the gap's first unit (its
            // walk starts in the zone its line starts in).
            const startZone = unitStartOf(old, oldSeg[0], wz).zone;
            this.zone = startZone;
            left = afterRecords(wz, startZone, y, unitLeft(old, oldSeg[0], wz));
            zone = startZone;
          } else {
            const po = k > 0 ? anchors[k - 1][1] : -1;
            if (po < 0) {
              zone = null;
              left = null;
            } else {
              const a = old[po];
              let end = a.end;
              if (end === null) {
                // Text no marker ends: after its last item (before the
                // node that follows it), or after its zone's record.
                const stop = unitStop(old, po, wz);
                const z = zoneOfUnit(a);
                const r = wz.rec(z);
                if (
                  stop === null ||
                  (r !== undefined && !wz.inRange(z!, stop))
                ) {
                  end = r !== undefined ? r.e : lastItem(y);
                } else {
                  end = stop.left;
                }
              }
              const nextOi = k < n ? anchors[k][1] : old.length;
              const preset = gapSlots.get(po + ':' + nextOi);
              ({zone, left} =
                preset !== undefined
                  ? preset
                  : slotAfterItem(zoneOfUnit(a), end));
            }
          }
          // Old units of other zones in the gap: deleted where they are.
          for (const oi of oldSeg) {
            if (!primary.includes(oi)) {
              this.$deleteUnit(old, oi);
            }
          }
          this.zone = zone;
          this.$writeSegment(
            cs,
            old,
            primary,
            desired,
            newSeg,
            left,
            newUnits,
            used,
            {contentLater, groupOf, movedOf, slotAfterItem},
          );
        }
        if (k < n && attach[k] === 'alone') {
          const [di, oi] = anchors[k];
          const d = desired[di];
          const u = old[oi];
          used.add(u);
          const join = joinOf.get(k);
          if (join !== undefined) {
            // Written after every gap (see $writeJoin).
            if (u.sig !== d.sig) {
              this.$writeMarker(u.end!, this.$marker(d), d.node);
            }
            this.touched.push({d, unit: u});
          } else if (d.kind === 'line') {
            if (this.$changed(d)) {
              this.$writeLineAlone(u, d);
            } else if (
              u.end !== null &&
              (u.sig !== d.sig || this.plan.lines.has(d.key!))
            ) {
              this.$writeMarker(u.end, this.$marker(d), d.node);
              u.sig = d.sig;
              this.touched.push({d, unit: u});
            }
          }
          u.first = d.first;
          u.last = d.last;
          u.sig = d.sig;
          newUnits.push(u);
        }
      }
      joinOf.forEach(j => this.$writeJoin(wz, j));
    } finally {
      this.zone = prevZone;
      this.zoneOverride.delete(y);
    }
    // Records left showing nothing go away.
    const showing = new Set<Item>();
    const markShowing = (from: Zone) => {
      // A record shows its units, and the records shown inside its range.
      for (
        let z: Zone = from, guard = 0;
        z !== null && !showing.has(z) && guard < 64;
        guard++
      ) {
        showing.add(z);
        z = wz.ownerOf(z);
      }
    };
    for (const u of newUnits) {
      markShowing(u.zone ?? null);
    }
    // An inline record shows its range's text inside a line: it shows
    // something while live content of its range is its own.
    for (const r of wz.active) {
      if (r.inline === true && !showing.has(r.item) && !r.item.deleted) {
        for (let p = r.s === null ? y._start : r.s.right; p !== null; ) {
          if (
            !p.deleted &&
            p.countable &&
            !isMoveItem(p) &&
            wz.ownerOf(p) === r.item
          ) {
            markShowing(r.item);
            break;
          }
          if (p === r.e) {
            break;
          }
          p = p.right;
        }
      }
    }
    for (const r of wz.active) {
      if (r.p !== Infinity && !showing.has(r.item) && !r.item.deleted) {
        r.item.delete(this.tr);
      }
    }
    for (const u of old) {
      if (!used.has(u)) {
        state.dropUnit(u);
      }
    }
    for (const u of newUnits) {
      state.setUnit(u);
    }
    cs.units = newUnits;
    state.noteMoves(y);
    // A unit's zone is the zone of its end item (a write can end a line in
    // a range shown inline, an Enter after a join).
    const nz = state.zonesOf(y);
    for (const u of newUnits) {
      if (u.end !== null && !u.end.deleted) {
        const z = nz === null ? null : nz.ownerOf(u.end);
        if (z !== null || u.zone !== undefined) {
          u.zone = z;
        }
      }
    }
    this.$zonedStarts(cs);
    // Moved lines whose content changed too: written in their new zone.
    for (const [u, d] of contentLater) {
      this.$writeLineAlone(u, d);
    }
  }

  /**
   * The joins of a zoned structure write (see Join): an anchor line whose
   * content changed into its own old content (or a start of it) followed by
   * the next old line's (or an end of it), where that next line is removed,
   * is in another zone and is one range of its zone.
   */
  private $findJoins(
    wz: Zones,
    desired: Desired[],
    old: Unit[],
    matches: [number, number][],
    anchors: [number, number][],
    movedOld: Set<number>,
    contiguous: (u: Unit) => boolean,
    rangeStart: (u: Unit) => Item | null,
  ): Map<number, Join> {
    const out = new Map<number, Join>();
    const matched = new Set(matches.map(m => m[1]));
    const n = anchors.length;
    for (let k = 0; k < n; k++) {
      const [di, oi] = anchors[k];
      const d = desired[di];
      const p = old[oi];
      const ti = oi + 1;
      const t = old[ti];
      if (
        d.kind !== 'line' ||
        p.kind !== 'line' ||
        p.end === null ||
        p.end.deleted ||
        !this.plan.lines.has(d.key!) ||
        !this.$contentChanged(d.key!) ||
        t === undefined ||
        (k + 1 < n && anchors[k + 1][1] <= ti) ||
        matched.has(ti) ||
        movedOld.has(ti) ||
        t.kind !== 'line' ||
        t.end === null ||
        t.end.deleted ||
        (t.zone ?? null) === (p.zone ?? null)
      ) {
        continue;
      }
      // A second line that is not one range is joined with one inline
      // record per piece.
      const pieces = contiguous(t) ? null : this.unitPieces(wz, t);
      if (!contiguous(t) && pieces === null) {
        continue;
      }
      const a = this.$oldLineAtoms(wz, p);
      const b = this.$oldLineAtoms(wz, t);
      // Where each joined character comes from (the text node it was in):
      // the second line's text must be recognized as such, never built from
      // characters of the first line that happen to be equal.
      const fromP = this.oldOrigins([p]);
      const fromT = this.oldOrigins([t]);
      if (fromP === null || fromT === null) {
        continue;
      }
      this.setOriginOrder(this.oldOrigins([p, t]));
      const want = new Atoms();
      $pushInline(want, (d.node as ElementNode).getChildren(), this.$ctx(true));
      const tKeys = new Set(fromT.map(o => o[2]).filter(key => key !== ''));
      const split = joinSplit(
        a,
        b,
        want,
        this.state,
        keysAt(want.origins, want.length),
        tKeys,
      );
      if (
        split !== null &&
        (pieces === null
          ? !this.joinMakesLoop(wz, p, t, rangeStart(t))
          : !pieces.some(pc => this.joinMakesLoop(wz, p, t, pc.s, pc.e)))
      ) {
        out.set(k, {
          from: split.from,
          k,
          keep: split.keep,
          p,
          pLength: a.length,
          pieces: pieces ?? undefined,
          s: rangeStart(t),
          t,
          ti,
        });
      }
    }
    return out;
  }

  /**
   * Whether an inline record of `t`'s range, written at the end of `p`,
   * would be inside its own range through the records that show it, or
   * would put a record already inside that range inside its own range (it
   * would then show nothing, and neither would what it showed): such a
   * join is written as before (the second line's text is copied).
   */
  private joinMakesLoop(
    wz: Zones,
    p: Unit,
    t: Unit,
    s: Item | null,
    e: Item = t.end!,
  ): boolean {
    const sOrd = s === null ? -1 : wz.order(s);
    const eOrd = wz.order(e);
    if ((s !== null && sOrd < 0) || eOrd < 0) {
      return true;
    }
    const inT = (it: Item) => {
      const k = wz.order(it);
      return k > sOrd && k <= eOrd;
    };
    // Where the record shows: at the end of `p`, and where the records
    // showing that zone show.
    const where: Item[] = [p.end!];
    for (
      let z = wz.ownerOf(p.end!), guard = 0;
      z !== null && guard < 64;
      z = wz.ownerOf(z), guard++
    ) {
      where.push(z);
    }
    if (where.some(inT)) {
      return true;
    }
    for (const r of wz.active) {
      if (r.p === Infinity || !inT(r.item)) {
        continue;
      }
      if (
        where.some(it => {
          const k = wz.order(it);
          return k > r.sOrd && k <= r.eOrd;
        })
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * The pieces of unit `u` that a move or join must carry with records of
   * their own, in the order its walk shows them: maximal runs of items of
   * one zone, physically adjacent, that the walk reaches without entering
   * an inline record of the unit itself (what the walk shows through such a
   * record moves with the record). The last piece holds the unit's end.
   * One piece: the unit is one range. Null when its end is reached through
   * an inline record of the unit (not handled: written as before).
   */
  private unitPieces(
    wz: Zones,
    u: Unit,
  ): {s: Item | null; e: Item; zone: Zone; items: Item[]}[] | null {
    const y = u.cs.y;
    const end = u.end!;
    const {left, zone} = lineStart(wz, end);
    const view = new ZoneView(wz, zone, null);
    type Piece = {s: Item | null; e: Item; zone: Zone; items: Item[]};
    const pieces: Piece[] = [];
    // The last piece of each zone in walk order (a walk that leaves an
    // inline range goes on right after the record's item).
    const lastOf = new Map<Zone, Piece>();
    // Inline records the walk entered and has not left yet.
    const open: Item[] = [];
    // Inline records the walk entered and left: what it showed through
    // them moves with their item, which is part of the piece around it.
    const covered = new Set<Item>();
    let cur: Piece | null = null;
    let prevZone: Zone = zone;
    const extend = (z: Zone, it: Item): Piece => {
      const last = lastOf.get(z);
      if (last !== undefined && last.e === it.left) {
        last.e = it;
        last.items.push(it);
        return last;
      }
      const pc: Piece = {e: it, items: [it], s: it.left, zone: z};
      pieces.push(pc);
      lastOf.set(z, pc);
      return pc;
    };
    const visit = (it: Item) => {
      const z = view.zone;
      if (z !== prevZone) {
        if (
          z !== null &&
          wz.inlineRec(z) !== null &&
          wz.ownerOf(z) === prevZone
        ) {
          open.push(z);
        } else if (open.length > 0 && open[open.length - 1] === prevZone) {
          // Left the inline record `prevZone`: its item belongs to the
          // piece of the zone it is in.
          const r = open.pop()!;
          covered.add(r);
          extend(z, r);
        }
        cur = null;
      }
      if (
        wz.ownerOf(it) !== z ||
        (!it.deleted && isMoveItem(it) && !isInlineRecordItem(it))
      ) {
        // Another zone's item, or a record showing units before the line
        // (not part of the line): a piece ends.
        cur = null;
      } else if (cur !== null && (cur as Piece).e === it.left) {
        (cur as Piece).e = it;
        (cur as Piece).items.push(it);
      } else {
        cur = extend(z, it);
      }
      prevZone = z;
    };
    let guard = 0;
    for (
      let p: Item | null =
        left === null
          ? enterZone(view, y, y._start, end)
          : stepZone(view, y, left, end);
      p !== null && guard < 100000;
      p = stepZone(view, y, p, end), guard++
    ) {
      visit(p);
    }
    if (view.zone !== wz.ownerOf(end)) {
      return null;
    }
    visit(end);
    // Ranges the walk entered and never left (the line ends inside them)
    // move piece by piece: their record stays.
    const own = pieces.filter(pc => pc.zone === null || !covered.has(pc.zone));
    if (own.length === 0 || own[own.length - 1].e !== end) {
      return null;
    }
    return own;
  }

  /** The atoms of an old line's content (without its marker). */
  private $oldLineAtoms(zones: Zones, u: Unit): Atoms {
    const {left, zone} = lineStart(zones, u.end!);
    const out = new Atoms();
    readAtoms(
      startItemAfter(zones, u.cs.y, left, zone),
      u.end,
      u.start || EMPTY_FORMATS,
      out,
      new ZoneView(zones, zone, this.state.hidden),
    );
    return out;
  }

  /**
   * Write a join across ranges: delete the end of the first line and the
   * start of the second one that the join removed, insert an inline record
   * of the second line's range right after what is left of the first line,
   * and delete the second line's marker. The second line's text keeps its
   * items (a peer typing in it keeps typing in the joined line).
   */
  private $writeJoin(wz: Zones, j: Join): void {
    const y = j.p.cs.y;
    const prevZone = this.zone;
    try {
      const tEnd = j.t.end!;
      if (j.from > 0) {
        const ts = lineStart(wz, tEnd);
        this.zone = ts.zone;
        this.cursor(y, ts.left, j.t.start || EMPTY_FORMATS).delete(j.from);
      }
      const ps = lineStart(wz, j.p.end!);
      this.zone = ps.zone;
      if (j.keep < j.pLength) {
        const c = this.cursor(y, ps.left, j.p.start || EMPTY_FORMATS);
        c.advance(j.keep);
        c.delete(j.pLength - j.keep);
      }
      const c = this.cursor(y, ps.left, j.p.start || EMPTY_FORMATS);
      if (j.keep === 0) {
        c.skipRecords();
      }
      c.advance(j.keep);
      c.skipNonContent();
      const ranges =
        j.pieces === undefined ? [{e: tEnd, items: [tEnd], s: j.s}] : j.pieces;
      for (const range of ranges) {
        const ry = this.newRecordNode();
        c.insertPlain(new ContentType(ry));
        ry.setAttr(MOVE_START_KEY, range.s === null ? null : idRef(range.s));
        ry.setAttr(MOVE_END_KEY, idRef(range.e));
        ry.setAttr(MOVE_PRIORITY_KEY, wz.priorityOver(range.items));
        ry.setAttr(MOVE_INLINE_KEY, 1);
      }
      tEnd.delete(this.tr);
    } finally {
      this.zone = prevZone;
    }
  }

  /**
   * Text that no marker ended showed the records after some of its text
   * after it; now that a marker ends it, those records (inside the line)
   * would show before it: they are written again right after the marker.
   */
  private $keepRecordsAfter(y: YNode, _left: Item | null, end: Item): void {
    const zones = this.zonesFor(y);
    if (zones === null) {
      return;
    }
    const zone = zones.ownerOf(end);
    const moved: Item[] = [];
    let content = false;
    // The line's walk (it can start in another zone, and show inline ranges
    // in its place): the records it passes after some content.
    const start = lineStart(zones, end);
    const view = new ZoneView(zones, start.zone, null);
    for (
      let p: Item | null =
        start.left === null
          ? enterZone(view, y, y._start, end)
          : stepZone(view, y, start.left, end);
      p !== null;
      p = stepZone(view, y, p, end)
    ) {
      if (zones.ownerOf(p) !== view.zone || p.deleted || !p.countable) {
        continue;
      }
      if (isMoveItem(p)) {
        if (content) {
          moved.push(p);
        }
      } else {
        content = true;
      }
    }
    let after: Item = end;
    const prevZone = this.zone;
    this.zone = zone;
    for (const r of moved) {
      const ry = this.newRecordNode();
      after = this.cursor(y, after, EMPTY_FORMATS).insertPlain(
        new ContentType(ry),
      );
      copyRecordAttrs(r, ry);
      r.delete(this.tr);
      const cs = this.state.containers.get(y);
      if (cs !== undefined) {
        for (const u of cs.units) {
          if (u.zone === r) {
            u.zone = after;
          }
        }
      }
    }
    this.zone = prevZone;
    if (moved.length > 0) {
      this.state.noteMoves(y);
    }
  }

  /**
   * A record shows its units before the line its item is in. A concurrent
   * join (or typing at the line start) can leave the record between that
   * line's characters, where nothing can be inserted between the record's
   * units and the line: such records are written again at the start of the
   * line (same range and priority), which shows the same.
   */
  private $normalizeRecords(y: YNode): void {
    const zones = this.state.zonesOf(y);
    if (zones === null || this.plan.followUp === true) {
      return;
    }
    const renamed = new Map<Item, Item>();
    // In document order, so records keep their order among themselves.
    const recs = [...zones.active].sort(
      (a, b) => zones.order(a.item) - zones.order(b.item),
    );
    // Records that show nothing (they lost to another record of the same
    // range) are not written again (they are removed with the write).
    const cs0 = this.state.containers.get(y);
    const showing = new Set<Item>();
    if (cs0 !== undefined) {
      for (const u of cs0.units) {
        for (
          let z: Zone = u.zone ?? null, guard = 0;
          z !== null && !showing.has(z) && guard < 64;
          guard++
        ) {
          showing.add(z);
          z = zones.ownerOf(z);
        }
      }
    }
    // Each record's walk to its line's start: a walk that reaches a record
    // of its zone walked before ends as that one's did (until a record is
    // written again, which changes the items).
    const walked = new Map<
      Item,
      {z: Zone; content: boolean; boundary: Item | null}
    >();
    for (const r of recs) {
      if (!showing.has(r.item) || r.inline === true) {
        // (An inline record belongs inside its line.)
        continue;
      }
      const z = zones.ownerOf(r.item);
      let content = false;
      let boundary: Item | null = null;
      for (let p = r.item.left; p !== null; p = p.left) {
        if (zones.ownerOf(p) !== z) {
          if (z !== null && !zones.inRange(z, p)) {
            boundary = p;
            break;
          }
          continue;
        }
        if (!p.deleted && isEndItem(p)) {
          boundary = p;
          break;
        }
        if (
          !p.deleted &&
          p.countable &&
          (!isMoveItem(p) || zones.entersAt(z, p) !== null)
        ) {
          content = true;
        }
        const before = walked.get(p);
        if (before !== undefined && before.z === z) {
          content = content || before.content;
          boundary = before.boundary;
          break;
        }
      }
      walked.set(r.item, {boundary, content, z});
      if (!content) {
        continue;
      }
      // Only inside a line (text no marker ends, before a block node or at
      // the end, shows the record after it: nothing to do).
      const next = nextZoneEnd(zones, r.item);
      if (next === null || isBlockNodeItem(next)) {
        continue;
      }
      // After the records already at the line's start.
      let at = boundary;
      for (
        let p: Item | null = boundary === null ? y._start : boundary.right;
        p !== null && p !== r.item;
        p = p.right
      ) {
        if (zones.ownerOf(p) !== z || p.deleted || !p.countable) {
          continue;
        }
        if (isMoveItem(p) && zones.entersAt(z, p) === null) {
          at = p;
          continue;
        }
        break;
      }
      // Only when the same records stay active: a record moved out of (or
      // into) another record's range can change which records show
      // anything (two records inside each other's ranges), and so what the
      // document shows.
      if (
        !zones.sameActiveWith(
          r.item,
          (at === null ? -1 : zones.order(at)) + 0.5,
        )
      ) {
        continue;
      }
      const prevZone = this.zone;
      this.zone = z;
      const ry = this.newRecordNode();
      const item = this.cursor(y, at, EMPTY_FORMATS).insertPlain(
        new ContentType(ry),
      );
      this.zone = prevZone;
      copyRecordAttrs(r.item, ry);
      r.item.delete(this.tr);
      renamed.set(r.item, item);
      walked.clear();
    }
    if (renamed.size > 0) {
      this.state.noteMoves(y);
      const cs = this.state.containers.get(y);
      if (cs !== undefined) {
        for (const u of cs.units) {
          const z = u.zone ? renamed.get(u.zone) : undefined;
          if (z !== undefined) {
            u.zone = z;
          }
        }
      }
    }
  }

  /**
   * Set every unit's start formats (the formats in effect where it starts)
   * from the shared items: deletes and inserts start from them, and a stale
   * value would leave a format open or close one early.
   */
  private $recomputeStarts(cs: CS): void {
    if (this.zonesFor(cs.y) !== null) {
      this.$zonedStarts(cs);
      return;
    }
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

  /** Start formats of every unit of a container holding moves. */
  private $zonedStarts(cs: CS): void {
    for (const [u, f] of physicalStarts(this.state, cs)) {
      u.start = f.size > 0 ? f : null;
    }
  }

  /** After a line's own write, the start formats of the units after it. */
  private $fixStartsAfter(u: Unit): void {
    if (this.zonesFor(u.cs.y) !== null) {
      this.$zonedStarts(u.cs);
      return;
    }
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
   * In a follow-up, a node stored as its own shared node is unchanged while
   * it stays in place: its attributes are written on their own (plan.attrs).
   */
  $contentChanged(key: NodeKey): boolean {
    return this.rewriteAll || !this.$sameContent(key, true);
  }

  /**
   * Whether node `k` is unchanged since the previous state: its own fields
   * (`top`: a line or container, compared by content only, as its fields
   * are elsewhere) and its children, recursively.
   */
  private $sameContent(k: NodeKey, top: boolean): boolean {
    const prevMap = this.prevState._nodeMap;
    const before = prevMap.get(k);
    const now = $getNodeByKey(k);
    if (before === undefined || now === null) {
      return false;
    }
    if (!top && this.followUp && this.state.yByKey.has(k)) {
      return true;
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
      if (a !== b || a === null || !this.$sameContent(a, false)) {
        return false;
      }
      const pa = prevMap.get(a)!;
      a = pa.__next;
      b = $getNodeByKey(b!)!.getLatest().__next;
    }
    return true;
  }

  /**
   * Whether the content of a line or inline container changed only by
   * losing children: each child it has now was its child before, in the
   * same order, and is unchanged. A follow-up may write such a change (its
   * diff only deletes).
   */
  private $deletesOnly(key: NodeKey): boolean {
    const prevMap = this.prevState._nodeMap;
    const before = prevMap.get(key);
    const now = $getNodeByKey(key);
    if (!$isElementNode(before) || !$isElementNode(now)) {
      return false;
    }
    let a = before.__first;
    for (let b = now.getLatest().__first; b !== null; ) {
      while (a !== null && a !== b) {
        if (!this.$removedFromDocument(a)) {
          return false;
        }
        a = prevMap.get(a)!.__next;
      }
      if (a === null || !this.$sameContent(b, false)) {
        return false;
      }
      a = prevMap.get(a)!.__next;
      b = $getNodeByKey(b)!.getLatest().__next;
    }
    for (; a !== null; a = prevMap.get(a)!.__next) {
      if (!this.$removedFromDocument(a)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Whether a node of the previous state left the document with everything
   * it held: a child an update moved elsewhere (adjacent lists merged, a
   * line lifted out of an item) was not deleted, so a follow-up that moved
   * it deletes nothing (its insert at the new place would not be written,
   * and the content would be lost for every reader).
   */
  private $removedFromDocument(key: NodeKey): boolean {
    const prevMap = this.prevState._nodeMap;
    const stack: NodeKey[] = [key];
    while (stack.length > 0) {
      const k = stack.pop()!;
      const node = $getNodeByKey(k);
      if (node !== null && node.isAttached()) {
        return false;
      }
      const prev = prevMap.get(k);
      if ($isElementNode(prev)) {
        for (let c = prev.__first; c !== null; ) {
          stack.push(c);
          const pc = prevMap.get(c);
          c = pc === undefined ? null : pc.__next;
        }
      }
    }
    return true;
  }

  /**
   * Whether this update changed a line without a marker (text concurrent
   * edits left without one, see Unit): its content, or its own fields or
   * NodeState, its block id included (the id a reader derives for it is set
   * by the read, so an id this update changed is one set on it).
   * Invariant: an unchanged one is not written. Why: it reads the same
   * without a marker, while each structural edit in its container would
   * otherwise give it one, so two clients making one at once would add two
   * (and an empty line).
   */
  $implicitChanged(key: NodeKey): boolean {
    if (this.$contentChanged(key)) {
      return true;
    }
    const now = $getNodeByKey(key);
    const prev = this.prevState._nodeMap.get(key);
    if (now === null || prev === undefined) {
      return true;
    }
    const latest = now.getLatest();
    if (prev === latest) {
      return false;
    }
    const state = (n: LexicalNode) => {
      const attrs: Attrs = {};
      $stateAttrs(n, attrs);
      return stableStringify(attrs);
    };
    return !sameOwnFields(prev, latest) || state(prev) !== state(latest);
  }

  /**
   * Whether this update changed a node's own fields (its format, indent or
   * direction, not its children or NodeState): for a line without a marker,
   * which keeps them nowhere, a follow-up's change of them is refused (see
   * followUp).
   */
  private $fieldsChanged(key: NodeKey): boolean {
    const prev = this.prevState._nodeMap.get(key);
    const now = $getNodeByKey(key);
    return (
      prev !== undefined &&
      now !== null &&
      prev !== now.getLatest() &&
      !sameAttrFields(prev, now.getLatest())
    );
  }

  private $refreshGroupsOf(line: LexicalNode): void {
    for (let p = line.getParent(); p !== null; p = p.getParent()) {
      const role = this.roles.$role(p);
      if (role === 'group') {
        this.refreshGroups.add(p.getKey());
      } else if (role !== 'level') {
        break;
      }
    }
  }

  /**
   * Delete exactly the content of an old unit, starting from its start
   * formats, and give the unit after it those as its own: it now starts
   * where the deleted unit started. Invariant: a unit's start (see
   * Unit.start) is the formats in effect after the live end item before it,
   * also after the units between were deleted, so every write that starts
   * there (this delete, a later unit's delete or diff, see $writeSegment
   * and $writeLineAlone) starts from the formats in effect there. Why: a
   * delete removes the format items it leaves redundant, judged from the
   * formats it starts from; from the start of a unit after a deleted block
   * node (inside a format run around that node), it removed the opener of
   * a run that goes on after the deleted content, and every reader showed
   * that text without the format while the author kept it (soak S3-6; on a
   * follow-up's delete, R12B-C1).
   */
  private $deleteUnit(old: Unit[], idx: number): void {
    const u = old[idx];
    const zones = this.zonesFor(u.cs.y);
    if (u.kind === 'node') {
      if (u.end !== null && !u.end.deleted) {
        u.end.delete(this.tr);
      }
    } else {
      const left = unitLeft(old, idx, zones);
      const stop = unitStop(old, idx, zones);
      const zone = zones === null ? null : unitStartOf(old, idx, zones).zone;
      const startItem = startItemAfter(zones, u.cs.y, left, zone);
      const prevZone = this.zone;
      this.zone = zone;
      const cursor = this.cursor(u.cs.y, left, u.start || EMPTY_FORMATS);
      // Its own content starts at its first item, right after the end item
      // of the unit before it, also once this write deleted that one (a line
      // without a marker always follows one, see parseRange): live text
      // between (a line without a marker before a block node this write
      // deleted) is stepped over, never deleted with it (R13-A P1; S4-3 for
      // a deleted line without a marker). With moves, the unit before it in
      // `old` need not be the one before it in the walk: from `startItem`.
      const own = zones === null && idx > 0 ? old[idx - 1].end : null;
      const from = own !== null && own !== left ? own.right : startItem;
      if (from !== startItem) {
        cursor.advance(countLive(startItem, from, this.viewFor(u.cs.y)));
      }
      // With moves, a line ends where its walk passes its end item (`last`).
      cursor.delete(
        countLive(
          from,
          zones !== null && u.end !== null ? null : stop,
          this.viewFor(u.cs.y),
          u.end,
        ),
      );
      this.zone = prevZone;
    }
    // With moves, the next unit in `old` need not follow this one in the walk.
    if (idx + 1 < old.length && zones === null) {
      old[idx + 1].start = u.start;
    }
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
    mv: MoveContext | null = null,
  ): Item | null {
    const zones = this.zonesFor(cs.y);
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
    const lines = newSeg.filter(
      di => desired[di].kind !== 'node' && !(mv !== null && mv.movedOf.has(di)),
    );
    // The formats in effect at `left`, where the content is diffed from: the
    // first remaining unit's start, also when node units before it were
    // deleted above (see $deleteUnit). With moves, the formats after `left`.
    const startFormats =
      remaining.length > 0 && zones === null
        ? old[remaining[0]].start || EMPTY_FORMATS
        : this.formatsAfter(left);
    const startItem = startItemAfter(zones, cs.y, left, this.zone);
    const lineItems = new Map<number, Item>();
    if (remaining.length > 0 || lines.length > 0) {
      const oldStop =
        remaining.length > 0
          ? unitStop(old, remaining[remaining.length - 1], zones)
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
      if (ctx.flattened === true) {
        this.refused.add(cs);
      }
      const items = this.$writeSeq(
        cs.y,
        left,
        startFormats,
        oldStop,
        atoms,
        ctx.cursorAt,
        oldOrigins,
        this.zone !== null && !openTail,
        remaining.length > 0 ? old[remaining[remaining.length - 1]].end : null,
      );
      if (openTail) {
        const c = this.cursor(cs.y, left, startFormats);
        c.advance(atoms.length);
        const lastD = desired[lines[lines.length - 1]];
        const tailEnd = c.insertPlain(
          new ContentType(new YNode(lastD.kind === 'line' ? MARKER : RUN_END)),
        );
        items.set(atoms.length, tailEnd);
        this.$keepRecordsAfter(cs.y, left, tailEnd);
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
    const gapZone = this.zone;
    let afterZone = gapZone;
    for (const di of newSeg) {
      const d = desired[di];
      const moi = mv === null ? undefined : mv.movedOf.get(di);
      if (mv !== null && moi !== undefined) {
        // A moved unit keeps its items: one record per moved range shows
        // them here.
        const mu = old[moi];
        const g = mv.groupOf.get(di)!;
        if (g.record === null) {
          const slot = mv.slotAfterItem(afterZone, after);
          this.zone = slot.zone;
          const ry = this.newRecordNode();
          g.record = this.cursor(cs.y, slot.left, EMPTY_FORMATS).insertPlain(
            new ContentType(ry),
          );
          this.zone = gapZone;
          ry.setAttr(MOVE_START_KEY, g.s === null ? null : idRef(g.s));
          ry.setAttr(MOVE_END_KEY, idRef(g.e));
          ry.setAttr(MOVE_PRIORITY_KEY, g.p);
          if (g.replaces !== null && !g.replaces.deleted) {
            g.replaces.delete(this.tr);
          }
          after = g.record;
          afterZone = slot.zone;
        }
        this.state.dropUnit(mu);
        mu.zone = g.record;
        if (d.kind === 'line') {
          if (mu.kind === 'line' && this.$changed(d)) {
            mv.contentLater.push([mu, d]);
          } else if (mu.sig !== d.sig || this.plan.lines.has(d.key!)) {
            this.$writeMarker(mu.end!, this.$marker(d), d.node);
            this.touched.push({d, unit: mu});
          }
        }
        mu.first = d.first;
        mu.last = d.last;
        mu.sig = d.sig;
        if (d.sig !== '') {
          this.$refreshGroupsOf(d.node!);
        }
        used.add(mu);
        newUnits.push(mu);
        continue;
      }
      let end: Item;
      if (d.kind === 'node') {
        let slotLeft = after;
        if (mv !== null) {
          const slot = mv.slotAfterItem(afterZone, after);
          this.zone = slot.zone;
          slotLeft = slot.left;
          afterZone = slot.zone;
        }
        const cursor = this.cursor(cs.y, slotLeft, EMPTY_FORMATS);
        this.zone = gapZone;
        const y = new YNode(BLOCK_PREFIX + d.node!.getType());
        end = cursor.insertPlain(new ContentType(y));
        this.$fillNode(y, d.node!);
      } else {
        afterZone = gapZone;
        end = lineItems.get(di)!;
        if (d.kind === 'line') {
          this.$writeMarker(end, this.$marker(d), d.node);
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
      if (u.zone !== undefined || afterZone !== null) {
        u.zone = d.kind === 'node' ? afterZone : gapZone;
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
    if (zones !== null || mv !== null) {
      // Start formats are recomputed for the whole container afterwards.
      return after;
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
    // items that span into it, and later writes start from that value. Its
    // own format items are its content, as a reader takes them (see
    // Reader#$readLineInPlace and $fixStartsAfter): before, its start took
    // them up to its end item, so a closer an outside writer left in it
    // could be judged redundant and deleted (R13-A P2).
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
      if (it.countable && isEndItem(it)) {
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

  /**
   * A new move record's node. The binding then marks the document with
   * the layout that has move records, outside the undo history (clients
   * that do not know it go read only).
   */
  private newRecordNode(): YNode {
    this.wroteRecord = true;
    return new YNode(MOVE);
  }

  /** Ownership of the items of `y` for this write (null: no moves). */
  private zonesFor(y: YNode): Zones | null {
    return this.zoneOverride.get(y) ?? this.state.zonesOf(y);
  }

  /** What writes of the current zone in `y` see. */
  private viewFor(y: YNode): Shown | null {
    const zones = this.zonesFor(y);
    return zones === null
      ? this.state.hidden
      : new ZoneView(zones, this.zone, this.state.hidden);
  }

  /** A write cursor after `left` that skips content the editor hides. */
  private cursor(y: YNode, left: Item | null, formats: Formats): Cursor {
    const c = new Cursor(this.tr, y, left, new Map(formats));
    c.hidden = this.viewFor(y);
    // A walk never stands after the last item of an inline range.
    c.settle();
    return c;
  }

  /** Formats in effect right after `item` (an end item, or null). */
  private formatsAfter(item: Item | null): Formats {
    if (item === null) {
      return EMPTY_FORMATS;
    }
    if (this.zonesFor(item.parent as YNode) !== null) {
      return formatsAfterItem(item.parent as YNode, item);
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

  /** A follow-up's change that is not written (see followUp). */
  private refuse(cs: CS, what: string, node: LexicalNode): void {
    this.refused.add(cs);
    followUpWarning(what, node);
  }

  /**
   * A follow-up's write of a block container (see followUp): the units it
   * removed are deleted, and the lines it kept are written where only their
   * attributes changed or their content only lost children (a line without
   * a marker: where its content did not change). Invariant: when it changed
   * anything else (a unit added, moved or rewritten), nothing of the
   * container is written, and the container is read again. Why: the
   * attributes a transform derived from that change (the start of a list it
   * split) would not fit what is stored, and a change of a line without a
   * marker that is not written left the author showing what no reader shows
   * (soak S4-2).
   */
  private $writeFollowUp(cs: CS, container: ElementNode): void {
    this.droppedOuterId = false;
    const desired = this.$desiredUnits(container);
    if (this.droppedOuterId) {
      this.refused.add(cs);
    }
    const old = cs.units;
    // The old units it kept, in order: each desired unit is a later old
    // unit (the old units passed over were removed).
    const kept = new Map<Unit, Desired>();
    let ok = true;
    let oi = 0;
    for (const d of desired) {
      let j = oi;
      while (j < old.length && !this.$keeps(d, old[j])) {
        j++;
      }
      if (j === old.length) {
        ok = false;
        break;
      }
      kept.set(old[j], d);
      oi = j + 1;
    }
    const rewrite: [Unit, Desired][] = [];
    const markers: [Unit, Desired][] = [];
    for (const d of ok ? desired : []) {
      const unit =
        d.kind === 'line' && d.part === undefined && d.key !== null
          ? this.state.unitByKey.get(d.key)
          : undefined;
      if (unit === undefined || unit.cs !== cs) {
        continue;
      }
      if (unit.end === null) {
        // A line without a marker whose content or fields changed is
        // refused (see followUp), as in $run.
        if (this.$changed(d) || this.$fieldsChanged(d.key!)) {
          ok = false;
          break;
        }
        continue;
      }
      if (unit.end.deleted) {
        continue;
      }
      if (this.$changed(d)) {
        if (kept.has(unit) && this.$deletesOnly(d.key!)) {
          rewrite.push([unit, d]);
        } else {
          ok = false;
          break;
        }
      } else if (unit.sig !== d.sig || this.plan.lines.has(d.key!)) {
        markers.push([unit, d]);
      }
    }
    // A unit it removed is deleted only if its content left the document
    // (see $removedFromDocument).
    if (
      ok &&
      old.some(
        u =>
          !kept.has(u) &&
          ((u.key !== null && !this.$removedFromDocument(u.key)) ||
            (u.kind === 'run' && !this.$runRemoved(u))),
      )
    ) {
      ok = false;
    }
    // A line without a marker ends where the block node after it starts:
    // with that node deleted, it would run into the line kept after it,
    // which only a marker (an insert) keeps apart, so every reader would
    // show the two joined (R13-A P1).
    if (ok) {
      for (let j = 0; j < old.length && ok; j++) {
        if (old[j].kind === 'implicit' && kept.has(old[j])) {
          let k = j + 1;
          while (k < old.length && !kept.has(old[k])) {
            k++;
          }
          if (k < old.length && old[k].kind !== 'node') {
            ok = false;
          }
        }
      }
    }
    if (!ok) {
      this.refuse(cs, 'the structure of', container);
      return;
    }
    for (const [unit, d] of markers) {
      this.$writeMarker(unit.end!, this.$marker(d), d.node);
      unit.sig = d.sig;
      this.touched.push({d, unit});
    }
    old.forEach((u, idx) => {
      if (!kept.has(u)) {
        this.$deleteUnit(old, idx);
      }
    });
    for (const [unit, d] of rewrite) {
      this.$writeLineAlone(unit, d);
    }
    if (kept.size !== old.length) {
      const units: Unit[] = [];
      for (const u of old) {
        const d = kept.get(u);
        if (d === undefined) {
          this.state.dropUnit(u);
        } else {
          u.first = d.first;
          u.last = d.last;
          units.push(u);
        }
      }
      cs.units = units;
      this.$recomputeStarts(cs);
    }
  }

  /** Whether every inline node of a run left the document. */
  private $runRemoved(u: Unit): boolean {
    const prevMap = this.prevState._nodeMap;
    for (let k = u.first; k !== null; ) {
      if (!this.$removedFromDocument(k)) {
        return false;
      }
      if (k === u.last) {
        break;
      }
      const prev = prevMap.get(k);
      k = prev === undefined ? null : prev.__next;
    }
    return true;
  }

  /** Whether desired unit `d` is old unit `o`, as a follow-up kept it. */
  private $keeps(d: Desired, o: Unit): boolean {
    if (d.part !== undefined) {
      return false;
    }
    if (d.kind === 'line') {
      return o.key === d.key && (o.kind === 'line' || o.kind === 'implicit');
    }
    if (d.kind === 'node') {
      return (
        o.key === d.key &&
        o.kind === 'node' &&
        o.end !== null &&
        nameOf(o.end).startsWith(BLOCK_PREFIX) &&
        storedTypeOf(typeOf(o.end)) === d.node!.getType()
      );
    }
    // A run: the same inline children as before, unchanged.
    if (o.kind !== 'run' || o.first === null || d.first !== o.first) {
      return false;
    }
    const prevMap = this.prevState._nodeMap;
    let k: NodeKey | null = o.first;
    for (const node of d.nodes) {
      if (k !== node.getKey() || !this.$sameContent(k, false)) {
        return false;
      }
      const prev = prevMap.get(k);
      k = k === o.last || prev === undefined ? null : prev.__next;
    }
    return k === null;
  }

  /** Rewrite one line (its content and marker) on its own. */
  $writeLineAlone(u: Unit, d: Desired): void {
    const prevZone = this.zone;
    const zones = this.zonesFor(u.cs.y);
    // A line's walk starts in the zone its line starts in (see lineStart).
    this.zone =
      zones === null
        ? (u.zone ?? null)
        : unitStartOf(u.cs.units, u.cs.units.indexOf(u), zones).zone;
    try {
      this.$writeLineAloneInZone(u, d);
    } finally {
      this.zone = prevZone;
    }
  }

  private $writeLineAloneInZone(u: Unit, d: Desired): void {
    if (this.$writeTextEdit(u, d)) {
      return;
    }
    const old = u.cs.units;
    const zones = this.zonesFor(u.cs.y);
    let left: Item | null;
    let stop: Item | null;
    if (u.end !== null) {
      left = prevBoundary(zones, u.end);
      stop = u.end.right;
    } else {
      const idx = old.indexOf(u);
      left = unitLeft(old, idx, zones);
      stop = unitStop(old, idx, zones);
    }
    const atoms = new Atoms();
    const oldOrigins = this.oldOrigins([u]);
    this.setOriginOrder(oldOrigins);
    const ctx = this.$ctx(true);
    $pushInline(atoms, $lineChildren(d), ctx);
    if (ctx.flattened === true) {
      this.refused.add(u.cs);
    }
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
      this.$keepRecordsAfter(u.cs.y, left, end);
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
        false,
        u.end,
      );
      end = items.get(at)!;
    }
    if (end !== u.end) {
      this.state.dropUnit(u);
      u.end = end;
      u.kind = 'line';
      this.state.setUnit(u);
    }
    this.$writeMarker(end, this.$marker(d), d.node);
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
    // With moves, a line can be written alone after text from another
    // zone was merged into it (a join with a moved line): the full write
    // tells such text apart (it has no old characters here).
    if (this.plan.removedText.size > 0 && this.zonesFor(u.cs.y) !== null) {
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
    if (
      changed === null ||
      changedBefore === null ||
      $runsWithNeighbour(changed)
    ) {
      return false;
    }
    const oldText = changedBefore.__text;
    const newText = changed.__text;
    // The node's segment key as stored: one read without a key (a code
    // highlight a client stored without one) keeps none, or the text
    // inserted here would be stored, and read, as a node of its own.
    const segment = isMergeableText(changed)
      ? null
      : (this.state.segments.get(changed.getKey()) ?? null);
    // The edits Lexical recorded, exactly where they were made (see
    // TextReplay), and as made: a replacement is not widened to whole
    // words (see snapToWords), which a diff's guess at shared letters
    // needs, and a record does not. A diff where the record does not
    // explain the line; the line written whole where the node holds
    // characters of another.
    const edits = this.exactEdits(changed, oldText.length);
    if (edits === false) {
      return false;
    }
    if (edits !== null) {
      if (edits.length > 0) {
        this.$writeEdits(
          u,
          offset,
          edits,
          oldText,
          newText,
          $textAttrs(changed, segment),
        );
      }
    } else {
      const selection = $getSelection();
      let cursor = -1;
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        if (selection.anchor.key === changed.getKey()) {
          cursor = selection.anchor.offset;
        } else {
          // A caret right before or after the changed node (in a link
          // ending there) anchors the diff at that edge.
          const at = selection.anchor.getNode();
          if (at.isBefore(changed)) {
            cursor = 0;
          } else if (changed.isBefore(at)) {
            cursor = newText.length;
          }
        }
      }
      const diff = diffStrings(oldText, newText, cursor);
      const {prefix, suffix} = snapToWords(
        oldText,
        newText,
        diff.prefix,
        diff.suffix,
        this.state.editor._compositionKey !== null,
      );
      const del = oldText.length - prefix - suffix;
      const to = newText.length - suffix;
      if (del > 0 || to > prefix) {
        this.$writeEdits(
          u,
          offset,
          [[prefix, del, newText.slice(prefix, to)]],
          oldText,
          newText,
          $textAttrs(changed, segment),
        );
      }
    }
    this.$writeMarker(u.end, this.$marker(d), d.node);
    u.sig = d.sig;
    this.touched.push({d, unit: u});
    return true;
  }

  /**
   * Write a text node's edits (see exactEdits), which make its text `now`
   * of its old text `old`, in line `u`, where the node starts at atom
   * `offset`, with the node's attributes `attrs`.
   */
  private $writeEdits(
    u: Unit,
    offset: number,
    edits: [number, number, string][],
    old: string,
    now: string,
    attrs: Attrs,
  ): void {
    const c = this.cursor(
      u.cs.y,
      prevBoundary(this.zonesFor(u.cs.y), u.end!),
      u.start || EMPTY_FORMATS,
    );
    c.advance(offset);
    const hunks: Hunk[] = [];
    let shift = 0;
    for (const [at, del, ins] of edits) {
      hunks.push([at, del, at + shift, at + shift + ins.length]);
      shift += ins.length - del;
    }
    this.$writeHunks(c, old, now, hunks, (cursor, from, to) => {
      cursor.insert(
        new ContentString(now.slice(from, to)),
        this.inheritUnknown(cursor, attrs),
      );
    });
  }

  /**
   * The one place a write deletes and inserts text: `hunks` of old atoms
   * `old` (counted from the cursor) and desired atoms `now` (see Hunk), in
   * order, each widened to whole code points first (see codePointHunks);
   * `insert` writes desired atoms `from` to `to` at the cursor. Every text
   * write goes through here: the fast path's recorded edits and its diff,
   * and a sequence's prefix, suffix and islands (see $writeSeq). Invariant:
   * no delete or insert starts or ends between the two halves of a
   * surrogate pair. Why: Yjs replaces both halves of a pair it splits with
   * U+FFFD under their ids (and a lone half reads as U+FFFD), so the
   * author's editor showed `😀` while every reader showed `��` (R17B-F1, a
   * splice of one half; R18A-4, a pair kept by two islands, stepped over
   * one atom at a time).
   */
  private $writeHunks(
    c: Cursor,
    old: string,
    now: string,
    hunks: readonly Hunk[],
    insert: (cursor: Cursor, from: number, to: number) => void,
  ): void {
    let pos = 0;
    for (const [at, del, from, to] of codePointHunks(hunks, old, now)) {
      if (__DEV__) {
        invariant(
          !splitsPair(old, at) &&
            !splitsPair(old, at + del) &&
            !splitsPair(now, from) &&
            !splitsPair(now, to),
          '@lexical/y: a write splits a surrogate pair',
        );
      }
      c.advance(at - pos);
      if (del > 0) {
        c.delete(del);
      }
      if (to > from) {
        insert(c, from, to);
      }
      pos = at + del;
    }
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
    pinLast = false,
    oldLast: Item | null = null,
  ): Map<number, Item> {
    const zones = this.zonesFor(y);
    const startItem = startItemAfter(zones, y, left, this.zone);
    const old = new Atoms();
    // With moves, old content ends where its walk passes `oldLast` (the
    // last unit's end item), not at a physical item.
    readAtoms(
      startItem,
      zones !== null && oldLast !== null ? null : oldStop,
      startFormats,
      old,
      this.viewFor(y),
      Infinity,
      oldLast,
    );
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
    let exact: {of: Int32Array; kept: Int32Array} | null = null;
    // Whether old character `i` may be kept for character `j` (see below).
    let keeps: ((i: number, j: number) => boolean) | null = null;
    // An old character is kept only for text of the same origin (the same
    // text node before this update, or a node new in it): text that moved
    // between nodes or lines is written as new text, never built from old
    // characters that happen to be equal.
    if (
      oldOrigins !== null &&
      (atoms.origins.length > 0 || atoms.nodes.length > 0)
    ) {
      const total = oldOrigins[oldOrigins.length - 1][1];
      if (total === old.length) {
        exact = this.$exactAtoms(oldOrigins, atoms, old);
        const oldKey = keysAt(oldOrigins, old.length);
        const newKey = this.$sameTextLineage(old, atoms, oldOrigins)
          ? oldKey
          : keysAt(atoms.origins, atoms.length);
        const prevMap = this.prevState._nodeMap;
        // Where each origin last shows in the new atoms.
        const lastAt = new Map<string, number>();
        newKey.forEach((k, j) => {
          if (k !== undefined) {
            lastAt.set(k, j);
          }
        });
        const same = (i: number, j: number): boolean => {
          if (exact !== null) {
            // Where the record says which old atom an atom is, exactly that
            // one; an old atom it gives another is not kept for this one.
            const x = exact.of[j];
            if (x !== UNKNOWN_ATOM) {
              return x === i;
            }
            if (exact.kept[i] !== -1) {
              return false;
            }
          }
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
          // Invariant: text of a node new in this update keeps an old
          // character only when that character's node is gone or ends before
          // it (the tail a split of the node made): while the old node still
          // shows later on, its characters are its own. Why: a new node with
          // equal text at its start (a paragraph typed in front of a line)
          // that took them would lose part of its text to a peer's concurrent
          // rewrite of the old node's text.
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
            return si && sj && matchSpecial(i, j) && same(i, j);
          }
          return (
            old.text.charCodeAt(i) === atoms.text.charCodeAt(j) && same(i, j)
          );
        };
        keeps = (i, j) =>
          !old.specials.has(i) && !atoms.specials.has(j) && plain(i, j);
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
    // A rewrite replaces whole words (see snapToWords): not where the
    // record of text edits says what the replaced text is (see
    // $exactAtoms), which is then written as made, keeping the old
    // characters it says are kept between the edits (see islands).
    const composing = this.state.editor._compositionKey !== null;
    const exactWrite =
      exact !== null && exactRange(exact, prefix, atoms.length - suffix);
    // Where the record says which atoms some are and not others (a node
    // the record does not cover, text a node new in this update was made
    // with next to a removed node, see $exactAtoms), the atoms it says
    // are kept stay, and only what lies between them is diffed, each gap
    // on its own as a rewrite is (whole words, see snapToWords). Why: the
    // whole range between the first change and the last was diffed as one
    // rewrite, which wrote again the text and the inline nodes the record
    // keeps between them (soak S5-3; a node removed and another made in
    // one update, as app code replaces one).
    const gapWrite =
      !exactWrite &&
      exact !== null &&
      keeps !== null &&
      islands(exact, old, atoms, prefix, suffix, matchSpecial).length > 0;
    if (!exactWrite && !gapWrite) {
      const [p0, s0] = [prefix, suffix];
      ({prefix, suffix} = snapToWords(
        old.text,
        atoms.text,
        prefix,
        suffix,
        composing,
      ));
      // Never over characters the record says are kept, where they are.
      if (exact !== null) {
        for (let j = p0 - 1; j >= prefix; j--) {
          if (exact.of[j] === j) {
            prefix = j + 1;
            break;
          }
        }
        for (let t = s0 - 1; t >= suffix; t--) {
          if (exact.of[atoms.length - 1 - t] === old.length - 1 - t) {
            suffix = t + 1;
            break;
          }
        }
      }
    }
    // Inside a moved range, the old last end item (the range's end) stays
    // last: nothing may be inserted after it, which would be outside the
    // range.
    if (
      pinLast &&
      suffix === 0 &&
      old.length > 0 &&
      atoms.length > 0 &&
      old.specials.has(old.length - 1) &&
      atoms.specials.has(atoms.length - 1) &&
      matchSpecial(old.length - 1, atoms.length - 1)
    ) {
      prefix = Math.min(prefix, old.length - 1, atoms.length - 1);
      suffix = 1;
    }
    // Islands are taken from the final prefix and suffix, so none falls
    // outside a pinned range.
    let kept: [number, number][] = [];
    if (exact !== null && (exactWrite || gapWrite)) {
      const anchors = islands(exact, old, atoms, prefix, suffix, matchSpecial);
      if (exactRange(exact, prefix, atoms.length - suffix)) {
        kept = anchors;
      } else if (anchors.length > 0 && keeps !== null) {
        kept = gapIslands(
          anchors,
          old,
          atoms,
          prefix,
          suffix,
          keeps,
          composing,
        );
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
    const c = this.cursor(y, left, startFormats);
    if (prefix === 0 && old.length > 0) {
      // Content written at the start of existing content goes after the
      // move records there (they show before it).
      c.skipRecords();
    }
    // Between the prefix and the suffix, each old atom kept there (an
    // island) ends a delete and an insert.
    const hunks: Hunk[] = [];
    let i = prefix;
    let j = prefix;
    kept.push([old.length - suffix, atoms.length - suffix]);
    for (const [ki, kj] of kept) {
      if (ki > i || kj > j) {
        hunks.push([i, ki - i, j, kj]);
      }
      i = ki + 1;
      j = kj + 1;
    }
    this.$writeHunks(c, old.text, atoms.text, hunks, (cursor, from, to) =>
      this.$insertAtoms(cursor, atoms, from, to, items),
    );
    this.$formatPass(y, left, startFormats, atoms);
    return items;
  }

  /**
   * Which old atom each desired atom is, by the identities Lexical's record
   * gives (see TextReplay): `of[j]` is the old atom desired atom `j` keeps,
   * NEW_ATOM where it is new (typed, made, or text whose old characters are
   * outside this content), UNKNOWN_ATOM for a marker or a run end; `kept[i]`
   * is the desired atom that keeps old atom `i`, or -1. Null where the record
   * does not explain the text of every line of the content: the diff writes
   * it, as before the record. Why: a diff of the old and new text cannot
   * tell where an insert or delete next to equal text was made (`t5z `
   * typed before `t4z ` diffs as `5z t` inserted after its `t`), nor which
   * characters a node made again holds, so a peer's concurrent edit of the
   * characters a write took for others moved or came back.
   */
  private $exactAtoms(
    oldOrigins: [number, number, string][],
    atoms: Atoms,
    old: Atoms,
  ): {of: Int32Array; kept: Int32Array} | null {
    const replay = this.textReplay();
    if (replay === null) {
      return null;
    }
    const range = new Map<string, [number, number]>();
    for (const [a, b, k] of oldOrigins) {
      if (k !== '') {
        range.set(k, [a, b]);
      }
    }
    const nodeAtoms = this.oldNodeAtoms.get(oldOrigins);
    const of = new Int32Array(atoms.length).fill(UNKNOWN_ATOM);
    const kept = new Int32Array(old.length).fill(-1);
    // Desired atoms `j` on (`n` of them) are the characters `ids` give. An
    // old node that is not the same atom of this content (a block's own
    // node, a node from elsewhere) is left to the match below.
    const place = (
      j: number,
      n: number,
      key: NodeKey,
      node: boolean,
    ): boolean => {
      const ids = replay.idsOf(key);
      if (ids === null) {
        return false;
      }
      let at = j;
      for (const s of ids) {
        const r = s.key === null ? undefined : range.get(s.key);
        const atom =
          s.key === null || r !== undefined || nodeAtoms === undefined
            ? undefined
            : nodeAtoms.get(s.key);
        for (let t = s.start; t < s.end; t++, at++) {
          const i =
            r !== undefined && t < r[1] - r[0]
              ? r[0] + t
              : atom !== undefined && this.sameAtom(old, atom, atoms, at)
                ? atom
                : -1;
          if (at >= j + n || (i >= 0 && kept[i] !== -1)) {
            return false;
          }
          of[at] =
            i >= 0 ? i : node && s.key !== null ? UNKNOWN_ATOM : NEW_ATOM;
          if (i >= 0) {
            kept[i] = at;
          }
        }
      }
      return at === j + n;
    };
    for (const [start, end, key] of atoms.textNodes) {
      if (!place(start, end - start, key, false)) {
        return null;
      }
    }
    for (const [j, key] of atoms.nodes) {
      if (!place(j, 1, key, true)) {
        return null;
      }
    }
    return {kept, of};
  }

  /**
   * Whether old atom `i` is the stored line break or inline node that
   * desired atom `j` shows (see $exactAtoms).
   */
  private sameAtom(old: Atoms, i: number, atoms: Atoms, j: number): boolean {
    const a = old.specials.get(i);
    const b = atoms.specials.get(j);
    if (a === undefined || b === undefined) {
      return (
        a === undefined &&
        b === undefined &&
        old.text.charCodeAt(i) === 10 &&
        atoms.text.charCodeAt(j) === 10
      );
    }
    if (a.kind !== 'oldNode' || b.kind !== 'inline') {
      return false;
    }
    const oy = typeOf(a.item);
    return (
      this.state.keyByY.get(oy) === b.key &&
      storedTypeOf(oy) === b.node.getType()
    );
  }

  /**
   * Whether the desired content holds the old text unchanged, cut and joined
   * again by this update's splits and merges alone (formats changed by one
   * or several formatText calls, or a comment set and removed): its text is
   * the old text, every text node holding it is a node of this content
   * before or a part Lexical split off one (WritePlan#splits), and starts
   * where its text did (a split part where it was in the node first cut:
   * so none moved), every node of this content no longer shown was merged
   * by the normalization (WritePlan#merged), and a node holds more
   * than its own old text only when the normalization merged others into
   * it. Then each character keeps the item at its own place, and the update
   * writes formats alone. Why: from each node's text alone, a node merged
   * into another after a split could be taken for an equal run of another
   * node, and the words were deleted and inserted again (soak S4-6:
   * `<u>ab` `<i>la ` `la la `, italic over [3,9) and underline over [7,8),
   * wrote `del "abla " ins "abla "`), which undid a peer's concurrent delete
   * there or moved its typing. A text edit, an insert or a delete, makes
   * the text differ or a node start elsewhere, and is diffed as before.
   */
  private $sameTextLineage(
    old: Atoms,
    atoms: Atoms,
    oldOrigins: [number, number, string][],
  ): boolean {
    if (old.text !== atoms.text || atoms.textNodes.length === 0) {
      return false;
    }
    const {merged, splits} = this.plan;
    const prevMap = this.prevState._nodeMap;
    const oldRange = new Map<string, [number, number]>();
    for (const [a, b, k] of oldOrigins) {
      if (k !== '') {
        oldRange.set(k, [a, b]);
      }
    }
    for (const k of oldRange.keys()) {
      const now = $getNodeByKey(k);
      if (
        (now === null || !now.isAttached()) &&
        (merged === undefined || merged === null || !merged.has(k))
      ) {
        // Deleted, not merged.
        return false;
      }
    }
    for (const [start, end, key] of atoms.textNodes) {
      let at: number;
      if (prevMap.has(key)) {
        const range = oldRange.get(key);
        if (range === undefined) {
          return false;
        }
        at = range[0];
        if (
          end - start > range[1] - range[0] &&
          (merged === undefined || merged === null || !merged.has(key))
        ) {
          return false;
        }
      } else {
        const rec =
          splits === undefined || splits === null ? undefined : splits.get(key);
        const range = rec === undefined ? undefined : oldRange.get(rec[0]);
        if (rec === undefined || range === undefined) {
          return false;
        }
        at = range[0] + rec[1];
      }
      if (at !== start) {
        return false;
      }
    }
    return true;
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
      this.viewFor(y),
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

  private $writeMarker(
    item: Item,
    desired: Attrs,
    line: LexicalNode | null,
  ): void {
    const y = typeOf(item);
    const current = y.getAttrs() as Attrs;
    const storedText = $isElementNode(line) && !$holdsText(line);
    let changed = false;
    for (const k in desired) {
      if (
        !equalValue(current[k], desired[k]) &&
        !this.keepsStored(k, current[k], desired[k], storedText)
      ) {
        y.setAttr(k, desired[k]);
        changed = true;
      }
    }
    const types = [
      desired[TYPE_KEY] ?? 'paragraph',
      current[TYPE_KEY] ?? 'paragraph',
    ];
    for (const k in current) {
      if (
        !(k in desired) &&
        this.isOwnedMarkerKey(k, types) &&
        !this.keepsStored(k, current[k], undefined, storedText)
      ) {
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

  /**
   * Whether this write leaves attribute `key` as stored although the editor
   * has another value: a follow-up (no one's edit) does not write an
   * element's textFormat/textStyle where they are derived, which Lexical's
   * reconciler does from the first text it renders under the element on
   * each client (see isTextFieldKey, $holdsText); a user's edit of that
   * line writes them. Where no text is below the element (`storedText`: a
   * line or stored node, empty or holding only inline decorators or line
   * breaks) they are its own, and a follow-up writes them as any update
   * does (a follow-up that sets them, or a delete that empties the element,
   * which sets them from the text removed); before, the author kept them
   * while every reader showed the stored ones (soak S4-5). A follow-up's
   * change of derived ones is not written (see WritePlan#unwritable).
   */
  keepsStored(
    key: string,
    current: unknown,
    desired: unknown,
    storedText = false,
  ): boolean {
    return (
      this.followUp &&
      ((isTextFieldKey(key) &&
        !(
          storedText &&
          (key === FIELD_PREFIX + 'textFormat' ||
            key === FIELD_PREFIX + 'textStyle')
        )) ||
        (key === OUTER_KEY &&
          outerWithoutTextFields(current) === outerWithoutTextFields(desired)))
    );
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
    const holes: string[] = [];
    const desired = $nodeAttrs(node, holes);
    if (holes.length > 0) {
      this.holed.add(node.getKey());
    }
    const current = y.getAttrs() as Attrs;
    if (String(y.name).slice(2) !== node.getType()) {
      desired[TYPE_KEY] = node.getType();
    } else if (TYPE_KEY in current) {
      y.deleteAttr(TYPE_KEY);
    }
    const storedText = $isElementNode(node) && !$holdsText(node);
    for (const k in desired) {
      if (
        !equalValue(current[k], desired[k]) &&
        !this.keepsStored(k, current[k], desired[k], storedText)
      ) {
        y.setAttr(k, desired[k]);
      }
    }
    for (const k in current) {
      if (
        !(k in desired) &&
        (k.startsWith(FIELD_PREFIX) || k.startsWith(STATE_PREFIX)) &&
        !this.keepsStored(k, current[k], undefined, storedText)
      ) {
        y.deleteAttr(k);
      }
    }
    $writeSlots(this, y, node, current, followUpWarning);
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
    const holes: string[] = [];
    const attrs = $nodeAttrs(node, holes);
    if (holes.length > 0) {
      this.holed.add(key);
    }
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
    $writeSlots(this, y, node, {}, followUpWarning);
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

/** sameOwnFields, but children too are not fields (an element's links). */
function sameAttrFields(prev: LexicalNode, now: LexicalNode): boolean {
  const a = prev as unknown as Record<string, unknown>;
  const b = now as unknown as Record<string, unknown>;
  for (const k of Object.keys(b)) {
    if (
      k.startsWith('__') &&
      !NOT_FIELDS.has(k) &&
      k !== '__first' &&
      k !== '__last' &&
      k !== '__size' &&
      a[k] !== b[k]
    ) {
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

const isHighSurrogate = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;

/**
 * An edit of a write (see Writer#$writeHunks): old atoms `at` to
 * `at + del` are replaced with desired atoms `from` to `to`. The atoms
 * between two hunks are kept, and equal in both.
 */
type Hunk = [at: number, del: number, from: number, to: number];

/** Whether a cut of `s` at `at` falls between the halves of a pair. */
const splitsPair = (s: string, at: number): boolean =>
  at > 0 &&
  at < s.length &&
  isHighSurrogate(s.charCodeAt(at - 1)) &&
  isLowSurrogate(s.charCodeAt(at));

/**
 * The hunks of a write of old atoms `old` as desired atoms `now` (see
 * Writer#$writeHunks), each widened so that it neither starts nor ends
 * between the two halves of a surrogate pair: a kept high half right before
 * a hunk, or a kept low half right after one, is replaced with itself, and
 * written again with the hunk's inserted atoms. Hunks that then touch are
 * joined, so that a pair is never written as two items.
 */
function codePointHunks(
  hunks: readonly Hunk[],
  old: string,
  now: string,
): Hunk[] {
  const join = (list: Hunk[]): Hunk[] => {
    const out: Hunk[] = [];
    for (const h of list) {
      const last = out[out.length - 1];
      if (last !== undefined && h[0] <= last[0] + last[1]) {
        out[out.length - 1] = [
          last[0],
          Math.max(last[0] + last[1], h[0] + h[1]) - last[0],
          last[2],
          Math.max(last[3], h[3]),
        ];
      } else {
        out.push(h);
      }
    }
    return out;
  };
  let out = join(hunks.slice());
  for (let changed = true; changed; ) {
    changed = false;
    out = out.map(([at, del, from, to], k) => {
      // The kept atoms around the hunk: up to the hunks before and after.
      const lo = k > 0 ? out[k - 1][0] + out[k - 1][1] : 0;
      const hi = k + 1 < out.length ? out[k + 1][0] : old.length;
      if (
        at > lo &&
        from > 0 &&
        (isHighSurrogate(old.charCodeAt(at - 1)) ||
          isHighSurrogate(now.charCodeAt(from - 1)))
      ) {
        at--;
        del++;
        from--;
        changed = true;
      }
      if (
        at + del < hi &&
        to < now.length &&
        (isLowSurrogate(old.charCodeAt(at + del)) ||
          isLowSurrogate(now.charCodeAt(to)))
      ) {
        del++;
        to++;
        changed = true;
      }
      return [at, del, from, to];
    });
    out = join(out);
  }
  return out;
}

function wrapperOnly(attrs: Attrs): Attrs {
  const out: Attrs = {};
  for (const k in attrs) {
    if (k.startsWith(WRAPPER_PREFIX)) {
      out[k] = attrs[k];
    }
  }
  return out;
}

/** A record written again keeps its range, priority and rank. */
function copyRecordAttrs(from: Item, to: YNode): void {
  const old = (from.content as ContentType).type as YNode;
  to.setAttr(MOVE_START_KEY, old.getAttr(MOVE_START_KEY) ?? null);
  to.setAttr(MOVE_END_KEY, old.getAttr(MOVE_END_KEY));
  to.setAttr(MOVE_PRIORITY_KEY, old.getAttr(MOVE_PRIORITY_KEY));
  to.setAttr(
    MOVE_ORIGIN_KEY,
    old.getAttr(MOVE_ORIGIN_KEY) ?? [from.id.client, from.id.clock],
  );
  if (old.getAttr(MOVE_INLINE_KEY) === 1) {
    to.setAttr(MOVE_INLINE_KEY, 1);
  }
}

function lastItem(y: YNode): Item | null {
  let last: Item | null = null;
  for (let it = y._start; it !== null; it = it.right) {
    last = it;
  }
  return last;
}

/**
 * The last move record of `zone` right after `left` (before the zone's next
 * content), or `left`: the records there show before the unit that follows,
 * so a rewrite of that unit starts after them.
 */
function afterRecords(
  zones: Zones,
  zone: Zone,
  y: YNode,
  left: Item | null,
): Item | null {
  let last = left;
  for (let p = left === null ? y._start : left.right; p !== null; p = p.right) {
    if (zones.ownerOf(p) !== zone) {
      if (zone !== null && !zones.inRange(zone, p)) {
        break;
      }
      continue;
    }
    if (p.deleted || !p.countable) {
      continue;
    }
    if (isMoveItem(p) && zones.entersAt(zone, p) === null) {
      // (An inline record shows text in its place: content.)
      last = p;
      continue;
    }
    break;
  }
  return last;
}

/** The live end item before an old unit (after earlier deletions too). */
function unitLeft(
  units: Unit[],
  idx: number,
  zones: Zones | null = null,
): Item | null {
  return unitStartOf(units, idx, zones).left;
}

/**
 * Where an old unit's content starts: the item it starts after and the zone
 * a walk from there starts in (see `lineStart`).
 */
function unitStartOf(
  units: Unit[],
  idx: number,
  zones: Zones | null,
): {left: Item | null; zone: Zone} {
  const u = units[idx];
  if (u.end !== null) {
    return lineStart(zones, u.end);
  }
  const zone = u.zone ?? null;
  if (zones !== null) {
    // Text no marker ends: after the previous unit of its zone, or of an
    // inline range shown in its zone (the text goes on there after the
    // range's last line, a line split after a join).
    for (let k = idx - 1; k >= 0; k--) {
      const p = units[k];
      if (p.end === null) {
        continue;
      }
      const pz = p.zone ?? null;
      if (pz === zone || shownInline(zones, pz, zone)) {
        if (p.end.deleted) {
          return {left: prevBoundary(zones, p.end), zone: pz};
        }
        // After the last item of an inline range: after its record.
        let left: Item = p.end;
        let z: Zone = pz;
        for (
          let r = zones.inlineRec(z), guard = 0;
          r !== null && r.e === left && guard < 64;
          r = zones.inlineRec(z), guard++
        ) {
          left = r.item;
          z = zones.ownerOf(r.item);
        }
        return {left, zone: z};
      }
    }
    const r = zones.rec(zone);
    return {left: r === undefined ? null : r.s, zone};
  }
  let e = idx > 0 ? units[idx - 1].end : null;
  while (e !== null && e.deleted) {
    e = prevLiveEnd(e);
  }
  return {left: e, zone: null};
}

/** Whether `inner` is an inline range shown (through inline ranges) in `zone`. */
function shownInline(zones: Zones, inner: Zone, zone: Zone): boolean {
  for (let z = inner, guard = 0; z !== null && guard < 64; guard++) {
    if (zones.inlineRec(z) === null) {
      return false;
    }
    z = zones.ownerOf(z);
    if (z === zone) {
      return true;
    }
  }
  return false;
}

/** The item right after an old unit (exclusive stop), or null. */
function unitStop(
  units: Unit[],
  idx: number,
  zones: Zones | null = null,
): Item | null {
  const u = units[idx];
  if (u.end !== null) {
    return u.end.right;
  }
  if (zones !== null) {
    // Text no marker ends: up to the next end item its walk reaches (a
    // block node), or the end of its zone's range.
    const {left, zone} = unitStartOf(units, idx, zones);
    const y = u.cs.y;
    const view = new ZoneView(zones, zone, null);
    for (
      let it =
        left === null
          ? enterZone(view, y, y._start)
          : stepZone(view, y, left, null);
      it !== null;
      it = stepZone(view, y, it, null)
    ) {
      const z = view.zone;
      if (zones.ownerOf(it) !== z) {
        if (
          z !== null &&
          zones.inlineRec(z) === null &&
          !zones.inRange(z, it)
        ) {
          return it;
        }
        continue;
      }
      if (!it.deleted && isEndItem(it)) {
        return it;
      }
    }
    return null;
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
  hidden: Shown | null,
): void {
  readAtoms(start, null, formats, out, hidden, limit);
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
        pushAll(stack, e.getChildren());
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

/** The origin of merged text whose old characters are not in the rewrite. */
const FOREIGN_ORIGIN = '\u0000foreign';

/** See Writer#$exactAtoms: an atom of new text, and one not known. */
const NEW_ATOM = -1;
const UNKNOWN_ATOM = -2;

/**
 * The old atoms the record of text edits says are kept between `prefix` and
 * the `suffix` (see Writer#$exactAtoms), with the desired atoms that keep
 * them, both in order: characters of the old text that the edits of one
 * write left between them (`ab ` | _`t7z `_ | `t8z ` | **`la `** | _`zz`_ |
 * `la `, `t7z t8` and `la zz` deleted, so `z ` is kept between the two
 * deletes; R15-A T1), and the line breaks and inline nodes kept between
 * them (S5-3). A surrogate half kept without its pair is written again with
 * it (see Writer#$writeHunks).
 */
function islands(
  exact: {of: Int32Array; kept: Int32Array},
  old: Atoms,
  atoms: Atoms,
  prefix: number,
  suffix: number,
  matchSpecial: (i: number, j: number) => boolean,
): [number, number][] {
  const out: [number, number][] = [];
  let last = prefix - 1;
  for (let j = prefix; j < atoms.length - suffix; j++) {
    const i = exact.of[j];
    if (i <= last || i >= old.length - suffix) {
      continue;
    }
    const si = old.specials.has(i);
    const sj = atoms.specials.has(j);
    if (
      si || sj
        ? si && sj && matchSpecial(i, j)
        : old.text.charCodeAt(i) === atoms.text.charCodeAt(j)
    ) {
      out.push([i, j]);
      last = i;
    }
  }
  return out;
}

/**
 * The old atoms kept between `prefix` and the `suffix` where the record of
 * text edits says which some of them are (see Writer#$writeSeq): the
 * `anchors` it keeps (see islands), and in each gap between them, the
 * common prefix and suffix of the gap's old and desired atoms that `keeps`
 * allows, snapped to whole words (see snapToWords). Both in order.
 */
function gapIslands(
  anchors: [number, number][],
  old: Atoms,
  atoms: Atoms,
  prefix: number,
  suffix: number,
  keeps: (i: number, j: number) => boolean,
  composing: boolean,
): [number, number][] {
  const out: [number, number][] = [];
  let i0 = prefix;
  let j0 = prefix;
  const ends: [number, number][] = [
    ...anchors,
    [old.length - suffix, atoms.length - suffix],
  ];
  ends.forEach(([i1, j1], k) => {
    let p = 0;
    while (i0 + p < i1 && j0 + p < j1 && keeps(i0 + p, j0 + p)) {
      p++;
    }
    let q = 0;
    while (
      q < i1 - i0 - p &&
      q < j1 - j0 - p &&
      keeps(i1 - 1 - q, j1 - 1 - q)
    ) {
      q++;
    }
    if (p > 0 || q > 0) {
      ({prefix: p, suffix: q} = snapToWords(
        old.text.slice(i0, i1),
        atoms.text.slice(j0, j1),
        p,
        q,
        composing,
      ));
    }
    for (let t = 0; t < p; t++) {
      out.push([i0 + t, j0 + t]);
    }
    for (let t = q; t > 0; t--) {
      out.push([i1 - t, j1 - t]);
    }
    if (k < anchors.length) {
      out.push([i1, j1]);
    }
    i0 = i1 + 1;
    j0 = j1 + 1;
  });
  return out;
}

/**
 * Whether the record of text edits says which atoms from `from` to `to` (of
 * the desired atoms) are (see Writer#$exactAtoms).
 */
function exactRange(
  exact: {of: Int32Array; kept: Int32Array} | null,
  from: number,
  to: number,
): boolean {
  if (exact === null) {
    return false;
  }
  for (let j = from; j < to; j++) {
    if (exact.of[j] === UNKNOWN_ATOM) {
      return false;
    }
  }
  return true;
}

function applyFormat(formats: Map<string, unknown>, f: ContentFormat): void {
  if (f.value === null) {
    formats.delete(f.key);
  } else {
    formats.set(f.key, f.value);
  }
}

/**
 * A follow-up update (see Writer#followUp) inserted or rewrote content or
 * structure: the change is not written, and the binding reads that content
 * again. Whatever made the follow-up (a transform it ran) changed content a
 * collaborator wrote.
 */
function followUpWarning(what: string, node: LexicalNode): void {
  if (__DEV__) {
    console.warn(
      `@lexical/y: a follow-up update changed ${what} a ${node.getType()} node; follow-ups (the binding's refresh, BlockIdExtension's naming, the update that runs a newly registered transform over the document) may only set attributes or delete, so this change is not written and the editor reads that content again.`,
    );
  }
}

/** Per atom, the signature of its formats ('' without). */
function atomFormatSigs(atoms: Atoms): string[] {
  const out = new Array<string>(atoms.length).fill('');
  for (const run of atoms.runs) {
    const sig = stableStringify(run.attrs);
    for (let i = run.start; i < run.end; i++) {
      out[i] = sig;
    }
  }
  return out;
}

/**
 * How a joined line's atoms `want` split into a start of the first line's
 * old atoms `a` (`keep` of them) and an end of the second line's `b` (from
 * `from` on); null when they do not (other edits in the same update), or
 * when nothing of the second line is left.
 */
function joinSplit(
  a: Atoms,
  b: Atoms,
  want: Atoms,
  state: State,
  origin: (string | undefined)[],
  tKeys: Set<string>,
): {keep: number; from: number} | null {
  const sigA = atomFormatSigs(a);
  const sigB = atomFormatSigs(b);
  const sigW = atomFormatSigs(want);
  const same = (x: Atoms, sx: string[], i: number, j: number): boolean => {
    const xs = x.specials.get(i);
    const ws = want.specials.get(j);
    if (xs !== undefined || ws !== undefined) {
      if (
        xs === undefined ||
        ws === undefined ||
        xs.kind !== 'oldNode' ||
        ws.kind !== 'inline' ||
        !xs.name.startsWith(INLINE_PREFIX) ||
        state.keyByY.get(typeOf(xs.item)) !== ws.key
      ) {
        return false;
      }
    } else if (x.text.charCodeAt(i) !== want.text.charCodeAt(j)) {
      return false;
    }
    return sx[i] === sigW[j];
  };
  let lcp = 0;
  while (lcp < a.length && lcp < want.length && same(a, sigA, lcp, lcp)) {
    lcp++;
  }
  // The second line's text starts with the first character that comes
  // from one of its text nodes; every later character does too.
  let firstT = -1;
  for (let i = 0; i < want.length; i++) {
    const k = origin[i];
    if (k !== undefined && tKeys.has(k)) {
      if (firstT < 0) {
        firstT = i;
      }
    } else if (firstT >= 0 && k !== undefined) {
      return null;
    }
  }
  if (firstT < 0 || firstT > lcp) {
    return null;
  }
  const keep = firstT;
  const rest = want.length - keep;
  if (rest === 0 || rest > b.length) {
    return null;
  }
  const from = b.length - rest;
  for (let t = 0; t < rest; t++) {
    if (!same(b, sigB, from + t, keep + t)) {
      return null;
    }
  }
  return {from, keep};
}
