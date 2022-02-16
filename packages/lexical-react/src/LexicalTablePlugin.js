/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority, ElementNode} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createTableNodeWithDimensions,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {$createParagraphNode, $getSelection, $log} from 'lexical';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function TablePlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TableNode, TableCellNode, TableRowNode])) {
      invariant(
        false,
        'TablePlugin: TableNode, TableCellNode or TableRowNode not registered on editor',
      );
    }
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'insertTable') {
          const {columns, rows} = payload;
          $log('handleAddTable');
          const selection = $getSelection();
          if (selection === null) {
            return true;
          }
          const focusNode = selection.focus.getNode();

          if (focusNode !== null) {
            const topLevelNode = focusNode.getTopLevelElementOrThrow();
            const tableNode = $createTableNodeWithDimensions(rows, columns);
            topLevelNode.insertAfter(tableNode);
            tableNode.insertAfter($createParagraphNode());
            const firstCell = tableNode
              .getFirstChildOrThrow<ElementNode>()
              .getFirstChildOrThrow<ElementNode>();
            firstCell.select();
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
