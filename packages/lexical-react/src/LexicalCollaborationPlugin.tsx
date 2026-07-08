/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {InitialEditorStateType} from './LexicalComposer';
import type {LexicalEditor} from 'lexical';
import type {Doc} from 'yjs';

import {
  type CollaborationContextType,
  useCollaborationContext,
} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  type Binding,
  createBinding,
  type ExcludedProperties,
  type Provider,
  type SyncCursorPositionsFn,
} from '@lexical/yjs';
import {type JSX, useEffect, useRef, useState} from 'react';

import {
  type CursorsContainerRef,
  useYjsCollaboration,
  useYjsCollaborationV2__EXPERIMENTAL,
  useYjsCursors,
  useYjsFocusTracking,
  useYjsHistory,
  useYjsHistoryV2,
} from './shared/useYjsCollaboration';

type ProviderFactory = (id: string, yjsDocMap: Map<string, Doc>) => Provider;

type CollaborationPluginProps = {
  id: string;
  providerFactory: ProviderFactory;
  shouldBootstrap: boolean;
  username?: string;
  cursorColor?: string;
  cursorsContainerRef?: CursorsContainerRef;
  initialEditorState?: InitialEditorStateType;
  excludedProperties?: ExcludedProperties;
  // `awarenessData` parameter allows arbitrary data to be added to the awareness.
  awarenessData?: object;
  syncCursorPositionsFn?: SyncCursorPositionsFn;
  /** Opt in to the new CSS Highlights-based selection rendering (if supported by the browser).
   * Fallback to legacy method if not enabled or not supported.
   */
  selectionHighlight?: boolean;
};

/**
 * Connects the editor to a Yjs document for real-time collaboration, syncing
 * editor state and rendering remote users' cursors and selections. Provide a
 * `providerFactory` that creates the Yjs {@link Provider} for the given
 * document `id`. Must be used within a {@link LexicalCollaboration} provider.
 *
 * @returns The element that renders collaborators' cursors (or an empty
 * fragment until the provider and binding are initialized).
 */
export function CollaborationPlugin({
  id,
  providerFactory,
  shouldBootstrap,
  username,
  cursorColor,
  cursorsContainerRef,
  initialEditorState,
  excludedProperties,
  awarenessData,
  syncCursorPositionsFn,
  selectionHighlight,
}: CollaborationPluginProps): JSX.Element {
  const isBindingInitialized = useRef(false);
  const isProviderInitialized = useRef(false);

  const collabContext = useCollaborationContext(username, cursorColor);
  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();

  useCollabActive(collabContext, editor);

  const [provider, setProvider] = useState<Provider>();
  const [doc, setDoc] = useState<Doc>();

  useEffect(() => {
    if (isProviderInitialized.current) {
      return;
    }

    isProviderInitialized.current = true;

    const newProvider = providerFactory(id, yjsDocMap);
    setProvider(newProvider);
    setDoc(yjsDocMap.get(id));

    return () => {
      newProvider.disconnect();
    };
  }, [id, providerFactory, yjsDocMap]);

  const [binding, setBinding] = useState<Binding>();

  useEffect(() => {
    if (!provider) {
      return;
    }

    if (isBindingInitialized.current) {
      return;
    }

    isBindingInitialized.current = true;

    const newBinding = createBinding(
      editor,
      provider,
      id,
      doc || yjsDocMap.get(id),
      yjsDocMap,
      excludedProperties,
    );
    setBinding(newBinding);

    return () => {
      newBinding.root.destroy(newBinding);
    };
  }, [editor, provider, id, yjsDocMap, doc, excludedProperties]);

  if (!provider || !binding) {
    return <></>;
  }

  return (
    <YjsCollaborationCursors
      awarenessData={awarenessData}
      binding={binding}
      collabContext={collabContext}
      color={color}
      cursorsContainerRef={cursorsContainerRef}
      editor={editor}
      id={id}
      initialEditorState={initialEditorState}
      name={name}
      provider={provider}
      setDoc={setDoc}
      shouldBootstrap={shouldBootstrap}
      yjsDocMap={yjsDocMap}
      syncCursorPositionsFn={syncCursorPositionsFn}
      selectionHighlight={selectionHighlight}
    />
  );
}

