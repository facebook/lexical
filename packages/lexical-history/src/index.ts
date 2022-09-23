/** @module @lexical/history */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorState,
  GridSelection,
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  REDO_COMMAND,
  UNDO_COMMAND,
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

export type HistoryStateEntry = {
  editor: LexicalEditor;
  editorState: EditorState;
  undoSelection?: RangeSelection | NodeSelection | GridSelection | null;
};
export type HistoryState = {
  current: null | HistoryStateEntry;
  redoStack: Array<HistoryStateEntry>;
  undoStack: Array<HistoryStateEntry>;
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
    (dirtyLeavesSet.size === 0 && dirtyElementsSet.size === 0 && !isComposing)
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

function isTextNodeUnchanged(
  key: NodeKey,
  prevEditorState: EditorState,
  nextEditorState: EditorState,
): boolean {
  const prevNode = prevEditorState._nodeMap.get(key);
  const nextNode = nextEditorState._nodeMap.get(key);
  if ($isTextNode(prevNode) && $isTextNode(nextNode)) {
    return (
      prevNode.__type === nextNode.__type &&
      prevNode.__text === nextNode.__text &&
      prevNode.__mode === nextNode.__mode &&
      prevNode.__detail === nextNode.__detail &&
      prevNode.__style === nextNode.__style &&
      prevNode.__format === nextNode.__format &&
      prevNode.__parent === nextNode.__parent
    );
  }
  return false;
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
      const isSameEditor =
        currentHistoryEntry === null || currentHistoryEntry.editor === editor;
      const shouldPushHistory = tags.has('history-push');
      const shouldMergeHistory =
        !shouldPushHistory && isSameEditor && tags.has('history-merge');

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

      if (
        shouldPushHistory === false &&
        changeType !== OTHER &&
        changeType === prevChangeType &&
        changeTime < prevChangeTime + delay &&
        isSameEditor
      ) {
        return HISTORY_MERGE;
      }

      // A single node might have been marked as dirty, but not have changed
      // due to some node transform reverting the change.
      if (dirtyLeaves.size === 1) {
        const dirtyLeafKey = Array.from(dirtyLeaves)[0];
        if (
          isTextNodeUnchanged(dirtyLeafKey, prevEditorState, nextEditorState)
        ) {
          return HISTORY_MERGE;
        }
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
      editor.dispatchCommand(CAN_UNDO_COMMAND, true);
    }

    const historyStateEntry = redoStack.pop();

    if (redoStack.length === 0) {
      editor.dispatchCommand(CAN_REDO_COMMAND, false);
    }

    historyState.current = historyStateEntry || null;

    if (historyStateEntry) {
      historyStateEntry.editor.setEditorState(historyStateEntry.editorState, {
        tag: 'historic',
      });
    }
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
      editor.dispatchCommand(CAN_REDO_COMMAND, true);
    }

    if (undoStack.length === 0) {
      editor.dispatchCommand(CAN_UNDO_COMMAND, false);
    }

    historyState.current = historyStateEntry || null;

    if (historyStateEntry) {
      historyStateEntry.editor.setEditorState(
        historyStateEntry.editorState.clone(historyStateEntry.undoSelection),
        {
          tag: 'historic',
        },
      );
    }
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
  }: {
    editorState: EditorState;
    prevEditorState: EditorState;
    dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
    dirtyLeaves: Set<NodeKey>;
    tags: Set<string>;
  }): void => {
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
        editor.dispatchCommand(CAN_UNDO_COMMAND, true);
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

  const unregisterCommandListener = mergeRegister(
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        undo(editor, historyState);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REDO_COMMAND,
      () => {
        redo(editor, historyState);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      CLEAR_EDITOR_COMMAND,
      () => {
        clearHistory(historyState);
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      CLEAR_HISTORY_COMMAND,
      () => {
        clearHistory(historyState);
        editor.dispatchCommand(CAN_REDO_COMMAND, false);
        editor.dispatchCommand(CAN_UNDO_COMMAND, false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
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
