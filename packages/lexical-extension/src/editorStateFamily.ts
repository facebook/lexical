/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createNodeSelection,
  $createRangeSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $parseSerializedNode,
  type BaseSelection,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  RootNode,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';

/**
 * The two slot links, which live on {@link SlotHostNode} and its children
 * rather than on every node. Both are NodeKeys, like the tree links, so they
 * are carried and remapped the same way.
 */
interface SlotLinks {
  __slots?: null | Map<string, NodeKey>;
  __slotHost?: null | NodeKey;
}

/**
 * A family of EditorStates is a set of versions of one document — the current
 * state of an editor and the entries of its undo and redo stacks, say.
 *
 * Serializing each of those states on its own (with `toJSON()`) and parsing
 * each one back (with `parseEditorState`) is lossy in two ways that matter:
 *
 * - **Structural sharing is lost.** Lexical clones only the nodes an update
 *   touches, so consecutive versions of a document share nearly all of their
 *   node objects. Independently parsed states share none, so the restored
 *   history costs memory proportional to its depth times the size of the
 *   document, where the original cost the size of the document plus its edits.
 * - **Key stability is lost.** `parseEditorState` mints a fresh NodeKey for
 *   every node, so independently parsed versions have disjoint key spaces.
 *   Reconciliation is a diff over NodeKeys, so undoing to such a state rebuilds
 *   the whole DOM and remounts every decorator instead of touching what
 *   actually changed.
 *
 * This module serializes a family as one payload instead: a table of the
 * distinct node *versions* across all of the states (a node that several
 * states share appears once), plus, per state, the list of versions its node
 * map is built from. Restoring rebuilds each version once and assembles the
 * node maps from those shared objects, so both properties survive: a node that
 * two states shared before is one object in both again, and every version of a
 * node answers to the same key.
 *
 * The payload is plain data — no `LexicalNode`s, no class references — so it
 * can be handed to another instance of the same module, which is what makes it
 * usable across a hot reload that replaced the node classes.
 *
 * @internal
 */
export interface SerializedEditorStateFamily {
  /** Every distinct node version across the family, in no particular order. */
  nodes: SerializedNodeVersion[];
  /** One entry per state, in the order the states were given. */
  states: SerializedFamilyState[];
}

/**
 * One version of one node: its own serialized form, with the tree links kept
 * beside it rather than nested. `exportJSON()` describes a node's own data and
 * leaves `children` empty — the recursive walk lives in `EditorState.toJSON`,
 * not in the node — and every link Lexical stores is a NodeKey, so a version
 * can be described, and restored, without touching any other node.
 */
interface SerializedNodeVersion {
  json: SerializedLexicalNode;
  key: NodeKey;
  parent: null | NodeKey;
  prev: null | NodeKey;
  next: null | NodeKey;
  /** Elements only. */
  first?: null | NodeKey;
  last?: null | NodeKey;
  size?: number;
  /** Slot hosts only. */
  slots?: [string, NodeKey][];
  /** Slot children only: the up-link that takes the place of `parent`. */
  slotHost?: null | NodeKey;
}

interface SerializedFamilyPoint {
  key: NodeKey;
  offset: number;
  type: 'element' | 'text';
}

type SerializedFamilySelection =
  | {
      anchor: SerializedFamilyPoint;
      focus: SerializedFamilyPoint;
      format: number;
      style: string;
      type: 'range';
    }
  | {keys: NodeKey[]; type: 'node'};

interface SerializedFamilyState {
  /** Indices into {@link SerializedEditorStateFamily.nodes}. */
  nodes: number[];
  selection: SerializedFamilySelection | null;
}

/**
 * The state the scratch parse starts from. Its content is thrown away — the
 * parse is only there to give the node versions an editor state to be
 * constructed in.
 */
