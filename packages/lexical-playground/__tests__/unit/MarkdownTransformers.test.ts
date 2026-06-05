/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createHeadlessEditor} from '@lexical/headless';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  $isTableNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {$getRoot} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $setTableColumnWidthsManuallyResized,
  PLAYGROUND_TRANSFORMERS,
} from '../../src/plugins/MarkdownTransformers';

const TABLE_MARKDOWN = [
  '| Before | After | Note |',
  '| --- | --- | --- |',
  '| FaceBook | Facebook | make the last word **bold** |',
].join('\n');

function createTestEditor() {
  return createHeadlessEditor({
    namespace: 'MarkdownTransformers',
    nodes: [TableNode, TableRowNode, TableCellNode],
    onError: error => {
      throw error;
    },
  });
}

function $getTable(): TableNode {
  const table = $getRoot().getFirstChild();
  if (!$isTableNode(table)) {
    throw new Error('Expected first root child to be a table.');
  }
  return table;
}

describe('PLAYGROUND_TRANSFORMERS table markdown', () => {
  it('preserves table column widths in markdown metadata', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        $convertFromMarkdownString(TABLE_MARKDOWN, PLAYGROUND_TRANSFORMERS);
        const table = $getTable();
        table.setColWidths([90, 180, 270]);
        $setTableColumnWidthsManuallyResized(table, true);
      },
      {discrete: true},
    );

    const markdown = editor.read(() =>
      $convertToMarkdownString(PLAYGROUND_TRANSFORMERS),
    );

    expect(markdown).toContain(
      '<!-- lexical-table-column-widths: 90,180,270 -->',
    );

    editor.update(
      () => {
        $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS);
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($getTable().getColWidths()).toEqual([90, 180, 270]);
      expect($getRoot().getChildrenSize()).toBe(1);
    });
  });

  it('estimates initial column widths for markdown tables', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        $convertFromMarkdownString(TABLE_MARKDOWN, PLAYGROUND_TRANSFORMERS);
      },
      {discrete: true},
    );

    editor.read(() => {
      const colWidths = $getTable().getColWidths();
      expect(colWidths).toHaveLength(3);
      expect(colWidths?.[2]).toBeGreaterThan(colWidths?.[0] ?? 0);
      expect($convertToMarkdownString(PLAYGROUND_TRANSFORMERS)).not.toContain(
        'lexical-table-column-widths',
      );
    });
  });
});
