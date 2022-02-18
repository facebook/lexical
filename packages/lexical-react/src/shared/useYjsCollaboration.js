/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Binding, Provider} from '@lexical/yjs';
import type {
  CommandListenerEditorPriority,
  CommandListenerLowPriority,
  LexicalEditor,
} from 'lexical';
import type {Doc} from 'yjs';

import {
  createBinding,
  createUndoManager,
  initLocalState,
  setLocalStateFocus,
  syncCursorPositions,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '@lexical/yjs';
import * as React from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';

const EditorPriority: CommandListenerEditorPriority = 0;
const BootstrapPriority: CommandListenerLowPriority = 1;

export function useYjsCollaboration(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  shouldBootstrap: boolean,
): [React$Node, Binding] {
  const binding = useMemo(
    () => createBinding(editor, provider, id, docMap),
    [editor, provider, id, docMap],
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

  const bootstrapPropagationRef = useRef(true);

  useLayoutEffect(() => {
    return editor.addListener(
      'command',
      (type) => {
        if (type === 'bootstrapEditor') {
          return bootstrapPropagationRef.current;
        }
        return false;
      },
      BootstrapPriority,
    );
  }, [editor]);

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    const onStatus = ({status}: {status: string}) => {
      editor.execCommand('connected', status === 'connected');
    };

    const onSync = (isSynced: boolean) => {
      if (
        shouldBootstrap &&
        isSynced &&
        root.isEmpty() &&
        root._xmlText._length === 0
      ) {
        bootstrapPropagationRef.current = false;
        editor.execCommand('bootstrapEditor');
      }
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

    provider.on('status', onStatus);
    provider.on('sync', onSync);
    awareness.on('update', onAwarenessUpdate);
    root.getSharedType().observeDeep(onYjsTreeChanges);

    const removeListener = editor.addListener(
      'update',
      ({
        prevEditorState,
        editorState,
        dirtyLeaves,
        dirtyElements,
        normalizedNodes,
        tags,
      }) => {
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
      },
    );

    connect();

    return () => {
      disconnect();
      provider.off('sync', onSync);
      provider.off('status', onStatus);
      awareness.off('update', onAwarenessUpdate);
      root.getSharedType().unobserveDeep(onYjsTreeChanges);
      removeListener();
    };
  }, [
    binding,
    color,
    connect,
    disconnect,
    editor,
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
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'toggleConnect') {
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
        }
        return false;
      },
      EditorPriority,
    );
  }, [connect, disconnect, editor]);

  return [cursorsContainer, binding];
}

export function useYjsFocusTracking(editor: LexicalEditor, provider: Provider) {
  useEffect(() => {
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'focus') {
          setLocalStateFocus(provider, true);
        } else if (type === 'blur') {
          setLocalStateFocus(provider, false);
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor, provider]);
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

    const applyCommand = (type) => {
      if (type === 'undo') {
        undo();
        return true;
      }
      if (type === 'redo') {
        redo();
        return true;
      }
      return false;
    };

    return editor.addListener('command', applyCommand, EditorPriority);
  });

  const clearHistory = useCallback(() => {
    undoManager.clear();
  }, [undoManager]);

  return clearHistory;
}
