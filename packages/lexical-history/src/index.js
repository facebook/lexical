/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerEditorPriority,
  EditorState,
  GridSelection,
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import withSubscriptions from '@lexical/react/withSubscriptions';
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
} from 'lexical';

type MergeAction = 0 | 1 | 2;
const HISTORY_MERGE = 0;
const HISTORY_PUSH = 1;
const DISCARD_HISTORY_CANDIDATE = 2;

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
  undoSelection?: RangeSelection | NodeSelection | GridSelection | null,
};

export type HistoryState = {
  current: null | HistoryStateEntry,
  redoStack: Array<HistoryStateEntry>,
  undoStack: Array<HistoryStateEntry>,
};

function getDirtyNodes(
  editorState: EditorState,
  dirtyLeaves: Set<NodeKey>,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): Array<LexicalNode> {
  const nodeMap = editorState._nodeMap;
  const nodes = [];

  for (const dirtyLeafKey of dirtyLeaves) {
    const dirtyLeaf = nodeMap.get(dirtyLeafKey);
    if (dirtyLeaf !== undefined) {
      nodes.push(dirtyLeaf);
    }
  }

  for (const [dirtyElementKey, intentionallyMarkedAsDirty] of dirtyElements) {
    if (!intentionallyMarkedAsDirty) {
      continue;
    }
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
    !$isRangeSelection(nextSelection) ||
    !$isRangeSelection(prevSelection) ||
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

  // Catching the case when inserting new text node into an element (e.g. first char in paragraph/list),
  // or after existing node.
  if (dirtyNodes.length > 1) {
    const nextNodeMap = nextEditorState._nodeMap;
    const nextAnchorNode = nextNodeMap.get(nextSelection.anchor.key);
    const prevAnchorNode = nextNodeMap.get(prevSelection.anchor.key);

    if (
      nextAnchorNode &&
      prevAnchorNode &&
      !prevEditorState._nodeMap.has(nextAnchorNode.__key) &&
      $isTextNode(nextAnchorNode) &&
      nextAnchorNode.__text.length === 1 &&
      nextSelection.anchor.offset === 1
    ) {
      return INSERT_CHARACTER_AFTER_SELECTION;
    }

    return OTHER;
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
      return DISCARD_HISTORY_CANDIDATE;
    }

    const changeType = getChangeType(
      prevEditorState,
      nextEditorState,
      dirtyLeaves,
      dirtyElements,
      editor.isComposing(),
    );

    const mergeAction = (() => {
      const shouldPushHistory = tags.has('history-push');
      const shouldMergeHistory =
        !shouldPushHistory && tags.has('history-merge');

      if (shouldMergeHistory) {
        return HISTORY_MERGE;
      }
      if (prevEditorState === null) {
        return HISTORY_PUSH;
      }
      const selection = nextEditorState._selection;
      const prevSelection = prevEditorState._selection;
      const hasDirtyNodes = dirtyLeaves.size > 0 || dirtyElements.size > 0;
      if (!hasDirtyNodes) {
        if (prevSelection === null && selection !== null) {
          return HISTORY_MERGE;
        }
        return DISCARD_HISTORY_CANDIDATE;
      }

      const isSameEditor =
        currentHistoryEntry === null || currentHistoryEntry.editor === editor;

      if (
        shouldPushHistory === false &&
        changeType !== OTHER &&
        changeType === prevChangeType &&
        changeTime < prevChangeTime + delay &&
        isSameEditor
      ) {
        return HISTORY_MERGE;
      }

      return HISTORY_PUSH;
    })();

    prevChangeTime = changeTime;
    prevChangeType = changeType;

    return mergeAction;
  };
}

function redo(editor: LexicalEditor, historyState: HistoryState): void {
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
}

function undo(editor: LexicalEditor, historyState: HistoryState): void {
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
}

function clearHistory(historyState: HistoryState) {
  historyState.undoStack = [];
  historyState.redoStack = [];
  historyState.current = null;
}

export function registerHistory(
  editor: LexicalEditor,
  historyState: HistoryState,
  delay: number,
): () => void {
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

    if (mergeAction === HISTORY_PUSH) {
      if (redoStack.length !== 0) {
        historyState.redoStack = [];
      }
      if (current !== null) {
        undoStack.push({
          ...current,
          undoSelection: prevEditorState.read($getSelection),
        });
        editor.execCommand('canUndo', true);
      }
    } else if (mergeAction === DISCARD_HISTORY_CANDIDATE) {
      return;
    }

    // Else we merge
    historyState.current = {
      editor,
      editorState,
    };
  };

  const unregisterCommandListener = withSubscriptions(
    editor.registerCommandListener(
      'undo',
      () => {
        undo(editor, historyState);
        return true;
      },
      EditorPriority,
    ),
    editor.registerCommandListener(
      'redo',
      () => {
        redo(editor, historyState);
        return true;
      },
      EditorPriority,
    ),
    editor.registerCommandListener(
      'clearEditor',
      () => {
        clearHistory(historyState);
        return false;
      },
      EditorPriority,
    ),
    editor.registerCommandListener(
      'clearHistory',
      () => {
        clearHistory(historyState);
        return true;
      },
      EditorPriority,
    ),
    editor.registerUpdateListener(applyChange),
  );

  const unregisterUpdateListener = editor.registerUpdateListener(applyChange);

  return () => {
    unregisterCommandListener();
    unregisterUpdateListener();
  };
}

export function createEmptyHistoryState(): HistoryState {
  return {
    current: null,
    redoStack: [],
    undoStack: [],
  };
}
