/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $computeTableMapSkipCellCheck,
  $createTableNodeWithDimensions,
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
  $mergeCells,
  TableExtension,
} from '@lexical/table';
import {
  $getRoot,
  $getSelection,
  $setSelection,
  defineExtension,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import {afterEach, assert, beforeEach, describe, expect, test} from 'vitest';

let container: HTMLDivElement;
let editor: ReturnType<typeof buildEditorFromExtensions>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [TableExtension],
      name: 'format-element-rect-host',
    }),
  );
  // The FORMAT_ELEMENT_COMMAND handler is registered by the table selection
  // observer, which needs the editor to have a root element.
  editor.setRootElement(container);
});

afterEach(() => {
  editor.dispose();
  document.body.removeChild(container);
});

function $table() {
  const table = $getRoot().getFirstChild();
  assert($isTableNode(table), 'expected a TableNode at the root');
  return table;
}

describe('FORMAT_ELEMENT_COMMAND over a table selection', () => {
  test('formats every cell the selection contains, including one pulled in by a merge', () => {
    editor.update(
      () => {
        const table = $createTableNodeWithDimensions(3, 3, false);
        $getRoot().clear().append(table);
        const [map] = $computeTableMapSkipCellCheck(table, null, null);
        // Merge grid columns 0 and 1 of row 1. The merged cell straddles the
        // left edge of the rect the next selection describes, so the rect has
        // to grow to column 0 to contain it.
        const merged = $mergeCells([map[1][0].cell, map[1][1].cell]);
        assert(merged !== null, 'expected the cells to merge');
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $table();
        const [map] = $computeTableMapSkipCellCheck(table, null, null);
        // Anchor at (row 0, column 1), focus at (row 1, column 2).
        $setSelection(
          $createTableSelectionFrom(table, map[0][1].cell, map[1][2].cell),
        );
      },
      {discrete: true},
    );

    editor.update(
      () => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
      },
      {discrete: true},
    );

    editor.read('latest', () => {
      const selection = $getSelection();
      assert(selection !== null, 'expected a selection');
      const selectedCells = selection.getNodes().filter($isTableCellNode);
      expect(selectedCells.length).toBeGreaterThan(0);
      expect(selectedCells.map(cell => cell.getFormatType())).toEqual(
        selectedCells.map(() => 'center'),
      );
    });
  });
});
