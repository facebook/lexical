/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalCommand} from 'lexical';

import {$createExcalidrawNode, ExcalidrawNode} from '@lexical/excalidraw';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from 'lexical';
import {useEffect} from 'react';

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand();
export function ExcalidrawPlugin({
  excalidrawNode,
}: {
  excalidrawNode: typeof ExcalidrawNode;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([excalidrawNode])) {
      throw new Error(
        'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
      );
    }

    return editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const newExcalidrawNode = $createExcalidrawNode(excalidrawNode);
          selection.insertNodes([newExcalidrawNode]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, excalidrawNode]);

  return null;
}

export {ExcalidrawNode};
