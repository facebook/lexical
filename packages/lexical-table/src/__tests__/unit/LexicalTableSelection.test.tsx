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
  });
});
