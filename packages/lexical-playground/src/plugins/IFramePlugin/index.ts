/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertBlockNode} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand} from 'lexical';
import {useEffect} from 'react';

import {$createIFrameNode, IFrameNode} from '../../nodes/IFrameNode';

export const INSERT_IFRAME_COMMAND: LexicalCommand<string> = createCommand();

export default function IFramePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([IFrameNode])) {
      throw new Error('IFramePlugin: IFrameNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_IFRAME_COMMAND,
      (payload) => {
        const iFrameNode = $createIFrameNode(payload);
        $insertBlockNode(iFrameNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
