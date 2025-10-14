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
  ExcludedProperties,
  Provider,
  SyncCursorPositionsFn,
} from '@lexical/yjs';
import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {mergeRegister} from '@lexical/utils';
import {
  CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  CONNECTED_COMMAND,
  createBindingV2__EXPERIMENTAL,
  createUndoManager,
  DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  initLocalState,
  renderSnapshot__EXPERIMENTAL,
  setLocalStateFocus,
  syncCursorPositions,
  syncLexicalUpdateToYjs,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexical,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
  syncYjsStateToLexicalV2__EXPERIMENTAL,
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
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Doc, Snapshot, Transaction, UndoManager, YEvent} from 'yjs';

import {InitialEditorStateType} from '../LexicalComposer';

export type CursorsContainerRef = React.RefObject<HTMLElement | null>;

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
  const isReloadingDoc = useRef(false);

  const onBootstrap = useCallback(() => {
    const {root} = binding;
    if (shouldBootstrap && root.isEmpty() && root._xmlText._length === 0) {
      initializeEditor(editor, initialEditorState);
    }
  }, [binding, editor, initialEditorState, shouldBootstrap]);

  useEffect(() => {
    const {root} = binding;

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
        if (!tags.has(SKIP_COLLAB_TAG)) {
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

    return () => {
      root.getSharedType().unobserveDeep(onYjsTreeChanges);
      removeListener();
    };
  }, [binding, provider, editor, setDoc, docMap, id, syncCursorPositionsFn]);

  // Note: 'reload' is not an actual Yjs event type. Included here for legacy support (#1409).
  useEffect(() => {
    const onProviderDocReload = (ydoc: Doc) => {
      clearEditorSkipCollab(editor, binding);
      setDoc(ydoc);
      docMap.set(id, ydoc);
      isReloadingDoc.current = true;
    };

    const onSync = () => {
      isReloadingDoc.current = false;
    };

    provider.on('reload', onProviderDocReload);
    provider.on('sync', onSync);

    return () => {
      provider.off('reload', onProviderDocReload);
      provider.off('sync', onSync);
    };
  }, [binding, provider, editor, setDoc, docMap, id]);

  useProvider(
    editor,
    provider,
    name,
    color,
    isReloadingDoc,
    awarenessData,
    onBootstrap,
  );

  return useYjsCursors(binding, cursorsContainerRef);
}

export function useYjsCollaborationV2__EXPERIMENTAL(
  editor: LexicalEditor,
  id: string,
  doc: Doc,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  options: {
    awarenessData?: object;
    excludedProperties?: ExcludedProperties;
    rootName?: string;
    __shouldBootstrapUnsafe?: boolean;
  } = {},
): BindingV2 {
  const {
    awarenessData,
    excludedProperties,
    rootName,
    __shouldBootstrapUnsafe: shouldBootstrap,
  } = options;

  // Note: v2 does not support 'reload' event, which is not an actual Yjs event type.
  const isReloadingDoc = useMemo(() => ({current: false}), []);

  const binding = useMemo(
    () =>
      createBindingV2__EXPERIMENTAL(editor, id, doc, docMap, {
        excludedProperties,
        rootName,
      }),
    [editor, id, doc, docMap, excludedProperties, rootName],
  );

  useEffect(() => {
    docMap.set(id, doc);
    return () => {
      docMap.delete(id);
    };
  }, [doc, docMap, id]);

  const onBootstrap = useCallback(() => {
    const {root} = binding;
    if (shouldBootstrap && root._length === 0) {
      initializeEditor(editor);
    }
  }, [binding, editor, shouldBootstrap]);

  const [diffSnapshots, setDiffSnapshots] = useState<{
    prevSnapshot?: Snapshot;
    snapshot?: Snapshot;
  } | null>();

  useEffect(() => {
    mergeRegister(
      editor.registerCommand(
        CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
        () => {
          setDiffSnapshots(null);
          // Ensure that any state already in Yjs is loaded into the editor (eg: after clearing diff view).
          syncYjsStateToLexicalV2__EXPERIMENTAL(binding, provider);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
        ({prevSnapshot, snapshot}) => {
          setDiffSnapshots({prevSnapshot, snapshot});
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor, binding, provider]);

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    if (diffSnapshots) {
      renderSnapshot__EXPERIMENTAL(
        binding,
        diffSnapshots.snapshot,
        diffSnapshots.prevSnapshot,
      );
      return;
    }

    const onYjsTreeChanges: OnYjsTreeChanges = (events, transaction) => {
      const origin = transaction.origin;
      if (origin !== binding) {
        const isFromUndoManger = origin instanceof UndoManager;
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events,
          transaction,
          isFromUndoManger,
        );
      }
    };

    // This updates the local editor state when we receive updates from other clients
    root.observeDeep(onYjsTreeChanges);
    const removeListener = editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        normalizedNodes,
        tags,
      }) => {
        if (!tags.has(SKIP_COLLAB_TAG)) {
          syncLexicalUpdateToYjsV2__EXPERIMENTAL(
            binding,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            normalizedNodes,
            tags,
          );
        }
      },
    );

    const onAwarenessUpdate = () => {
      syncCursorPositions(binding, provider);
    };
    awareness.on('update', onAwarenessUpdate);

    return () => {
      root.unobserveDeep(onYjsTreeChanges);
      removeListener();
      awareness.off('update', onAwarenessUpdate);
    };
  }, [binding, provider, editor, diffSnapshots]);

  useProvider(
    editor,
    provider,
    name,
    color,
    isReloadingDoc,
    awarenessData,
    onBootstrap,
  );

  return binding;
}

function useProvider(
  editor: LexicalEditor,
  provider: Provider,
  name: string,
  color: string,
  isReloadingDoc: React.RefObject<boolean>,
  awarenessData?: object,
  onBootstrap?: () => void,
): void {
  const connect = useCallback(() => provider.connect(), [provider]);

  const disconnect = useCallback(() => {
    try {
      provider.disconnect();
    } catch (_e) {
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
    };

    initLocalState(
      provider,
      name,
      color,
      document.activeElement === editor.getRootElement(),
      awarenessData || {},
    );

    provider.on('status', onStatus);
    provider.on('sync', onSync);

    const connectionPromise = connect();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- expected that isReloadingDoc.current may change
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
    };
  }, [
    editor,
    provider,
    name,
    color,
    isReloadingDoc,
    awarenessData,
    onBootstrap,
    connect,
    disconnect,
  ]);

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
}

export function useYjsCursors(
  binding: BaseBinding,
  cursorsContainerRef?: CursorsContainerRef,
): JSX.Element {
  return useMemo(() => {
    const ref = (element: null | HTMLElement) => {
      binding.cursorsContainer = element;
    };

    return createPortal(
      <div ref={ref} />,
      (cursorsContainerRef && cursorsContainerRef.current) || document.body,
    );
  }, [binding, cursorsContainerRef]);
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
