/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  HTMLTableElementWithWithTableSelectionState,
  InsertTableCommandPayload,
  TableSelection,
} from '@lexical/table';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createTableNodeWithDimensions,
  applyTableHandlers,
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  ElementNode,
  NodeKey,
} from 'lexical';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

export function TablePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TableNode, TableCellNode, TableRowNode])) {
      invariant(
        false,
        'TablePlugin: TableNode, TableCellNode or TableRowNode not registered on editor',
      );
    }

    return editor.registerCommand<InsertTableCommandPayload>(
      INSERT_TABLE_COMMAND,
      ({columns, rows, includeHeaders}) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return true;
        }

        const focus = selection.focus;
        const focusNode = focus.getNode();

        if (focusNode !== null) {
          const tableNode = $createTableNodeWithDimensions(
            Number(rows),
            Number(columns),
            includeHeaders,
          );

          if ($isRootOrShadowRoot(focusNode)) {
            const target = focusNode.getChildAtIndex(focus.offset);

            if (target !== null) {
              target.insertBefore(tableNode);
            } else {
              focusNode.append(tableNode);
            }

            tableNode.insertBefore($createParagraphNode());
          } else {
            const topLevelNode = focusNode.getTopLevelElementOrThrow();
            topLevelNode.insertAfter(tableNode);
          }

          tableNode.insertAfter($createParagraphNode());
          const firstCell = tableNode
            .getFirstChildOrThrow<ElementNode>()
            .getFirstChildOrThrow<ElementNode>();
          firstCell.select();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  useEffect(() => {
    const tableSelections = new Map<NodeKey, TableSelection>();

    return editor.registerMutationListener(TableNode, (nodeMutations) => {
      for (const [nodeKey, mutation] of nodeMutations) {
        if (mutation === 'created') {
          editor.update(() => {
            const tableElement = editor.getElementByKey(
              nodeKey,
            ) as HTMLTableElementWithWithTableSelectionState;
            const tableNode = $getNodeByKey<TableNode>(nodeKey);

            if (tableElement && tableNode) {
              const tableSelection = applyTableHandlers(
                tableNode,
                tableElement,
                editor,
              );
              tableSelections.set(nodeKey, tableSelection);
            }
          });
        } else if (mutation === 'destroyed') {
          const tableSelection = tableSelections.get(nodeKey);

          if (tableSelection !== undefined) {
            tableSelection.removeListeners();
            tableSelections.delete(nodeKey);
          }
        }
      }
    });
  }, [editor]);

  return null;
}
