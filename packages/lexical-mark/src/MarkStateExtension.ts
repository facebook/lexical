/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  effect,
  getPeerDependencyFromEditor,
  namedSignals,
  type ReadonlySignal,
  type Signal,
  signal,
} from '@lexical/extension';
import {
  $setRenderContextValue,
  createRenderState,
  defineImportRule,
  DOMImportExtension,
  domOverride,
  DOMRenderExtension,
  sel,
} from '@lexical/html';
import invariant from '@lexical/internal/invariant';
import {
  $createTextNode,
  $getEditor,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotNames,
  $getState,
  $hasUpdateTag,
  $isDecoratorNode,
  $isElementNode,
  $isLexicalNode,
  $isRangeSelection,
  $isTextNode,
  $setState,
  addClassNamesToElement,
  arraySetValue,
  type BaseSelection,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_CRITICAL,
  COMPOSITION_START_COMMAND,
  configExtension,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  createState,
  type DecoratorNode,
  defineExtension,
  type EditorState,
  type ElementNode,
  HISTORIC_TAG,
  isHTMLElement,
  type Klass,
  type LexicalEditor,
  type LexicalExtension,
  type LexicalNode,
  LineBreakNode,
  mergeRegister,
  type NodeKey,
  PASTE_COMMAND,
  type PointType,
  removeClassNamesFromElement,
  RootNode,
  safeCast,
  type SerializationSchema,
  TextNode,
} from 'lexical';

import {$isMarkNode} from './MarkNode';

/**
 * The NodeState key that {@link MarkStateExtension} stores mark ids under: a
 * leaf covered by `c1` and `c2` has `{"markIds": ["c1", "c2"]}` (sorted) in
 * the `$` record of its JSON.
 *
 * The state is an `arraySetValue` (see `lexical`), so its schema marks it as
 * a set whose members are independent: code that stores or merges NodeState
 * can treat each id separately.
 *
 * @experimental
 */
export const MARK_STATE_KEY = 'markIds';

/**
 * A node class, matched with `instanceof`, or a guard function, as used in
 * the `markableNodes` config of {@link MarkStateExtension}.
 *
 * @experimental
 */
export type MarkableNodeMatch =
  | Klass<LexicalNode>
  | ((node: LexicalNode) => boolean);

/**
 * The attribute that {@link MarkStateExtension} renders on the element of each
 * marked leaf in the editor, holding its space separated ids. HTML export
 * writes it when `exportIDsToHTML` is set, and HTML import reads it back.
 *
 * @experimental
 */
export const MARK_STATE_IDS_ATTRIBUTE = 'data-lexical-mark-ids';

/**
 * Configuration for {@link MarkStateExtension}.
 *
 * @experimental
 */
export interface MarkStateConfig {
  /**
   * When `true`, mark ids are not rendered in the editor DOM, the
   * `markIDNodeKeys` output is emptied and no longer maintained, and text
   * inserted next to a marked run no longer has its ids adjusted (it keeps
   * whatever ids the TextNode it lands in has). The ids stay in the document,
   * the `$` functions keep working, and HTML export (with `exportIDsToHTML`)
   * and import still write and read the ids.
   */
  disabled: boolean;
  /**
   * When `true`, HTML export (`$generateHtmlFromNodes`, and so copying to the
   * clipboard as `text/html`) writes the `data-lexical-mark-ids` attribute on
   * marked leaves, so that the ids survive an HTML round trip. Default
   * `false`, like MarkNode, which exports no ids: they are often internal
   * thread ids that should not leak into other applications.
   */
  exportIDsToHTML: boolean;
  /**
   * The nodes that carry mark ids: a node is markable when it is an instance
   * of one of these classes or one of these guards returns `true` for it.
   * Marking a range marks the markable nodes in it, and the ElementNodes and
   * slot hosts in it are looked through (their children and their slots).
   * Use it for leaves: TextNode, LineBreakNode and DecoratorNode subclasses.
   *
   * The default is `[TextNode, LineBreakNode, $isInlineDecoratorNode]`:
   * TextNode and its subclasses, LineBreakNode, and every inline DecoratorNode
   * (which includes `DecoratorTextNode` from `@lexical/extension`). To extend
   * it, spread the default:
   * `[...DEFAULT_MARKABLE_NODES, MyBlockDecoratorNode]`.
   * Every editor that edits the same document should use the same set.
   */
  markableNodes: readonly MarkableNodeMatch[];
}

/**
 * Output of {@link MarkStateExtension}.
 *
 * @experimental
 */
export interface MarkStateOutput {
  disabled: Signal<boolean>;
  exportIDsToHTML: Signal<boolean>;
  /**
   * Every mark id in the document, mapped to the keys of the leaves that carry
   * it (in no particular order). A new Map is published after each update that
   * changes it. Empty while the extension is disabled.
   */
  markIDNodeKeys: ReadonlySignal<ReadonlyMap<string, readonly NodeKey[]>>;
}

interface MarkStateInit {
  markIDNodeKeys: Signal<ReadonlyMap<string, readonly NodeKey[]>>;
}

const MARK_STATE_EXTENSION_NAME = '@lexical/mark/MarkState';

type MarkStateExtensionType = LexicalExtension<
  MarkStateConfig,
  typeof MARK_STATE_EXTENSION_NAME,
  MarkStateOutput,
  MarkStateInit
>;

/**
 * Whether `id` can be used as a mark id: a non-empty string without
 * whitespace, since the ids of a leaf are written space separated in the
 * `data-lexical-mark-ids` attribute.
 */
function isValidMarkID(id: unknown): id is string {
  return typeof id === 'string' && id !== '' && !/\s/.test(id);
}

/**
 * The item schema of the ids: a string that {@link isValidMarkID} accepts.
 * `arraySetValue` drops the members its item does not accept, so an invalid
 * id is dropped wherever the ids are parsed: JSON, HTML import, a value
 * written with `$setState`, or a state applied by `updateFromUnknown`.
 *
 * @__NO_SIDE_EFFECTS__
 */
function markIDValue(): SerializationSchema<string> {
  return Object.assign(
    (value: unknown): string => (isValidMarkID(value) ? value : ''),
    {
      accepts: isValidMarkID,
      defaultValue: '',
      meta: {kind: 'string'} as const,
    },
  );
}

/**
 * The mark ids of a leaf: a frozen array, sorted and without duplicates, which
 * is also its JSON.
 */
const markIDsState = createState(MARK_STATE_KEY, {
  parse: arraySetValue(markIDValue()),
});

/**
 * Inline DecoratorNodes, one of the default `markableNodes` of
 * {@link MarkStateExtension}. This includes `DecoratorTextNode`.
 *
 * @experimental
 */
export function $isInlineDecoratorNode(
  node: null | undefined | LexicalNode,
): node is DecoratorNode<unknown> {
  return $isDecoratorNode(node) && node.isInline();
}

/**
 * The default `markableNodes` of {@link MarkStateExtension}: TextNode,
 * LineBreakNode and inline DecoratorNodes (including `DecoratorTextNode`).
 *
 * @experimental
 */
export const DEFAULT_MARKABLE_NODES: readonly MarkableNodeMatch[] = [
  TextNode,
  LineBreakNode,
  $isInlineDecoratorNode,
];

function isNodeClass(match: MarkableNodeMatch): match is Klass<LexicalNode> {
  // A guard written as an arrow function has no prototype
  return $isLexicalNode(match.prototype);
}

function compileMarkableNodes(
  matches: readonly MarkableNodeMatch[],
): (node: LexicalNode) => boolean {
  const klasses: Klass<LexicalNode>[] = [];
  const guards: ((node: LexicalNode) => boolean)[] = [];
  for (const match of matches) {
    if (isNodeClass(match)) {
      klasses.push(match);
    } else {
      guards.push(match as (node: LexicalNode) => boolean);
    }
  }
  return node =>
    klasses.some(klass => node instanceof klass) ||
    guards.some(guard => guard(node));
}

let defaultIsMarkable: undefined | ((node: LexicalNode) => boolean);
let isMarkableByEditor:
  | undefined
  | WeakMap<LexicalEditor, (node: LexicalNode) => boolean>;

/**
 * Whether `node` carries mark ids in the active editor, according to the
 * `markableNodes` config of its MarkStateExtension (or the default, when the
 * extension is not installed). Inline ElementNodes such as links are not
 * marked themselves, their leaves are.
 */
