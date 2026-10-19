/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

import {
  $createTableNodeWithDimensions,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {createHarness} from './collabTestHarness';

function $cellParagraph(r: number, c: number): ElementNode {
  const table = $getRoot().getChildren().find($isTableNode)!;
  const row = table.getChildAtIndex(r) as ElementNode;
  const cell = row.getChildAtIndex(c) as ElementNode;
  return cell.getFirstChild() as ElementNode;
}

function $initTable() {
  $getRoot()
    .clear()
    .append(
      $createTableNodeWithDimensions(3, 3, false),
      $createParagraphNode(),
    );
}

describe.each([
  ['v1', false],
  ['v2', true],
])('table sync (%s)', (_n, v2) => {
  test('A inserts rows, then B types in a cell (no concurrency)', async () => {
    const {clients, sync} = createHarness(v2, 2);
    const [a, b] = clients;
    a.update($initTable);
    await sync();
    for (let i = 0; i < 2; i++) {
      a.update(() => {
        $cellParagraph(0, 0).selectEnd();
        $insertTableRowAtSelection(true);
      });
      await sync();
    }
    b.update(() => {
      $cellParagraph(1, 1).selectEnd().insertText('x');
    });
    await sync();
    const expected = [
      ['', '', ''],
      ['', 'x', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ];
    expect([...a.errors, ...b.errors]).toEqual([]);
    expect(b.cells()).toEqual(expected);
    expect(a.cells()).toEqual(expected);
  });

  test('rows inserted by two clients, then a third types (no concurrency)', async () => {
    const {clients, sync} = createHarness(v2, 3);
    const [a, b, c] = clients;
    a.update($initTable);
    await sync();
    a.update(() => {
      $cellParagraph(0, 0).selectEnd();
      $insertTableRowAtSelection(true);
    });
    await sync();
    b.update(() => {
      $cellParagraph(1, 0).selectEnd();
      $insertTableRowAtSelection(true);
    });
    await sync();
    c.update(() => {
      $cellParagraph(2, 1).selectEnd().insertText('x');
    });
    await sync();
    a.update(() => {
      $cellParagraph(1, 2).selectEnd().insertText('y');
    });
    await sync();
    const expected = [
      ['', '', ''],
      ['', '', 'y'],
      ['', 'x', ''],
      ['', '', ''],
      ['', '', ''],
    ];
    expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
    expect(c.cells()).toEqual(expected);
    expect(b.cells()).toEqual(expected);
    expect(a.cells()).toEqual(expected);
  });

  // A shrunk random sequence (2x2 table with text, cells addressed
  // row-major) that threw "Lexical node does not exist in active editor
  // state" on v2 and left peers with different shapes.
  test('fuzz-shrunk 3-client sequential row and column edits', async () => {
    const {clients, sync} = createHarness(v2, 3);
    const [a, b, c] = clients;
    const $width = () => {
      const t = $getRoot().getChildren().find($isTableNode)!;
      return (t.getFirstChild() as ElementNode).getChildrenSize();
    };
    const $at = (i: number) => {
      const w = $width();
      return $cellParagraph(Math.floor(i / w), i % w);
    };
    a.update(() => {
      const table = $createTableNodeWithDimensions(2, 2, false);
      $getRoot().clear().append(table, $createParagraphNode());
      ['ab', 'cd', 'ef', 'gh'].forEach((t, i) => {
        const row = table.getChildAtIndex(Math.floor(i / 2)) as ElementNode;
        const cell = row.getChildAtIndex(i % 2) as ElementNode;
        (cell.getFirstChild() as ElementNode).append($createTextNode(t));
      });
    });
    await sync();
    a.update(() => {
      $at(2).selectStart();
      $insertTableRowAtSelection(true);
    });
    await sync();
    a.update(() => {
      $at(0).selectStart();
      $insertTableColumnAtSelection(true);
    });
    await sync();
    a.update(() => {
      $at(3).selectStart();
      $insertTableRowAtSelection(true);
    });
    await sync();
    c.update(() => {
      $at(8).selectStart().insertText('x');
    });
    await sync();
    b.update(() => {
      $at(9).selectStart();
      $insertTableColumnAtSelection(true);
    });
    await sync();
    expect([...a.errors, ...b.errors, ...c.errors]).toEqual([]);
    expect(b.cells()).toEqual(a.cells());
    expect(c.cells()).toEqual(a.cells());
    expect(a.shape()).toEqual([4, 4, 4, 4]);
    expect(a.cells().flat().join(',')).toContain('x');
  });

  // Intent: A inserts an empty row above the (empty) row B is typing in. B's
  // text must stay in B's row, which ends up one row lower.
  test('row insert above ‖ peer types in an empty row below', async () => {
    const {clients, sync, offline} = createHarness(v2, 2);
    const [a, b] = clients;
    a.update($initTable);
    await sync();
    offline();
    a.update(() => {
      $cellParagraph(0, 0).selectEnd();
      $insertTableRowAtSelection(true);
    });
    b.update(() => {
      $cellParagraph(1, 1).selectEnd().insertText('x');
    });
    await sync();
    const expected = [
      ['', '', ''],
      ['', '', ''],
      ['', 'x', ''],
      ['', '', ''],
    ];
    expect([...a.errors, ...b.errors]).toEqual([]);
    expect(a.cells()).toEqual(expected);
    expect(b.cells()).toEqual(expected);
  });

  // The same mis-pairing outside tables: any run of look-alike siblings (here
  // empty paragraphs) is affected.
  test('paragraph inserted between empty paragraphs ‖ peer types in the next one', async () => {
    const {clients, sync, offline} = createHarness(v2, 2);
    const [a, b] = clients;
    const $texts = (editor: LexicalEditor) =>
      editor.read(() =>
        $getRoot()
          .getChildren()
          .map(n => n.getTextContent()),
      );
    a.update(() => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append($createTextNode('top')),
          $createParagraphNode(),
          $createParagraphNode(),
          $createParagraphNode(),
        );
    });
    await sync();
    offline();
    a.update(() => {
      ($getRoot().getChildAtIndex(1) as ElementNode).insertAfter(
        $createParagraphNode(),
      );
    });
    b.update(() => {
      ($getRoot().getChildAtIndex(2) as ElementNode)
        .selectEnd()
        .insertText('x');
    });
    await sync();
    const expected = ['top', '', '', 'x', ''];
    expect([...a.errors, ...b.errors]).toEqual([]);
    expect($texts(a.editor)).toEqual(expected);
    expect($texts(b.editor)).toEqual(expected);
  });
});
