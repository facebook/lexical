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
import {$getSelection, $isRangeSelection, $isRootNode} from 'lexical';
import {useEffect} from 'react';

import {$createPollNode, PollNode} from '../nodes/PollNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function PollPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([PollNode])) {
      throw new Error('PollPlugin: PollNode not registered on editor');
    }

    return editor.registerCommandListener(
      'insertPoll',
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
