/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import {$log, $getSelection} from 'lexical';
import {ExcalidrawNode, $createExcalidrawNode} from '../nodes/ExcalidrawNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function ExcalidrawPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (type) => {
        if (type === 'insertExcalidraw') {
          $log('insertExcalidraw');
          const selection = $getSelection();
          if (selection !== null) {
            const excalidrawNode = $createExcalidrawNode();
            selection.insertNodes([excalidrawNode]);
          }
          return true;
        }
        return false;
      },
      EditorPriority,
    );

    const removeExcalidrawNode = editor.registerNodes([ExcalidrawNode]);

    return () => {
      removeCommandListener();
      removeExcalidrawNode();
    };
  }, [editor]);
  return null;
}
