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

import {useEffect, useMemo, useState} from 'react';
import {
  createBinding,
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
} from 'outline-yjs';
import {initEditor} from './useRichTextSetup';

export default function useYjsCollaboration(
  editor: OutlineEditor,
  doc: YjsDoc,
  provider: Provider,
): [boolean] {
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

    const removeListener = editor.addListener(
      'update',
      ({prevEditorState, editorState, dirty, dirtyNodes}) => {
        if (dirty) {
          syncOutlineUpdateToYjs(
            binding,
            prevEditorState,
            editorState,
            dirtyNodes,
          );
        }
      },
    );

    root.observeDeep((events) => {
      // eslint-disable-next-line no-console
      console.log(root.toJSON());
      syncYjsChangesToOutline(binding, editor, events);
    });

    provider.connect();

    return () => {
      provider.disconnect();
      removeListener();
    };
  }, [binding, editor, provider]);

  return [connected];
}
