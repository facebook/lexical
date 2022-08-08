/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Doc} from 'yjs';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useMemo} from 'react';
import {WebsocketProvider} from 'y-websocket';

import {
  useYjsCollaboration,
  useYjsFocusTracking,
  useYjsHistory,
} from './shared/useYjsCollaboration';

export function CollaborationPlugin({
  id,
  providerFactory,
  shouldBootstrap,
  username,
}: {
  id: string;
  providerFactory: (
    // eslint-disable-next-line no-shadow
    id: string,
    yjsDocMap: Map<string, Doc>,
  ) => WebsocketProvider;
  shouldBootstrap: boolean;
  username?: string;
}): JSX.Element {
  const collabContext = useCollaborationContext(username);

  const {yjsDocMap, name, color} = collabContext;

  const [editor] = useLexicalComposerContext();

  const provider = useMemo(
    () => providerFactory(id, yjsDocMap),
    [id, providerFactory, yjsDocMap],
  );

  const [cursors, binding] = useYjsCollaboration(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    shouldBootstrap,
  );

  collabContext.clientID = binding.clientID;

  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider, name, color);

  return cursors;
}
