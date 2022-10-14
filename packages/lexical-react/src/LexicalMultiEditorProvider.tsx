/* eslint-disable header/header */

import type {LexicalEditor} from 'lexical';

import {HistoryState} from '@lexical/history';
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
  // don't expose directly. safety first!
  const editorStore = React.useRef<LexicalMultiEditorContextEditorStore>({});

  // mutations
  const addEditor = React.useCallback(
    (editorKey: string | undefined, editor: LexicalEditor) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] !== 'undefined') return;
      editorStore.current[editorKey] = {
        editor,
        history: undefined,
        nestedEditorList: [],
      };
    },
    [],
  );
  const addHistory = React.useCallback(
    (
      multiEditorKey: string | undefined,
      historyState: HistoryState | undefined,
    ) => {
      if (typeof multiEditorKey === 'undefined') return;
      if (typeof editorStore.current[multiEditorKey] === 'undefined') return;
      if (typeof historyState === 'undefined') return;
      editorStore.current[multiEditorKey] = {
        ...editorStore.current[multiEditorKey],
        history: historyState,
      };
    },
    [],
  );
  const addNestedEditorToList = React.useCallback(
    (editorKey: string | undefined, nestedEditorKey: string) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      editorStore.current[editorKey].nestedEditorList.push(nestedEditorKey);
    },
    [],
  );
  const deleteEditor = React.useCallback((editorKey: string | undefined) => {
    if (typeof editorKey === 'undefined') return;
    if (typeof editorStore.current[editorKey] === 'undefined') return;
    delete editorStore.current[editorKey];
  }, []);
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  // ...all the rest
  const getEditor = React.useCallback((editorKey: string | undefined) => {
    if (typeof editorKey === 'undefined') return;
    if (typeof editorStore.current[editorKey] === 'undefined') return;
    return editorStore.current[editorKey].editor;
  }, []);
  const getEditorHistory = React.useCallback(
    (editorKey: string | undefined) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey].history;
    },
    [],
  );
  const getEditorAndHistory = React.useCallback(
    (editorKey: string | undefined) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey];
    },
    [],
  );
  const getEditorKeychain = React.useCallback(() => {
    return Object.keys(editorStore.current);
  }, []);
  const getNestedEditorList = React.useCallback(
    (editorKey: string | undefined) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey].nestedEditorList;
    },
    [],
  );
  const isNestedEditor = React.useCallback(
    (editorKey: string | undefined, nestedEditorKey: string) => {
      if (typeof editorKey === 'undefined') return false;
      return (
        typeof editorStore.current[editorKey].nestedEditorList.find(
          (key) => nestedEditorKey === key,
        ) !== 'undefined'
      );
    },
    [],
  );

  return (
    <LexicalMultiEditorContext.Provider
      value={{
        addEditor,
        addHistory,
        addNestedEditorToList,
        deleteEditor,
        getEditor,
        getEditorAndHistory,
        getEditorHistory,
        getEditorKeychain,
        getNestedEditorList,
        isNestedEditor,
        resetEditorStore,
      }}>
      {children}
    </LexicalMultiEditorContext.Provider>
  );
}
