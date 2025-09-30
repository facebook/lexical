/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$patchStyleText} from '@lexical/selection';
import {
  $computeTableMapSkipCellCheck,
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableSelectionFrom,
  $deleteTableRowAtSelection,
  $isTableSelection,
  TableMapType,
  TableNode,
  TableSelection,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $setSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, expect, test} from 'vitest';

describe('table selection', () => {
  initializeUnitTest((testEnv) => {
    let tableNode: TableNode;
    let tableMap: TableMapType;
    let tableSelection: TableSelection;

    beforeEach(() => {
      testEnv.editor.update(() => {
        tableNode = $createTableNode();
        $getRoot()
          .clear()
          .append(
            tableNode.append(
              ...Array.from({length: 2}, (_0, row) =>
                $createTableRowNode().append(
                  ...Array.from({length: 2}, (_1, col) =>
                    $createTableCellNode().append(
                      $createParagraphNode().append(
                        $createTextNode(`${col},${row}`),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        tableMap = $computeTableMapSkipCellCheck(tableNode, null, null)[0];
        tableSelection = $createTableSelectionFrom(
          tableNode,
          tableMap.at(0)!.at(0)!.cell,
          tableMap.at(-1)!.at(-1)!.cell,
        );
        $setSelection(tableSelection);
      });
    });

    describe('regression #7076', () => {
      test('$patchStyleText works on a TableSelection', () => {
        testEnv.editor.update(
          () => {
            const length = 4;
            expect(
              $getRoot()
                .getAllTextNodes()
                .map((node) => node.getStyle()),
            ).toEqual(Array.from({length}, () => ''));
            expect($isTableSelection($getSelection())).toBe(true);
            $patchStyleText($getSelection()!, {color: 'red'});
            expect($isTableSelection($getSelection())).toBe(true);
            expect(
              $getRoot()
                .getAllTextNodes()
                .map((node) => node.getStyle()),
            ).toEqual(Array.from({length}, () => 'color: red;'));
          },
          {discrete: true},
        );
      });
    });

    describe('regression #7140', () => {
      test('selection points to missing nodes after deleting table rows', () => {
        testEnv.editor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode().append(
            $createTextNode('Before table'),
          );
          root.append(paragraph);
          root.append(tableNode);

          const newTableMap = $computeTableMapSkipCellCheck(
            tableNode,
            null,
            null,
          )[0];
          const newTableSelection = $createTableSelectionFrom(
            tableNode,
            newTableMap.at(0)!.at(0)!.cell,
            newTableMap.at(-1)!.at(-1)!.cell,
          );
          $setSelection(newTableSelection);
        });

        // Delete table rows
        testEnv.editor.update(() => {
          const selection = $getSelection();
          expect($isTableSelection(selection)).toBe(true);
          $deleteTableRowAtSelection();
        });

        // Try to access the selection after deletion
        testEnv.editor.update(() => {
          const selection = $getSelection();
          if (selection && $isTableSelection(selection)) {
            expect(selection.isValid()).toBe(false);
            const nodes = selection.getNodes();
            expect(nodes).toEqual([]);
          }
        });
      });
    });
  });
});