function $isMarkableNode(node: null | undefined | LexicalNode): boolean {
  if (!node) {
    return false;
  }
  const isMarkable = isMarkableByEditor && isMarkableByEditor.get($getEditor());
  if (isMarkable) {
    return isMarkable(node);
  }
  if (defaultIsMarkable === undefined) {
    defaultIsMarkable = compileMarkableNodes(DEFAULT_MARKABLE_NODES);
  }
  return defaultIsMarkable(node);
}

/**
 * Get the mark ids stored on a node by {@link MarkStateExtension}, sorted.
 * Nodes that cannot carry ids return an empty array.
 *
 * @param node The node
 * @returns A new array of the ids, sorted, which the caller may change
 *
 * @experimental
 */
export function $getNodeMarkIDs(node: LexicalNode): string[] {
  return $readNodeMarkIDs(node).slice();
}

/**
 * The stored value itself, frozen: for reads that do not hand it out.
 */
function $readNodeMarkIDs(node: LexicalNode): readonly string[] {
  return $getState(node, markIDsState);
}

/** The ids of `node` when it is markable, otherwise none. */
function $getMarkableIDs(
  node: null | undefined | LexicalNode,
): readonly string[] {
  return node && $isMarkableNode(node) ? $readNodeMarkIDs(node) : NO_IDS;
}

/**
 * {@link $isMarkableNode} as the type guard `domOverride` takes. A guard
 * cannot be the predicate itself: narrowing a `LexicalNode` with
 * `node is LexicalNode` leaves `never` where it returns `false`.
 */
function $isMarkableNodeMatch(node: LexicalNode): node is LexicalNode {
  return $isMarkableNode(node);
}

const NO_IDS: readonly string[] = [];

function $addNodeMarkIDs(node: LexicalNode, ids: readonly string[]): void {
  // $setState sorts and dedupes the result
  $setState(node, markIDsState, prev =>
    ids.every(id => prev.includes(id)) ? prev : [...prev, ...ids],
  );
}

function $removeNodeMarkIDs(node: LexicalNode, ids: readonly string[]): void {
  $setState(node, markIDsState, prev =>
    ids.some(id => prev.includes(id))
      ? prev.filter(id => !ids.includes(id))
      : prev,
  );
}

function assertValidMarkID(id: string): void {
  invariant(
    isValidMarkID(id),
    'MarkStateExtension: invalid mark id %s, ids must be non-empty strings without whitespace',
    JSON.stringify(id),
  );
}

/** Call `fn` with the value of each slot of `node`. */
function $forEachSlot(
  node: LexicalNode,
  fn: (slot: LexicalNode) => void,
): void {
  for (const name of $getSlotNames(node)) {
    const slot = $getSlot(node, name);
    if (slot !== null) {
      fn(slot);
    }
  }
}

function $markableNodesInSelection(selection: BaseSelection): LexicalNode[] {
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    return [];
  }
  // extract() splits the TextNodes at the boundaries of a RangeSelection, so
  // only the selected part of them is returned. It does not include the
  // content of slots, which is collected from each selected slot host.
  const nodes: LexicalNode[] = [];
  const seen = new Set<LexicalNode>();
  for (const node of selection.extract()) {
    if ($isMarkableNode(node) && !seen.has(node)) {
      seen.add(node);
      nodes.push(node);
    }
    $forEachSlot(node, slot => $collectMarkableNodes(slot, nodes, seen));
  }
  return nodes;
}

/**
 * Add the mark `id` to every markable node in `selection` (TextNode,
 * LineBreakNode and inline DecoratorNode by default, see `markableNodes`),
 * including the content of the slots of the nodes in it, splitting the
 * TextNodes at its boundaries. Ids already on those nodes are kept, so marks
 * can overlap freely. A collapsed selection marks nothing.
 *
 * @param id The mark id, for example a comment thread id. It must be a
 *   non-empty string without whitespace, otherwise this throws.
 * @param selection The selection to mark
 * @returns The nodes that now carry the id
 *
 * @experimental
 */
export function $addMarkID(
  id: string,
  selection: BaseSelection,
): LexicalNode[] {
  assertValidMarkID(id);
  const nodes = $markableNodesInSelection(selection);
  for (const node of nodes) {
    $addNodeMarkIDs(node, [id]);
  }
  return nodes;
}

/**
 * Collect the markable nodes in the subtree of `node`, looking through the
 * children of ElementNodes and the slots of slot hosts (ElementNodes and
 * DecoratorNodes).
 */
function $collectMarkableNodes(
  node: LexicalNode,
  out: LexicalNode[],
  seen: Set<LexicalNode>,
): void {
  if ($isMarkableNode(node) && !seen.has(node)) {
    seen.add(node);
    out.push(node);
  }
  if ($isElementNode(node)) {
    for (
      let child = node.getFirstChild();
      child !== null;
      child = child.getNextSibling()
    ) {
      $collectMarkableNodes(child, out, seen);
    }
  }
  $forEachSlot(node, slot => $collectMarkableNodes(slot, out, seen));
}

function $markableNodesIn(node: LexicalNode): LexicalNode[] {
  const out: LexicalNode[] = [];
  $collectMarkableNodes(node, out, new Set());
  return out;
}

/**
 * The leaves that may carry `id` without a full document walk: the leaves the
 * `markIDNodeKeys` output had for it at the last commit, plus the leaves
 * changed by the pending update (which include every leaf that got the id,
 * or was split off one, since). `null` when the extension is not installed
 * or is disabled.
 */
function $getMarkIDCandidates(id: string): null | LexicalNode[] {
  const editor = $getEditor();
  const dep = getPeerDependencyFromEditor<MarkStateExtensionType>(
    editor,
    MARK_STATE_EXTENSION_NAME,
  );
  if (!dep || dep.output.disabled.peek()) {
    return null;
  }
  const keys = new Set(dep.output.markIDNodeKeys.peek().get(id));
  // @internal access: the leaves this update made dirty, which the update
  // listener receives as `dirtyLeaves` once it commits
  for (const key of editor._dirtyLeaves) {
    keys.add(key);
  }
  const nodes: LexicalNode[] = [];
  for (const key of keys) {
    const node = $getNodeByKey(key);
    if (node !== null && $isMarkableNode(node) && node.isAttached()) {
      nodes.push(node);
    }
  }
  return nodes;
}

/**
 * Remove the mark `id`. With a `selection` it is removed from the nodes in
 * that selection only (splitting the TextNodes at its boundaries), otherwise
 * from the whole document (found through the `markIDNodeKeys` output, or by
 * walking the document when the extension is not active). Text that no
 * longer differs from its neighbors is merged back by normalization.
 *
 * @param id The mark id
 * @param selection Limit the removal to this selection
 *
 * @experimental
 */
export function $removeMarkID(
  id: string,
  selection?: null | BaseSelection,
): void {
  const nodes = selection
    ? $markableNodesInSelection(selection)
    : $getMarkIDCandidates(id) || $markableNodesIn($getRoot());
  for (const node of nodes) {
    $removeNodeMarkIDs(node, [id]);
  }
  // The inserted-text rule of this update must not give the id back
  const edit = editsByEditor && editsByEditor.get($getEditor());
  if (edit) {
    edit.removed.add(id);
    forgetSoon(edit);
  }
}

function $getPointMarkIDs(point: PointType): readonly string[] {
  const node = point.getNode();
  if (point.type === 'text') {
    const ids = $readNodeMarkIDs(node);
    if (
      ids.length === 0 &&
      $isTextNode(node) &&
      point.offset === node.getTextContentSize()
    ) {
      // Like $getMarkIDs: a caret right before a marked run is in it
      return $getMarkableIDs($getAdjacentLeaf(node, 'next'));
    }
    return ids;
  }
  if ($isElementNode(node)) {
    const before = $getMarkableIDs(node.getChildAtIndex(point.offset - 1));
    return before.length > 0
      ? before
      : $getMarkableIDs(node.getChildAtIndex(point.offset));
  }
  return NO_IDS;
}

/**
 * Get the mark ids at a selection, sorted. For a collapsed RangeSelection
 * these are the ids of the leaf holding the caret (or of the next leaf, when
 * the caret is at the end of an unmarked TextNode), like `$getMarkIDs` does
 * for MarkNode. Otherwise, `mode` `'any'` (the default) returns the ids on
 * any selected leaf, and `'all'` the ids shared by every selected leaf. The
 * TextNodes that a RangeSelection only touches at an edge are ignored.
 *
 * @param selection The selection, defaults to the current selection
 * @param mode `'any'` or `'all'`, for a selection that is not collapsed
 * @returns The ids, sorted
 *
 * @experimental
 */
