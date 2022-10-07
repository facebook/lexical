/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';

type LexicalMultiEditorProviderContextGetters = {
  getEditor: (editorId: string) => LexicalEditor | undefined;
  getEditorHistory: (editorId: string) => HistoryState | undefined;
  getEditorAndHistory: (editorId: string) =>
    | {
        editor: LexicalEditor;
        history: HistoryState;
      }
    | undefined;
  resetEditorStore: () => void;
};
type LexicalMultiEditorProviderContextMutations = {
  addEditor: (editorId: string, editor: LexicalEditor) => void;
  deleteEditor: (editorId: string) => void;
};

export type LexicalMultiEditorProviderContextEditorStore = Record<
  string,
  {
    editor: LexicalEditor;
    history: HistoryState;
  }
>;

export type LexicalMultiEditorContext =
  LexicalMultiEditorProviderContextGetters &
    LexicalMultiEditorProviderContextMutations;

export type UseLexicalMultiEditorProviderContext = LexicalMultiEditorContext;
export type UseLexicalMultiEditorProviderContextConfig =
  | {
      addEditor: (editor: LexicalEditor) => void;
      editor: LexicalEditor | undefined;
      history: HistoryState | undefined;
      state: 'listening' | 'remountable';
    }
  | {state: 'inactive'};

export const LexicalMultiEditorContext =
  React.createContext<LexicalMultiEditorContext | null>(null);

export const useLexicalMultiEditorProviderContext =
  (): UseLexicalMultiEditorProviderContext | null => {
    const context = React.useContext(LexicalMultiEditorContext);
    if (context === null) return null;

    return context;
  };

export const useLexicalMultiEditorProviderContextConfig = (
  editorId: string | undefined,
  caller: string,
): UseLexicalMultiEditorProviderContextConfig => {
  const context = React.useContext(LexicalMultiEditorContext);

  const isActive = context !== null;
  const hasEditorId = typeof editorId !== 'undefined';
  const isMissingConfigProps = isActive && !hasEditorId;
  const isMissingActiveMultiEditorProvider = !isActive && hasEditorId;

  if (isMissingConfigProps) {
    console.error(
      `${caller}: You haven't passed an initialMultiEditorProviderConfig.editorId prop. The LexicalMultiEditorProvider won't track editor history without it.`,
    );
  }

  if (isMissingActiveMultiEditorProvider) {
    console.error(
      `${caller}: For some reason, the LexicalMultiEditorProvider is not active. Did you add it to your tree? The initialMultiEditorProviderConfig.editorId prop won't work without it.`,
    );
  }

  if (
    !isActive ||
    !hasEditorId ||
    isMissingConfigProps ||
    isMissingActiveMultiEditorProvider
  ) {
    return {state: 'inactive'};
  }

  return {
    addEditor: (editor: LexicalEditor) => {
      if (typeof context.getEditor(editorId) !== 'undefined') return;
      context.addEditor(editorId, editor);
    },
    editor: context.getEditor(editorId),
    history: context.getEditorHistory(editorId),
    state:
      typeof context.getEditor(editorId) === 'undefined'
        ? 'listening'
        : 'remountable',
  };
};
