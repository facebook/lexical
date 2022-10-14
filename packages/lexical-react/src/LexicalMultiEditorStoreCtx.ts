/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

type LexicalMultiEditorStoreHelpers = {
  isNestedEditor: (
    editorKey: string | undefined,
    nestedEditorKey: string,
  ) => boolean;
};
type LexicalMultiEditorStoreGetters = {
  getEditor: (editorKey: string | undefined) => LexicalEditor | undefined;
  getEditorHistory: (editorKey: string | undefined) => HistoryState | undefined;
  getEditorAndHistory: (editorKey: string | undefined) =>
    | {
        editor: LexicalEditor;
        history: HistoryState | undefined;
      }
    | undefined;
  getEditorKeychain: () => string[];
  getNestedEditorList: (editorKey: string | undefined) => string[] | undefined;
};
type LexicalMultiEditorStoreMutations = {
  addEditor: (editorKey: string | undefined, editor: LexicalEditor) => void;
  addHistory: (
    editorKey: string | undefined,
    hsitoryState: HistoryState | undefined,
  ) => void;
  addNestedEditorToList: (
    editorKey: string | undefined,
    nestedEditorKey: string,
  ) => void;
  deleteEditor: (editorKey: string | undefined) => void;
  resetEditorStore: () => void;
};

export type MultiEditorStore = Record<
  string,
  {
    editor: LexicalEditor;
    history: HistoryState | undefined;
    nestedEditorList: string[];
  }
>;

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
