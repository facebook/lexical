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

  // utils
  const isValidMultiEditorKey = React.useCallback(
    (multiEditorKey: string | undefined): multiEditorKey is string => {
      return typeof multiEditorKey === 'string' && multiEditorKey.length > 0;
    },
    [],
  );
  const isValidStoreRecord = React.useCallback(
    (
      multiEditorKey: string | undefined,
      getStoreRecordFunc: (
        k: string,
      ) => ReturnType<typeof getEditorStoreRecord>,
    ): multiEditorKey is string => {
      if (!isValidMultiEditorKey(multiEditorKey)) return false;
      return Boolean(getStoreRecordFunc(multiEditorKey));
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
      if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
      return editorStore.current[multiEditorKey].editor;
    },
    [getEditorStoreRecord, isValidStoreRecord],
  );
  const getEditorHistory: UseLexicalMultiEditorStore['getEditorHistory'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        return editorStore.current[multiEditorKey].historyState;
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );
  const getEditorKeychain: UseLexicalMultiEditorStore['getEditorKeychain'] =
    React.useCallback(() => {
      return Object.keys(editorStore.current);
    }, []);
  const getNestedEditorList: UseLexicalMultiEditorStore['getNestedEditorList'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        return editorStore.current[multiEditorKey].nestedEditorList;
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );

  // helpers
  const hasHistoryKey: UseLexicalMultiEditorStore['hasHistoryKey'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord))
          return false;
        return editorStore.current[multiEditorKey].historyKeys.includes(
          lexicalEditorKey,
        );
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );
  const isNestedEditor: UseLexicalMultiEditorStore['isNestedEditor'] =
    React.useCallback(
      (multiEditorKey, nestedEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord))
          return false;
        return (
          typeof editorStore.current[multiEditorKey].nestedEditorList.find(
            (key) => nestedEditorKey === key,
          ) !== 'undefined'
        );
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );

  // mutations
  const addEditor: UseLexicalMultiEditorStore['addEditor'] = React.useCallback(
    (multiEditorKey, editor) => {
      // one-time only...
      if (isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) {
        editorStore.current[multiEditorKey] = {
          editor,
          // primarily used for nestedEditors. allows for better control of
          // history plugin set up
          historyKeys: [],
          // set up by history plugin
          historyState: undefined,
          // nested instances live on their top-level editor (AKA, parent editor). this
          // allows us to manage their config on remount with a simple string[]
          nestedEditorList: [],
        };
      }
    },
    [getEditorStoreRecord, isValidStoreRecord],
  );
  const addOrCreateHistory: UseLexicalMultiEditorStore['addOrCreateHistory'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey, historyState) => {
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
      [getEditorHistory, getEditorStoreRecord, isValidStoreRecord],
    );
  const addHistoryKey: UseLexicalMultiEditorStore['addHistoryKey'] =
    React.useCallback(
      (multiEditorKey, lexicalEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        if (hasHistoryKey(multiEditorKey, lexicalEditorKey)) return;
        editorStore.current[multiEditorKey].historyKeys.push(lexicalEditorKey);
      },
      [getEditorStoreRecord, hasHistoryKey, isValidStoreRecord],
    );
  const addNestedEditorToList: UseLexicalMultiEditorStore['addNestedEditorToList'] =
    React.useCallback(
      (multiEditorKey, nestedEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        editorStore.current[multiEditorKey].nestedEditorList.push(
          nestedEditorKey,
        );
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );
  const deleteEditor: UseLexicalMultiEditorStore['deleteEditor'] =
    React.useCallback(
      (multiEditorKey) => {
        if (!isValidStoreRecord(multiEditorKey, getEditorStoreRecord)) return;
        delete editorStore.current[multiEditorKey];
      },
      [getEditorStoreRecord, isValidStoreRecord],
    );
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  return (
    <LexicalMultiEditorStoreCtx.Provider
      value={{
        addEditor,
        addHistoryKey,
        addNestedEditorToList,
        addOrCreateHistory,
        deleteEditor,
        getEditor,
        getEditorHistory,
        getEditorKeychain,
        getEditorStoreRecord,
        getNestedEditorList,
        hasHistoryKey,
        isNestedEditor,
        resetEditorStore,
      }}>
      {children}
    </LexicalMultiEditorStoreCtx.Provider>
  );
}
