/* eslint-disable header/header */

import type {LexicalEditor} from 'lexical';

import {createEmptyHistoryState} from '@lexical/history';
import {
  LexicalMultiEditorContext,
  LexicalMultiEditorContextEditorStore,
} from '@lexical/react/LexicalMultiEditorContext';
import * as React from 'react';

type Props = {
  children: JSX.Element | string | (JSX.Element | string)[];
};

/**
 * *Overview*
 *
 * This component collects editor instances and histories as they're mounted so you can:
 *
 *  - Run `editor` updates, listeners, etc..., outside a `LexicalComposer`.
 *  - Easily remount editors without losing history or state — all without overusing the onChange plugin.
 *    - Why? You'll stop resaving `editorState` via the `OnChangePlugin` just for an internal remount.
 *    - Neither undo nor redo will work if you don't install the `HistoryPlugin`.
 *      - This is standard Lexical behavior.
 *
 * *Directions*
 *
 * - Make the `LexicalMultiEditorProvider` a parent of your `LexicalComposer`.
 * - Pass the composer a `multiEditorKey` via its `initialConfig`.
 * - Get editors with `useLexicalMultiEditorContext` hook.
 *
 * *Public methods*
 * - `addEditor`
 * - `deleteEditor`
 * - `getEditor`
 * - `getEditorHistory`
 * - `getEditorAndHistory`
 * - `getEditorKeychain`
 *   - Returns a list of your `editorStore`'s current keys. This can be handy when you need to look up a group of related editors `onClick` in order to serialize and save their `editorStates` to a database.
 * - `resetEditorStore`
 *   - Start over...
 */

export function LexicalMultiEditorProvider({children}: Props): JSX.Element {
  // don't expose directly. safety first
  const editorStore = React.useRef<LexicalMultiEditorContextEditorStore>({});

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
  const getEditorKeychain = React.useCallback(() => {
    // use the key array to run your own search...
    return Object.keys(editorStore.current);
  }, []);

  return (
    <LexicalMultiEditorContext.Provider
      value={{
        addEditor,
        deleteEditor,
        getEditor,
        getEditorAndHistory,
        getEditorHistory,
        getEditorKeychain,
        resetEditorStore,
      }}>
      {children}
    </LexicalMultiEditorContext.Provider>
  );
}
