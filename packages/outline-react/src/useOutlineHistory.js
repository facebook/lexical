/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  EditorState,
  OutlineNode,
  NodeKey,
  IntentionallyMarkedAsDirtyBlock,
} from 'outline';

import {isTextNode, isRootNode} from 'outline';
import {isRedo, isUndo} from 'outline/keys';
import {useCallback, useEffect, useMemo} from 'react';

const MERGE = 0;
const NO_MERGE = 1;
const DISCARD = 2;

export type HistoryStateEntry = {
  editor: OutlineEditor,
  editorState: EditorState,
};

export type HistoryState = {
  current: null | HistoryStateEntry,
  redoStack: Array<HistoryStateEntry>,
  undoStack: Array<HistoryStateEntry>,
};

function getDirtyNodes(
  editorState: EditorState,
  dirtyLeavesSet: Set<NodeKey>,
  dirtyBlocksSet: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
): Array<OutlineNode> {
  const dirtyLeaves = Array.from(dirtyLeavesSet);
  const dirtyBlocks = Array.from(dirtyBlocksSet);
  const nodeMap = editorState._nodeMap;
  const nodes = [];

  for (let i = 0; i < dirtyLeaves.length; i++) {
    const dirtyLeafKey = dirtyLeaves[i];
    const dirtyLeaf = nodeMap.get(dirtyLeafKey);
    if (dirtyLeaf !== undefined) {
      nodes.push(dirtyLeaf);
    }
  }

  for (let i = 0; i < dirtyBlocks.length; i++) {
    const intentionallyMarkedAsDirty = dirtyBlocks[i][1];
    if (!intentionallyMarkedAsDirty) {
      continue;
    }
    const dirtyBlockKey = dirtyBlocks[i][0];
    const dirtyBlock = nodeMap.get(dirtyBlockKey);
    if (dirtyBlock !== undefined && !isRootNode(dirtyBlock)) {
      nodes.push(dirtyBlock);
    }
  }
  return nodes;
}

function getMergeAction(
  prevEditorState: null | EditorState,
  nextEditorState: EditorState,
  dirtyLeavesSet: Set<NodeKey>,
  dirtyBlocksSet: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
  tags: Set<string>,
  canMergeWithinDelay: boolean,
): 0 | 1 | 2 {
  // If we have an editor state that doesn't want its history
  // recorded then we always merge the changes.
  if (tags.has('without-history')) {
    return MERGE;
  }
  if (prevEditorState === null) {
    return NO_MERGE;
  }
  const selection = nextEditorState._selection;
  const prevSelection = prevEditorState._selection;
  const hasDirtyNodes = dirtyLeavesSet.size > 0 || dirtyBlocksSet.size > 0;
  if (!hasDirtyNodes) {
    if (prevSelection === null && selection !== null) {
      return MERGE;
    }
    return DISCARD;
  }
  const dirtyNodes = getDirtyNodes(
    nextEditorState,
    dirtyLeavesSet,
    dirtyBlocksSet,
  );
  if (dirtyNodes.length === 1 && canMergeWithinDelay) {
    const prevNodeMap = prevEditorState._nodeMap;
    const nextDirtyNode = dirtyNodes[0];
    const prevDirtyNodeKey = nextDirtyNode.__key;
    const prevDirtyNode = prevNodeMap.get(prevDirtyNodeKey);
    if (
      prevDirtyNode !== undefined &&
      isTextNode(prevDirtyNode) &&
      isTextNode(nextDirtyNode) &&
      prevDirtyNode.__flags === nextDirtyNode.__flags
    ) {
      const prevText = prevDirtyNode.__text;
      const nextText = nextDirtyNode.__text;
      if (prevText === '') {
        return NO_MERGE;
      }
      const textDiff = nextText.length - prevText.length;
      if (prevText === nextText) {
        return MERGE;
      }
      // Only merge if we're adding/removing a single character
      // or if there is not change at all.
      if (textDiff === -1 || textDiff === 1) {
        if (selection === null || prevSelection === null) {
          return MERGE;
        }
        const anchor = selection.anchor;
        const prevAnchor = prevSelection.anchor;
        const anchorKey = anchor.key;
        const prevAnchorKey = prevAnchor.key;
        if (anchorKey !== prevAnchorKey || anchor.type !== 'text') {
          return NO_MERGE;
        }
        const anchorOffset = anchor.offset;
        const prevAnchorOffset = prevAnchor.offset;
        // If we've inserted some text that is a single character
        // after, then merge it.
        if (prevAnchorOffset === anchorOffset - 1) {
          return MERGE;
        }
      }
    }
  }
  return NO_MERGE;
}

