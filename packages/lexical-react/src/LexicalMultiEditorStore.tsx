/* eslint-disable header/header */

import {
  LexicalMultiEditorStoreCtx,
  MultiEditorStore,
  UseLexicalMultiEditorStore,
} from '@lexical/react/LexicalMultiEditorStoreCtx';
import * as React from 'react';

import {createEmptyHistoryState} from './LexicalHistoryPlugin';

type Props = {
  children: JSX.Element | string | (JSX.Element | string)[];
};

/**
 * *Overview*
 *
 * This component collects editor instances and histories as they're mounted so you can:
 *
 *  - Run `editor` updates, listeners, etc..., outside a `LexicalComposer`.
 *  - Easily remount editors without losing history or state — all without overusing the `onChange` plugin.
 *    - Why? You'll stop resaving `editorState` via the `OnChangePlugin` just for an internal remount.
 *    - Neither undo nor redo will work if you don't install the `HistoryPlugin`.
 *      - This is standard Lexical behavior.
 *
 * *Directions*
 *
 * - Make the `LexicalMultiEditorStore` a parent of your `LexicalComposer`.
 * - Pass the composer a `multiEditorStoreKey` via its `initialConfig`.
 * - Get editors with `useLexicalMultiEditorContext` hook.
 *
 * *Public methods*
 * - `addEditor`
 * - `deleteEditor`
 * - `getEditor`
 * - `getEditorHistory`
 * - `getEditorStoreRecord`
 * - `getEditorKeychain`
 *   - Returns a list of your `editorStore`'s current keys. This can be handy when you need to look up a group of related editors `onClick` in order to serialize and save their `editorStates` to a database.
 * - `resetEditorStore`
 *   - Start over...
 */

export function LexicalMultiEditorStore({children}: Props): JSX.Element {
  // don't expose directly. safety first!
  const editorStore = React.useRef<MultiEditorStore>({});

  // internal utils
  const isValidStoreRecord = React.useCallback(
    (
      multiEditorKey: string,
      getEditorRecord: (k: string) => ReturnType<typeof getEditorStoreRecord>,
    ) => {
      return Boolean(getEditorRecord(multiEditorKey));
    },
    [],
  );

  // helpers
  const isValidMultiEditorKey = React.useCallback(
    (multiEditorKey: string | undefined): multiEditorKey is string => {
      return typeof multiEditorKey === 'string' && multiEditorKey.length > 0;
    },
    [],
  );
  const hasHistoryKey: UseLexicalMultiEditorStore['hasHistoryKey'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return false;
        return editorStore.current[multiEditorKey].historyKeys.includes(
          lexicalEditorKey,
        );
      },
      [isValidMultiEditorKey],
    );
  const isNestedEditor: UseLexicalMultiEditorStore['isNestedEditor'] =
    React.useCallback(
      (multiEditorKey, nestedEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return false;
        return (
          typeof editorStore.current[multiEditorKey].nestedEditorList.find(
            (key) => nestedEditorKey === key,
          ) !== 'undefined'
        );
      },
      [isValidMultiEditorKey],
    );

  // getters
  const getEditorStoreRecord: UseLexicalMultiEditorStore['getEditorStoreRecord'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (typeof editorStore.current[multiEditorKey] === 'undefined') return;
        return editorStore.current[multiEditorKey];
      },
      [isValidMultiEditorKey],
    );
  const getEditor: UseLexicalMultiEditorStore['getEditor'] = React.useCallback(
    (multiEditorKey) => {
      if (!isValidMultiEditorKey(multiEditorKey)) return;
      if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
      return editorStore.current[multiEditorKey].editor;
    },
    [getEditorStoreRecord, isValidStoreRecord, isValidMultiEditorKey],
  );
  const getEditorHistory: UseLexicalMultiEditorStore['getEditorHistory'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        return editorStore.current[multiEditorKey].historyState;
      },
      [getEditorStoreRecord, isValidStoreRecord, isValidMultiEditorKey],
    );
  const getEditorKeychain: UseLexicalMultiEditorStore['getEditorKeychain'] =
    React.useCallback(() => {
      return Object.keys(editorStore.current);
    }, []);
  const getNestedEditorList: UseLexicalMultiEditorStore['getNestedEditorList'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        return editorStore.current[multiEditorKey].nestedEditorList;
      },
      [getEditorStoreRecord, isValidStoreRecord, isValidMultiEditorKey],
    );

  // mutations
  const addEditor: UseLexicalMultiEditorStore['addEditor'] = React.useCallback(
    (multiEditorKey, editor) => {
      if (!isValidMultiEditorKey(multiEditorKey)) return;
      if (isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return; // only once!
      editorStore.current[multiEditorKey] = {
        editor,
        // primarily used for nestedEditors. lets us better control set up of
        // history plugin
        historyKeys: [],
        // set up by history plugin
        historyState: undefined,
        // nested instances live on their top-level editor (AKA, parent editor), so
        // we can use a string[] of ids to manage their config on remount
        nestedEditorList: [],
      };
    },
    [getEditorStoreRecord, isValidStoreRecord, isValidMultiEditorKey],
  );
  const addHistory: UseLexicalMultiEditorStore['addHistory'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey, historyState) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        if (typeof getEditorHistory(multiEditorKey) !== 'undefined') return;
        const storedHistory = historyState || createEmptyHistoryState();
        editorStore.current[multiEditorKey] = {
          ...editorStore.current[multiEditorKey],
          historyKeys: [lexicalEditorKey],
          historyState: storedHistory,
        };
        return storedHistory;
      },
      [
        getEditorHistory,
        getEditorStoreRecord,
        isValidMultiEditorKey,
        isValidStoreRecord,
      ],
    );
  const addHistoryKey: UseLexicalMultiEditorStore['addHistoryKey'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        if (hasHistoryKey(multiEditorKey, lexicalEditorKey)) return;
        editorStore.current[multiEditorKey].historyKeys.push(lexicalEditorKey);
      },
      [
        getEditorStoreRecord,
        hasHistoryKey,
        isValidMultiEditorKey,
        isValidStoreRecord,
      ],
    );
  const addNestedEditorToList: UseLexicalMultiEditorStore['addNestedEditorToList'] =
    React.useCallback(
      (multiEditorKey, nestedEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        editorStore.current[multiEditorKey].nestedEditorList.push(
          nestedEditorKey,
        );
      },
      [getEditorStoreRecord, isValidMultiEditorKey, isValidStoreRecord],
    );
  const deleteEditor: UseLexicalMultiEditorStore['deleteEditor'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidMultiEditorKey(multiEditorKey)) return;
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        delete editorStore.current[multiEditorKey];
      },
      [getEditorStoreRecord, isValidMultiEditorKey, isValidStoreRecord],
    );
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  return (
    <LexicalMultiEditorStoreCtx.Provider
      value={{
        addEditor,
        addHistory,
        addHistoryKey,
        addNestedEditorToList,
        deleteEditor,
        getEditor,
        getEditorHistory,
        getEditorKeychain,
        getEditorStoreRecord,
        getNestedEditorList,
        hasHistoryKey,
        isNestedEditor,
        isValidMultiEditorKey,
        resetEditorStore,
      }}>
      {children}
    </LexicalMultiEditorStoreCtx.Provider>
  );
}
