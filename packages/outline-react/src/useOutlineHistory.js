/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, ViewModel, View} from 'outline';

import {isTextNode} from 'outline';
import {isRedo, isUndo} from './OutlineKeyHelpers';
import {useEffect, useMemo} from 'react';

const viewModelsWithoutHistory = new Set();

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
  const hasDirtyNodes = nextViewModel.hasDirtyNodes();
  if (!hasDirtyNodes) {
    return DISCARD;
  }
  const dirtyNodes = nextViewModel.getDirtyNodes();
  if (dirtyNodes.length === 1) {
    const prevNodeMap = prevViewModel._nodeMap;
    const nextDirtyNode = dirtyNodes[0];
    const prevDirtyNodeKey = nextDirtyNode.__key;
    const prevDirtyNode = prevNodeMap[prevDirtyNodeKey];
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
      if (textDiff === 0) {
        return MERGE;
      }
      // Only merge if we're adding/removing a single character
      // or if there is not change at all.
      if (textDiff === -1 || textDiff === 1) {
        const selection = nextViewModel._selection;
        const prevSelection = prevViewModel._selection;
        if (selection == null || prevSelection === null) {
          return MERGE;
        }
        const anchorKey = selection.anchorKey;
        const prevAnchorKey = prevSelection.anchorKey;
        if (anchorKey !== prevAnchorKey) {
          return NO_MERGE;
        }
        const anchorOffset = selection.anchorOffset;
        const prevAnchorOffset = prevSelection.anchorOffset;
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

export function updateWithoutHistory(
  editor: OutlineEditor,
  updateFn: (view: View) => void,
): boolean {
  const res = editor.update(updateFn);
  const pendingViewModel = editor._pendingViewModel;
  if (pendingViewModel !== null) {
    viewModelsWithoutHistory.add(pendingViewModel);
  }
  return res;
}

type OutlineHistoryStacks = [Array<ViewModel>, Array<ViewModel>];
type OutlineHistorySetter = (
  undoStack: Array<ViewModel>,
  redoStack: Array<ViewModel>,
) => void;

export function useOutlineHistory(
  editor: OutlineEditor,
): [OutlineHistoryStacks, OutlineHistorySetter] {
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
    const undoStack = historyState.undoStack;
    const editorElement = editor.getEditorElement();
    if (editorElement === null) {
      return;
    }
    let redoStack = historyState.redoStack;

    const applyChange = (viewModel) => {
      const current = historyState.current;

      if (viewModel === current) {
        return;
      }
      if (!viewModel.isDirty()) {
        const mergeAction = getMergeAction(current, viewModel);
        if (mergeAction === NO_MERGE) {
          if (redoStack.length !== 0) {
            redoStack = historyState.redoStack = [];
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (editor.isComposing()) {
        return;
      }
      if (isUndo(event)) {
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
      } else if (isRedo(event)) {
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
      }
    };

    const removeUpdateListener = editor.addUpdateListener(applyChange);
    editorElement.addEventListener('keydown', handleKeyDown);
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
      removeUpdateListener();
    };
  }, [historyState, editor]);

  const setHistoryState: OutlineHistorySetter = (undoStack, redoStack) => {
    historyState.undoStack.splice(
      0,
      historyState.undoStack.length,
      ...undoStack,
    );
    historyState.redoStack.splice(
      0,
      historyState.redoStack.length,
      ...redoStack,
    );
  };

  return [
    [historyState.undoStack.slice(), historyState.redoStack.slice()],
    setHistoryState,
  ];
}