export function useOutlineHistory(
  editor: OutlineEditor,
  externalHistoryState?: HistoryState,
  delay?: number = 1000,
): () => void {
  const historyState: HistoryState = useMemo(
    () => externalHistoryState || createEmptyHistoryState(),
    [externalHistoryState],
  );

  useEffect(() => {
    let lastChangeTime = Date.now();
    const canMergeWithinDelay = (): boolean => {
      const changeTime = Date.now();
      const canMerge = changeTime < lastChangeTime + delay;
      lastChangeTime = changeTime;
      return canMerge;
    };

    const applyChange = ({editorState, dirtyLeaves, dirtyBlocks, tags}) => {
      const current = historyState.current;
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      const currentEditorState = current === null ? null : current.editorState;

      if (current !== null && editorState === currentEditorState) {
        return;
      }
      const mergeAction = getMergeAction(
        currentEditorState,
        editorState,
        dirtyLeaves,
        dirtyBlocks,
        tags,
        canMergeWithinDelay(),
      );
      if (mergeAction === NO_MERGE) {
        if (redoStack.length !== 0) {
          historyState.redoStack = [];
        }
        if (current !== null) {
          undoStack.push(current);
        }
      } else if (mergeAction === DISCARD) {
        return;
      }
      // Else we merge
      historyState.current = {
        editor,
        editorState,
      };
    };

    const undo = () => {
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      const undoStackLength = undoStack.length;
      if (undoStackLength !== 0) {
        const current = historyState.current;

        if (current !== null) {
          redoStack.push(current);
        }
        const historyStateEntry = undoStack.pop();
        historyState.current = historyStateEntry;
        historyStateEntry.editor.setEditorState(historyStateEntry.editorState);
      }
    };

    const redo = () => {
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      if (redoStack.length !== 0) {
        const current = historyState.current;

        if (current !== null) {
          undoStack.push(current);
        }
        const historyStateEntry = redoStack.pop();
        historyState.current = historyStateEntry;
        historyStateEntry.editor.setEditorState(historyStateEntry.editorState);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (editor.isComposing()) {
        return;
      }

      if (isUndo(event)) {
        event.preventDefault();
        event.stopPropagation();
        undo();
      } else if (isRedo(event)) {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    };

    const handleBeforeInput = (event: InputEvent) => {
      const inputType = event.inputType;
      if (inputType === 'historyUndo') {
        event.preventDefault();
        event.stopPropagation();
        undo();
      } else if (inputType === 'historyRedo') {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    };

    const removeRootListener = editor.addListener(
      'root',
      (
        rootElement: null | HTMLElement,
        prevRootElement: null | HTMLElement,
      ) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('keydown', handleKeyDown);
          prevRootElement.removeEventListener('beforeinput', handleBeforeInput);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('keydown', handleKeyDown);
          rootElement.addEventListener('beforeinput', handleBeforeInput);
        }
      },
    );

    const removeUpdateListener = editor.addListener('update', applyChange);

    return () => {
      removeUpdateListener();
      removeRootListener();
    };
  }, [delay, editor, historyState]);

  const clearHistory = useCallback(() => {
    historyState.undoStack = [];
    historyState.redoStack = [];
    historyState.current = null;
  }, [historyState]);

  return clearHistory;
}

export function createEmptyHistoryState(): HistoryState {
  return {
    current: null,
    redoStack: [],
    undoStack: [],
  };
}
