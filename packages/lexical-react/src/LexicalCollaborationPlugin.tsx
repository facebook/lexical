/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';
import type {Doc} from 'yjs';

import {
  type CollaborationContextType,
  useCollaborationContext,
} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  Binding,
  BindingV2,
  createBinding,
  createBindingV2__EXPERIMENTAL,
  ExcludedProperties,
  Provider,
  SyncCursorPositionsFn,
} from '@lexical/yjs';
import {LexicalEditor} from 'lexical';
import {useEffect, useRef, useState} from 'react';

import {InitialEditorStateType} from './LexicalComposer';
import {
  CursorsContainerRef,
  useYjsCollaboration,
  useYjsCollaborationV2__EXPERIMENTAL,
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
};

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
}: CollaborationPluginProps): JSX.Element {
  const isBindingInitialized = useRef(false);

  const collabContext = useCollaborationContext(username, cursorColor);

  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();
  useCollabActive(collabContext, editor);

  const provider = useProvider(id, yjsDocMap, providerFactory);

  const [doc, setDoc] = useState(yjsDocMap.get(id));
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
  );

  collabContext.clientID = binding.clientID;

  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);

  return cursors;
}

type CollaborationPluginV2Props = {
  id: string;
  providerFactory: ProviderFactory;
  username?: string;
  cursorColor?: string;
  cursorsContainerRef?: CursorsContainerRef;
  excludedProperties?: ExcludedProperties;
  // `awarenessData` parameter allows arbitrary data to be added to the awareness.
  awarenessData?: object;
};

export function CollaborationPluginV2__EXPERIMENTAL({
  id,
  providerFactory,
  username,
  cursorColor,
  cursorsContainerRef,
  excludedProperties,
  awarenessData,
}: CollaborationPluginV2Props): JSX.Element {
  const isBindingInitialized = useRef(false);

  const collabContext = useCollaborationContext(username, cursorColor);

  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();
  useCollabActive(collabContext, editor);

  const provider = useProvider(id, yjsDocMap, providerFactory);

  const [doc, setDoc] = useState(yjsDocMap.get(id));
  const [binding, setBinding] = useState<BindingV2>();

  useEffect(() => {
    if (!provider) {
      return;
    }

    if (isBindingInitialized.current) {
      return;
    }

    isBindingInitialized.current = true;

    const newBinding = createBindingV2__EXPERIMENTAL(
      editor,
      id,
      doc || yjsDocMap.get(id),
      yjsDocMap,
      excludedProperties,
    );
    setBinding(newBinding);
  }, [editor, provider, id, yjsDocMap, doc, excludedProperties]);

  if (!provider || !binding) {
    return <></>;
  }

  return (
    <YjsCollaborationCursorsV2__EXPERIMENTAL
      awarenessData={awarenessData}
      binding={binding}
      collabContext={collabContext}
      color={color}
      cursorsContainerRef={cursorsContainerRef}
      editor={editor}
      id={id}
      name={name}
      provider={provider}
      setDoc={setDoc}
      shouldBootstrap={false}
      yjsDocMap={yjsDocMap}
    />
  );
}

function YjsCollaborationCursorsV2__EXPERIMENTAL({
  editor,
  id,
  provider,
  yjsDocMap,
  name,
  color,
  cursorsContainerRef,
  awarenessData,
  collabContext,
  binding,
  setDoc,
}: {
  editor: LexicalEditor;
  id: string;
  provider: Provider;
  yjsDocMap: Map<string, Doc>;
  name: string;
  color: string;
  shouldBootstrap: boolean;
  binding: BindingV2;
  setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>;
  cursorsContainerRef?: CursorsContainerRef | undefined;
  initialEditorState?: InitialEditorStateType | undefined;
  awarenessData?: object;
  collabContext: CollaborationContextType;
  syncCursorPositionsFn?: SyncCursorPositionsFn;
}) {
  const cursors = useYjsCollaborationV2__EXPERIMENTAL(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    binding,
    setDoc,
    cursorsContainerRef,
    awarenessData,
  );

  collabContext.clientID = binding.clientID;

  useYjsHistoryV2(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);

  return cursors;
}

const useCollabActive = (
  collabContext: CollaborationContextType,
  editor: LexicalEditor,
) => {
  useEffect(() => {
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

const useProvider = (
  id: string,
  yjsDocMap: Map<string, Doc>,
  providerFactory: ProviderFactory,
) => {
  const isProviderInitialized = useRef(false);
  const [provider, setProvider] = useState<Provider>();

  useEffect(() => {
    if (isProviderInitialized.current) {
      return;
    }

    isProviderInitialized.current = true;

    const newProvider = providerFactory(id, yjsDocMap);
    setProvider(newProvider);

    return () => {
      newProvider.disconnect();
    };
  }, [id, providerFactory, yjsDocMap]);

  return provider;
};
