/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, ViewModel} from 'outline';

import {isTextNode} from 'outline';
import {isRedo, isUndo} from 'outline/KeyHelpers';
import {useCallback, useEffect, useMemo} from 'react';
import {viewModelsWithoutHistory} from 'outline/HistoryHelpers';

const MERGE = 0;
const NO_MERGE = 1;
const DISCARD = 2;

function getMergeAction(
  prevViewModel: null | ViewModel,
  nextViewModel: ViewModel,
): 0 | 1 | 2 {
  // If we have a view model that doesn't want its history
  // recorded then we always merge the changes.
  if (viewModelsWithoutHistory.has(nextViewModel)) {
    viewModelsWithoutHistory.delete(nextViewModel);
    return MERGE;
  }
  if (prevViewModel === null) {
    return NO_MERGE;
  }
  const selection = nextViewModel._selection;
  const prevSelection = prevViewModel._selection;
  const hasDirtyNodes = nextViewModel.hasDirtyNodes();
  if (!hasDirtyNodes) {
    if (prevSelection === null && selection !== null) {
      return MERGE;
    }
    return DISCARD;
  }
  const dirtyNodes = nextViewModel.getDirtyNodes();
  if (dirtyNodes.length === 1) {
    const prevNodeMap = prevViewModel._nodeMap;
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
        if (selection == null || prevSelection === null) {
          return MERGE;
        }
        const anchor = selection.anchor;
        const anchorKey = anchor.key;
        const prevAnchorKey = prevSelection.anchor.key;
        if (anchorKey !== prevAnchorKey || anchor.type !== 'text') {
          return NO_MERGE;
        }
        const anchorOffset = anchor.offset;
        const prevAnchorOffset = prevSelection.anchor.offset;
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

export default function useOutlineHistory(editor: OutlineEditor): () => void {
  const historyState: {
    current: null | ViewModel,
    redoStack: Array<ViewModel>,
    undoStack: Array<ViewModel>,
  } = useMemo(
    () => ({
      current: null,
      redoStack: [],
      undoStack: [],
    }),
    [],
  );

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (rootElement === null) {
      return;
    }

    const applyChange = (viewModel) => {
      const current = historyState.current;
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;

      if (viewModel === current) {
        return;
      }
      if (!viewModel.isDirty()) {
        const mergeAction = getMergeAction(current, viewModel);
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
      }
      historyState.current = viewModel;
    };

    const undo = () => {
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      const undoStackLength = undoStack.length;
      if (undoStackLength !== 0) {
        let current = historyState.current;

        if (current !== null) {
          if (undoStackLength !== 1 && !current.hasDirtyNodes()) {
            current = undoStack.pop();
          }
          redoStack.push(current);
        }
        const viewModel = undoStack.pop();
        historyState.current = viewModel;
        viewModel.markDirty();
        editor.setViewModel(viewModel);
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
        const viewModel = redoStack.pop();
        historyState.current = viewModel;
        viewModel.markDirty();
        editor.setViewModel(viewModel);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (editor.isComposing()) {
        return;
      }
      if (isUndo(event)) {
        event.preventDefault();
        undo();
      } else if (isRedo(event)) {
        event.preventDefault();
        redo();
      }
    };

    const handleBeforeInput = (event: InputEvent) => {
      const inputType = event.inputType;
      if (inputType === 'historyUndo') {
        event.preventDefault();
        undo();
      } else if (inputType === 'historyRedo') {
        event.preventDefault();
        redo();
      }
    };

    const removeUpdateListener = editor.addListener('update', applyChange);
    rootElement.addEventListener('keydown', handleKeyDown);
    rootElement.addEventListener('beforeinput', handleBeforeInput);
    return () => {
      removeUpdateListener();
      rootElement.removeEventListener('keydown', handleKeyDown);
      rootElement.removeEventListener('beforeinput', handleBeforeInput);
    };
  }, [historyState, editor]);

  const clearHistory = useCallback(() => {
    historyState.undoStack = [];
    historyState.redoStack = [];
    historyState.current = null;
  }, [historyState]);

  return clearHistory;
}
