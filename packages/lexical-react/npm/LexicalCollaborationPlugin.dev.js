/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalCollaborationContext = require('@lexical/react/LexicalCollaborationContext');
var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var React = require('react');
var utils = require('@lexical/utils');
var yjs = require('@lexical/yjs');
var lexical = require('lexical');
var reactDom = require('react-dom');
var yjs$1 = require('yjs');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function useYjsCollaboration(editor, id, provider, docMap, name, color, shouldBootstrap, cursorsContainerRef, initialEditorState, excludedProperties, awarenessData) {
  const isReloadingDoc = React.useRef(false);
  const [doc, setDoc] = React.useState(docMap.get(id));
  const binding = React.useMemo(() => yjs.createBinding(editor, provider, id, doc, docMap, excludedProperties), [editor, provider, id, docMap, doc, excludedProperties]);
  const connect = React.useCallback(() => {
    provider.connect();
  }, [provider]);
  const disconnect = React.useCallback(() => {
    try {
      provider.disconnect();
    } catch (e) {
      // Do nothing
    }
  }, [provider]);
  React.useEffect(() => {
    const {
      root
    } = binding;
    const {
      awareness
    } = provider;
    const onStatus = ({
      status
    }) => {
      editor.dispatchCommand(yjs.CONNECTED_COMMAND, status === 'connected');
    };
    const onSync = isSynced => {
      if (shouldBootstrap && isSynced && root.isEmpty() && root._xmlText._length === 0 && isReloadingDoc.current === false) {
        initializeEditor(editor, initialEditorState);
      }
      isReloadingDoc.current = false;
    };
    const onAwarenessUpdate = () => {
      yjs.syncCursorPositions(binding, provider);
    };
    const onYjsTreeChanges = (events, transaction) => {
      const origin = transaction.origin;
      if (origin !== binding) {
        const isFromUndoManger = origin instanceof yjs$1.UndoManager;
        yjs.syncYjsChangesToLexical(binding, provider, events, isFromUndoManger);
      }
    };
    yjs.initLocalState(provider, name, color, document.activeElement === editor.getRootElement(), awarenessData || {});
    const onProviderDocReload = ydoc => {
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
    const removeListener = editor.registerUpdateListener(({
      prevEditorState,
      editorState,
      dirtyLeaves,
      dirtyElements,
      normalizedNodes,
      tags
    }) => {
      if (tags.has('skip-collab') === false) {
        yjs.syncLexicalUpdateToYjs(binding, provider, prevEditorState, editorState, dirtyElements, dirtyLeaves, normalizedNodes, tags);
      }
    });
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
  }, [binding, color, connect, disconnect, docMap, editor, id, initialEditorState, name, provider, shouldBootstrap, awarenessData]);
  const cursorsContainer = React.useMemo(() => {
    const ref = element => {
      binding.cursorsContainer = element;
    };
    return /*#__PURE__*/reactDom.createPortal( /*#__PURE__*/React.createElement("div", {
      ref: ref
    }), cursorsContainerRef && cursorsContainerRef.current || document.body);
  }, [binding, cursorsContainerRef]);
  React.useEffect(() => {
    return editor.registerCommand(yjs.TOGGLE_CONNECT_COMMAND, payload => {
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
    }, lexical.COMMAND_PRIORITY_EDITOR);
  }, [connect, disconnect, editor]);
  return [cursorsContainer, binding];
}
function useYjsFocusTracking(editor, provider, name, color, awarenessData) {
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(lexical.FOCUS_COMMAND, () => {
      yjs.setLocalStateFocus(provider, name, color, true, awarenessData || {});
      return false;
    }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.BLUR_COMMAND, () => {
      yjs.setLocalStateFocus(provider, name, color, false, awarenessData || {});
      return false;
    }, lexical.COMMAND_PRIORITY_EDITOR));
  }, [color, editor, name, provider, awarenessData]);
}
function useYjsHistory(editor, binding) {
  const undoManager = React.useMemo(() => yjs.createUndoManager(binding, binding.root.getSharedType()), [binding]);
  React.useEffect(() => {
    const undo = () => {
      undoManager.undo();
    };
    const redo = () => {
      undoManager.redo();
    };
    return utils.mergeRegister(editor.registerCommand(lexical.UNDO_COMMAND, () => {
      undo();
      return true;
    }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.REDO_COMMAND, () => {
      redo();
      return true;
    }, lexical.COMMAND_PRIORITY_EDITOR));
  });
  const clearHistory = React.useCallback(() => {
    undoManager.clear();
  }, [undoManager]);

  // Exposing undo and redo states
  React.useEffect(() => {
    const updateUndoRedoStates = () => {
      editor.dispatchCommand(lexical.CAN_UNDO_COMMAND, undoManager.undoStack.length > 0);
      editor.dispatchCommand(lexical.CAN_REDO_COMMAND, undoManager.redoStack.length > 0);
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
function initializeEditor(editor, initialEditorState) {
  editor.update(() => {
    const root = lexical.$getRoot();
    if (root.isEmpty()) {
      if (initialEditorState) {
        switch (typeof initialEditorState) {
          case 'string':
            {
              const parsedEditorState = editor.parseEditorState(initialEditorState);
              editor.setEditorState(parsedEditorState, {
                tag: 'history-merge'
              });
              break;
            }
          case 'object':
            {
              editor.setEditorState(initialEditorState, {
                tag: 'history-merge'
              });
              break;
            }
          case 'function':
            {
              editor.update(() => {
                const root1 = lexical.$getRoot();
                if (root1.isEmpty()) {
                  initialEditorState(editor);
                }
              }, {
                tag: 'history-merge'
              });
              break;
            }
        }
      } else {
        const paragraph = lexical.$createParagraphNode();
        root.append(paragraph);
        const {
          activeElement
        } = document;
        if (lexical.$getSelection() !== null || activeElement !== null && activeElement === editor.getRootElement()) {
          paragraph.select();
        }
      }
    }
  }, {
    tag: 'history-merge'
  });
}
function clearEditorSkipCollab(editor, binding) {
  // reset editor state
  editor.update(() => {
    const root = lexical.$getRoot();
    root.clear();
    root.select();
  }, {
    tag: 'skip-collab'
  });
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

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function CollaborationPlugin({
  id,
  providerFactory,
  shouldBootstrap,
  username,
  cursorColor,
  cursorsContainerRef,
  initialEditorState,
  excludedProperties,
  awarenessData
}) {
  const collabContext = LexicalCollaborationContext.useCollaborationContext(username, cursorColor);
  const {
    yjsDocMap,
    name,
    color
  } = collabContext;
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  React.useEffect(() => {
    collabContext.isCollabActive = true;
    return () => {
      // Reseting flag only when unmount top level editor collab plugin. Nested
      // editors (e.g. image caption) should unmount without affecting it
      if (editor._parentEditor == null) {
        collabContext.isCollabActive = false;
      }
    };
  }, [collabContext, editor]);
  const provider = React.useMemo(() => providerFactory(id, yjsDocMap), [id, providerFactory, yjsDocMap]);
  const [cursors, binding] = useYjsCollaboration(editor, id, provider, yjsDocMap, name, color, shouldBootstrap, cursorsContainerRef, initialEditorState, excludedProperties, awarenessData);
  collabContext.clientID = binding.clientID;
  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);
  return cursors;
}

exports.CollaborationPlugin = CollaborationPlugin;
