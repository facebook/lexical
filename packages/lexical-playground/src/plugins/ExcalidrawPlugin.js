/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority, LexicalCommand} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection, createCommand} from 'lexical';
import {useEffect} from 'react';

import {$createExcalidrawNode, ExcalidrawNode} from '../nodes/ExcalidrawNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand();

export default function ExcalidrawPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ExcalidrawNode])) {
      throw new Error(
        'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
      );
    }

    return editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const excalidrawNode = $createExcalidrawNode();
          selection.insertNodes([excalidrawNode]);
        }
        return true;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
