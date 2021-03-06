/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, ViewModel, View} from 'outline';

import {TextNode} from 'outline';
import {isRedo, isUndo} from './OutlineKeyHelpers';
import {useEffect, useMemo} from 'react';

const viewModelsWithoutHistory = new Set();

function shouldMerge(
  viewModel: ViewModel,
  current: null | ViewModel,
  undoStack: Array<ViewModel>,
): boolean {
  // If we have a view model that doesn't want its history
  // recorded then we always merge the changes.
  if (viewModelsWithoutHistory.has(viewModel)) {
    viewModelsWithoutHistory.delete(viewModel);
    return true;
  }
  if (current === null || undoStack.length === 0) {
    return false;
  }
  const hadDirtyNodes = current.hasDirtyNodes();
  const hasDirtyNodes = viewModel.hasDirtyNodes();
  // If we are changing selection between view models, then merge.
  if (!hadDirtyNodes && !hasDirtyNodes) {
    return true;
  } else if (hasDirtyNodes) {
    const dirtyNodes = viewModel.getDirtyNodes();
    if (dirtyNodes.length === 1) {
      const prevNodeMap = current._nodeMap;
      const nextDirtyNode = dirtyNodes[0];
      const prevDirtyNodeKey = nextDirtyNode.__key;
      const prevDirtyNode = prevNodeMap[prevDirtyNodeKey];
      if (
        prevDirtyNode !== undefined &&
        prevDirtyNode instanceof TextNode &&
        nextDirtyNode instanceof TextNode &&
        prevDirtyNode.__flags === nextDirtyNode.__flags
      ) {
        const prevText = prevDirtyNode.__text;
        const nextText = nextDirtyNode.__text;
        if (prevText === '') {
          return false;
        }
        const diff = nextText.length - prevText.length;
        // Only merge if we're adding/removing a single character
        // or if there is not change at all.
        return diff === -1 || diff === 1 || diff === 0;
      }
    }
  }
  return false;
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

type OutlineHistoryStacks = [
  $ReadOnly<Array<ViewModel>>,
  $ReadOnly<Array<ViewModel>>,
];
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

    const applyChange = viewModel => {
      const current = historyState.current;

      if (viewModel === current) {
        return;
      }
      if (!viewModel.isDirty() && !shouldMerge(viewModel, current, undoStack)) {
        if (redoStack.length !== 0) {
          redoStack = historyState.redoStack = [];
        }
        if (current !== null) {
          undoStack.push(current);
        }
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
