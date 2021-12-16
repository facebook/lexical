/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, CommandListenerEditorPriority} from 'outline';
import type {Provider, Binding} from 'outline-yjs';
import type {Doc} from 'yjs';

import * as React from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  createBinding,
  createUndoManager,
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
  syncCursorPositions,
  initLocalState,
  setLocalStateFocus,
} from 'outline-yjs';
import {initEditor} from './useRichTextSetup';

const EditorPriority: CommandListenerEditorPriority = 0;

export function useYjsCollaboration(
  editor: OutlineEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
  skipInit?: boolean,
): [React$Node, Binding, boolean, () => void, () => void] {
  const [connected, setConnected] = useState(false);
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

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    const onStatus = ({status}: {status: string}) => {
      setConnected(status === 'connected');
    };

    const onSync = (isSynced: boolean) => {
      if (
        !skipInit &&
        isSynced &&
        root.isEmpty() &&
        root._xmlText._length === 0
      ) {
        initEditor(editor);
      }
    };

    const onAwarenessUpdate = () => {
      syncCursorPositions(binding, provider);
    };

    const onYjsTreeChanges = (events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToOutline(binding, provider, events);
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
        syncOutlineUpdateToYjs(
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
  }, [binding, color, connect, disconnect, editor, name, provider, skipInit]);

  const cursorsContainer = useMemo(() => {
    const ref = (element) => {
      binding.cursorsContainer = element;
    };

    return createPortal(<div ref={ref} />, document.body);
  }, [binding]);

  return [cursorsContainer, binding, connected, connect, disconnect];
}

export function useYjsFocusTracking(editor: OutlineEditor, provider: Provider) {
  useEffect(() => {
    const onBlur = () => {
      setLocalStateFocus(provider, false);
    };
    const onFocus = () => {
      setLocalStateFocus(provider, true);
    };

    return editor.addListener(
      'root',
      (
        rootElement: null | HTMLElement,
        prevRootElement: null | HTMLElement,
      ) => {
        // Clear our old listener if the root element changes
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('blur', onBlur);
          prevRootElement.removeEventListener('focus', onFocus);
        }
        if (rootElement !== null) {
          if (document.activeElement === rootElement) {
            onFocus();
          }
          rootElement.addEventListener('blur', onBlur);
          rootElement.addEventListener('focus', onFocus);
        }
      },
    );
  }, [editor, provider, provider.awareness]);
}

export function useYjsHistory(
  editor: OutlineEditor,
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
