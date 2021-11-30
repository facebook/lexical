/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  NodeKey,
  EditorState,
  IntentionallyMarkedAsDirtyBlock,
} from 'outline';
import type {Binding, Provider, YjsEvent} from '.';

// $FlowFixMe: need Flow typings for yjs
import {YTextEvent, YMapEvent, YXmlEvent} from 'yjs';
import {
  isTextNode,
  getSelection,
  getRoot,
  setSelection,
  getNodeByKey,
} from 'outline';
import {CollabBlockNode} from './CollabBlockNode';
import {CollabTextNode} from './CollabTextNode';
import {
  getOrInitCollabNodeFromSharedType,
  doesSelectionNeedRecovering,
} from './Utils';
import {
  syncOutlineSelectionToYjs,
  syncLocalCursorPosition,
  syncCursorPositions,
} from './SyncCursors';
import {CollabDecoratorNode} from './CollabDecoratorNode';
import {createOffsetView} from 'outline/offsets';

function syncEvent(binding: Binding, event: YTextEvent | YMapEvent): void {
  const {target} = event;
  const collabNode = getOrInitCollabNodeFromSharedType(binding, target);

  if (collabNode instanceof CollabBlockNode && event instanceof YTextEvent) {
    const {keysChanged, childListChanged, delta} = event;
    // Update
    if (keysChanged.size > 0) {
      collabNode.syncPropertiesFromYjs(binding, keysChanged);
    }
    if (childListChanged) {
      collabNode.applyChildrenYjsDelta(binding, delta);
      collabNode.syncChildrenFromYjs(binding);
    }
  } else if (
    collabNode instanceof CollabTextNode &&
    event instanceof YMapEvent
  ) {
    const {keysChanged} = event;
    // Update
    if (keysChanged.size > 0) {
      collabNode.syncPropertiesAndTextFromYjs(binding, keysChanged);
    }
  } else if (
    collabNode instanceof CollabDecoratorNode &&
    event instanceof YXmlEvent
  ) {
    const {attributesChanged} = event;
    // Update
    if (attributesChanged.size > 0) {
      collabNode.syncPropertiesFromYjs(binding, attributesChanged);
    }
  } else {
    throw new Error('Should never happen');
  }
}

export function syncYjsChangesToOutline(
  binding: Binding,
  provider: Provider,
  events: Array<YjsEvent>,
): void {
  const editor = binding.editor;
  const currentEditorState = editor._editorState;
  editor.update(
    () => {
      // $FlowFixMe: this is always true
      const pendingEditorState: EditorState = editor._pendingEditorState;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        syncEvent(binding, event);
      }

      const selection = getSelection();
      if (selection !== null) {
        // We can't use Yjs's cursor position here, as it doesn't always
        // handle selection recovery correctly – especially on blocks that
        // get moved around or split. So instead, we roll our own solution.
        if (doesSelectionNeedRecovering(selection)) {
          const prevSelection = currentEditorState._selection;
          if (prevSelection !== null) {
            const prevOffsetView = createOffsetView(
              editor,
              0,
              currentEditorState,
            );
            const nextOffsetView = createOffsetView(
              editor,
              0,
              pendingEditorState,
            );
            const [start, end] =
              prevOffsetView.getOffsetsFromSelection(prevSelection);
            const nextSelection = nextOffsetView.createSelectionFromOffsets(
              start,
              end,
              prevOffsetView,
            );
            if (nextSelection !== null) {
              setSelection(nextSelection);
            } else {
              // Fallback is to use the Yjs cursor position
              syncLocalCursorPosition(binding, provider);
              if (doesSelectionNeedRecovering(selection)) {
                // Fallback
                getRoot().selectEnd();
              }
            }
          }
          syncOutlineSelectionToYjs(
            binding,
            provider,
            prevSelection,
            getSelection(),
          );
        } else {
          syncLocalCursorPosition(binding, provider);
        }
      }
    },
    {
      onUpdate: () => {
        syncCursorPositions(binding, provider);
      },
      skipTransforms: true,
      tag: 'collaboration',
    },
  );
}

function handleNormalizationMergeConflicts(
  binding: Binding,
  normalizedNodes: Set<NodeKey>,
): void {
  // We handle the merge opperations here
  const normalizedNodesKeys = Array.from(normalizedNodes);
  const collabNodeMap = binding.collabNodeMap;
  const mergedNodes = [];
  for (let i = 0; i < normalizedNodesKeys.length; i++) {
    const nodeKey = normalizedNodesKeys[i];
    const outlineNode = getNodeByKey(nodeKey);
    const collabNode = collabNodeMap.get(nodeKey);
    if (collabNode instanceof CollabTextNode) {
      if (isTextNode(outlineNode)) {
        // We mutate the text collab nodes after removing
        // all the dead nodes first, otherwise offsets break.
        mergedNodes.push([collabNode, outlineNode.__text]);
      } else {
        const offset = collabNode.getOffset();
        if (offset === -1) {
          continue;
        }
        const parent = collabNode._parent;
        collabNode._normalized = true;
        // Only try and delete the collab node if its backing
        // map is not empty;
        if (collabNode._map._length !== 0) {
          parent._xmlText.delete(offset, 1);
        }
        collabNodeMap.delete(nodeKey);
        const parentChildren = parent._children;
        const index = parentChildren.indexOf(collabNode);
        parentChildren.splice(index, 1);
      }
    }
  }
  for (let i = 0; i < mergedNodes.length; i++) {
    const [collabNode, text] = mergedNodes[i];
    collabNode._text = text;
  }
}

export function syncOutlineUpdateToYjs(
  binding: Binding,
  provider: Provider,
  prevEditorState: EditorState,
  currEditorState: EditorState,
  dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
  dirtyLeaves: Set<NodeKey>,
  normalizedNodes: Set<NodeKey>,
  tags: Set<string>,
): void {
  binding.doc.transact(() => {
    currEditorState.read(() => {
      // We check if the update has come from a origin where the origin
      // was the collaboration binding previously. This can help us
      // prevent unecessarily re-diffing and possible re-applying
      // the same change editor state again. For example, if a user
      // types a character and we get it, we don't want to then insert
      // the same character again. The exception to this heuristic is
      // when we need to handle normalization merge conflicts.
      if (tags.has('collaboration')) {
        if (normalizedNodes.size > 0) {
          handleNormalizationMergeConflicts(binding, normalizedNodes);
        }
        return;
      }
      if (dirtyBlocks.has('root')) {
        const prevNodeMap = prevEditorState._nodeMap;
        const nextOutlineRoot = getRoot();
        const collabRoot = binding.root;
        collabRoot.syncPropertiesFromOutline(
          binding,
          nextOutlineRoot,
          prevNodeMap,
        );
        collabRoot.syncChildrenFromOutline(
          binding,
          nextOutlineRoot,
          prevNodeMap,
          dirtyBlocks,
          dirtyLeaves,
        );
      }
      const selection = getSelection();
      const prevSelection = prevEditorState._selection;
      syncOutlineSelectionToYjs(binding, provider, prevSelection, selection);
    });
  }, binding);
}