export function $getMarkIDsAtSelection(
  selection: null | BaseSelection = $getSelection(),
  mode: 'any' | 'all' = 'any',
): string[] {
  if (!selection) {
    return [];
  }
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    return $getPointMarkIDs(selection.anchor).slice();
  }
  let leaves = selection.getNodes().filter($isMarkableNode);
  if ($isRangeSelection(selection)) {
    const [start, end] = selection.isBackward()
      ? [selection.focus, selection.anchor]
      : [selection.anchor, selection.focus];
    leaves = leaves.filter(node => {
      if (!$isTextNode(node)) {
        return true;
      }
      const key = node.getKey();
      const from =
        start.type === 'text' && start.key === key ? start.offset : 0;
      const to =
        end.type === 'text' && end.key === key
          ? end.offset
          : node.getTextContentSize();
      return to > from;
    });
  }
  if (leaves.length === 0) {
    return [];
  }
  const idSets = leaves.map($readNodeMarkIDs);
  // Both build a new array, so the stored values are never sorted in place
  return mode === 'any'
    ? Array.from(new Set(idSets.flat())).sort()
    : idSets[0].filter(id => idSets.every(ids => ids.includes(id)));
}

/**
 * Convert a document that uses MarkNode into one that uses
 * {@link MarkStateExtension}: the ids of every MarkNode (including the ids of
 * MarkNodes it is nested in) are added to the leaves inside it, and the
 * MarkNode is unwrapped.
 *
 * Run this once per document, before anything else edits it (for example in
 * a headless editor): the unwrap is a structural change, and an edit made at
 * the same time by another writer races with it as with any MarkNode edit.
 * Like {@link $addMarkID}, it throws on an id that is empty or contains
 * whitespace.
 *
 * @param node The subtree to convert, defaults to the root
 * @returns The number of MarkNodes that were unwrapped
 *
 * @experimental
 */
export function $migrateMarkNodesToMarkState(
  node: LexicalNode = $getRoot(),
): number {
  let count = 0;
  const $visit = (current: LexicalNode, inherited: readonly string[]) => {
    if ($isMarkNode(current)) {
      const ownIDs = current.getIDs();
      ownIDs.forEach(assertValidMarkID);
      const ids = Array.from(new Set([...inherited, ...ownIDs]));
      for (const child of current.getChildren()) {
        $visit(child, ids);
      }
      // Re-read: unwrapping a nested MarkNode replaced it with its children
      for (const child of current.getChildren()) {
        current.insertBefore(child);
      }
      current.remove();
      count++;
    } else {
      if ($isMarkableNode(current) && inherited.length > 0) {
        $addNodeMarkIDs(current, inherited);
      }
      if ($isElementNode(current)) {
        for (const child of current.getChildren()) {
          $visit(child, inherited);
        }
      }
      $forEachSlot(current, slot => $visit(slot, inherited));
    }
  };
  $visit(node, []);
  return count;
}

const MarkStateRenderDisabled = createRenderState(
  'markStateDisabled',
  () => false,
);

function $decorateMarkIDs(
  node: LexicalNode,
  dom: HTMLElement,
  editor: LexicalEditor,
): void {
  const ids = $readNodeMarkIDs(node);
  // @internal access with precedent (CodeNode, HorizontalRuleExtension): the
  // render overrides receive the editor, not its theme
  const {mark, markOverlap} = editor._config.theme;
  if (ids.length > 0) {
    dom.setAttribute(MARK_STATE_IDS_ATTRIBUTE, ids.join(' '));
    addClassNamesToElement(dom, mark);
  } else {
    dom.removeAttribute(MARK_STATE_IDS_ATTRIBUTE);
    removeClassNamesFromElement(dom, mark);
  }
  if (ids.length > 1) {
    addClassNamesToElement(dom, markOverlap);
  } else {
    removeClassNamesFromElement(dom, markOverlap);
  }
}

const MarkStateImportRule = defineImportRule({
  $import: (_ctx, el, $next) => {
    const nodes = $next();
    const ids = (el.getAttribute(MARK_STATE_IDS_ATTRIBUTE) || '')
      .split(/\s+/)
      .filter(isValidMarkID);
    if (ids.length > 0) {
      const leaves: LexicalNode[] = [];
      const seen = new Set<LexicalNode>();
      for (const node of nodes) {
        $collectMarkableNodes(node, leaves, seen);
      }
      for (const leaf of leaves) {
        $addNodeMarkIDs(leaf, ids);
      }
    }
    return nodes;
  },
  match: sel.any().attr(MARK_STATE_IDS_ATTRIBUTE, true),
  name: '@lexical/mark/MarkState/ids',
});

/**
 * `setEditorState` replaces the whole document: its dirty sets do not list
 * the nodes it replaced (LexicalConstants `FULL_RECONCILE`).
 */
const FULL_RECONCILE = 2;

/**
 * What the inserted text rule needs to know about the current edits besides
 * the two editor states: the selection that an insertion or paste command
 * replaces (recorded before its handler replaces it), and the ids removed
 * with {@link $removeMarkID}, which the rule must not give back. Both are
 * forgotten when the editor commits and at the next microtask: a command
 * dispatched outside an update runs each priority level in an update of its
 * own, and an update that changes nothing is dropped without a commit.
 */
interface PendingEdits {
  replaced: null | readonly [PointLike, PointLike];
  removed: Set<string>;
}

let editsByEditor: undefined | WeakMap<LexicalEditor, PendingEdits>;

function forgetEdits(edit: PendingEdits): void {
  edit.replaced = null;
  edit.removed.clear();
}

/**
 * Forget the edits at the next microtask. The updates they apply to have run
 * their transforms by then: a command and the transforms of its update run
 * synchronously.
 */
function forgetSoon(edit: PendingEdits): void {
  Promise.resolve().then(() => forgetEdits(edit));
}

/**
 * Maintains the `markIDNodeKeys` output, and keeps text inserted next to a
 * marked run consistent with the documented rule (see
 * {@link $applyInsertedTextMarkIDs}). Mutation listeners are not used because
 * they do not run without a root element.
 *
 * The output is updated after each commit from the dirty leaves, so the cost
 * of an update is proportional to what it changed: removed leaves are found
 * under the removed dirty nodes of the previous state. A commit whose dirty
 * sets do not describe the change is compared with the previous state node
 * by node: a `setEditorState` (an undo or redo, or any other replacement of
 * the editor state), recognized from the root transform of that update or
 * from its tag. Only the nodes that are not the same object in both states
 * are read.
 */
