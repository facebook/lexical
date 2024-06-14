/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical';
import {useEffect} from 'react';

import {$createPageBreakNode, PageBreakNode} from '../../nodes/PageBreakNode';

export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand();

export default function PageBreakPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error(
        'PageBreakPlugin: PageBreakNode is not registered on editor',
      );
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_PAGE_BREAK,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const pgBreak = $createPageBreakNode();
            $insertNodeToNearestRoot(pgBreak);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
