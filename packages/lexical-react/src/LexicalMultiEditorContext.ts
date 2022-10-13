/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';
import * as React from 'react';
import invariant from 'shared/invariant';

type LexicalMultiEditorContextGetters = {
  getEditor: (editorKey: string) => LexicalEditor | undefined;
  getEditorHistory: (editorKey: string) => HistoryState | undefined;
  getEditorAndHistory: (editorKey: string) =>
    | {
        editor: LexicalEditor;
        history: HistoryState | undefined;
      }
    | undefined;
  getEditorKeychain: () => string[];
  getNestedEditorList: (editorKey: string) => string[] | undefined;
  isNestedEditor: (editorKey: string, nestedEditorKey: string) => boolean;
};
type LexicalMultiEditorContextMutations = {
  addEditor: (editorKey: string, editor: LexicalEditor) => void;
  addHistory: (editorKey: string, hsitoryState: HistoryState) => void;
  addNestedEditorToList: (editorKey: string, nestedEditorKey: string) => void;
  deleteEditor: (editorKey: string) => void;
  resetEditorStore: () => void;
};

export type LexicalMultiEditorContextEditorStore = Record<
  string,
  {
    childRoster: string[];
    editor: LexicalEditor;
    history: HistoryState | undefined;
  }
>;

export type LexicalMultiEditorContext = LexicalMultiEditorContextGetters &
  LexicalMultiEditorContextMutations;

export type UseLexicalMultiEditorContext = LexicalMultiEditorContext;
export type UseLexicalMultiEditorContextConfigInternal =
  | {
      addNestedEditorToList: (nestedEditorKey: string) => void;
      getNestedEditorList: () => void;
      getEditor: () => LexicalEditor | undefined;
      getHistory: () => HistoryState | undefined;
      isNestedEditor: (nestedEditorKey: string) => boolean;
      startHistory: (externalHistoryState?: HistoryState) => void;
      state: 'tracking';
    }
  | {addEditor: (editor: LexicalEditor | undefined) => void; state: 'listening'}
  | {state: 'inactive'};

export const LexicalMultiEditorContext: React.Context<LexicalMultiEditorContext | null> =
  React.createContext<LexicalMultiEditorContext | null>(null);

// TODO, nested editor context...
export function useLexicalMultiEditorContext():
  | UseLexicalMultiEditorContext
  | Record<string, never> {
  const context = React.useContext(LexicalMultiEditorContext);
  if (context === null) return {};

  return context;
}

export function useInternalLexicalMultiEditorContextConfig(
  multiEditorKey: string | undefined | null,
): UseLexicalMultiEditorContextConfigInternal {
  const context = useLexicalMultiEditorContext();

  const isActive = context !== null;
  const hasMultiEditorKey = ((keyTest): keyTest is string => {
    return typeof keyTest === 'string' && keyTest.length > 0;
  })(multiEditorKey);

  const isListening = isActive && hasMultiEditorKey;
  const isMissingActiveMultiEditorProvider = !isActive && hasMultiEditorKey;
  const isMissingMultiEditorContextConfigProps = isActive && !hasMultiEditorKey;

  if (isMissingActiveMultiEditorProvider) {
    invariant(false, 'cannot find a LexicalMultiEditorProvider');
  }

  if (isMissingMultiEditorContextConfigProps) {
    invariant(
      false,
      "cannot find a multiEditorKey. check your LexicalComposer's initConfig",
    );
  }

  if (!isListening) {
    return {
      state: 'inactive',
    };
  } else {
    if (typeof context.getEditor(multiEditorKey) === 'undefined') {
      return {
        addEditor: (editor) => {
          if (typeof editor === 'undefined') return;
          context.addEditor(multiEditorKey, editor);
        },
        state: 'listening',
      };
    } else {
      return {
        addNestedEditorToList: (nestedEditorKey) => {
          if (context.isNestedEditor(multiEditorKey, nestedEditorKey)) return;
          context.addNestedEditorToList(multiEditorKey, nestedEditorKey);
        },
        getEditor: () => {
          return context.getEditor(multiEditorKey);
        },
        getHistory: () => {
          return context.getEditorHistory(multiEditorKey);
        },
        getNestedEditorList: () => {
          return context.getNestedEditorList(multiEditorKey);
        },
        isNestedEditor: (nestedEditorKey) => {
          return context.isNestedEditor(multiEditorKey, nestedEditorKey);
        },
        startHistory: (externalHistoryState) => {
          // added separately because the history plugin manages it on its own
          if (typeof context.getEditorHistory(multiEditorKey) !== 'undefined')
            return;
          context.addHistory(
            multiEditorKey,
            externalHistoryState ?? createEmptyHistoryState(),
          );
        },
        state: 'tracking',
      };
    }
  }
}
