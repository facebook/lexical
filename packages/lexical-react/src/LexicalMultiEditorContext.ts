/* eslint-disable header/header */

import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';

import * as React from 'react';
import invariant from 'shared/invariant';

type LexicalMultiEditorContextGetters = {
  getEditor: (editorId: string) => LexicalEditor | undefined;
  getEditorHistory: (editorId: string) => HistoryState | undefined;
  getEditorAndHistory: (editorId: string) =>
    | {
        editor: LexicalEditor;
        history: HistoryState;
      }
    | undefined;
  getEditorKeychain: () => string[];
};
type LexicalMultiEditorContextMutations = {
  addEditor: (editorId: string, editor: LexicalEditor) => void;
  deleteEditor: (editorId: string) => void;
  resetEditorStore: () => void;
};

export type LexicalMultiEditorContextEditorStore = Record<
  string,
  {
    editor: LexicalEditor;
    history: HistoryState;
  }
>;

export type LexicalMultiEditorContext = LexicalMultiEditorContextGetters &
  LexicalMultiEditorContextMutations;

export type UseLexicalMultiEditorContext = LexicalMultiEditorContext;
export type UseLexicalMultiEditorContextConfigInternal =
  | {
      editor: LexicalEditor | undefined;
      history: HistoryState | undefined;
      state: 'remountable';
    }
  | {addEditor: (editor: LexicalEditor) => void; state: 'listening'}
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
  editorId: string | undefined,
): UseLexicalMultiEditorContextConfigInternal {
  const context = useLexicalMultiEditorContext();

  const isActive = context !== null;
  const hasEditorId = typeof editorId !== 'undefined';

  const isListening = isActive && hasEditorId;
  const isMissingActiveMultiEditorProvider = !isActive && hasEditorId;
  const isMissingMultiEditorContextConfigProps = isActive && !hasEditorId;

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
    if (typeof context.getEditor(editorId) === 'undefined') {
      return {
        addEditor: (editor) => {
          context.addEditor(editorId, editor);
        },
        state: 'listening',
      };
    } else {
      return {
        editor: context.getEditor(editorId),
        history: context.getEditorHistory(editorId),
        state: 'remountable',
      };
    }
  }
}
