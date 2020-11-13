// @flow

import type {OutlineEditor, ViewModel} from 'outline';
import {isRedo, isUndo} from 'plugin-shared/src/hotKeys';

import {useEffect, useMemo} from 'react';

export function useHistoryPlugin(editor: null | OutlineEditor): void {
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
    if (editor !== null) {
      const undoStack = historyState.undoStack;
      const editorElement = editor.getEditorElement();
      let redoStack = historyState.redoStack;

      const applyChange = (viewModel) => {
        // TODO: merge with previous undo if the same node has changed
        const current = historyState.current;

        if (viewModel === current) {
          return;
        }
        if (!viewModel.isHistoric && viewModel.hasDirtyNodes()) {
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
          if (undoStack.length !== 0) {
            const current = historyState.current;

            if (current !== null) {
              redoStack.push(current);
            }
            const viewModel = undoStack.pop();
            historyState.current = viewModel;
            viewModel.isHistoric = true;
            editor.update(viewModel);
          }
        } else if (isRedo(event)) {
          if (redoStack.length !== 0) {
            const current = historyState.current;

            if (current !== null) {
              undoStack.push(current);
            }
            const viewModel = redoStack.pop();
            historyState.current = viewModel;
            viewModel.isHistoric = true;
            editor.update(viewModel);
          }
        }
      };

      const removeUpdateListener = editor.addUpdateListener(applyChange);
      editorElement.addEventListener('keydown', handleKeyDown);
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
        removeUpdateListener();
      };
    }
  }, [historyState, editor]);
}