function YjsCollaborationCursors({
  editor,
  id,
  provider,
  yjsDocMap,
  name,
  color,
  shouldBootstrap,
  cursorsContainerRef,
  initialEditorState,
  awarenessData,
  collabContext,
  binding,
  setDoc,
  syncCursorPositionsFn,
  selectionHighlight,
}: {
  editor: LexicalEditor;
  id: string;
  provider: Provider;
  yjsDocMap: Map<string, Doc>;
  name: string;
  color: string;
  shouldBootstrap: boolean;
  binding: Binding;
  setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>;
  cursorsContainerRef?: CursorsContainerRef | undefined;
  initialEditorState?: InitialEditorStateType | undefined;
  awarenessData?: object;
  collabContext: CollaborationContextType;
  syncCursorPositionsFn?: SyncCursorPositionsFn;
  /** Opt in to the new CSS Highlights-based selection rendering (if supported by the browser).
   * Fallback to legacy method if not enabled or not supported.
   */
  selectionHighlight?: boolean;
}) {
  const cursors = useYjsCollaboration(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    shouldBootstrap,
    binding,
    setDoc,
    cursorsContainerRef,
    initialEditorState,
    awarenessData,
    syncCursorPositionsFn,
    selectionHighlight,
  );

  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);

  return cursors;
}

type CollaborationPluginV2Props = {
  id: string;
  doc: Doc;
  provider: Provider;
  __shouldBootstrapUnsafe?: boolean;
  username?: string;
  cursorColor?: string;
  cursorsContainerRef?: CursorsContainerRef;
  excludedProperties?: ExcludedProperties;
  // `awarenessData` parameter allows arbitrary data to be added to the awareness.
  awarenessData?: object;
  /** Opt in to the new CSS Highlights-based selection rendering (if supported by the browser).
   * Fallback to legacy method if not enabled or not supported.
   */
  selectionHighlight?: boolean;
};

/**
 * A variant of {@link CollaborationPlugin} that takes an already-created Yjs
 * `doc` and {@link Provider} directly instead of a provider factory, giving the
 * application full control over their lifecycle. Must be used within a
 * {@link LexicalCollaboration} provider.
 *
 * @experimental The API may change in a future release.
 * @returns The element that renders collaborators' cursors.
 */
export function CollaborationPluginV2__EXPERIMENTAL({
  id,
  doc,
  provider,
  __shouldBootstrapUnsafe,
  username,
  cursorColor,
  cursorsContainerRef,
  excludedProperties,
  awarenessData,
  selectionHighlight,
}: CollaborationPluginV2Props): JSX.Element {
  const collabContext = useCollaborationContext(username, cursorColor);
  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();
  useCollabActive(collabContext, editor);

  const binding = useYjsCollaborationV2__EXPERIMENTAL(
    editor,
    id,
    doc,
    provider,
    yjsDocMap,
    name,
    color,
    {
      __shouldBootstrapUnsafe,
      awarenessData,
      excludedProperties,
      selectionHighlight,
    },
  );

  useYjsHistoryV2(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);
  return useYjsCursors(binding, cursorsContainerRef);
}

const useCollabActive = (
  collabContext: CollaborationContextType,
  editor: LexicalEditor,
) => {
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    collabContext.isCollabActive = true;

    return () => {
      // Resetting flag only when unmount top level editor collab plugin. Nested
      // editors (e.g. image caption) should unmount without affecting it
      if (editor._parentEditor == null) {
        collabContext.isCollabActive = false;
      }
    };
  }, [collabContext, editor]);
};
