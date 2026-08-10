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
  $isTableNode,
  $isTableSelection,
  $mergeCells,
  TableExtension,
} from '@lexical/table';
import {
  $getRoot,
  $getSelection,
  $setSelection,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
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
      name: 'shift-arrow-corner-host',
    }),
  );
  // The arrow key handlers come from the table selection observer, which needs
  // the editor to have a root element.
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

describe('Shift+Arrow with an anchor that is not on a rect corner', () => {
  test('extends the selection instead of throwing', () => {
    editor.update(
      () => {
        const table = $createTableNodeWithDimensions(3, 3, false);
        $getRoot().clear().append(table);
        const [map] = $computeTableMapSkipCellCheck(table, null, null);
        // Merge grid columns 0 and 1 of row 1. This cell straddles the left
        // edge of the rect selected below, so $computeTableCellRectBoundary
        // grows the rect out to column 0 — past the anchor, which then sits on
        // no corner of it.
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

    expect(() =>
      editor.update(
        () => {
          editor.dispatchCommand(
            KEY_ARROW_DOWN_COMMAND,
            new KeyboardEvent('keydown', {key: 'ArrowDown', shiftKey: true}),
          );
        },
        {discrete: true},
      ),
    ).not.toThrow();

    editor.read('latest', () => {
      const selection = $getSelection();
      assert($isTableSelection(selection), 'expected a TableSelection');
      expect(selection.isValid()).toBe(true);
    });
  });
});
