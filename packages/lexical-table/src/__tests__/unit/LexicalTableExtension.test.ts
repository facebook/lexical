/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {$getRoot, defineExtension} from 'lexical';
import {describe, expect, it} from 'vitest';

describe('Table', () => {
  it('Creates a table with INSERT_TABLE_COMMAND', () => {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: 'table-test',
        theme: {tableScrollableWrapper: 'table-scrollable-wrapper'},
      }),
    );
    editor.update(
      () => {
        $getRoot().selectEnd();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '3',
          includeHeaders: true,
          rows: '2',
        });
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect(children.map((node) => node.getType())).toEqual([
        'paragraph',
        'table',
        'paragraph',
      ]);
      const table = children[1] as TableNode;
      expect($isTableNode(table)).toBe(true);
      const rows = table.getChildren();
      expect(rows.length).toBe(2);
      rows.forEach((row) => {
        expect($isTableRowNode(row)).toBe(true);
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          expect(cells.length).toBe(3);
          expect(cells.every($isTableCellNode));
        }
      });
    });
  });
});