function registerMarkState(
  editor: LexicalEditor,
  output: Signal<ReadonlyMap<string, readonly NodeKey[]>>,
): () => void {
  const idsByKey = new Map<NodeKey, readonly string[]>();
  const keysById = new Map<string, Set<NodeKey>>();
  let changed = false;
  let replacedState = false;
  let compositionBase: null | EditorState = null;
  // Set when an update tagged COLLABORATION_TAG (another editor's update)
  // changed the block of the composition while it was in progress: comparing
  // with `compositionBase` would then take that update's text for composed
  // text
  let compositionTainted = false;
  const edit: PendingEdits = {
    removed: new Set(),
    replaced: null,
  };
  if (editsByEditor === undefined) {
    editsByEditor = new WeakMap();
  }
  editsByEditor.set(editor, edit);
  const setKey = (key: NodeKey, ids: readonly string[]) => {
    const prev = idsByKey.get(key) || NO_IDS;
    if (markIDsState.isEqual(prev, ids)) {
      return;
    }
    changed = true;
    for (const id of prev) {
      const keys = keysById.get(id);
      if (keys && !ids.includes(id)) {
        keys.delete(key);
        if (keys.size === 0) {
          keysById.delete(id);
        }
      }
    }
    for (const id of ids) {
      let keys = keysById.get(id);
      if (!keys) {
        keys = new Set();
        keysById.set(id, keys);
      }
      keys.add(key);
    }
    if (ids.length > 0) {
      idsByKey.set(key, ids);
    } else {
      idsByKey.delete(key);
    }
  };
  const $visit = (key: NodeKey) => {
    const node = $getNodeByKey(key);
    setKey(key, $getMarkableIDs(node));
  };
  const $rescan = () => {
    const seen = new Set<NodeKey>();
    for (const leaf of $markableNodesIn($getRoot())) {
      seen.add(leaf.getKey());
      setKey(leaf.getKey(), $readNodeMarkIDs(leaf));
    }
    for (const key of Array.from(idsByKey.keys())) {
      if (!seen.has(key)) {
        setKey(key, NO_IDS);
      }
    }
  };
  /**
   * Bring the output from `prevState` to `nextState` when the dirty sets do
   * not describe the change. A node that did not change is the same object
   * in both states (an undo restores a state that shares its unchanged
   * nodes with the current one), so only the others are read.
   */
  const rescanChanged = (prevState: EditorState, nextState: EditorState) => {
    // @internal access: the node maps, compared by identity
    const prevNodes = prevState._nodeMap;
    const nextNodes = nextState._nodeMap;
    nextState.read(
      () => {
        for (const [key, node] of nextNodes) {
          if (prevNodes.get(key) !== node) {
            setKey(
              key,
              $isMarkableNode(node) && node.isAttached()
                ? $readNodeMarkIDs(node)
                : NO_IDS,
            );
          }
        }
      },
      {editor},
    );
    for (const key of Array.from(idsByKey.keys())) {
      if (!nextNodes.has(key)) {
        setKey(key, NO_IDS);
      }
    }
  };
  const publish = () => {
    if (changed) {
      changed = false;
      const next = new Map<string, readonly NodeKey[]>();
      for (const [id, keys] of keysById) {
        next.set(id, Array.from(keys));
      }
      output.value = next;
    }
  };
  const $recordReplaced = () => {
    edit.replaced = $getReplacedRange($getSelection());
    forgetSoon(edit);
    return false;
  };
  editor.getEditorState().read($rescan, {editor});
  publish();
  return mergeRegister(
    editor.registerUpdateListener(
      ({editorState, prevEditorState, dirtyElements, dirtyLeaves, tags}) => {
        forgetEdits(edit);
        if (compositionBase !== null) {
          if (!editor.isComposing()) {
            compositionBase = null;
            compositionTainted = false;
          } else if (!compositionTainted && tags.has(COLLABORATION_TAG)) {
            compositionTainted = editorState.read(
              () => {
                // @internal access: the node being composed
                const key = editor._compositionKey;
                const node = key !== null ? $getNodeByKey(key) : null;
                const composing = node !== null ? $getBlock(node) : null;
                return (
                  composing === null || dirtyElements.has(composing.getKey())
                );
              },
              {editor},
            );
          }
        }
        if (
          replacedState ||
          tags.has(HISTORIC_TAG) ||
          (dirtyLeaves.size === 0 &&
            dirtyElements.size === 1 &&
            dirtyElements.has('root'))
        ) {
          replacedState = false;
          rescanChanged(prevEditorState, editorState);
          publish();
          return;
        }
        if (dirtyLeaves.size === 0 && dirtyElements.size === 0) {
          return;
        }
        // The dirty nodes that this update removed: the markable nodes under
        // them in the previous state are gone too, unless they were moved
        // (which made them dirty leaves of their own)
        const removed: NodeKey[] = [];
        editorState.read(
          () => {
            for (const key of dirtyLeaves) {
              $visit(key);
              if ($getNodeByKey(key) === null) {
                removed.push(key);
              }
            }
            for (const key of dirtyElements.keys()) {
              const node = $getNodeByKey(key);
              if (node === null) {
                removed.push(key);
              } else if ($isMarkableNode(node)) {
                setKey(key, $readNodeMarkIDs(node));
              }
            }
          },
          {editor},
        );
        if (removed.length > 0) {
          const gone: NodeKey[] = [];
          prevEditorState.read(
            () => {
              for (const key of removed) {
                const node = $getNodeByKey(key);
                if (node !== null) {
                  for (const leaf of $markableNodesIn(node)) {
                    gone.push(leaf.getKey());
                  }
                }
              }
            },
            {editor},
          );
          editorState.read(
            () => {
              for (const key of gone) {
                if ($getNodeByKey(key) === null) {
                  setKey(key, NO_IDS);
                }
              }
            },
            {editor},
          );
        }
        publish();
      },
    ),
    editor.registerNodeTransform(RootNode, () => {
      // @internal access: nothing else tells a transform that this update is
      // a setEditorState, whose dirty sets the update listener cannot use and
      // which is not an edit
      if (editor._dirtyType === FULL_RECONCILE) {
        replacedState = true;
        return;
      }
      if (
        editor.isComposing() ||
        $hasUpdateTag(COLLABORATION_TAG) ||
        $hasUpdateTag(HISTORIC_TAG)
      ) {
        return;
      }
      if (compositionBase !== null) {
        // The end of a composition: the composed text is compared with the
        // document from before it, and replaces the selection it had
        if (!compositionTainted) {
          $applyInsertedTextMarkIDs(
            editor,
            compositionBase,
            compositionBase.read(() => $getReplacedRange($getSelection()), {
              editor,
            }),
            edit.removed,
          );
        }
        return;
      }
      $applyInsertedTextMarkIDs(
        editor,
        editor.getEditorState(),
        edit.replaced,
        edit.removed,
      );
    }),
    editor.registerCommand(
      COMPOSITION_START_COMMAND,
      () => {
        // Transforms skip the node being composed, so the composed text is
        // compared with the document from before the composition once it ends
        compositionBase = editor.getEditorState();
        compositionTainted = false;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    // The selection that an insertion replaces, before the handler of the
    // command replaces it (a beforeinput event sets it from its target range
    // in the same update)
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      $recordReplaced,
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      PASTE_COMMAND,
      $recordReplaced,
      COMMAND_PRIORITY_CRITICAL,
    ),
    () => {
      compositionBase = null;
      forgetEdits(edit);
      if (editsByEditor && editsByEditor.get(editor) === edit) {
        editsByEditor.delete(editor);
      }
      output.value = new Map();
    },
  );
}

/** The nearest ancestor of `node` (or `node` itself) that is a block. */
function $getBlock(node: LexicalNode): null | ElementNode {
  let current: null | LexicalNode = node;
  while (current !== null) {
    if ($isElementNode(current) && !current.isInline()) {
      return current;
    }
    current = current.getParent();
  }
  return null;
}

/**
 * The leaf next to `node` in `direction` within its block, looking through
 * the boundaries of inline elements such as links: the last leaf of a
 * preceding link, or the leaf after the link that `node` ends. An empty
 * inline element is returned as is (it carries no ids).
 */
function $getAdjacentLeaf(
  node: LexicalNode,
  direction: 'previous' | 'next',
): null | LexicalNode {
  let current: LexicalNode = node;
  for (;;) {
    const sibling =
      direction === 'previous'
        ? current.getPreviousSibling()
        : current.getNextSibling();
    if (sibling === null) {
      const parent = current.getParent();
      if ($isElementNode(parent) && parent.isInline()) {
        current = parent;
        continue;
      }
      return null;
    }
    let leaf: LexicalNode = sibling;
    while ($isElementNode(leaf) && leaf.isInline()) {
      const child: null | LexicalNode =
        direction === 'previous' ? leaf.getLastChild() : leaf.getFirstChild();
      if (child === null) {
        break;
      }
      leaf = child;
    }
    return leaf;
  }
}

/**
 * A character of a markable TextNode (a code point, so that a surrogate pair
 * is never split), or a run of characters of one TextNode that both states
 * share at the start or the end of the compared text (see
 * {@link flattenSide})
 */
const CHAR = 0;
/** A markable leaf that is not a TextNode (a LineBreakNode, a decorator) */
const LEAF = 1;
/** The boundary between two blocks */
const BREAK = 2;
/** Anything else: a nested block, a leaf that cannot carry ids */
const OPAQUE = 3;
type Kind = typeof CHAR | typeof LEAF | typeof BREAK | typeof OPAQUE;

/** A point to locate in the flattened units: the caret, or an end of a selection */
interface PointLike {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
}

/**
 * The part of a block that is flattened: its children from `from` to `to`,
 * both included, or from its first child or to its last one when `null`.
 */
interface BlockWindow {
  block: ElementNode;
  from: null | LexicalNode;
  to: null | LexicalNode;
}

/**
 * A markable TextNode with its text, or one other unit. Positions in a run
 * of segments count each UTF-16 code unit of a text, and each other unit, as
 * one.
 */
interface Segment {
  /** How the unit compares, for a unit that is not a text */
  code: string;
  ids: readonly string[];
  kind: Kind;
  node: LexicalNode;
  /** The text of a TextNode, otherwise empty */
  text: string;
}

interface Segments {
  length: number;
  /** The position of each point that was asked for, -1 when it is not there */
  points: number[];
  segs: Segment[];
  /** The texts, with U+FFFF for each other unit */
  text: string;
  /** The code of each other unit, by position */
  codes: Map<number, string>;
}

/**
 * Units that the text inserted into them is found with. Two units are the
 * same when their codes are: a character when it is the same character, a
 * run of characters when it is the same run of the shared start or end, any
 * other unit when it is the same node.
 */
interface Flattened {
  codes: string[];
  kinds: Kind[];
  ids: (readonly string[])[];
  nodes: LexicalNode[];
  /** The offset of the unit in its node */
  offsets: number[];
  /** The index of each point that was asked for, -1 when it is not there */
  points: number[];
}

function toPointLike(point: PointType): PointLike {
  return {key: point.key, offset: point.offset, type: point.type};
}

/** The start and end of a selection that is not collapsed, otherwise `null` */
function $getReplacedRange(
  selection: null | BaseSelection,
): null | readonly [PointLike, PointLike] {
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return null;
  }
  const [start, end] = selection.isBackward()
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus];
  return [toPointLike(start), toPointLike(end)];
}