const SCRATCH_STATE_JSON: SerializedEditorState = {
  root: {
    children: [],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

function serializeSelection(
  selection: null | BaseSelection,
): SerializedFamilySelection | null {
  if ($isRangeSelection(selection)) {
    return {
      anchor: {
        key: selection.anchor.key,
        offset: selection.anchor.offset,
        type: selection.anchor.type,
      },
      focus: {
        key: selection.focus.key,
        offset: selection.focus.offset,
        type: selection.focus.type,
      },
      format: selection.format,
      style: selection.style,
      type: 'range',
    };
  }
  if ($isNodeSelection(selection)) {
    return {keys: [...selection._nodes], type: 'node'};
  }
  // A TableSelection (or any other implementation) is left behind rather than
  // half-restored.
  return null;
}

function $serializeNodeVersion(node: LexicalNode): SerializedNodeVersion {
  const json: Record<string, unknown> = {...node.exportJSON()};
  // The nested containers are rebuilt from the links below. Leaving them in
  // would restore a node's children a second time, once per version, which is
  // the duplication this format exists to avoid.
  delete json.children;
  delete json.$slots;
  const version: SerializedNodeVersion = {
    json: json as unknown as SerializedLexicalNode,
    key: node.__key,
    next: node.__next,
    parent: node.__parent,
    prev: node.__prev,
  };
  if ($isElementNode(node)) {
    version.first = node.__first;
    version.last = node.__last;
    version.size = node.__size;
  }
  const {__slotHost, __slots} = node as LexicalNode & SlotLinks;
  if (__slots != null) {
    version.slots = [...__slots];
  }
  if (__slotHost != null) {
    version.slotHost = __slotHost;
  }
  return version;
}

/**
 * Serializes `states` into a single payload of plain data, sharing one node
 * table across all of them.
 *
 * @internal
 */
export function serializeEditorStateFamily(
  states: readonly EditorState[],
): SerializedEditorStateFamily {
  const ids = new Map<LexicalNode, number>();
  const nodes: SerializedNodeVersion[] = [];
  const serializedStates = states.map(
    (state): SerializedFamilyState =>
      // exportJSON reads through getLatest(), so each state's nodes are
      // serialized with that state active.
      state.read(() => {
        const stateNodes: number[] = [];
        for (const node of state._nodeMap.values()) {
          let id = ids.get(node);
          if (id === undefined) {
            id = nodes.length;
            ids.set(node, id);
            nodes.push($serializeNodeVersion(node));
          }
          stateNodes.push(id);
        }
        return {
          nodes: stateNodes,
          selection: serializeSelection(state._selection),
        };
      }),
  );
  return {nodes, states: serializedStates};
}

export function isSerializedEditorStateFamily(
  raw: unknown,
): raw is SerializedEditorStateFamily {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const {nodes, states} = raw as Record<string, unknown>;
  return (
    Array.isArray(nodes) &&
    Array.isArray(states) &&
    nodes.every(
      node => node != null && typeof node === 'object' && 'json' in node,
    ) &&
    states.every(
      state =>
        state != null &&
        typeof state === 'object' &&
        Array.isArray((state as SerializedFamilyState).nodes) &&
        (state as SerializedFamilyState).nodes.every(
          id => typeof id === 'number' && id >= 0 && id < nodes.length,
        ),
    )
  );
}

function $buildNodeVersion(json: SerializedLexicalNode): LexicalNode {
  const node = $parseSerializedNode(json);
  // RootNode.importJSON returns the active editor state's root rather than a
  // new node, so without this every root version would be the same object —
  // and the states of the family would share one root instead of having their
  // own. The parsed root carries this version's data; copying it onto a fresh
  // RootNode keeps the version and leaves the scratch state's root alone.
  return $isRootNode(node) ? Object.assign(new RootNode(), node) : node;
}

function $restoreSelection(
  serialized: SerializedFamilySelection | null,
  keys: ReadonlyMap<NodeKey, NodeKey>,
): null | BaseSelection {
  if (serialized === null) {
    return null;
  }
  if (serialized.type === 'node') {
    const selection = $createNodeSelection();
    for (const key of serialized.keys) {
      const restored = keys.get(key);
      if (restored === undefined) {
        return null;
      }
      selection._nodes.add(restored);
    }
    return selection;
  }
  const anchorKey = keys.get(serialized.anchor.key);
  const focusKey = keys.get(serialized.focus.key);
  if (anchorKey === undefined || focusKey === undefined) {
    return null;
  }
  const selection = $createRangeSelection();
  selection.anchor.key = anchorKey;
  selection.anchor.offset = serialized.anchor.offset;
  selection.anchor.type = serialized.anchor.type;
  selection.focus.key = focusKey;
  selection.focus.offset = serialized.focus.offset;
  selection.focus.type = serialized.focus.type;
  selection.format = serialized.format;
  selection.style = serialized.style;
  return selection;
}

/**
 * Rebuilds the states of a family for `editor`, preserving the sharing and the
 * key relationships they had when they were serialized.
 *
 * The keys are new ones minted by this editor rather than the keys the
 * previous editor used — what matters is that every version of a node, in
 * every state, answers to the *same* key, and freshly minted keys cannot
 * collide with the keys this editor goes on to mint.
 *
 * Returns one entry per state, in the order they were serialized. A state
 * whose nodes cannot all be rebuilt — a node class the new editor no longer
 * registers, say — comes back as `null` rather than failing the whole family.
 *
 * @internal
 */
export function deserializeEditorStateFamily(
  family: SerializedEditorStateFamily,
  editor: LexicalEditor,
): (EditorState | null)[] {
  const versions: (LexicalNode | null)[] = [];
  const keys = new Map<NodeKey, NodeKey>();
  let slotsUsed = false;
  const template = editor.parseEditorState(SCRATCH_STATE_JSON, () => {
    for (const version of family.nodes) {
      let node: LexicalNode | null = null;
      try {
        node = $buildNodeVersion(version.json);
      } catch {
        // A version that no longer rebuilds costs the states that reference
        // it, which the caller reports; the rest of the family is still good.
        versions.push(null);
        continue;
      }
      const key = keys.get(version.key);
      if (key === undefined) {
        keys.set(version.key, node.__key);
      } else {
        node.__key = key;
      }
      versions.push(node);
    }
    const mapKey = (key: null | NodeKey): null | NodeKey =>
      key === null ? null : (keys.get(key) ?? null);
    for (const [index, version] of family.nodes.entries()) {
      const node = versions[index];
      if (node === null) {
        continue;
      }
      node.__parent = mapKey(version.parent);
      node.__prev = mapKey(version.prev);
      node.__next = mapKey(version.next);
      if ($isElementNode(node)) {
        node.__first = mapKey(version.first ?? null);
        node.__last = mapKey(version.last ?? null);
        node.__size = version.size ?? 0;
      }
      const slotted = node as LexicalNode & SlotLinks;
      if (version.slots !== undefined) {
        slotsUsed = true;
        slotted.__slots = new Map(
          version.slots.flatMap(([name, key]): [string, NodeKey][] => {
            const restored = mapKey(key);
            return restored === null ? [] : [[name, restored]];
          }),
        );
      }
      if (version.slotHost !== undefined) {
        slotted.__slotHost = mapKey(version.slotHost);
      }
    }
  });

  return family.states.map(serializedState => {
    const nodeMap = new Map<NodeKey, LexicalNode>();
    for (const id of serializedState.nodes) {
      const node = versions[id];
      if (node === undefined || node === null) {
        return null;
      }
      nodeMap.set(node.__key, node);
    }
    const state = template.clone(
      $restoreSelection(serializedState.selection, keys),
    );
    state._nodeMap = nodeMap;
    state._slotsUsed = slotsUsed;
    return state;
  });
}
