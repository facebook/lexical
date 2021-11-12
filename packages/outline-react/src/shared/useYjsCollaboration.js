/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';
import type {Provider, YjsDoc} from 'outline-yjs';

import * as React from 'react';

import {useEffect, useMemo, useState} from 'react';
import {
  createBinding,
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
  syncCursorPositions,
} from 'outline-yjs';
import {initEditor} from './useRichTextSetup';

export default function useYjsCollaboration(
  editor: OutlineEditor,
  doc: YjsDoc,
  provider: Provider,
): [React$Node, boolean] {
  const [connected, setConnected] = useState(false);
  const binding = useMemo(() => createBinding(provider, doc), [doc, provider]);

  useEffect(() => {
    const {root} = binding;
    provider.on('status', ({status}: {status: string}) => {
      setConnected(status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (root.firstChild === null) {
        initEditor(editor);
      }
    });

    provider.awareness.on('update', ({removed}) => {
      syncCursorPositions(editor, binding, provider);
    });

    const removeListener = editor.addListener(
      'update',
      ({prevEditorState, editorState, dirty, dirtyNodes}) => {
        if (dirty) {
          syncOutlineUpdateToYjs(
            binding,
            provider,
            prevEditorState,
            editorState,
            dirtyNodes,
          );
        }
      },
    );

    root.observeDeep((events) => {
      // console.log(root.toJSON());
      syncYjsChangesToOutline(binding, editor, provider, events);
    });

    provider.connect();

    return () => {
      provider.disconnect();
      removeListener();
    };
  }, [binding, editor, provider]);

  const cursorsContainer = useMemo(() => {
    const ref = (element) => {
      binding.cursorsContainer = element;
    };

    return <div ref={ref} />;
  }, [binding]);

  return [cursorsContainer, connected];
}
