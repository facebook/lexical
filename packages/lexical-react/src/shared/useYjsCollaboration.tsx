/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseBinding,
  Binding,
  BindingV2,
  Provider,
  SyncCursorPositionsFn,
} from '@lexical/yjs';
import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {mergeRegister} from '@lexical/utils';
import {
  CONNECTED_COMMAND,
  createUndoManager,
  initLocalState,
  setLocalStateFocus,
  syncCursorPositions,
  syncLexicalUpdateToYjs,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexical,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
  TOGGLE_CONNECT_COMMAND,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  BLUR_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  FOCUS_COMMAND,
  HISTORY_MERGE_TAG,
  REDO_COMMAND,
  SKIP_COLLAB_TAG,
  UNDO_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Doc, Transaction, UndoManager, YEvent} from 'yjs';

import {InitialEditorStateType} from '../LexicalComposer';

export type CursorsContainerRef = React.MutableRefObject<HTMLElement | null>;

type OnYjsTreeChanges = (
  // The below `any` type is taken directly from the vendor types for YJS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: Array<YEvent<any>>,
  transaction: Transaction,
) => void;

export function useYjsCollaboration(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  shouldBootstrap: boolean,
  binding: Binding,
  setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>,
  cursorsContainerRef?: CursorsContainerRef,
  initialEditorState?: InitialEditorStateType,
  awarenessData?: object,
  syncCursorPositionsFn: SyncCursorPositionsFn = syncCursorPositions,
): JSX.Element {
  const onBootstrap = useCallback(() => {
    const {root} = binding;
    if (shouldBootstrap && root.isEmpty() && root._xmlText._length === 0) {
      initializeEditor(editor, initialEditorState);
    }
  }, [binding, editor, initialEditorState, shouldBootstrap]);

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    const onYjsTreeChanges: OnYjsTreeChanges = (events, transaction) => {
      const origin = transaction.origin;
      if (origin !== binding) {
        const isFromUndoManger = origin instanceof UndoManager;
        syncYjsChangesToLexical(
          binding,
          provider,
          events,
          isFromUndoManger,
          syncCursorPositionsFn,
        );
      }
    };

    // This updates the local editor state when we receive updates from other clients
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
        if (tags.has(SKIP_COLLAB_TAG) === false) {
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

    const onAwarenessUpdate = () => {
      syncCursorPositionsFn(binding, provider);
    };
    awareness.on('update', onAwarenessUpdate);

    return () => {
      binding.root.getSharedType().unobserveDeep(onYjsTreeChanges);
      removeListener();
      awareness.off('update', onAwarenessUpdate);
    };
  }, [binding, provider, editor, syncCursorPositionsFn]);

  return useYjsCollaborationInternal(
    editor,
    id,
    provider,
    docMap,
    name,
    color,
    binding,
    setDoc,
    cursorsContainerRef,
    awarenessData,
    onBootstrap,
  );
}

export function useYjsCollaborationV2__EXPERIMENTAL(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  binding: BindingV2,
  setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>,
  cursorsContainerRef?: CursorsContainerRef,
  awarenessData?: object,
) {
  // TODO(collab-v2): sync cursor positions.

  useEffect(() => {
    const {root} = binding;

    const onYjsTreeChanges: OnYjsTreeChanges = (_events, transaction) => {
      const origin = transaction.origin;
      if (origin !== binding) {
        const isFromUndoManger = origin instanceof UndoManager;
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          transaction,
          isFromUndoManger,
        );
      }
    };

    // This updates the local editor state when we receive updates from other clients
    root.observeDeep(onYjsTreeChanges);
    const removeListener = editor.registerUpdateListener(
      ({editorState, dirtyElements, normalizedNodes, tags}) => {
        if (tags.has(SKIP_COLLAB_TAG) === false) {
          syncLexicalUpdateToYjsV2__EXPERIMENTAL(
            binding,
            editorState,
            dirtyElements,
            normalizedNodes,
            tags,
          );
        }
      },
    );

    return () => {
      root.unobserveDeep(onYjsTreeChanges);
      removeListener();
    };
  }, [binding, editor]);

  return useYjsCollaborationInternal(
    editor,
    id,
    provider,
    docMap,
    name,
    color,
    binding,
    setDoc,
    cursorsContainerRef,
    awarenessData,
  );
}

