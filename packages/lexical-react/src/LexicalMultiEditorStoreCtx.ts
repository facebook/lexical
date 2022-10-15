/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

export type EditorStoreRecord = {
  editor: LexicalEditor;
  historyState: HistoryState | undefined;
  historyKeys: string[];
  nestedEditorList: string[];
};
export type MultiEditorStore = Record<string, EditorStoreRecord>;

export type EditorKeyParam = string | undefined;
export type HistoryStateParam = HistoryState | undefined;

type LexicalMultiEditorStoreHelpers = {
  hasHistoryKey: (
    multiEditorKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => boolean;
  isNestedEditor: (
    multiEditorKey: EditorKeyParam,
    nestedEditorKey: string,
  ) => boolean;
  isValidMultiEditorKey: (multiEditorKey: EditorKeyParam) => boolean;
};
type LexicalMultiEditorStoreGetters = {
  getEditor: (multiEditorKey: EditorKeyParam) => LexicalEditor | undefined;
  getEditorHistory: (
    multiEditorKey: EditorKeyParam,
  ) => HistoryState | undefined;
  getEditorStoreRecord: (
    multiEditorKey: EditorKeyParam,
  ) => EditorStoreRecord | undefined;
  getEditorKeychain: () => string[];
  getNestedEditorList: (multiEditorKey: EditorKeyParam) => string[] | undefined;
};
type LexicalMultiEditorStoreMutations = {
  addEditor: (multiEditorKey: EditorKeyParam, editor: LexicalEditor) => void;
  addHistory: (
    multiEditorKey: EditorKeyParam,
    lexicalEditorKey: string,
    historyState: HistoryStateParam,
  ) => HistoryState | undefined;
  addHistoryKey: (
    multiEditorKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => void;
  addNestedEditorToList: (
    multiEditorKey: EditorKeyParam,
    nestedEditorKey: string,
  ) => void;
  deleteEditor: (multiEditorKey: EditorKeyParam) => void;
  resetEditorStore: () => void;
};

export type NoLexicalMultiEditorStore = Record<string, never>; // i.e., no store
export type FullLexicalMultiEditorStore = LexicalMultiEditorStoreGetters &
  LexicalMultiEditorStoreHelpers &
  LexicalMultiEditorStoreMutations;

export type UseLexicalMultiEditorStore =
  | FullLexicalMultiEditorStore
  | NoLexicalMultiEditorStore;

export const LexicalMultiEditorStoreCtx: React.Context<UseLexicalMultiEditorStore | null> =
  React.createContext<UseLexicalMultiEditorStore | null>(null);

export function useLexicalMultiEditorStore(): UseLexicalMultiEditorStore {
  const context = React.useContext(LexicalMultiEditorStoreCtx);
  if (context === null) return {};

  return context;
}
