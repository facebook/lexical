/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';

import {useEffect, useMemo, useState} from 'react';
import {createWebsocketAdapter, syncOutlineUpdateToYjs} from 'outline-yjs';
import {initEditor} from './useRichTextSetup';

const WEBSOCKET_ENDPOINT = 'ws://localhost:1234';
const WEBSOCKET_SLUG = 'playground';

export default function useYjsCollaboration(editor: OutlineEditor): [boolean] {
  const [connected, setConnected] = useState(false);

  const adapter = useMemo(
    () => createWebsocketAdapter(WEBSOCKET_ENDPOINT, WEBSOCKET_SLUG),
    [],
  );

  useEffect(() => {
    const {provider, root} = adapter;
    provider.on('status', ({status}: {status: string}) => {
      setConnected(status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (root.firstChild === null) {
        initEditor(editor);
      }
    });

    const removeListener = editor.addListener(
      'update',
      ({prevEditorState, editorState, dirty, dirtyNodes}) => {
        if (dirty) {
          syncOutlineUpdateToYjs(
            adapter,
            prevEditorState,
            editorState,
            dirtyNodes,
          );
        }
      },
    );

    root.observeDeep((events) => {
      // TODO handle syncing to Outline
    });

    provider.connect();

    return () => {
      provider.disconnect();
      removeListener();
    };
  }, [adapter, editor]);

  return [connected];
}
