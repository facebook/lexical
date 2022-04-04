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
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  createCommand,
} from 'lexical';
import {useEffect} from 'react';

import {$createPollNode, PollNode} from '../nodes/PollNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand();

export default function PollPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([PollNode])) {
      throw new Error('PollPlugin: PollNode not registered on editor');
    }

    return editor.registerCommand(
      INSERT_POLL_COMMAND,
      (payload) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const question: string = payload;
          const pollNode = $createPollNode(question);
          if ($isRootNode(selection.anchor.getNode())) {
            selection.insertParagraph();
          }
          selection.insertNodes([pollNode]);
        }
        return true;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