function $collectSegments(
  windows: readonly BlockWindow[],
  points: readonly PointLike[],
): Segments {
  const out: Segments = {
    codes: new Map(),
    length: 0,
    points: points.map(() => -1),
    segs: [],
    text: '',
  };
  const texts: string[] = [];
  const add = (
    node: LexicalNode,
    kind: Kind,
    code: string,
    text: string,
    ids: readonly string[],
  ) => {
    out.segs.push({code, ids, kind, node, text});
    if (kind !== CHAR) {
      out.codes.set(out.length, code);
      text = '\uffff';
    }
    texts.push(text);
    out.length += text.length;
  };
  const locateElementPoints = (key: NodeKey, index: number) => {
    points.forEach((point, i) => {
      if (
        point.type === 'element' &&
        point.key === key &&
        point.offset === index
      ) {
        out.points[i] = out.length;
      }
    });
  };
  const $visitChildren = (
    element: ElementNode,
    from: null | LexicalNode,
    to: null | LexicalNode,
  ) => {
    const key = element.getKey();
    // The index of the child is only needed for an element point in it
    let index = points.some(
      point => point.type === 'element' && point.key === key,
    )
      ? from !== null
        ? from.getIndexWithinParent()
        : 0
      : -1;
    for (
      let child = from !== null ? from : element.getFirstChild();
      child !== null;
      child = child.getNextSibling()
    ) {
      if (index >= 0) {
        locateElementPoints(key, index++);
      }
      $visitNode(child);
      if (to !== null && child.is(to)) {
        break;
      }
    }
    if (index >= 0) {
      locateElementPoints(key, index);
    }
  };
  const $visitNode = (node: LexicalNode) => {
    const key = node.getKey();
    if ($isTextNode(node) && $isMarkableNode(node)) {
      const text = node.getTextContent();
      points.forEach((point, i) => {
        if (
          point.type === 'text' &&
          point.key === key &&
          point.offset <= text.length
        ) {
          out.points[i] = out.length + point.offset;
        }
      });
      add(node, CHAR, '', text, $readNodeMarkIDs(node));
    } else if ($isMarkableNode(node)) {
      add(node, LEAF, '\u0002' + key, '', $readNodeMarkIDs(node));
    } else if ($isElementNode(node) && node.isInline()) {
      $visitChildren(node, null, null);
    } else {
      add(node, OPAQUE, '\u0001' + key, '', NO_IDS);
    }
  };
  windows.forEach(({block, from, to}, i) => {
    if (i > 0) {
      add(block, BREAK, '\u0000', '', NO_IDS);
    }
    $visitChildren(block, from, to);
  });
  out.text = texts.join('');
  return out;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/**
 * How many positions at the start of `a` and `b` (or at their end, when
 * `fromEnd`) are the same, at most `limit`, without ending inside a
 * surrogate pair.
 */
function sameEnd(
  a: Segments,
  b: Segments,
  limit: number,
  fromEnd: boolean,
): number {
  const at = (side: Segments, k: number) => (fromEnd ? side.length - 1 - k : k);
  let k = 0;
  for (; k < limit; k++) {
    const code = a.text.charCodeAt(at(a, k));
    if (
      code !== b.text.charCodeAt(at(b, k)) ||
      (code === 0xffff && a.codes.get(at(a, k)) !== b.codes.get(at(b, k)))
    ) {
      break;
    }
  }
  const last = k > 0 ? a.text.charCodeAt(at(a, k - 1)) : 0;
  return (fromEnd ? isLowSurrogate(last) : isHighSurrogate(last)) ? k - 1 : k;
}

/** The positions where the segments of `side` end */
function segmentEnds(side: Segments): number[] {
  let position = 0;
  return side.segs.map(
    seg => (position += seg.kind === CHAR ? seg.text.length : 1),
  );
}

/**
 * Flatten `side` into units: a unit per character, except in the first
 * `prefix` and the last `suffix` positions, which both sides share. There a
 * run of characters is one unit, cut where a segment of either side ends, so
 * that the two sides have the same units there and each unit is in one
 * node. A keystroke in a long TextNode then costs a comparison of its text
 * rather than units for each of its characters.
 */
function flattenSide(
  side: Segments,
  other: Segments,
  prefix: number,
  suffix: number,
): Flattened {
  const out: Flattened = {
    codes: [],
    ids: [],
    kinds: [],
    nodes: [],
    offsets: [],
    points: side.points.map(() => -1),
  };
  const suffixStart = side.length - suffix;
  // Where a shared run is cut, in the positions of `side`
  const cutSet = new Set<number>();
  segmentEnds(side).forEach(end => cutSet.add(end));
  for (const end of segmentEnds(other)) {
    if (end < prefix) {
      cutSet.add(end);
    } else if (end > other.length - suffix) {
      cutSet.add(end - other.length + side.length);
    }
  }
  cutSet.add(prefix);
  cutSet.add(suffixStart);
  const cuts = Array.from(cutSet).sort((x, y) => x - y);
  let cut = 0;
  const starts: number[] = [];
  const push = (
    code: string,
    kind: Kind,
    node: LexicalNode,
    offset: number,
    ids: readonly string[],
    start: number,
  ) => {
    out.codes.push(code);
    out.kinds.push(kind);
    out.nodes.push(node);
    out.offsets.push(offset);
    out.ids.push(ids);
    starts.push(start);
  };
  let position = 0;
  for (const {code, ids, kind, node, text} of side.segs) {
    if (kind !== CHAR) {
      push(code, kind, node, 0, ids, position++);
      continue;
    }
    for (let offset = 0; offset < text.length; ) {
      const at = position + offset;
      if (at < prefix || at >= suffixStart) {
        while (cuts[cut] <= at) {
          cut++;
        }
        const end = Math.min(cuts[cut], position + text.length);
        push(
          at < prefix ? '\u0003' + at : '\u0004' + (side.length - at),
          CHAR,
          node,
          offset,
          ids,
          at,
        );
        offset = end - position;
      } else {
        const size =
          isHighSurrogate(text.charCodeAt(offset)) &&
          isLowSurrogate(text.charCodeAt(offset + 1))
            ? 2
            : 1;
        push(text.slice(offset, offset + size), CHAR, node, offset, ids, at);
        offset += size;
      }
    }
    position += text.length;
  }
  side.points.forEach((point, i) => {
    if (point >= 0) {
      let index = 0;
      while (index < starts.length && starts[index] < point) {
        index++;
      }
      out.points[i] = index;
    }
  });
  return out;
}

/** The ids in both `a` and `b`. */
function intersect(
  a: readonly string[],
  b: readonly string[],
): readonly string[] {
  return a.length === 0 || b.length === 0
    ? NO_IDS
    : a.filter(id => b.includes(id));
}

/** The ids in `a` that are not in `removed`. */
function without(
  a: readonly string[],
  removed: ReadonlySet<string>,
): readonly string[] {
  return removed.size === 0 || !a.some(id => removed.has(id))
    ? a
    : a.filter(id => !removed.has(id));
}

/** The ids in `a` or `b`, sorted. */
function union(a: readonly string[], b: readonly string[]): readonly string[] {
  if (b.length === 0) {
    return a;
  }
  if (a.length === 0) {
    return b;
  }
  return Array.from(new Set([...a, ...b])).sort();
}

/**
 * The largest number of unit pairs {@link matchUnits} compares. A change
 * that is larger and is not a replaced selection is taken as one replacement.
 */
const MATCH_BUDGET = 250_000;

/**
 * The longest common subsequence of `a[a0, a1)` and `b[b0, b1)`, as the
 * index pairs it matches (taking the earliest matches, so that inserted
 * units come as late as they can), or `null` when there are too many units
 * to compare.
 */
function matchUnits(
  a: readonly string[],
  a0: number,
  a1: number,
  b: readonly string[],
  b0: number,
  b1: number,
): null | [number, number][] {
  const n = a1 - a0;
  const m = b1 - b0;
  if (n === 0 || m === 0) {
    return [];
  }
  if (n * m > MATCH_BUDGET) {
    return null;
  }
  const width = m + 1;
  // lengths[i * width + j]: the length of the LCS of a[a0 + i, a1) and
  // b[b0 + j, b1)
  const lengths = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i * width + j] =
        a[a0 + i] === b[b0 + j]
          ? lengths[(i + 1) * width + j + 1] + 1
          : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[a0 + i] === b[b0 + j]) {
      pairs.push([a0 + i, b0 + j]);
      i++;
      j++;
    } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * Whether ids were ever set on `node`, or on the node it was split or copied
 * from. A TextNode that the core or a transform creates from scratch to hold
 * existing text (a hashtag, a segmented node turned into text) has none.
 */
