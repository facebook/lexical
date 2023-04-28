/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand} from 'lexical';
import {useEffect} from 'react';

import {$createCodeBlockNode, CodeBlockNode} from '../../nodes/CodeBlockNode';

export const INSERT_CODE_BLOCK_COMMAND: LexicalCommand<
  string | null | undefined
> = createCommand('INSERT_CODE_BLOCK_COMMAND');

export default function CodeBlockPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CodeBlockNode])) {
      throw new Error(
        'CodeBlockPlugin: CodeBlockNode not registered on editor',
      );
    }

    return editor.registerCommand<string>(
      INSERT_CODE_BLOCK_COMMAND,
      (payload) => {
        const codeBlockNode = $createCodeBlockNode(payload);
        $insertNodeToNearestRoot(codeBlockNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
