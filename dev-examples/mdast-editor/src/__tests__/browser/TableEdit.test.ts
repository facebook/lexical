/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  effect,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/mdast';
import {$isTableCellNode, INSERT_TABLE_COMMAND} from '@lexical/table';
import {
  $getRoot,
  $isElementNode,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

import {
  TABLE_EDIT_COMMAND,
  type TableEdit,
} from '../../extensions/TableEditExtension';
import {ToolbarStateExtension} from '../../extensions/ToolbarStateExtension';

const TABLE = '| a | b |\n| - | - |\n| 1 | 2 |';

function mountEditor(markdown: string) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions(ToolbarStateExtension);
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  const toolbar = getExtensionDependencyFromEditor(
    editor,
    ToolbarStateExtension,
  ).output;
  // Subscribe like ToolbarPlugin so the watched editor-state signal updates.
  onTestFinished(
    effect(() => {
      void toolbar.isInTable.value;
    }),
  );
  editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
  return {editor, root, toolbar};
}

function exportMarkdown(editor: LexicalEditor): string {
  return editor.read(() => $convertToMarkdownString());
}

/** Puts the caret at the end of the last cell of the last table. */
function selectLastCell(editor: LexicalEditor) {
  editor.update(
    () => {
      let node: LexicalNode | null = $getRoot().getLastChild();
      while ($isElementNode(node) && !$isTableCellNode(node)) {
        node = node.getLastChild();
      }
      if ($isTableCellNode(node)) {
        node.selectEnd();
      }
    },
    {discrete: true},
  );
}

test('the toolbar sees when the selection is in a table', () => {
  const {editor, toolbar} = mountEditor(`intro\n\n${TABLE}`);
  editor.update(() => $getRoot().selectStart(), {discrete: true});
  expect(toolbar.isInTable.value).toBe(false);
  selectLastCell(editor);
  expect(toolbar.isInTable.value).toBe(true);
});

test.each<[TableEdit, string]>([
  ['row-above', '| a | b |\n| - | - |\n|   |   |\n| 1 | 2 |'],
  ['row-below', '| a | b |\n| - | - |\n| 1 | 2 |\n|   |   |'],
  ['column-left', '| a |   | b |\n| - | - | - |\n| 1 |   | 2 |'],
  ['column-right', '| a | b |   |\n| - | - | - |\n| 1 | 2 |   |'],
  ['delete-row', '| a | b |\n| - | - |'],
  ['delete-column', '| a |\n| - |\n| 1 |'],
  ['delete-table', ''],
  ['align-center', '| a |  b  |\n| - | :-: |\n| 1 |  2  |'],
  ['align-right', '| a |  b |\n| - | -: |\n| 1 |  2 |'],
])('TABLE_EDIT_COMMAND %s', (edit, expected) => {
  const {editor} = mountEditor(TABLE);
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, edit);
  expect(exportMarkdown(editor)).toBe(expected);
});

test('an inserted table exports as GFM with a header row', () => {
  const {editor} = mountEditor('');
  editor.update(() => $getRoot().selectEnd(), {discrete: true});
  editor.dispatchCommand(INSERT_TABLE_COMMAND, {
    columns: '2',
    includeHeaders: {columns: false, rows: true},
    rows: '2',
  });
  expect(exportMarkdown(editor)).toContain('|   |   |\n| - | - |\n|   |   |');
});

test('an aligned column renders and clears its alignment', () => {
  const {editor, root} = mountEditor('| a | b |\n| - | -: |\n| 1 | 2 |');
  const cells = () =>
    [...root.querySelectorAll('td, th')].map(
      cell => (cell as HTMLElement).style.textAlign,
    );
  expect(cells()).toEqual(['', 'right', '', 'right']);
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'align-none');
  // Reading commits the pending update to the DOM.
  editor.read(() => {});
  expect(cells()).toEqual(['', '', '', '']);
  expect(exportMarkdown(editor)).toBe('| a | b |\n| - | - |\n| 1 | 2 |');
});

test('an inserted row takes the alignment of its columns', () => {
  const {editor, root} = mountEditor('| a | b |\n| - | -: |\n| 1 | 2 |');
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  editor.read(() => {});
  expect(
    [...root.querySelectorAll('tr:last-child td')].map(
      cell => (cell as HTMLElement).style.textAlign,
    ),
  ).toEqual(['', 'right']);
});

test('an inserted row takes the alignment set on paragraphs', () => {
  const {editor, root} = mountEditor(TABLE);
  editor.update(
    () => {
      for (const node of $getRoot().getAllTextNodes()) {
        if (node.getTextContent() === 'b' || node.getTextContent() === '2') {
          node.getParentOrThrow<ElementNode>().setFormat('center');
        }
      }
    },
    {discrete: true},
  );
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  editor.read(() => {});
  expect(
    [...root.querySelectorAll('tr:last-child td')].map(
      cell => (cell as HTMLElement).style.textAlign,
    ),
  ).toEqual(['', 'center']);
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | :-: |');
});

test('inserting rows keeps the alignment a column exports', () => {
  const {editor} = mountEditor('| a | b |\n| - | :-: |\n| 1 | 2 |');
  editor.update(
    () => {
      for (const node of $getRoot().getAllTextNodes()) {
        if (node.getTextContent() === '2') {
          node.getParentOrThrow<ElementNode>().setFormat('right');
        }
      }
    },
    {discrete: true},
  );
  // One cell each way: the header's alignment is the column's.
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | :-: |');
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | :-: |');
});

test('an inserted row keeps the alignment most of its column has', () => {
  const {editor} = mountEditor('| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |');
  editor.update(
    () => {
      for (const node of $getRoot().getAllTextNodes()) {
        if (node.getTextContent() === '2' || node.getTextContent() === '4') {
          node.getParentOrThrow<ElementNode>().setFormat('center');
        }
      }
    },
    {discrete: true},
  );
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | :-: |');
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | :-: |');
});

function $justifyText(text: string) {
  for (const node of $getRoot().getAllTextNodes()) {
    if (node.getTextContent() === text) {
      node.getParentOrThrow<ElementNode>().setFormat('justify');
    }
  }
}

test('an inserted row takes the alignment a justified cell exports', () => {
  const {editor, root} = mountEditor('| a | b |\n| - | -: |\n| 1 | 2 |');
  editor.update(() => $justifyText('2'), {discrete: true});
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'row-below');
  editor.read(() => {});
  expect(
    [...root.querySelectorAll('tr:last-child td')].map(
      cell => (cell as HTMLElement).style.textAlign,
    ),
  ).toEqual(['', 'right']);
});

test('aligning a column keeps a justified paragraph', () => {
  const {editor, root} = mountEditor(TABLE);
  editor.update(() => $justifyText('2'), {discrete: true});
  selectLastCell(editor);
  editor.dispatchCommand(TABLE_EDIT_COMMAND, 'align-right');
  editor.read(() => {});
  expect(
    [...root.querySelectorAll('td p, th p')].map(
      p => (p as HTMLElement).style.textAlign,
    ),
  ).toEqual(['', '', '', 'justify']);
  expect(exportMarkdown(editor).split('\n')[1]).toBe('| - | -: |');
});

// https://github.com/facebook/lexical/issues/9323
test('Enter in a cell exports as <br>, not a newline', async () => {
  const {editor, root} = mountEditor(TABLE);
  root.focus();
  selectLastCell(editor);
  await userEvent.keyboard('{Enter}3');
  expect(exportMarkdown(editor)).toBe(
    '| a | b      |\n| - | ------ |\n| 1 | 2<br>3 |',
  );
});
