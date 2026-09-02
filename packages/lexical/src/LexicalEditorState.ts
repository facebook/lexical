/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {
  LexicalNode,
  NodeMap,
  SerializedLexicalNode,
  SerializedPartial,
} from './LexicalNode';
import type {BaseSelection} from './LexicalSelection';

import invariant from '@lexical/internal/invariant';

import {cloneMap} from './LexicalGenMap';
import {$exportNodeJSON, $withCompactExport} from './LexicalSerializedExport';
import {$getSlot, $getSlotNames} from './LexicalSlot';
import {readEditorState} from './LexicalUpdates';
import {$getRoot} from './LexicalUtils';
import {
  $isElementNode,
  type SerializedElementNode,
} from './nodes/LexicalElementNode';
import {
  $createRootNode,
  type SerializedRootNode,
} from './nodes/LexicalRootNode';

export interface SerializedEditorState<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> {
  root: SerializedRootNode<T>;
}

/**
 * A document written in the compact form, which omits from every node the
 * properties parsing restores on its own. The two forms describe the same
 * document, and both parse; this one is smaller and can only be read by a
 * Lexical new enough to restore what it left out.
 *
 * Distinct from {@link SerializedEditorState} because the shapes differ:
 * a property the form omitted is absent, so promising the full type would
 * promise values that are not there.
 */
export interface CompactSerializedEditorState<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> {
  root: SerializedPartial<SerializedRootNode<T>>;
}

export function editorStateHasDirtySelection(
  editorState: EditorState,
  editor: LexicalEditor,
): boolean {
  const currentSelection = editor.getEditorState()._selection;

  const pendingSelection = editorState._selection;

  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }

  return false;
}

export function cloneEditorState(current: EditorState): EditorState {
  return new EditorState(cloneMap(current._nodeMap), null, current._slotsUsed);
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', $createRootNode()]]), null, false);
}

function $exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode,
): SerializedNode {
  const nodeClass = node.constructor;

  // The active export decides the form: the compact form drops properties that
  // parsing would restore from their schema default anyway.
  const serializedNode = $exportNodeJSON(node);

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      serializedChildren.push($exportNodeToJSON(children[i]));
    }
  }

  // Slots ride in a separate Map on every LexicalNode (an ElementNode or a
  // DecoratorNode host), so serialize them outside the element branch.
  const slotNames = $getSlotNames(node);
  if (slotNames.length > 0) {
    const serializedSlots: Record<string, SerializedLexicalNode> = {};
    for (const name of slotNames) {
      const slotNode = $getSlot(node, name);
      invariant(
        slotNode !== null,
        'LexicalNode: Node %s has slot "%s" but it resolved to no node during export.',
        nodeClass.name,
        name,
      );
      serializedSlots[name] = $exportNodeToJSON(slotNode);
    }
    serializedNode.$slots = serializedSlots;
  }

  // @ts-expect-error
  return serializedNode;
}

export interface EditorStateReadOptions {
  editor?: LexicalEditor | null;
}

/**
 * Type guard that returns true if the argument is an EditorState
 */
export function $isEditorState(x: unknown): x is EditorState {
  return x instanceof EditorState;
}

export class EditorState {
  _nodeMap: NodeMap;
  _selection: null | BaseSelection;
  _flushSync: boolean;
  _readOnly: boolean;
  /**
   * True if this EditorState was parsed without running transforms
   */
  _parsed: boolean;
  /**
   * True if this EditorState or the LexicalEditor that created it has
   * ever used slots
   */
  _slotsUsed: boolean;

  constructor(
    nodeMap: NodeMap,
    selection: null | BaseSelection = null,
    slotsUsed: boolean = false,
  ) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
    this._parsed = false;
    this._slotsUsed = slotsUsed;
  }

  isEmpty(): boolean {
    // `<= 1` rather than `=== 1`: a state whose node map is empty has not even
    // got a root, which is emptier still, and every caller treats an empty
    // state as one not to use — `setEditorState` refuses it with an invariant
    // rather than committing an editor with no root for `$getRoot` to find.
    return this._nodeMap.size <= 1 && this._selection === null;
  }

  read<V>(callbackFn: () => V, options?: EditorStateReadOptions): V {
    return readEditorState(
      (options && options.editor) || null,
      this,
      callbackFn,
    );
  }

  clone(selection?: null | BaseSelection): EditorState {
    const editorState = new EditorState(
      this._nodeMap,
      selection === undefined ? this._selection : selection,
      this._slotsUsed,
    );
    editorState._readOnly = true;
    // A clone describes the same content as this state, so it is still
    // "parsed without running transforms" if this one was. Dropping the flag
    // made `setEditorState(parsedState.clone(null))` — the documented way to
    // apply a state without focusing the editor — skip the dirty-marking that
    // lets transforms and hydrate-time normalization run.
    editorState._parsed = this._parsed;

    return editorState;
  }
  /**
   * This document's JSON, in the legacy form that writes every property.
   *
   * Called with no argument — including by `JSON.stringify`, for which this is
   * the `toJSON` hook — it writes the form of an enclosing
   * {@link $withCompactExport}, which is what keeps a nested editor's JSON
   * (an image caption) in the same form as the document that contains it. With
   * nothing enclosing it, that is the legacy form.
   */
  toJSON(compact?: false): SerializedEditorState;
  /**
   * @param compact Write the compact form, which omits from every node the
   *   properties parsing restores on its own. Passing the form here rather
   *   than through an enclosing {@link $withCompactExport} is what lets the
   *   return type say which shape it is.
   */
  toJSON(compact: boolean): CompactSerializedEditorState;
  toJSON(compact?: unknown): CompactSerializedEditorState {
    const $toJSON = () =>
      readEditorState(null, this, () => ({
        root: $exportNodeToJSON($getRoot()) as SerializedRootNode,
      }));
    // `=== true` rather than a truthy test, because `JSON.stringify` invokes
    // this hook with the *property name* the value is under: `''` at the top
    // level, but `'state'` for `JSON.stringify({state: editorState})`. A
    // truthy check would silently write the compact form for the latter.
    // A stated form wins, so both overloads are true of what they return.
    // Anything else — `undefined`, or a key — leaves the ambient form alone
    // rather than forcing the legacy one, so a nested editor serialized inside
    // a compact walk still writes compact.
    return typeof compact === 'boolean'
      ? $withCompactExport(compact, $toJSON)
      : $toJSON();
  }
}
