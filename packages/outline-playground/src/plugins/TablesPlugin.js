/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, CommandListenerEditorPriority} from 'outline';

import {useEffect} from 'react';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {$log, $getSelection} from 'outline';
import {TableNode} from 'outline/TableNode';
import {TableCellNode} from 'outline/TableCellNode';
import {TableRowNode} from 'outline/TableRowNode';
import {$createTableNodeWithDimensions} from 'outline/nodes';
import {$createParagraphNode} from 'outline/ParagraphNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function TablesPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();

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

    const removeNodes = editor.registerNodes([TableNode, TableCellNode, TableRowNode]);

    return () => {
      removeCommandListener();
      removeNodes();
    };
  }, [editor]);

  return null;
}
