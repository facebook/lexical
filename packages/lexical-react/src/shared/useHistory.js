/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  EditorState,
  LexicalNode,
  Selection,
  NodeKey,
  IntentionallyMarkedAsDirtyElement,
  CommandListenerEditorPriority,
} from 'lexical';

import {$isTextNode, $isElementNode, $isRootNode, $getSelection} from 'lexical';
import {useCallback, useEffect, useMemo} from 'react';
import withSubscriptions from '@lexical/react/withSubscriptions';

type MergeAction = 0 | 1 | 2;
const MERGE = 0;
const NO_MERGE = 1;
const DISCARD = 2;

type ChangeType = 0 | 1 | 2 | 3 | 4;
const OTHER = 0;
const COMPOSING_CHARACTER = 1;
const INSERT_CHARACTER_AFTER_SELECTION = 2;
const DELETE_CHARACTER_BEFORE_SELECTION = 3;
const DELETE_CHARACTER_AFTER_SELECTION = 4;

const EditorPriority: CommandListenerEditorPriority = 0;

export type HistoryStateEntry = {
  editor: LexicalEditor,
  editorState: EditorState,
  undoSelection?: Selection | null,
};

export type HistoryState = {
  current: null | HistoryStateEntry,
  redoStack: Array<HistoryStateEntry>,
  undoStack: Array<HistoryStateEntry>,
};

function getDirtyNodes(
  editorState: EditorState,
  dirtyLeavesSet: Set<NodeKey>,
  dirtyElementsSet: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): Array<LexicalNode> {
  const dirtyLeaves = Array.from(dirtyLeavesSet);
  const dirtyElements = Array.from(dirtyElementsSet);
  const nodeMap = editorState._nodeMap;
  const nodes = [];

  for (let i = 0; i < dirtyLeaves.length; i++) {
    const dirtyLeafKey = dirtyLeaves[i];
    const dirtyLeaf = nodeMap.get(dirtyLeafKey);
    if (dirtyLeaf !== undefined) {
      nodes.push(dirtyLeaf);
    }
  }

  for (let i = 0; i < dirtyElements.length; i++) {
    const intentionallyMarkedAsDirty = dirtyElements[i][1];
    if (!intentionallyMarkedAsDirty) {
      continue;
    }
    const dirtyElementKey = dirtyElements[i][0];
    const dirtyElement = nodeMap.get(dirtyElementKey);
    if (dirtyElement !== undefined && !$isRootNode(dirtyElement)) {
      nodes.push(dirtyElement);
    }
  }
  return nodes;
}

function getChangeType(
  prevEditorState: null | EditorState,
  nextEditorState: EditorState,
  dirtyLeavesSet: Set<NodeKey>,
  dirtyElementsSet: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  isComposing: boolean,
): ChangeType {
  if (
    prevEditorState === null ||
    (dirtyLeavesSet.size === 0 && dirtyElementsSet.size === 0)
  ) {
    return OTHER;
  }

  const nextSelection = nextEditorState._selection;
  const prevSelection = prevEditorState._selection;
  if (isComposing) {
    return COMPOSING_CHARACTER;
  }
  if (
    nextSelection === null ||
    prevSelection === null ||
    !prevSelection.isCollapsed() ||
    !nextSelection.isCollapsed()
  ) {
    return OTHER;
  }
  const dirtyNodes = getDirtyNodes(
    nextEditorState,
    dirtyLeavesSet,
    dirtyElementsSet,
  );

  if (dirtyNodes.length === 0) {
    return OTHER;
  }

  // Catching the case when inserting new text node into an element (e.g. first char in paragraph/list/etc),
  // relying on selection change: anchor was within element, and after the change it'll be within newly
  // created text node with 1 char offset.
  if (dirtyNodes.length > 1) {
    const nextNodeMap = nextEditorState._nodeMap;
    const elementNode = nextNodeMap.get(prevSelection.anchor.key);
    const textNode = nextNodeMap.get(nextSelection.anchor.key);
    if (
      !$isTextNode(textNode) ||
      !$isElementNode(elementNode) ||
      prevEditorState._nodeMap.has(textNode.__key) ||
      textNode.__text.length !== 1 ||
      nextSelection.anchor.offset !== 1
    ) {
      return OTHER;
    }

    const hasOnlyOneTextNode = dirtyNodes.every(
      (node, index) => node === textNode || !$isTextNode(node),
    );
    return hasOnlyOneTextNode ? INSERT_CHARACTER_AFTER_SELECTION : OTHER;
  }

  const nextDirtyNode = dirtyNodes[0];
  const prevDirtyNode = prevEditorState._nodeMap.get(nextDirtyNode.__key);
  if (
    !$isTextNode(prevDirtyNode) ||
    !$isTextNode(nextDirtyNode) ||
    prevDirtyNode.__mode !== nextDirtyNode.__mode
  ) {
    return OTHER;
  }

  const prevText = prevDirtyNode.__text;
  const nextText = nextDirtyNode.__text;
  if (prevText === nextText) {
    return OTHER;
  }

  const nextAnchor = nextSelection.anchor;
  const prevAnchor = prevSelection.anchor;
  if (nextAnchor.key !== prevAnchor.key || nextAnchor.type !== 'text') {
    return OTHER;
  }

  const nextAnchorOffset = nextAnchor.offset;
  const prevAnchorOffset = prevAnchor.offset;
  const textDiff = nextText.length - prevText.length;
  if (textDiff === 1 && prevAnchorOffset === nextAnchorOffset - 1) {
    return INSERT_CHARACTER_AFTER_SELECTION;
  }
  if (textDiff === -1 && prevAnchorOffset === nextAnchorOffset + 1) {
    return DELETE_CHARACTER_BEFORE_SELECTION;
  }
  if (textDiff === -1 && prevAnchorOffset === nextAnchorOffset) {
    return DELETE_CHARACTER_AFTER_SELECTION;
  }

  return OTHER;
}