function $hasMarkIDsState(node: LexicalNode): boolean {
  // @internal access: NodeState does not expose whether a value was set
  const state = node.getLatest().__state;
  return (
    state !== undefined &&
    (state.knownState.has(markIDsState) ||
      (state.unknownState !== undefined &&
        MARK_STATE_KEY in state.unknownState))
  );
}

/**
 * Whether `splitText` cuts `node` into nodes of its own class: a TextNode in
 * normal mode that is a TextNode, or of the class that replaces TextNode in
 * this editor (a node replacement), since the pieces after the first are
 * created with `$createTextNode`. The pieces of another subclass (a hashtag,
 * a code token) would be plain text, which its transforms merge back.
 */
function $splitsIntoOwnClass(node: TextNode): boolean {
  return (
    node.getMode() === 'normal' &&
    (node.isSimpleText() ||
      // An unattached node, garbage collected with the update
      $createTextNode('').constructor === node.constructor)
  );
}

/**
 * Set the ids of the units `[start, end)` of `flat`, which are all the units
 * of one node, to `ids[start, end)`. A TextNode is split where they differ
 * when its pieces are of its own class; another TextNode (a token or
 * segmented node, a hashtag, a code token) gets all of them, so that none of
 * its text loses an id it had.
 */
function $setUnitIDs(
  flat: Flattened,
  ids: readonly (readonly string[])[],
  start: number,
  end: number,
): void {
  const node = flat.nodes[start];
  if (!$isTextNode(node)) {
    $setState(node, markIDsState, ids[start]);
    return;
  }
  const offsets: number[] = [];
  for (let i = start + 1; i < end; i++) {
    if (!markIDsState.isEqual(ids[i], ids[i - 1])) {
      offsets.push(flat.offsets[i]);
    }
  }
  if (offsets.length > 0 && !$splitsIntoOwnClass(node)) {
    let all = NO_IDS;
    for (let i = start; i < end; i++) {
      all = union(all, ids[i]);
    }
    if (!markIDsState.isEqual($readNodeMarkIDs(node), all)) {
      $setState(node, markIDsState, all);
    }
    return;
  }
  const parts = offsets.length > 0 ? node.splitText(...offsets) : [node];
  let i = start;
  for (const part of parts) {
    if (!markIDsState.isEqual($readNodeMarkIDs(part), ids[i])) {
      $setState(part, markIDsState, ids[i]);
    }
    // The next part starts where the ids change
    do {
      i++;
    } while (i < end && markIDsState.isEqual(ids[i], ids[i - 1]));
  }
}

/**
 * Give the text a local edit inserted the ids the documented rule says it
 * has, whatever TextNode the core put it in, and give text that the edit
 * re-created back its ids:
 *
 * - Inserted text gets the ids shared by the units right before and right
 *   after it, within its block: text inserted inside a marked run joins it,
 *   text inserted at its edge does not.
 * - When it replaces a selection, also the ids all of the replaced text had.
 * - Its own ids: those of the nodes it came in (pasted or otherwise inserted
 *   nodes). Text inserted into a node that existed has none, also when a
 *   transform split it off into a copy of that node (`$isSplitOffEntity`).
 * - Text that was not deleted keeps its ids, also when the core or a
 *   transform moved it into a new TextNode that has none (a hashtag, a
 *   segmented node turned into text, the text around a replaced selection).
 * - None of this gives back an id in `removed` (removed with
 *   {@link $removeMarkID} in this update).
 *
 * The change is found by comparing the units around the caret with the same
 * units in `prevState`. Only the children of the blocks that the update
 * changed are compared: a child that is the same object in both states is
 * unchanged, and one on each side bounds the comparison. Within them, the
 * text both states share at the start and at the end is a few units (see
 * {@link flattenSide}), so the cost is a scan of the changed TextNodes and
 * units for the changed text only. The change ends at the caret (what
 * follows the caret is what followed the change), and starts at the end of
 * the common prefix, or at the start of the selection it replaced. That
 * selection is `replaced`: the selection when an insertion or paste command
 * was last dispatched, or the one a composition started with. It is only
 * used when the text in its place is in new TextNodes, as the core inserts
 * it, so a handler that wrapped the selection instead is not taken for one
 * that replaced it. Without it (text replaced by code that dispatches no
 * command), the longest common subsequence of the two sides of the change
 * tells the units that were kept from those that were inserted or deleted.
 *
 * This needs no knowledge of how the text was inserted (typing, native
 * input, composition, paste, or any code that edits TextNodes and leaves the
 * caret after its insertion), and it runs as a root transform, after every
 * TextNode has been normalized.
 */
