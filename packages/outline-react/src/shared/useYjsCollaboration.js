/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';
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
import {isRedo, isUndo} from 'outline/keys';

export function useYjsCollaboration(
  editor: OutlineEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, Doc>,
  name: string,
  color: string,
): [React$Node, Binding, boolean] {
  const [connected, setConnected] = useState(false);
  const binding = useMemo(
    () => createBinding(editor, provider, id, docMap),
    [editor, provider, id, docMap],
  );

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    const onStatus = ({status}: {status: string}) => {
      setConnected(status === 'connected');
    };

    const onSync = (isSynced: boolean) => {
      if (root.firstChild === null) {
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
    root.observeDeep(onYjsTreeChanges);

    const removeListener = editor.addListener(
      'update',
      ({prevEditorState, editorState, dirtyLeaves, dirtyBlocks}) => {
        syncOutlineUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyBlocks,
          dirtyLeaves,
        );
      },
    );

    // window.provider = provider;
    provider.connect();

    return () => {
      try {
        provider.disconnect();
      } catch (e) {
        // Do nothing
      }
      provider.off('sync', onSync);
      provider.off('status', onStatus);
      awareness.off('update', onAwarenessUpdate);
      root.unobserveDeep(onYjsTreeChanges);
      removeListener();
    };
  }, [binding, color, editor, name, provider]);

  const cursorsContainer = useMemo(() => {
    const ref = (element) => {
      binding.cursorsContainer = element;
    };

    return createPortal(<div ref={ref} />, document.body);
  }, [binding]);

  return [cursorsContainer, binding, connected];
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
  const undoManager = useMemo(() => createUndoManager(binding.root), [binding]);

  useEffect(() => {
    const undo = () => {
      undoManager.undo();
    };

    const redo = () => {
      undoManager.redo();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (editor.isComposing()) {
        return;
      }
      if (isUndo(event)) {
        event.preventDefault();
        event.stopPropagation();
        undo();
      } else if (isRedo(event)) {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    };

    const handleBeforeInput = (event: InputEvent) => {
      const inputType = event.inputType;
      if (inputType === 'historyUndo') {
        event.preventDefault();
        event.stopPropagation();
        undo();
      } else if (inputType === 'historyRedo') {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    };

    return editor.addListener(
      'root',
      (
        rootElement: null | HTMLElement,
        prevRootElement: null | HTMLElement,
      ) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('keydown', handleKeyDown);
          prevRootElement.removeEventListener('beforeinput', handleBeforeInput);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('keydown', handleKeyDown);
          rootElement.addEventListener('beforeinput', handleBeforeInput);
        }
      },
    );
  });

  const clearHistory = useCallback(() => {
    undoManager.clear();
  }, [undoManager]);

  return clearHistory;
}