function createMergeActionGetter(
  editor: LexicalEditor,
  delay: number,
): (
  prevEditorState: null | EditorState,
  nextEditorState: EditorState,
  currentHistoryEntry: null | HistoryStateEntry,
  dirtyLeaves: Set<NodeKey>,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  tags: Set<string>,
) => MergeAction {
  let prevChangeTime = Date.now();
  let prevChangeType = OTHER;

  return (
    prevEditorState,
    nextEditorState,
    currentHistoryEntry,
    dirtyLeaves,
    dirtyElements,
    tags,
  ) => {
    const changeTime = Date.now();

    // If applying changes from history stack there's no need
    // to run history logic again, as history entries already calculated
    if (tags.has('historic')) {
      prevChangeType = OTHER;
      prevChangeTime = changeTime;
      return DISCARD;
    }

    const changeType = getChangeType(
      prevEditorState,
      nextEditorState,
      dirtyLeaves,
      dirtyElements,
      editor.isComposing(),
    );

    const mergeAction = (() => {
      if (tags.has('without-history')) {
        return MERGE;
      }
      if (prevEditorState === null) {
        return NO_MERGE;
      }
      const selection = nextEditorState._selection;
      const prevSelection = prevEditorState._selection;
      const hasDirtyNodes = dirtyLeaves.size > 0 || dirtyElements.size > 0;
      const isSameEditor =
        currentHistoryEntry === null || currentHistoryEntry.editor === editor;
      if (!hasDirtyNodes) {
        if (isSameEditor) {
          return prevSelection === null && selection !== null ? MERGE : DISCARD;
        } else {
          // Discard null-selection when switching between editors
          return prevSelection !== null && selection === null
            ? DISCARD
            : NO_MERGE;
        }
      }
      if (
        changeType !== OTHER &&
        changeType === prevChangeType &&
        changeTime < prevChangeTime + delay &&
        isSameEditor
      ) {
        return MERGE;
      }

      return NO_MERGE;
    })();

    prevChangeTime = changeTime;
    prevChangeType = changeType;

    return mergeAction;
  };
}

export function useHistory(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  delay?: number = 1000,
): void {
  const historyState: HistoryState = useMemo(
    () => externalHistoryState || createEmptyHistoryState(),
    [externalHistoryState],
  );

  const clearHistory = useCallback(() => {
    historyState.undoStack = [];
    historyState.redoStack = [];
    historyState.current = null;
  }, [historyState]);

  useEffect(() => {
    const getMergeAction = createMergeActionGetter(editor, delay);
    const applyChange = ({
      editorState,
      prevEditorState,
      dirtyLeaves,
      dirtyElements,
      tags,
    }) => {
      const current = historyState.current;
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      const currentEditorState = current === null ? null : current.editorState;

      if (current !== null && editorState === currentEditorState) {
        return;
      }

      const mergeAction = getMergeAction(
        prevEditorState,
        editorState,
        current,
        dirtyLeaves,
        dirtyElements,
        tags,
      );

      if (mergeAction === NO_MERGE) {
        if (redoStack.length !== 0) {
          historyState.redoStack = [];
        }
        if (current !== null) {
          undoStack.push({
            ...current,
            undoSelection:
              current.editor === editor
                ? prevEditorState.read($getSelection)
                : null,
          });
          editor.execCommand('canUndo', true);
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
        const historyStateEntry = undoStack.pop();
        if (current !== null) {
          redoStack.push(current);
          editor.execCommand('canRedo', true);
        }
        if (undoStack.length === 0) {
          editor.execCommand('canUndo', false);
        }
        historyState.current = historyStateEntry;
        historyStateEntry.editor.setEditorState(
          historyStateEntry.editorState.clone(historyStateEntry.undoSelection),
          {
            tag: 'historic',
          },
        );
      }
    };

    const redo = () => {
      const redoStack = historyState.redoStack;
      const undoStack = historyState.undoStack;
      if (redoStack.length !== 0) {
        const current = historyState.current;
        if (current !== null) {
          undoStack.push(current);
          editor.execCommand('canUndo', true);
        }
        const historyStateEntry = redoStack.pop();
        if (redoStack.length === 0) {
          editor.execCommand('canRedo', false);
        }
        historyState.current = historyStateEntry;
        historyStateEntry.editor.setEditorState(historyStateEntry.editorState, {
          tag: 'historic',
        });
      }
    };

    const applyCommand = (type) => {
      switch (type) {
        case 'undo':
          undo();
          return true;
        case 'redo':
          redo();
          return true;
        case 'clearEditor':
          clearHistory();
          return false;
        case 'clearHistory':
          clearHistory();
          return true;
        default:
          return false;
      }
    };

    return withSubscriptions(
      editor.addListener('command', applyCommand, EditorPriority),
      editor.addListener('update', applyChange),
    );
  }, [clearHistory, delay, editor, historyState]);
}

export function createEmptyHistoryState(): HistoryState {
  return {
    current: null,
    redoStack: [],
    undoStack: [],
  };
}