function useYjsCollaborationInternal<T extends BaseBinding>(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  binding: T,
  setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>,
  cursorsContainerRef?: CursorsContainerRef,
  awarenessData?: object,
  onBootstrap?: () => void,
): JSX.Element {
  const isReloadingDoc = useRef(false);

  const connect = useCallback(() => provider.connect(), [provider]);

  const disconnect = useCallback(() => {
    try {
      provider.disconnect();
    } catch (e) {
      // Do nothing
    }
  }, [provider]);

  useEffect(() => {
    const onStatus = ({status}: {status: string}) => {
      editor.dispatchCommand(CONNECTED_COMMAND, status === 'connected');
    };

    const onSync = (isSynced: boolean) => {
      if (isSynced && isReloadingDoc.current === false && onBootstrap) {
        onBootstrap();
      }

      isReloadingDoc.current = false;
    };

    initLocalState(
      provider,
      name,
      color,
      document.activeElement === editor.getRootElement(),
      awarenessData || {},
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

    const connectionPromise = connect();

    return () => {
      if (isReloadingDoc.current === false) {
        if (connectionPromise) {
          connectionPromise.then(disconnect);
        } else {
          // Workaround for race condition in StrictMode. It's possible there
          // is a different race for the above case where connect returns a
          // promise, but we don't have an example of that in-repo.
          // It's possible that there is a similar issue with
          // TOGGLE_CONNECT_COMMAND below when the provider connect returns a
          // promise.
          // https://github.com/facebook/lexical/issues/6640
          disconnect();
        }
      }

      provider.off('sync', onSync);
      provider.off('status', onStatus);
      provider.off('reload', onProviderDocReload);
      docMap.delete(id);
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
    onBootstrap,
    awarenessData,
    setDoc,
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

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [connect, disconnect, editor]);

  return cursorsContainer;
}

export function useYjsFocusTracking(
  editor: LexicalEditor,
  provider: Provider,
  name: string,
  color: string,
  awarenessData?: object,
) {
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          setLocalStateFocus(provider, name, color, true, awarenessData || {});
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          setLocalStateFocus(provider, name, color, false, awarenessData || {});
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [color, editor, name, provider, awarenessData]);
}

export function useYjsHistory(
  editor: LexicalEditor,
  binding: Binding,
): () => void {
  const undoManager = useMemo(
    () => createUndoManager(binding, binding.root.getSharedType()),
    [binding],
  );

  return useYjsUndoManager(editor, undoManager);
}

export function useYjsHistoryV2(
  editor: LexicalEditor,
  binding: BindingV2,
): () => void {
  const undoManager = useMemo(
    () => createUndoManager(binding, binding.root),
    [binding],
  );

  return useYjsUndoManager(editor, undoManager);
}

function useYjsUndoManager(editor: LexicalEditor, undoManager: UndoManager) {
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

  // Exposing undo and redo states
  React.useEffect(() => {
    const updateUndoRedoStates = () => {
      editor.dispatchCommand(
        CAN_UNDO_COMMAND,
        undoManager.undoStack.length > 0,
      );
      editor.dispatchCommand(
        CAN_REDO_COMMAND,
        undoManager.redoStack.length > 0,
      );
    };
    undoManager.on('stack-item-added', updateUndoRedoStates);
    undoManager.on('stack-item-popped', updateUndoRedoStates);
    undoManager.on('stack-cleared', updateUndoRedoStates);
    return () => {
      undoManager.off('stack-item-added', updateUndoRedoStates);
      undoManager.off('stack-item-popped', updateUndoRedoStates);
      undoManager.off('stack-cleared', updateUndoRedoStates);
    };
  }, [editor, undoManager]);

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
              editor.setEditorState(parsedEditorState, {
                tag: HISTORY_MERGE_TAG,
              });
              break;
            }
            case 'object': {
              editor.setEditorState(initialEditorState, {
                tag: HISTORY_MERGE_TAG,
              });
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
                {tag: HISTORY_MERGE_TAG},
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
      tag: HISTORY_MERGE_TAG,
    },
  );
}

function clearEditorSkipCollab(editor: LexicalEditor, binding: BaseBinding) {
  // reset editor state
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.select();
    },
    {
      tag: SKIP_COLLAB_TAG,
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
