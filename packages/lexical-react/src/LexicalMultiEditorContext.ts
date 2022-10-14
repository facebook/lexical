/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

type LexicalMultiEditorContextHelpers = {
  isNestedEditor: (
    editorKey: string | undefined,
    nestedEditorKey: string,
  ) => boolean;
};
type LexicalMultiEditorContextGetters = {
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
type LexicalMultiEditorContextMutations = {
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

export type LexicalMultiEditorContextEditorStore = Record<
  string,
  {
    editor: LexicalEditor;
    history: HistoryState | undefined;
    nestedEditorList: string[];
  }
>;

export type LexicalMultiEditorContext = LexicalMultiEditorContextGetters &
  LexicalMultiEditorContextHelpers &
  LexicalMultiEditorContextMutations;

export type UseLexicalMultiEditorContext = LexicalMultiEditorContext;

export const LexicalMultiEditorContext: React.Context<LexicalMultiEditorContext | null> =
  React.createContext<LexicalMultiEditorContext | null>(null);

export function useLexicalMultiEditorContext():
  | UseLexicalMultiEditorContext
  | Record<string, never> {
  const context = React.useContext(LexicalMultiEditorContext);
  if (context === null) return {};

  return context;
}
