/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  const isValidEditorStoreKey = React.useCallback(
    (editorStoreKey: string | undefined): editorStoreKey is string => {
      return typeof editorStoreKey === 'string' && editorStoreKey.length > 0;
    },
    [],
  );
  const isValidEditorStoreRecord = React.useCallback(
    (
      editorStoreKey: string | undefined,
      getStoreRecordFunc: (
        k: string,
      ) => ReturnType<typeof getEditorStoreRecord>,
    ): editorStoreKey is string => {
      if (!isValidEditorStoreKey(editorStoreKey)) return false;
      return Boolean(getStoreRecordFunc(editorStoreKey));
    },
    [isValidEditorStoreKey],
  );

  // getters
  const getEditorStoreRecord: UseLexicalMultiEditorStore['getEditorStoreRecord'] =
    React.useCallback(
      (editorStoreKey) => {
        if (!isValidEditorStoreKey(editorStoreKey)) return;
        if (typeof editorStore.current[editorStoreKey] === 'undefined') return;
        return editorStore.current[editorStoreKey];
      },
      [isValidEditorStoreKey],
    );
  const getEditor: UseLexicalMultiEditorStore['getEditor'] = React.useCallback(
    (editorStoreKey) => {
      if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
        return;
      return editorStore.current[editorStoreKey].editor;
    },
    [getEditorStoreRecord, isValidEditorStoreRecord],
  );
  const getEditorHistory: UseLexicalMultiEditorStore['getEditorHistory'] =
    React.useCallback(
      (editorStoreKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        return editorStore.current[editorStoreKey].historyState;
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const getEditorStoreKeychain: UseLexicalMultiEditorStore['getEditorStoreKeychain'] =
    React.useCallback(() => {
      return Object.keys(editorStore.current);
    }, []);
  const getHistoryKeys: UseLexicalMultiEditorStore['getHistoryKeys'] =
    React.useCallback(
      (editorStoreKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        return editorStore.current[editorStoreKey].historyKeys;
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const getNestedEditorKeys: UseLexicalMultiEditorStore['getNestedEditorKeys'] =
    React.useCallback(
      (editorStoreKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        return editorStore.current[editorStoreKey].nestedEditorKeys;
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );

  // helpers
  const hasHistoryKey: UseLexicalMultiEditorStore['hasHistoryKey'] =
    React.useCallback(
      (editorStoreKey, lexicalEditorKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return false;
        return editorStore.current[editorStoreKey].historyKeys.includes(
          lexicalEditorKey,
        );
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const isNestedEditor: UseLexicalMultiEditorStore['isNestedEditor'] =
    React.useCallback(
      (editorStoreKey, lexicalEditorKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return false;
        return (
          typeof editorStore.current[editorStoreKey].nestedEditorKeys.find(
            (key) => lexicalEditorKey === key,
          ) !== 'undefined'
        );
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );

  // mutations
  const addEditor: UseLexicalMultiEditorStore['addEditor'] = React.useCallback(
    (editorStoreKey, editor) => {
      if (!isValidEditorStoreKey(editorStoreKey)) return;
      // one-time only...
      if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord)) {
        editorStore.current[editorStoreKey] = {
          editor,
          // primarily used for nestedEditors. allows for better set up
          // of history plugin
          historyKeys: [],
          // set up by history plugin
          historyState: undefined,
          // nested instances live on their top-level editor (AKA, parent editor). this
          // allows us to manage their config on remount with an array of editor keys
          nestedEditorKeys: [],
        };
      }
    },
    [getEditorStoreRecord, isValidEditorStoreKey, isValidEditorStoreRecord],
  );
  const addOrCreateHistory: UseLexicalMultiEditorStore['addOrCreateHistory'] =
    React.useCallback(
      (editorStoreKey, lexicalEditorKey, historyState) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        if (typeof getEditorHistory(editorStoreKey) !== 'undefined') return;
        const storedHistory = historyState || createEmptyHistoryState();
        editorStore.current[editorStoreKey] = {
          ...editorStore.current[editorStoreKey],
          historyKeys: [lexicalEditorKey],
          historyState: storedHistory,
        };
        return storedHistory;
      },
      [getEditorHistory, getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const addHistoryKey: UseLexicalMultiEditorStore['addHistoryKey'] =
    React.useCallback(
      (editorStoreKey, lexicalEditorKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        if (hasHistoryKey(editorStoreKey, lexicalEditorKey)) return;
        editorStore.current[editorStoreKey].historyKeys.push(lexicalEditorKey);
      },
      [getEditorStoreRecord, hasHistoryKey, isValidEditorStoreRecord],
    );
  const addNestedEditorKey: UseLexicalMultiEditorStore['addNestedEditorKey'] =
    React.useCallback(
      (editorStoreKey, lexicalEditorKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        editorStore.current[editorStoreKey].nestedEditorKeys.push(
          lexicalEditorKey,
        );
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const deleteEditor: UseLexicalMultiEditorStore['deleteEditor'] =
    React.useCallback(
      (editorStoreKey) => {
        if (!isValidEditorStoreRecord(editorStoreKey, getEditorStoreRecord))
          return;
        delete editorStore.current[editorStoreKey];
      },
      [getEditorStoreRecord, isValidEditorStoreRecord],
    );
  const resetEditorStore = React.useCallback(() => {
    editorStore.current = {};
  }, []);

  return (
    <LexicalMultiEditorStoreCtx.Provider
      value={{
        addEditor,
        addHistoryKey,
        addNestedEditorKey,
        addOrCreateHistory,
        deleteEditor,
        getEditor,
        getEditorHistory,
        getEditorStoreKeychain,
        getEditorStoreRecord,
        getHistoryKeys,
        getNestedEditorKeys,
        hasHistoryKey,
        isNestedEditor,
        resetEditorStore,
      }}>
      {children}
    </LexicalMultiEditorStoreCtx.Provider>
  );
}
