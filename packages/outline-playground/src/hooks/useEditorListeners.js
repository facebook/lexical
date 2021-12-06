/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'outline';

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useEffect, useState} from 'react';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function useEditorListeners(
  clear: () => void,
  connected?: boolean,
  connect?: () => void,
  disconnect?: () => void,
): boolean {
  const [editor] = useOutlineComposerContext();
  const [isReadOnly, setIsReadyOnly] = useState(false);

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (command) => {
        if (command.type === 'readOnly') {
          const readOnly = command.payload;
          setIsReadyOnly(readOnly);
        } else if (command.type === 'clear') {
          clear();
        } else if (command.type === 'toggleConnect') {
          if (connect !== undefined && disconnect !== undefined) {
            const isConnected = command.payload;
            if (isConnected) {
              console.log('Collaboration disconnected!');
              disconnect();
            } else {
              console.log('Collaboration connected!');
              connect();
            }
          }
        }
        return false;
      },
      EditorPriority,
    );

    return () => {
      removeCommandListener();
    };
  }, [clear, connect, connected, disconnect, editor]);

  useEffect(() => {
    if (connected !== undefined) {
      editor.execCommand('connected', !connected);
    }
  }, [connected, editor]);

  return isReadOnly;
}
