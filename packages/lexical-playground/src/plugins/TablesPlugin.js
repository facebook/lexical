/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, CommandListenerEditorPriority} from '@lexical/core';

import {useEffect} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$log, $getSelection} from '@lexical/core';
import {TableNode} from '@lexical/core/TableNode';
import {TableCellNode} from '@lexical/core/TableCellNode';
import {TableRowNode} from '@lexical/core/TableRowNode';
import {$createTableNodeWithDimensions} from '@lexical/helpers/nodes';
import {$createParagraphNode} from '@lexical/core/ParagraphNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function TablesPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (type) => {
        if (type === 'insertTable') {
          $log('handleAddTable');
          const selection = $getSelection();
          if (selection === null) {
            return true;
          }
          const focusNode = selection.focus.getNode();

          if (focusNode !== null) {
            const topLevelNode = focusNode.getTopLevelElementOrThrow();
            const tableNode = $createTableNodeWithDimensions(3, 3);
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

    const removeNodes = editor.registerNodes([
      TableNode,
      TableCellNode,
      TableRowNode,
    ]);

    return () => {
      removeCommandListener();
      removeNodes();
    };
  }, [editor]);

  return null;
}
