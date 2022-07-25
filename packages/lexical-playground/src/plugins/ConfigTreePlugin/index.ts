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

import {
  $createConfigTreeNode,
  ConfigTreeNode,
} from '../../nodes/ConfigTreeNode';

export const INSERT_CONFIG_TREE_COMMAND: LexicalCommand<string> =
  createCommand();

export default function ConfigTreePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  // TODO: not sure about priority
  useEffect(() => {
    if (!editor.hasNodes([ConfigTreeNode])) {
      throw new Error('ConfigTreePlugin: Config tree not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_CONFIG_TREE_COMMAND,
      (payload) => {
        const configTreeNode = $createConfigTreeNode(payload);
        $insertBlockNode(configTreeNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
