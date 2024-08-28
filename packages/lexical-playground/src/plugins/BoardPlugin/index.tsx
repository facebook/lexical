/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR, createCommand} from 'lexical';
import {useEffect} from 'react';

import {$createKanbanNode, KanbanNode} from '../../nodes/BoardNode';

export const INSERT_KANBAN_COMMAND = createCommand<void>(
  'INSERT_KANBAN_COMMAND',
);

export default function KanbanPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([KanbanNode])) {
      throw new Error('KanbanPlugin: KanbanNode not registered on editor');
    }

    return editor.registerCommand<void>(
      INSERT_KANBAN_COMMAND,
      () => {
        const kanbanNode = $createKanbanNode();
        $insertNodeToNearestRoot(kanbanNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
