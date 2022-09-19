/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from '@lexical/yjs';
import type {LexicalEditor} from 'lexical';
import type {Doc, Transaction, YEvent} from 'yjs';

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
import {createPortal} from 'react-dom';
import {WebsocketProvider} from 'y-websocket';

import {InitialEditorStateType} from '../LexicalComposer';

export type CursorsContainerRef = React.MutableRefObject<HTMLElement | null>;

export function useYjsCollaboration(
  editor: LexicalEditor,
  id: string,
  provider: WebsocketProvider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  shouldBootstrap: boolean,
  cursorsContainerRef?: CursorsContainerRef,
  initialEditorState?: InitialEditorStateType,
): [JSX.Element, Binding] {
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
        initializeEditor(editor, initialEditorState);
      }

      isReloadingDoc.current = false;
    };

    const onAwarenessUpdate = () => {
      syncCursorPositions(binding, provider);
    };

    const onYjsTreeChanges = (
      // The below `any` type is taken directly from the vendor types for YJS.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events: Array<YEvent<any>>,
      transaction: Transaction,
    ) => {
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

    const onProviderDocReload = (ydoc: Doc) => {
      clearEditorSkipCollab(editor, binding);
      setDoc(ydoc);
      docMap.set(id, ydoc);
      isReloadingDoc.current = true;
    };

    provider.on('reload', onProviderDocReload);
    provider.on('status', onStatus);
    provider.on('sync', onSync);
    awareness.on('update', onAwarenessUpdate);
    // This updates the local editor state when we recieve updates from other clients
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
      docMap.delete(id);
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
    initialEditorState,
    name,
    provider,
    shouldBootstrap,
  ]);
  const cursorsContainer = useMemo(() => {
    const ref = (element: null | HTMLElement) => {
      binding.cursorsContainer = element;
    };

    return createPortal(
      <div ref={ref} />,
      (cursorsContainerRef && cursorsContainerRef.current) || document.body,
    );
  }, [binding, cursorsContainerRef]);

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
  provider: WebsocketProvider,
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

function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  editor.update(
    () => {
      const root = $getRoot();

      if (root.isEmpty()) {
        if (initialEditorState) {
          switch (typeof initialEditorState) {
            case 'string': {
              const parsedEditorState =
                editor.parseEditorState(initialEditorState);
              editor.setEditorState(parsedEditorState, {tag: 'history-merge'});
              break;
            }
            case 'object': {
              editor.setEditorState(initialEditorState, {tag: 'history-merge'});
              break;
            }
            case 'function': {
              editor.update(
                () => {
                  const root1 = $getRoot();
                  if (root1.isEmpty()) {
                    initialEditorState(editor);
                  }
                },
                {tag: 'history-merge'},
              );
              break;
            }
          }
        } else {
          const paragraph = $createParagraphNode();
          root.append(paragraph);
          const {activeElement} = document;

          if (
            $getSelection() !== null ||
            (activeElement !== null &&
              activeElement === editor.getRootElement())
          ) {
            paragraph.select();
          }
        }
      }
    },
    {
      tag: 'history-merge',
    },
  );
}

function clearEditorSkipCollab(editor: LexicalEditor, binding: Binding) {
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

  const cursors = binding.cursors;

  if (cursors == null) {
    return;
  }
  const cursorsContainer = binding.cursorsContainer;

  if (cursorsContainer == null) {
    return;
  }

  // reset cursors in dom
  const cursorsArr = Array.from(cursors.values());

  for (let i = 0; i < cursorsArr.length; i++) {
    const cursor = cursorsArr[i];
    const selection = cursor.selection;

    if (selection && selection.selections != null) {
      const selections = selection.selections;

      for (let j = 0; j < selections.length; j++) {
        cursorsContainer.removeChild(selections[i]);
      }
    }
  }
}
