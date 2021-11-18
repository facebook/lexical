/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';
import type {Provider, YjsDoc, Binding} from 'outline-yjs';

import * as React from 'react';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  createBinding,
  createUndoManager,
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
  syncCursorPositions,
  initLocalState,
} from 'outline-yjs';
import {initEditor} from './useRichTextSetup';
import {isRedo, isUndo} from 'outline/keys';

export function useYjsCollaboration(
  editor: OutlineEditor,
  id: string,
  provider: Provider,
  docMap: Map<string, YjsDoc>,
  name: string,
  color: string,
): [React$Node, Binding, boolean] {
  const [connected, setConnected] = useState(false);
  const binding = useMemo(
    () => createBinding(provider, id, docMap),
    [id, provider, docMap],
  );

  useEffect(() => {
    const {root} = binding;
    const {awareness} = provider;

    provider.on('status', ({status}: {status: string}) => {
      setConnected(status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (root.firstChild === null) {
        initEditor(editor);
      }
    });

    initLocalState(provider, name, color);

    awareness.on('update', ({removed}) => {
      syncCursorPositions(editor, binding, provider);
    });

    const removeListener = editor.addListener(
      'update',
      ({prevEditorState, editorState, dirtyNodes}) => {
        syncOutlineUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyNodes,
        );
      },
    );

    root.observeDeep((events) => {
      syncYjsChangesToOutline(binding, editor, provider, events);
    });

    provider.connect();

    return () => {
      provider.disconnect();
      removeListener();
    };
  }, [binding, color, editor, name, provider]);

  const cursorsContainer = useMemo(() => {
    const ref = (element) => {
      binding.cursorsContainer = element;
    };

    return <div ref={ref} />;
  }, [binding]);

  return [cursorsContainer, binding, connected];
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
        undo();
      } else if (isRedo(event)) {
        event.preventDefault();
        redo();
      }
    };

    const handleBeforeInput = (event: InputEvent) => {
      const inputType = event.inputType;
      if (inputType === 'historyUndo') {
        event.preventDefault();
        undo();
      } else if (inputType === 'historyRedo') {
        event.preventDefault();
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