function $applyInsertedTextMarkIDs(
  editor: LexicalEditor,
  prevState: EditorState,
  replaced: null | readonly [PointLike, PointLike],
  removed: ReadonlySet<string>,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return;
  }
  const caret = selection.anchor;
  const caretNode = caret.getNode();
  const block = $getBlock(caretNode);
  if (block === null) {
    return;
  }
  // @internal access: a node that this update did not change is the same
  // object in both states
  const prevNodes = prevState._nodeMap;
  const $isUnchangedInline = (element: ElementNode): boolean => {
    let hasUnits = false;
    for (
      let child = element.getFirstChild();
      child !== null;
      child = child.getNextSibling()
    ) {
      if (prevNodes.get(child.getKey()) !== child) {
        return false;
      }
      if ($isElementNode(child) && child.isInline()) {
        if (!$isUnchangedInline(child)) {
          return false;
        }
        hasUnits = true;
      } else if (!$isTextNode(child) || child.getTextContentSize() > 0) {
        hasUnits = true;
      }
    }
    return hasUnits;
  };
  // A child of a block that bounds the comparison: unchanged, with units
  const $isContext = (node: LexicalNode): boolean => {
    if (prevNodes.get(node.getKey()) !== node) {
      return false;
    }
    if ($isTextNode(node)) {
      return node.getTextContentSize() > 0;
    }
    return (
      !($isElementNode(node) && node.isInline()) || $isUnchangedInline(node)
    );
  };
  const $expand = (
    start: null | LexicalNode,
    direction: 'previous' | 'next',
  ): null | LexicalNode => {
    let node = start;
    while (node !== null && !$isContext(node)) {
      node =
        direction === 'previous'
          ? node.getPreviousSibling()
          : node.getNextSibling();
    }
    return node;
  };
  // The children of the caret's block around the caret that may have
  // changed, bounded by an unchanged child on each side (or the block's ends)
  let left: null | LexicalNode;
  let right: null | LexicalNode;
  if (caret.type === 'element' && caret.key === block.getKey()) {
    right = block.getChildAtIndex(caret.offset);
    left = right !== null ? right.getPreviousSibling() : block.getLastChild();
  } else {
    let top: LexicalNode = caretNode;
    for (
      let parent = top.getParent();
      parent !== null && !parent.is(block);
      parent = top.getParent()
    ) {
      top = parent;
    }
    left = top.getPreviousSibling();
    right = top.getNextSibling();
  }
  const from = $expand(left, 'previous');
  const to = $expand(right, 'next');
  // The blocks around the caret that may have changed: from the nearest one
  // at or before it that existed before the update, up to the next one that
  // did
  const parent = block.getParent();
  let first: null | LexicalNode = block;
  let next: null | LexicalNode = null;
  if (parent !== null) {
    while (first !== null && !prevNodes.has(first.getKey())) {
      first = first.getPreviousSibling();
    }
    next = block.getNextSibling();
    while (next !== null && !prevNodes.has(next.getKey())) {
      next = next.getNextSibling();
    }
  } else if (!prevNodes.has(block.getKey())) {
    return;
  }
  const windows: BlockWindow[] = [];
  for (
    let current: null | LexicalNode =
      first !== null ? first : parent!.getFirstChild();
    current !== null && current !== next;
    current = current.getNextSibling()
  ) {
    if (!$isElementNode(current)) {
      return;
    }
    const isCaretBlock = current.is(block);
    let windowFrom: null | LexicalNode = null;
    if (windows.length === 0 && first !== null) {
      windowFrom = isCaretBlock
        ? from
        : $expand(current.getLastChild(), 'previous');
    }
    windows.push({
      block: current,
      from: windowFrom,
      to: isCaretBlock ? to : null,
    });
    if ((isCaretBlock && to !== null) || parent === null) {
      // What follows an unchanged child after the caret is not compared
      break;
    }
  }
  const afterSegments = $collectSegments(windows, [caret]);
  const firstKey = first !== null ? first.getKey() : null;
  const nextKey = next !== null ? next.getKey() : null;
  const parentKey = parent !== null ? parent.getKey() : null;
  const blockKey = block.getKey();
  const fromKey = windows[0].from !== null ? windows[0].from.getKey() : null;
  const lastWindow = windows[windows.length - 1];
  const toKey = lastWindow.to !== null ? lastWindow.to.getKey() : null;
  const beforeSegments = prevState.read(
    () => {
      const prevWindows: BlockWindow[] = [];
      let current: null | LexicalNode;
      if (firstKey !== null) {
        current = $getNodeByKey(firstKey);
        const prevParent = current && current.getParent();
        if ((prevParent ? prevParent.getKey() : null) !== parentKey) {
          return null;
        }
      } else {
        const prevParent = parentKey !== null ? $getNodeByKey(parentKey) : null;
        if (!$isElementNode(prevParent)) {
          return null;
        }
        current = prevParent.getFirstChild();
      }
      let reachedTo = false;
      for (; current !== null; current = current.getNextSibling()) {
        if (current.getKey() === nextKey) {
          break;
        }
        if (!$isElementNode(current)) {
          return null;
        }
        const prevWindow: BlockWindow = {block: current, from: null, to: null};
        if (prevWindows.length === 0 && fromKey !== null) {
          // Unchanged, so in the same block as in the pending state
          prevWindow.from = $getNodeByKey(fromKey);
          if (
            prevWindow.from === null ||
            !current.is(prevWindow.from.getParent())
          ) {
            return null;
          }
        }
        prevWindows.push(prevWindow);
        if (toKey !== null && current.getKey() === blockKey) {
          prevWindow.to = $getNodeByKey(toKey);
          if (
            prevWindow.to === null ||
            !current.is(prevWindow.to.getParent())
          ) {
            return null;
          }
          reachedTo = true;
          break;
        }
        if (parentKey === null) {
          break;
        }
      }
      if (toKey !== null ? !reachedTo : nextKey !== null && current === null) {
        return null;
      }
      return $collectSegments(prevWindows, replaced || []);
    },
    {editor},
  );
  const caretAt = afterSegments.points[0];
  if (beforeSegments === null || caretAt < 0) {
    return;
  }
  // The text both sides share at the start and the end is compared as a few
  // units. Those stay outside the change: the start before the caret and
  // before what follows the caret in the previous state, the end after both,
  // and both outside the replaced selection.
  let suffixLimit = afterSegments.length - caretAt;
  let prefixLimit = Math.max(
    0,
    Math.min(caretAt, beforeSegments.length - suffixLimit),
  );
  const [replacedStart, replacedEnd] = beforeSegments.points;
  if (replacedStart >= 0 && replacedEnd >= 0) {
    prefixLimit = Math.min(prefixLimit, replacedStart);
    suffixLimit = Math.min(suffixLimit, beforeSegments.length - replacedEnd);
  }
  const prefix = sameEnd(afterSegments, beforeSegments, prefixLimit, false);
  const suffix = sameEnd(
    afterSegments,
    beforeSegments,
    Math.min(
      suffixLimit,
      Math.min(afterSegments.length, beforeSegments.length) - prefix,
    ),
    true,
  );
  const after = flattenSide(afterSegments, beforeSegments, prefix, suffix);
  const before = flattenSide(beforeSegments, afterSegments, prefix, suffix);
  const c = after.points[0];
  const n = after.codes.length;
  const m = before.codes.length;
  // Anchored at the caret: what follows it is what followed the change
  const k = n - c;
  if (k > m) {
    return;
  }
  for (let i = 1; i <= k; i++) {
    if (after.codes[n - i] !== before.codes[m - i]) {
      return;
    }
  }
  const e = m - k;
  let s = 0;
  while (s < c && s < e && after.codes[s] === before.codes[s]) {
    s++;
  }
  // @internal access: the keys of the TextNodes merged by this update
  const normalized = editor._normalizedNodes;
  let absorbedNew = false;
  for (const key of normalized) {
    if (!prevNodes.has(key)) {
      const node = $getNodeByKey(key);
      if (node === null || !node.isAttached()) {
        absorbedNew = true;
        break;
      }
    }
  }
  // A node that did not exist before the update brought its ids with it,
  // and so did a node that absorbed one when normalization merged them
  // (which it only does for nodes with the same ids)
  const $isNewText = (node: LexicalNode) =>
    !prevNodes.has(node.getKey()) ||
    (absorbedNew && normalized.has(node.getKey()));
  // The replaced selection, when the text in its place is new text: the
  // core puts the text that replaces a selection in a new TextNode, so a
  // handler that wrapped the selection instead is not mistaken for one
  let replacedSelection = false;
  if (replaced !== null) {
    const [start, end] = before.points;
    if (start >= 0 && end > start && end === e && start <= s) {
      replacedSelection = true;
      for (let i = start; i < c && replacedSelection; i++) {
        replacedSelection = after.kinds[i] > LEAF || $isNewText(after.nodes[i]);
      }
      if (replacedSelection) {
        s = start;
      }
    }
  }
  // The nearest previous sibling of a node that existed before the update,
  // by key, for the nodes that did not
  const origins = new Map<NodeKey, null | LexicalNode>();
  const $getOrigin = (node: LexicalNode): null | LexicalNode => {
    const keys: NodeKey[] = [];
    let origin = node.getPreviousSibling();
    while (origin !== null && !prevNodes.has(origin.getKey())) {
      const known = origins.get(origin.getKey());
      if (known !== undefined) {
        origin = known;
        break;
      }
      keys.push(origin.getKey());
      origin = origin.getPreviousSibling();
    }
    for (const key of keys) {
      origins.set(key, origin);
    }
    return origin;
  };
  // Whether `node` is text that a transform split off a TextNode that
  // existed, of another class than the pieces `splitText` creates (a text
  // entity: a hashtag, a mention), with the text inserted at its end, which
  // no longer belongs to it. `splitText` creates such a piece with
  // `$createTextNode` and a copy of the ids of that node, after it (and
  // after its other pieces). Those ids are not the inserted text's own.
  const splitOff = new Map<NodeKey, boolean>();
  const $isSplitOffEntity = (node: LexicalNode): boolean => {
    const key = node.getKey();
    let result = splitOff.get(key);
    if (result === undefined) {
      const origin =
        $isTextNode(node) && !prevNodes.has(key) ? $getOrigin(node) : null;
      result =
        $isTextNode(origin) &&
        origin.constructor !== node.constructor &&
        // The same value: `splitText` cloned the node's state into the
        // piece in this update. Inserted nodes bring ids of their own, even
        // equal ones (pasted, dropped, inserted or marked by code).
        $readNodeMarkIDs(origin) === $readNodeMarkIDs(node) &&
        // An unattached node, garbage collected with the update
        $createTextNode('').constructor === node.constructor;
      splitOff.set(key, result);
    }
    return result;
  };
  const ids = after.ids.slice();
  // A kept character in a TextNode that the update created without ids
  // (or one that absorbed such a node) was re-created: it keeps its ids
  const $keep = (i: number, j: number) => {
    if (
      after.kinds[i] === CHAR &&
      ids[i].length === 0 &&
      before.ids[j].length > 0
    ) {
      const node = after.nodes[i];
      const key = node.getKey();
      if (
        key !== before.nodes[j].getKey() &&
        ((!prevNodes.has(key) && !$hasMarkIDsState(node)) ||
          (absorbedNew && normalized.has(key)))
      ) {
        ids[i] = without(before.ids[j], removed);
      }
    }
  };
  for (let i = 0; i < s; i++) {
    $keep(i, i);
  }
  for (let i = c; i < n; i++) {
    $keep(i, i - c + e);
  }
  // The inserted runs [i0, i1), each with the run [j0, j1) of `before` it
  // replaced
  const gaps: [number, number, number, number][] = [];
  const pairs = replacedSelection
    ? []
    : matchUnits(after.codes, s, c, before.codes, s, e);
  let i0 = s;
  let j0 = s;
  for (const [i, j] of pairs || []) {
    if (i > i0 || j > j0) {
      gaps.push([i0, i, j0, j]);
    }
    $keep(i, j);
    i0 = i + 1;
    j0 = j + 1;
  }
  if (c > i0 || e > j0) {
    gaps.push([i0, c, j0, e]);
  }
  const unitIDs = (i: number): readonly string[] =>
    i >= 0 && i < n && after.kinds[i] <= LEAF ? ids[i] : NO_IDS;
  for (const [g0, g1, r0, r1] of gaps) {
    if (g1 === g0) {
      continue;
    }
    let shared = intersect(unitIDs(g0 - 1), unitIDs(g1));
    // The ids every replaced unit had (line breaks between blocks aside)
    let replacedIDs: null | readonly string[] = null;
    for (let j = r0; j < r1; j++) {
      if (before.kinds[j] !== BREAK) {
        const unit = before.kinds[j] <= LEAF ? before.ids[j] : NO_IDS;
        replacedIDs =
          replacedIDs === null ? unit : intersect(replacedIDs, unit);
      }
    }
    if (replacedIDs !== null) {
      shared = union(shared, without(replacedIDs, removed));
    }
    for (let i = g0; i < g1; i++) {
      if (after.kinds[i] <= LEAF) {
        // Text inserted into a node that existed, or split off one, has no
        // ids of its own
        const node = after.nodes[i];
        const own =
          $isNewText(node) &&
          after.ids[i].length > 0 &&
          !$isSplitOffEntity(node)
            ? after.ids[i]
            : NO_IDS;
        ids[i] = union(own, shared);
      }
    }
  }
  for (let i = 0; i < n; ) {
    let end = i + 1;
    while (end < n && after.nodes[end] === after.nodes[i]) {
      end++;
    }
    for (let u = i; u < end; u++) {
      if (
        after.kinds[u] <= LEAF &&
        !markIDsState.isEqual(ids[u], after.ids[u])
      ) {
        $setUnitIDs(after, ids, i, end);
        break;
      }
    }
    i = end;
  }
}

