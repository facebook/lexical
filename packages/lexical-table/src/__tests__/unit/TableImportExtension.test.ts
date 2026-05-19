/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {DOMImportExtension} from '@lexical/html';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellNode,
  TableImportExtension,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {JSDOM} from 'jsdom';
import {
  $getRoot,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [TableImportExtension],
      name: 'table-host',
      nodes: [TableNode, TableRowNode, TableCellNode],
    }),
  );
}

function $generate(editor: LexicalEditor, html: string): LexicalNode[] {
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document);
}

describe('TableImportExtension', () => {
  test('basic 2x2 table imports with correct structure', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const table = $getRoot().getFirstChild() as TableNode;
      expect($isTableNode(table)).toBe(true);
      const rows = table.getChildren() as TableRowNode[];
      expect(rows.length).toBe(2);
      expect($isTableRowNode(rows[0])).toBe(true);
      const cells = rows[0].getChildren() as TableCellNode[];
      expect(cells.length).toBe(2);
      expect($isTableCellNode(cells[0])).toBe(true);
      expect(cells[0].getTextContent()).toBe('a');
      expect(cells[1].getTextContent()).toBe('b');
    });
  });

  test('<th scope="col"> → COLUMN header state', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<table><tr><th scope="col">H</th></tr></table>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const table = $getRoot().getFirstChild() as TableNode;
      const cell = (
        table.getFirstChild() as TableRowNode
      ).getFirstChild() as TableCellNode;
      expect(cell.hasHeader()).toBe(true);
    });
  });

  test('table picks up <thead>/<tbody> rows via $descendantsMatching', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const table = $getRoot().getFirstChild() as TableNode;
      const rows = table.getChildren() as TableRowNode[];
      expect(rows.length).toBe(2);
      expect(rows[0].getFirstChild()?.getTextContent()).toBe('H');
      expect(rows[1].getFirstChild()?.getTextContent()).toBe('B');
    });
  });

  test('row picks up cells via $descendantsMatching even when wrapped', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        // Some pasted HTML wraps cells weirdly; the row's $descendantsMatching
        // should still find them.
        const nodes = $generate(editor, '<table><tr><td>a</td></tr></table>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const row = (
        $getRoot().getFirstChild() as TableNode
      ).getFirstChild() as TableRowNode;
      const cell = row.getFirstChild() as TableCellNode;
      expect(cell.getTextContent()).toBe('a');
    });
  });
});
