/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

export type EditorStoreRecord = {
  editor: LexicalEditor;
  historyState: HistoryState | undefined;
  historyKeys: string[];
  nestedEditorKeys: string[];
};
export type MultiEditorStore = Record<string, EditorStoreRecord>;

export type EditorKeyParam = string | undefined;
export type HistoryStateParam = HistoryState | undefined;

type LexicalMultiEditorStoreHelpers = {
  hasHistoryKey: (
    editorStoreKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => boolean;
  isNestedEditor: (
    editorStoreKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => boolean;
};
type LexicalMultiEditorStoreGetters = {
  getEditor: (editorStoreKey: EditorKeyParam) => LexicalEditor | undefined;
  getEditorHistory: (
    editorStoreKey: EditorKeyParam,
  ) => HistoryState | undefined;
  getEditorStoreRecord: (
    editorStoreKey: EditorKeyParam,
  ) => EditorStoreRecord | undefined;
  getEditorStoreKeychain: () => string[];
  getNestedEditorKeys: (editorStoreKey: EditorKeyParam) => string[] | undefined;
};
type LexicalMultiEditorStoreMutations = {
  addEditor: (editorStoreKey: EditorKeyParam, editor: LexicalEditor) => void;
  addOrCreateHistory: (
    editorStoreKey: EditorKeyParam,
    lexicalEditorKey: string,
    historyState: HistoryStateParam,
  ) => HistoryState | undefined;
  addHistoryKey: (
    editorStoreKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => void;
  addNestedEditorKey: (
    editorStoreKey: EditorKeyParam,
    lexicalEditorKey: string,
  ) => void;
  deleteEditor: (editorStoreKey: EditorKeyParam) => void;
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
