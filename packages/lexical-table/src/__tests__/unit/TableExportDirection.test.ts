/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {$generateHtmlFromNodes} from '@lexical/html';
import {
  $createTableNodeWithDimensions,
  $isTableNode,
  TableExtension,
} from '@lexical/table';
import {$getRoot, defineExtension} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor(hasHorizontalScroll: boolean) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [configExtension(TableExtension, {hasHorizontalScroll})],
      name: 'table-export-dir-host',
      theme: {tableScrollableWrapper: 'scroll-wrapper'},
    }),
  );
}

function exportRtlTable(hasHorizontalScroll: boolean): string {
  using editor = buildEditor(hasHorizontalScroll);
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append(
          $createTableNodeWithDimensions(1, 1, false).setDirection('rtl'),
        );
    },
    {discrete: true},
  );
  return editor.read(() => {
    const table = $getRoot().getFirstChild();
    assert($isTableNode(table), 'expected a TableNode at the root');
    expect(table.getDirection()).toBe('rtl');
    return $generateHtmlFromNodes(editor);
  });
}

describe('TableNode.exportDOM direction', () => {
  test('exports dir with scrollable tables active', () => {
    expect(exportRtlTable(true)).toContain('<table dir="rtl">');
  });

  test('exports dir without scrollable tables', () => {
    expect(exportRtlTable(false)).toContain('<table dir="rtl">');
  });
});