/**
 * Make the `markIds` StateConfig known to every node type of the editor, as
 * using it on a node of that type would, so that ids read from JSON or
 * applied with `updateFromUnknown` are parsed right away, and code that
 * reads the StateConfig of a node can recognize it as set-valued before this
 * editor has marked anything.
 */
function registerMarkIDsState(editor: LexicalEditor): void {
  // @internal access with precedent (NormalizeInlineElementsExtension): there
  // is no public API to declare a state for node classes the extension does
  // not own
  for (const {sharedNodeState} of editor._nodes.values()) {
    const {sharedConfigMap} = sharedNodeState;
    if (!sharedConfigMap.has(MARK_STATE_KEY)) {
      sharedConfigMap.set(MARK_STATE_KEY, markIDsState);
    }
  }
}

/**
 * An experimental alternative to `MarkNode` for comments and other
 * annotations: the mark ids are stored as a set-valued NodeState
 * (`markIds`, a sorted array in JSON) on the leaves they cover (TextNode,
 * LineBreakNode and inline DecoratorNode by default, see `markableNodes`),
 * instead of wrapping them in a MarkNode.
 *
 * - Marks overlap freely: text covered by two comments is one TextNode with
 *   both ids, not a MarkNode split into sibling wrappers.
 * - Adding or removing an id changes NodeState only; it never moves,
 *   re-creates or wraps text. (Adding or removing it on part of a TextNode
 *   splits that TextNode, and TextNodes left with the same ids merge back.)
 * - The ids live on the leaves, so they travel with the text: typing inside
 *   a marked run, copying, cutting or deleting text keeps its ids with it.
 * - Marked leaves are rendered with the `mark` (and, for more than one id,
 *   `markOverlap`) theme classes and a `data-lexical-mark-ids` attribute.
 *   With `exportIDsToHTML`, HTML export writes that attribute too; the
 *   `@lexical/html` import pipeline reads it back.
 * - Text inserted at the edge of a marked run does not join it, like
 *   MarkNode; text inserted inside a run does. Text that replaces a
 *   selection also gets the ids all of the replaced text had, and pasted
 *   content keeps its own ids (pasted marked text stays marked). Text that
 *   the edit moves into a new TextNode (a hashtag, a segmented node turned
 *   into text) keeps its ids, except an id removed with
 *   {@link $removeMarkID} in the same update. A TextNode is split where its
 *   text gets different ids when its pieces stay of its own class (TextNode,
 *   or the class that replaces it); other TextNodes (a token or segmented
 *   node, a hashtag) get every id their text had.
 *
 * Use {@link $addMarkID}, {@link $removeMarkID},
 * {@link $getMarkIDsAtSelection} and {@link $getNodeMarkIDs} to work with
 * the ids, the `markIDNodeKeys` output to find the nodes of an id, and
 * {@link $migrateMarkNodesToMarkState} to convert MarkNode documents.
 *
 * @experimental
 */
export const MarkStateExtension: MarkStateExtensionType = defineExtension<
  MarkStateConfig,
  typeof MARK_STATE_EXTENSION_NAME,
  MarkStateOutput,
  MarkStateInit
>({
  build: (editor, config, state): MarkStateOutput => {
    if (isMarkableByEditor === undefined) {
      isMarkableByEditor = new WeakMap();
    }
    isMarkableByEditor.set(editor, compileMarkableNodes(config.markableNodes));
    registerMarkIDsState(editor);
    const {markableNodes: _markableNodes, ...signalConfig} = config;
    return {
      ...namedSignals(signalConfig),
      markIDNodeKeys: state.getInitResult().markIDNodeKeys,
    };
  },
  config: safeCast<MarkStateConfig>({
    disabled: false,
    exportIDsToHTML: false,
    markableNodes: DEFAULT_MARKABLE_NODES,
  }),
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        // A guard rather than [TextNode, LineBreakNode, DecoratorNode]: the
        // class form requires every class to be registered, and DecoratorNode
        // is abstract.
        domOverride(
          [$isMarkableNodeMatch],
          {
            $decorateDOM: (node, _prevNode, dom, editor) =>
              $decorateMarkIDs(node, dom, editor),
          },
          {disabledForEditor: ctx => ctx.get(MarkStateRenderDisabled)},
        ),
        domOverride([$isMarkableNodeMatch], {
          $exportDOM: (node, $next, editor) => {
            const output = $next();
            const dep = getPeerDependencyFromEditor<MarkStateExtensionType>(
              editor,
              MARK_STATE_EXTENSION_NAME,
            );
            if (!dep || !dep.output.exportIDsToHTML.peek()) {
              return output;
            }
            const ids = $readNodeMarkIDs(node);
            if (ids.length > 0 && isHTMLElement(output.element)) {
              output.element.setAttribute(
                MARK_STATE_IDS_ATTRIBUTE,
                ids.join(' '),
              );
            }
            return output;
          },
        }),
      ],
    }),
    configExtension(DOMImportExtension, {rules: [MarkStateImportRule]}),
  ],
  init: (): MarkStateInit => ({markIDNodeKeys: signal(new Map())}),
  name: MARK_STATE_EXTENSION_NAME,
  register: (editor, _config, state) => {
    const {disabled} = state.getOutput();
    const {markIDNodeKeys} = state.getInitResult();
    return effect(() => {
      const isDisabled = disabled.value;
      $setRenderContextValue(MarkStateRenderDisabled, isDisabled, editor);
      if (!isDisabled) {
        return registerMarkState(editor, markIDNodeKeys);
      }
    });
  },
});
