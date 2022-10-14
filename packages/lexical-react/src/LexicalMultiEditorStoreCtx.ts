/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

export type MultiEditorStore = Record<
  string,
  {
    editor: LexicalEditor;
    history: HistoryStateParam;
    nestedEditorList: string[];
  }
>;

export type EditorKeyParam = string | undefined;
export type HistoryStateParam = HistoryState | undefined;

type LexicalMultiEditorStoreHelpers = {
  isNestedEditor: (
    editorKey: EditorKeyParam,
    nestedEditorKey: string,
  ) => boolean;
};
type LexicalMultiEditorStoreGetters = {
  getEditor: (editorKey: EditorKeyParam) => LexicalEditor | undefined;
  getEditorHistory: (editorKey: EditorKeyParam) => HistoryState | undefined;
  getEditorAndHistory: (editorKey: EditorKeyParam) =>
    | {
        editor: LexicalEditor;
        history: HistoryStateParam;
      }
    | undefined;
  getEditorKeychain: () => string[];
  getNestedEditorList: (editorKey: EditorKeyParam) => string[] | undefined;
};
type LexicalMultiEditorStoreMutations = {
  addEditor: (editorKey: EditorKeyParam, editor: LexicalEditor) => void;
  addHistory: (
    editorKey: EditorKeyParam,
    hsitoryState: HistoryStateParam,
  ) => void;
  addNestedEditorToList: (
    editorKey: EditorKeyParam,
    nestedEditorKey: string,
  ) => void;
  deleteEditor: (editorKey: EditorKeyParam) => void;
  resetEditorStore: () => void;
};

export type EmptyLexicalMultiEditorStore = Record<string, never>;
export type FullLexicalMultiEditorStore = LexicalMultiEditorStoreGetters &
  LexicalMultiEditorStoreHelpers &
  LexicalMultiEditorStoreMutations;

export type UseLexicalMultiEditorStore =
  | FullLexicalMultiEditorStore
  | EmptyLexicalMultiEditorStore;

export const LexicalMultiEditorStoreCtx: React.Context<UseLexicalMultiEditorStore | null> =
  React.createContext<UseLexicalMultiEditorStore | null>(null);

export function useLexicalMultiEditorStore(): UseLexicalMultiEditorStore {
  const context = React.useContext(LexicalMultiEditorStoreCtx);
  if (context === null) return {};

  return context;
}
