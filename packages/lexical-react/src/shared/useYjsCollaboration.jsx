/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Binding, Provider} from '@lexical/yjs';
import type {LexicalEditor} from 'lexical';
import type {Doc} from 'yjs';

import {mergeRegister} from '@lexical/utils';
import {
  CONNECTED_COMMAND,
  createBinding,
  createUndoManager,
  initLocalState,
  setLocalStateFocus,
  syncCursorPositions,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
  TOGGLE_CONNECT_COMMAND,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  FOCUS_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';

export function useYjsCollaboration(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  shouldBootstrap: boolean,
): [React$Node, Binding] {
  const isReloadingDoc = useRef(false);
  const [doc, setDoc] = useState(docMap.get(id));
  const binding = useMemo(
    () => createBinding(editor, provider, id, doc, docMap),
    [editor, provider, id, docMap, doc],
  );

  const connect = useCallback(() => {
    provider.connect();
  }, [provider]);

  const disconnect = useCallback(() => {
    try {
      provider.disconnect();
    } catch (e) {
      // Do nothing
    }
  }, [provider]);

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    const onStatus = ({status}: {status: string}) => {
      editor.dispatchCommand(CONNECTED_COMMAND, status === 'connected');
    };

    const onSync = (isSynced: boolean) => {
      if (
        shouldBootstrap &&
        isSynced &&
        root.isEmpty() &&
        root._xmlText._length === 0 &&
        isReloadingDoc.current === false
      ) {
        initializeEditor(editor);
      }
      isReloadingDoc.current = false;
    };

    const onAwarenessUpdate = () => {
      syncCursorPositions(binding, provider);
    };

    const onYjsTreeChanges = (events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexical(binding, provider, events);
      }
    };

    initLocalState(
      provider,
      name,
      color,
      document.activeElement === editor.getRootElement(),
    );

    const onProviderDocReload = (ydoc) => {
      clearEditorSkipCollab(editor, binding);
      setDoc(ydoc);
      docMap.set(id, ydoc);
      isReloadingDoc.current = true;
    };
    provider.on('reload', onProviderDocReload);

    provider.on('status', onStatus);
    provider.on('sync', onSync);
    awareness.on('update', onAwarenessUpdate);
    root.getSharedType().observeDeep(onYjsTreeChanges);

    const removeListener = editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyLeaves,
        dirtyElements,
        normalizedNodes,
        tags,
      }) => {
        if (tags.has('skip-collab') === false) {
          syncLexicalUpdateToYjs(
            binding,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            dirtyLeaves,
            normalizedNodes,
            tags,
          );
        }
      },
    );

    connect();

    return () => {
      if (isReloadingDoc.current === false) {
        disconnect();
      }
      provider.off('sync', onSync);
      provider.off('status', onStatus);
      provider.off('reload', onProviderDocReload);
      awareness.off('update', onAwarenessUpdate);
      root.getSharedType().unobserveDeep(onYjsTreeChanges);
      removeListener();
    };
  }, [
    binding,
    color,
    connect,
    disconnect,
    docMap,
    editor,
    id,
    name,
    provider,
    shouldBootstrap,
  ]);

  const cursorsContainer = useMemo(() => {
    const ref = (element) => {
      binding.cursorsContainer = element;
    };

    return createPortal(<div ref={ref} />, document.body);
  }, [binding]);

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_CONNECT_COMMAND,
      (payload) => {
        if (connect !== undefined && disconnect !== undefined) {
          const shouldConnect = payload;
          if (shouldConnect) {
            // eslint-disable-next-line no-console
            console.log('Collaboration connected!');
            connect();
          } else {
            // eslint-disable-next-line no-console
            console.log('Collaboration disconnected!');
            disconnect();
          }
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [connect, disconnect, editor]);

  return [cursorsContainer, binding];
}

export function useYjsFocusTracking(
  editor: LexicalEditor,
  provider: Provider,
  name: string,
  color: string,
) {
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        (payload) => {
          setLocalStateFocus(provider, name, color, true);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        (payload) => {
          setLocalStateFocus(provider, name, color, false);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [color, editor, name, provider]);
}

export function useYjsHistory(
  editor: LexicalEditor,
  binding: Binding,
): () => void {
  const undoManager = useMemo(
    () => createUndoManager(binding, binding.root.getSharedType()),
    [binding],
  );

  useEffect(() => {
    const undo = () => {
      undoManager.undo();
    };
    const redo = () => {
      undoManager.redo();
    };

    return mergeRegister(
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          undo();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          redo();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  });

  const clearHistory = useCallback(() => {
    undoManager.clear();
  }, [undoManager]);

  return clearHistory;
}

function initializeEditor(editor: LexicalEditor): void {
  editor.update(
    () => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if (firstChild === null) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const activeElement = document.activeElement;
        if (
          $getSelection() !== null ||
          (activeElement !== null && activeElement === editor.getRootElement())
        ) {
          paragraph.select();
        }
      }
    },
    {
      tag: 'history-merge',
    },
  );
}

function clearEditorSkipCollab(editor, binding) {
  // reset editor state
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.select();
    },
    {
      tag: 'skip-collab',
    },
  );

  if (binding.cursors == null) {
    return;
  }

  const cursorsContainer = binding.cursorsContainer;
  if (cursorsContainer == null) {
    return;
  }

  // reset cursors in dom
  const cursors = Array.from(binding.cursors.values());
  for (let i = 0; i < cursors.length; i++) {
    const cursor = cursors[i];
    const selection = cursor.selection;
    if (selection && selection.selections != null) {
      const selections = selection.selections;
      for (let j = 0; j < selections.length; j++) {
        cursorsContainer.removeChild(selections[i]);
      }
    }
  }
}
