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
      syncCursorPositions(binding, provider);
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
      syncYjsChangesToOutline(binding, provider, events);
    });

    provider.connect();

    return () => {
      try {
        provider.disconnect();
      } catch (e) {
        // Do nothing
      }
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
      const {awareness} = provider;
      awareness.setLocalState({
        ...awareness.getLocalState(),
        anchorPos: null,
        focusPos: null,
      });
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
        }
        // If we have an root element, listen to the "input" event
        if (rootElement !== null) {
          rootElement.addEventListener('blur', onBlur);
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
