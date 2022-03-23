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
import {$getSelection, $isRangeSelection} from 'lexical';
import {useEffect} from 'react';

import {$createExcalidrawNode, ExcalidrawNode} from '../nodes/ExcalidrawNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function ExcalidrawPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ExcalidrawNode])) {
      throw new Error(
        'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
      );
    }

    return editor.registerListener(
      'command',
      (type) => {
        if (type === 'insertExcalidraw') {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const excalidrawNode = $createExcalidrawNode();
            selection.insertNodes([excalidrawNode]);
          }
          return true;
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
