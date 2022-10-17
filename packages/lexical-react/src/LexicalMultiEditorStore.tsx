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
          // primarily used for nestedEditors. allows for better set up
          // of history plugin
          historyKeys: [],
          // set up by history plugin
          historyState: undefined,
          // nested instances live on their top-level editor (AKA, parent editor). this
          // allows us to manage their config on remount with an array of editor keys
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
