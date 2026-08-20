/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {LexicalNode, NodeMap, SerializedLexicalNode} from './LexicalNode';
import type {BaseSelection} from './LexicalSelection';

import invariant from '@lexical/internal/invariant';

import {cloneMap} from './LexicalGenMap';
import {$applySerializationContext} from './LexicalSerializedExport';
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
  isRoot = false,
): SerializedNode | null {
  const nodeClass = node.constructor;

  // The active serialization context decides what this node contributes: an
  // override may replace or omit it, and the compact form drops properties
  // that parsing would restore from their schema default anyway. The default
  // (non-overridden) export is validated by the context; a replacement is
  // authoritative and is not recursed into.
  const applied = $applySerializationContext(node, isRoot);
  if (applied === null) {
    return null;
  }
  const {recurseChildren, serializedNode} = applied;

  if (recurseChildren && $isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
    const children = node.getChildren();
    // $validatedExportJSON checks this for the node's own export, but an
    // override that enhances it can drop the array on the way through — say a
    // `const {children, ...rest} = $next()`. Say so, rather than failing on
    // `undefined.push` several frames deeper.
    invariant(
      Array.isArray(serializedChildren),
      'LexicalNode: Node %s is an element but the JSON exported for it has no children array.',
      nodeClass.name,
    );

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = $exportNodeToJSON(child);
      if (serializedChildNode !== null) {
        serializedChildren.push(serializedChildNode);
      }
    }
  }

  // Slots ride in a separate Map on every LexicalNode (an ElementNode or a
  // DecoratorNode host), so serialize them outside the element branch. Like
  // children, they are only attached to the node's own export, never to a
  // replacement.
  const slotNames = recurseChildren ? $getSlotNames(node) : [];
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
      const serializedSlotNode = $exportNodeToJSON(slotNode);
      if (serializedSlotNode !== null) {
        serializedSlots[name] = serializedSlotNode;
      }
    }
    // An override may have omitted every slot value, in which case the host
    // has no slots to write: an empty `$slots` object would be bytes that
    // parse back to nothing.
    if (Object.keys(serializedSlots).length > 0) {
      serializedNode.$slots = serializedSlots;
    }
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
    return this._nodeMap.size === 1 && this._selection === null;
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
  toJSON(): SerializedEditorState {
    return readEditorState(null, this, () => ({
      root: $exportNodeToJSON($getRoot(), true) as SerializedRootNode,
    }));
  }
}
