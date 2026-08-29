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
  createYjsBinding,
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
  /** Customize the Yjs shared-type key used for the root `XmlText`. Defaults to `'root'`. */
  rootName?: string;
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
  rootName,
}: CollaborationPluginProps): JSX.Element {
  // The inputs that produced the current Provider, document and Binding. A ref
  // rather than the effect deps alone because the effect must be idempotent:
  // React StrictMode (and React 18+ remounts in general) re-runs it with
  // unchanged inputs and must not call providerFactory a second time.
  //
  // The compared set has to match the dependency list exactly. React runs the
  // previous cleanup before every re-run, so a dependency that is not compared
  // here would disconnect the Provider and destroy the Binding and then take
  // the early return, leaving both torn down but still in state.
  // `excludedProperties` and `rootName` are in neither: they are read once when
  // the Binding is built, as they always have been, so a caller that passes a
  // fresh object every render keeps its connection instead of churning it.
  const sessionInputs = useRef<null | {
    editor: LexicalEditor;
    id: string;
    providerFactory: ProviderFactory;
    yjsDocMap: Map<string, Doc>;
  }>(null);

  const collabContext = useCollaborationContext(username, cursorColor);
  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();

  useCollabActive(collabContext, editor);

  const [provider, setProvider] = useState<Provider>();
  const [binding, setBinding] = useState<Binding>();
  // The document itself is never read back: the Binding below is built from
  // whatever providerFactory put in the map. Only the setter is still needed,
  // for the legacy 'reload' path (#1409) that swaps the document out from under
  // an existing session; rebinding on reload is a pre-existing gap that this
  // change does not close.
  const [, setDoc] = useState<Doc>();

  useEffect(() => {
    const prevInputs = sessionInputs.current;
    if (
      prevInputs !== null &&
      prevInputs.editor === editor &&
      prevInputs.id === id &&
      prevInputs.providerFactory === providerFactory &&
      prevInputs.yjsDocMap === yjsDocMap
    ) {
      return;
    }

    sessionInputs.current = {editor, id, providerFactory, yjsDocMap};

    const newProvider = providerFactory(id, yjsDocMap);
    // providerFactory is what puts the document in the map.
    const newDoc = yjsDocMap.get(id);
    const newBinding =
      newDoc === undefined
        ? undefined
        : createYjsBinding({
            doc: newDoc,
            docMap: yjsDocMap,
            editor,
            excludedProperties,
            id,
            rootName,
          });

    // Set together, so that the components below see one consistent Provider,
    // document and Binding in a single commit. Staged across renders instead,
    // useProvider() would connect once for the new Provider and then again for
    // the new Binding.
    setProvider(newProvider);
    setDoc(newDoc);
    setBinding(newBinding);

    return () => {
      newProvider.disconnect();
      if (newBinding !== undefined) {
        newBinding.root.destroy(newBinding);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- excludedProperties and rootName are read once at creation, see sessionInputs above
  }, [editor, id, providerFactory, yjsDocMap]);

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
  /** Customize the Yjs shared-type key used for the root `XmlElement`. Defaults to `'root-v2'`. */
  rootName?: string;
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
  rootName,
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
      rootName,
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
