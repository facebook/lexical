/* eslint-disable header/header */

import {
  LexicalMultiEditorStoreCtx,
  MultiEditorStore,
  UseLexicalMultiEditorStore,
} from '@lexical/react/LexicalMultiEditorStoreCtx';
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
 * - Make the `LexicalMultiEditorStore` a parent of your `LexicalComposer`.
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

export function LexicalMultiEditorStore({children}: Props): JSX.Element {
  // don't expose directly. safety first!
  const editorStore = React.useRef<MultiEditorStore>({});

  // mutations
  const addEditor: UseLexicalMultiEditorStore['addEditor'] = React.useCallback(
    (editorKey, editor) => {
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
  const addHistory: UseLexicalMultiEditorStore['addHistory'] =
    React.useCallback((multiEditorKey, historyState) => {
      if (typeof multiEditorKey === 'undefined') return;
      if (typeof editorStore.current[multiEditorKey] === 'undefined') return;
      if (typeof historyState === 'undefined') return;
      editorStore.current[multiEditorKey] = {
        ...editorStore.current[multiEditorKey],
        history: historyState,
      };
    }, []);
  const addNestedEditorToList: UseLexicalMultiEditorStore['addNestedEditorToList'] =
    React.useCallback((editorKey, nestedEditorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      editorStore.current[editorKey].nestedEditorList.push(nestedEditorKey);
    }, []);
  const deleteEditor: UseLexicalMultiEditorStore['deleteEditor'] =
    React.useCallback((editorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      delete editorStore.current[editorKey];
    }, []);
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  // getters
  const getEditor: UseLexicalMultiEditorStore['getEditor'] = React.useCallback(
    (editorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey].editor;
    },
    [],
  );
  const getEditorHistory: UseLexicalMultiEditorStore['getEditorHistory'] =
    React.useCallback((editorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey].history;
    }, []);
  const getEditorAndHistory: UseLexicalMultiEditorStore['getEditorAndHistory'] =
    React.useCallback((editorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey];
    }, []);
  const getEditorKeychain: UseLexicalMultiEditorStore['getEditorKeychain'] =
    React.useCallback(() => {
      return Object.keys(editorStore.current);
    }, []);
  const getNestedEditorList: UseLexicalMultiEditorStore['getNestedEditorList'] =
    React.useCallback((editorKey) => {
      if (typeof editorKey === 'undefined') return;
      if (typeof editorStore.current[editorKey] === 'undefined') return;
      return editorStore.current[editorKey].nestedEditorList;
    }, []);

  // helpers
  const isNestedEditor: UseLexicalMultiEditorStore['isNestedEditor'] =
    React.useCallback((editorKey, nestedEditorKey) => {
      if (typeof editorKey === 'undefined') return false;
      return (
        typeof editorStore.current[editorKey].nestedEditorList.find(
          (key) => nestedEditorKey === key,
        ) !== 'undefined'
      );
    }, []);

  return (
    <LexicalMultiEditorStoreCtx.Provider
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
    </LexicalMultiEditorStoreCtx.Provider>
  );
}
