/* eslint-disable header/header */

import type {LexicalEditor} from 'lexical';

import {createEmptyHistoryState} from '@lexical/history';
import * as React from 'react';

import {
  LexicalMultiEditorContext,
  LexicalMultiEditorProviderContextEditorStore,
} from './LexicalMultiEditorContext';

type Props = {
  children: JSX.Element | string | (JSX.Element | string)[];
};

/**
 * *Overview*
 *
 * This component won't restore `editor` instances and histories from a database. Rather, it
 * collects them as they're mounted in your app so you can:
 *
 * - Run `editor` updates, listeners, etc..., outside a `LexicalComposer`.
 * - Remount an editor throughout your app without losing its history or state.
 *
 * *Directions*
 *
 * - Make the `LexicalMultiEditorProvider` a parent of your `LexicalComposer`s.
 * - Pass an `editorId` to each composer, as well as its `HistoryPlugin`, via the `initialMultiEditorProviderConfig` prop.
 *    - Note: History stacks are disabled if you don't use the `HistoryPlugin` — standard Lexical behavior.
 * - Enjoy your freedom.
 */

export function LexicalMultiEditorProvider({children}: Props): JSX.Element {
  const editorStore =
    React.useRef<LexicalMultiEditorProviderContextEditorStore>({});

  // mutations
  const addEditor = React.useCallback(
    (editorId: string, editor: LexicalEditor) => {
      if (typeof editorStore.current[editorId] !== 'undefined') return;
      editorStore.current[editorId] = {
        editor,
        history: createEmptyHistoryState(),
      };
    },
    [],
  );
  const deleteEditor = React.useCallback((editorId: string) => {
    if (typeof editorStore.current[editorId] === 'undefined') return;
    delete editorStore.current[editorId];
  }, []);
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  // getters
  const getEditor = React.useCallback((editorId: string) => {
    if (typeof editorStore.current[editorId] === 'undefined') return;
    return editorStore.current[editorId].editor;
  }, []);
  const getEditorHistory = React.useCallback((editorId: string) => {
    if (typeof editorStore.current[editorId] === 'undefined') return;
    return editorStore.current[editorId].history;
  }, []);
  const getEditorAndHistory = React.useCallback((editorId: string) => {
    if (typeof editorStore.current[editorId] === 'undefined') return;
    return editorStore.current[editorId];
  }, []);

  const value = React.useMemo((): LexicalMultiEditorContext => {
    return {
      addEditor,
      deleteEditor,
      getEditor,
      getEditorAndHistory,
      getEditorHistory,
      resetEditorStore,
    };
  }, [
    addEditor,
    deleteEditor,
    getEditor,
    getEditorAndHistory,
    getEditorHistory,
    resetEditorStore,
  ]);

  return (
    <LexicalMultiEditorContext.Provider value={value}>
      {children}
    </LexicalMultiEditorContext.Provider>
  );
}
