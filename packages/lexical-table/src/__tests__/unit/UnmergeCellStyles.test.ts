/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createTableNodeWithDimensions,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $mergeCells,
  $unmergeCellNode,
  type TableCellNode,
  TableExtension,
} from '@lexical/table';
import {$getRoot, defineExtension} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [TableExtension],
      name: 'unmerge-styles-host',
    }),
  );
}

function $cells(): TableCellNode[][] {
  const table = $getRoot().getFirstChild();
  assert($isTableNode(table), 'expected a TableNode at the root');
  return table
    .getChildren()
    .filter($isTableRowNode)
    .map(row => row.getChildren().filter($isTableCellNode));
}

describe('$unmergeCellNode keeps the cell presentation', () => {
  test('the cells a merged cell splits into keep its backgroundColor and verticalAlign', () => {
    using editor = buildEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createTableNodeWithDimensions(2, 2, false));
        const rows = $cells();
        const merged = $mergeCells([
          rows[0][0],
          rows[0][1],
          rows[1][0],
          rows[1][1],
        ]);
        assert(merged !== null, 'expected the cells to merge');
        merged.setBackgroundColor('rgb(255, 0, 0)').setVerticalAlign('middle');
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const merged = $cells()[0][0];
        expect(merged.getColSpan()).toBe(2);
        expect(merged.getRowSpan()).toBe(2);
        $unmergeCellNode(merged);
      },
      {discrete: true},
    );

    editor.read(() => {
      const rows = $cells();
      expect(rows.map(row => row.length)).toEqual([2, 2]);
      for (const row of rows) {
        for (const cell of row) {
          expect(cell.getColSpan()).toBe(1);
          expect(cell.getRowSpan()).toBe(1);
          expect(cell.getBackgroundColor()).toBe('rgb(255, 0, 0)');
          expect(cell.getVerticalAlign()).toBe('middle');
        }
      }
    });
  });

  test('an unstyled merged cell still splits into unstyled cells', () => {
    using editor = buildEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createTableNodeWithDimensions(1, 2, false));
        const rows = $cells();
        const merged = $mergeCells([rows[0][0], rows[0][1]]);
        assert(merged !== null, 'expected the cells to merge');
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $unmergeCellNode($cells()[0][0]);
      },
      {discrete: true},
    );

    editor.read(() => {
      for (const cell of $cells()[0]) {
        expect(cell.getBackgroundColor()).toBe(null);
        expect(cell.getVerticalAlign()).toBe(undefined);
      }
    });
  });
});
