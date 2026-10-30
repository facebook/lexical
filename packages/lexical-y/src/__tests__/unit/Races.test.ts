/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$toggleLink} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $insertList,
  type ListItemNode,
} from '@lexical/list';
import {$wrapSelectionInMarkNode} from '@lexical/mark';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createTableNodeWithDimensions,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $mergeCells,
  type TableCellNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type ElementNode,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $createBoxNode,
  $p,
  $selectIn,
  type Delivery,
  describeNode,
  expectConverged,
  type Peer,
  type Setup,
  setup,
} from '../utils/harness';

// Concurrent edits racing typing or each other, run
// headless: A and B edit offline, C is a third peer, then all sync. Both id
// orders, causal and per-sender delivery.

const P = 'Revenue grew 4% in Q3.';
const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));
const $initPara = () => $getRoot().append($p(P));
const $initLinked = () => {
  $initPara();
  $selectIn([0], 8, 15);
  $toggleLink('https://x');
};
const $initList = () =>
  $getRoot().append(
    $createListNode('bullet').append($li('one'), $li('two'), $li('three')),
  );
const $initTable = () => {
  $getRoot().append($createTableNodeWithDimensions(3, 3, false));
  $getRoot().append($createParagraphNode());
};
function $cell(r: number, c: number): ElementNode {
  const t = $getRoot().getChildren().find($isTableNode)!;
  return (t.getChildAtIndex(r) as ElementNode).getChildAtIndex(
    c,
  ) as ElementNode;
}
function $typeInCell(r: number, c: number, text: string) {
  ($cell(r, c).getFirstChild() as ElementNode).selectEnd().insertText(text);
}
function tableText(peer: Peer): string {
  return peer.read(() => {
    const parts: string[] = [];
    for (const n of $getRoot().getChildren()) {
      if ($isTableNode(n)) {
        parts.push(
          'table' +
            JSON.stringify(
              n
                .getChildren()
                .filter($isTableRowNode)
                .map(r =>
                  r
                    .getChildren()
                    .filter($isTableCellNode)
                    .map((cell: LexicalNode) => cell.getTextContent()),
                ),
            ),
        );
      } else {
        parts.push(describeNode(n));
      }
    }
    return parts.join(' / ');
  });
}

type Case = {
  id: string;
  init: () => void;
  a?: () => void;
  b?: () => void;
  run?: (t: Setup) => Promise<void>;
  expected: string | ((t: Setup) => void);
  /** A documented limit: converges without loss, intent not kept. */
  limit?: string;
};

const CASES: Case[] = [
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => {
      $selectIn([0], 8, 15);
      $toggleLink('https://x');
    },
    expected: 'paragraph("Revenue " link<https://x>("grew by 4%") " in Q3.")',
    id: 'link ‖ type inside it',
    init: $initPara,
  },
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => {
      $selectIn([0], 8, 15);
      $toggleLink(null);
    },
    expected: 'paragraph("Revenue grew by 4% in Q3.")',
    id: 'unlink ‖ type',
    init: $initLinked,
  },
  {
    a: () => $selectIn([0], 19).insertText('ZZ'),
    b: () => {
      $selectIn([0], 8, 15);
      $toggleLink('https://x');
    },
    expected: 'paragraph("Revenue " link<https://x>("grew 4%") " in ZZQ3.")',
    id: 'link ‖ type after it',
    init: $initPara,
  },
  {
    expected: 'paragraph("Revenue grew by 4% in Q3.")',
    id: 'undo link after a peer typed in it',
    init: $initPara,
    run: async t => {
      t.a.update(() => {
        $selectIn([0], 8, 15);
        $toggleLink('https://x');
      });
      await t.sync();
      t.b.update(() => $selectIn([0], 13).insertText('by '));
      await t.sync();
      t.a.undo();
      await t.sync();
    },
  },
  {
    a: () => $selectIn([0], 8, 15).formatText('bold'),
    b: () => $selectIn([0], 11, 19).formatText('italic'),
    expected: 'paragraph("Revenue " "gre"{1} "w 4%"{3} " in "{2} "Q3.")',
    id: 'bold ‖ italic overlap',
    init: $initPara,
  },
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => $setBlocksType($selectIn([0], 0), () => $createHeadingNode('h1')),
    expected: 'heading[h1]("Revenue grew by 4% in Q3.")',
    id: 'heading ‖ type',
    init: $initPara,
  },
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => $setBlocksType($selectIn([0], 0), () => $createQuoteNode()),
    expected: 'quote("Revenue grew by 4% in Q3.")',
    id: 'quote ‖ type',
    init: $initPara,
  },
  {
    a: () => $selectIn([0], 8).insertParagraph(),
    b: () => $selectIn([0], 13).insertText('by '),
    expected: 'paragraph("Revenue ") / paragraph("grew by 4% in Q3.")',
    id: 'Enter ‖ type in the tail',
    init: $initPara,
  },
  {
    a: () => $selectIn([1], 0).deleteCharacter(true),
    b: () => $selectIn([1], 7).insertText('really '),
    expected: 'paragraph("Revenue grew 4% in Q3.Second really line.")',
    id: 'Backspace join ‖ type in the second line',
    init: () => $getRoot().append($p(P), $p('Second line.')),
  },
  {
    a: () => {
      $selectIn([0, 1], 3);
      ($block([0, 1]) as ListItemNode).setIndent(1);
    },
    b: () => $selectIn([0, 1], 3).insertText('X'),
    expected:
      'list[bullet](listitem("one") listitem(list[bullet](listitem("twoX"))) listitem("three"))',
    id: 'list indent ‖ type',
    init: $initList,
  },
  {
    a: () => {
      $selectIn([0, 1], 1);
      $insertList('number');
    },
    b: () => $selectIn([0, 1], 3).insertText('X'),
    expected:
      'list[number](listitem("one") listitem("twoX") listitem("three"))',
    id: 'list type ‖ type',
    init: $initList,
  },
  {
    a: () => {
      $selectIn([0, 0, 0, 0], 1);
      $insertList('bullet');
    },
    b: () => $selectIn([0, 0, 0, 0], 3).insertText('X'),
    expected: 'table(tablerow(tablecell(list[bullet](listitem("twoX")))))',
    id: 'list in a table cell ‖ type',
    init: () => {
      const table = $createTableNodeWithDimensions(1, 1, false);
      $getRoot().append(table);
      const cell = $block([0, 0, 0]);
      cell.clear();
      cell.append($p('two'));
    },
  },
  {
    a: () => {
      $selectIn([0, 0], 1);
      $insertList('bullet');
    },
    b: () => $selectIn([0, 0], 3).insertText('X'),
    expected: 'list[bullet](listitem("two"))',
    // Documented (Moves): Lexical replaces the container with the list, a
    // move, so the typing is lost.
    id: 'list in a container that is not a shadow root ‖ type',
    init: () => $getRoot().append($createBoxNode('b').append($p('two'))),
  },
  {
    // Documented (Undo): the undo restores the old block, and the edit of
    // the new block stays next to it.
    expected: 'paragraph("Revenue grew 4% in Q3.by ")',
    id: 'undo of a block replacement after a collaborator edits the new block',
    init: $initPara,
    run: async t => {
      t.a.update(() => $block([0]).replace($p(P)));
      await t.sync();
      t.b.update(() => $selectIn([0], 13).insertText('by '));
      await t.sync();
      t.a.undo();
      await t.sync();
    },
  },
  {
    a: () => $block([0]).insertAfter($p('New.')),
    b: () => $selectIn([1], 0).deleteCharacter(true),
    expected: 'paragraph("Revenue grew 4%New.") / paragraph(" in Q3.")',
    // Documented (Other races): the line before joins the inserted block,
    // and the line after stays apart.
    id: 'block inserted at a join ‖ Backspace join',
    init: () => $getRoot().append($p('Revenue grew 4%'), $p(' in Q3.')),
  },
  {
    a: () => {
      const row = $block([0, 0]);
      $mergeCells([
        row.getChildAtIndex(0) as TableCellNode,
        row.getChildAtIndex(1) as TableCellNode,
      ]);
    },
    b: () => $selectIn([0, 0, 1, 0], 5).insertText('X'),
    // Documented (Moves): merging cells moves the content of the merged-away
    // cell, so the typing in it is lost.
    expected:
      'table(tablerow(tablecell(paragraph("left") paragraph("right"))))',
    id: 'merge cells ‖ type in the cell merged away',
    init: () => {
      const table = $createTableNodeWithDimensions(1, 2, false);
      $getRoot().append(table);
      $block([0, 0, 0]).clear().append($p('left'));
      $block([0, 0, 1]).clear().append($p('right'));
    },
  },
  {
    // Documented (Moves, Undo): the box keeps the moved paragraph once B
    // typed in it, and the undo restores the paragraph next to it.
    expected:
      'test_box[b](paragraph("movedX para")) / paragraph("moved para") / paragraph("end")',
    id: 'undo of a box wrap after a collaborator types in the wrapped block',
    init: () => $getRoot().append($p('moved para'), $p('end')),
    run: async t => {
      t.a.update(() => {
        const box = $createBoxNode('b');
        $block([0]).insertBefore(box);
        box.append($block([1]));
      });
      await t.sync();
      t.b.update(() => $selectIn([0, 0], 5).insertText('X'));
      await t.sync();
      t.a.undo();
      await t.sync();
    },
  },
  {
    a: () => $selectIn([0, 1], 1).insertParagraph(),
    b: () => $selectIn([0, 1], 3).insertText('X'),
    expected:
      'list[bullet](listitem("one") listitem("t") listitem("woX") listitem("three"))',
    id: 'Enter in a list item ‖ type',
    init: $initList,
  },
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => $block([1]).insertAfter($block([0])),
    expected: 'paragraph("Second.") / paragraph("Revenue grew by 4% in Q3.")',
    id: 'move ‖ type',
    init: () => $getRoot().append($p(P), $p('Second.')),
    limit: 'a move is a delete and reinsert: the typing lands in a neighbour',
  },
  {
    a: () => $block([2]).insertAfter($block([0])),
    b: () => $block([0]).insertBefore($block([2])),
    expected: t => {
      const parts = t.a.describe().split(' / ').sort();
      expect(parts).toEqual([
        'paragraph("one")',
        'paragraph("three")',
        'paragraph("two")',
      ]);
    },
    id: 'move ‖ move',
    init: () => $getRoot().append($p('one'), $p('two'), $p('three')),
  },
  {
    expected: t =>
      expect(tableText(t.a)).toBe(
        'table[["","",""],["","x",""],["","",""],["","",""],["","","y"]] / paragraph()',
      ),
    id: 'rows inserted, then typing in cells',
    init: $initTable,
    run: async t => {
      for (let i = 0; i < 2; i++) {
        t.a.update(() => {
          ($cell(0, 0).getFirstChild() as ElementNode).selectEnd();
          $insertTableRowAtSelection(true);
        });
        await t.sync();
      }
      t.b.update(() => $typeInCell(1, 1, 'x'));
      await t.sync();
      t.b.update(() => $typeInCell(4, 2, 'y'));
      await t.sync();
    },
  },
  {
    a: () => {
      $typeInCell(0, 0, 'a');
      $typeInCell(1, 1, 'c');
    },
    b: () => {
      $typeInCell(0, 1, 'b');
      $typeInCell(1, 1, 'd');
    },
    expected: t =>
      expect([
        'table[["a","b",""],["","cd",""],["","",""]] / paragraph()',
        'table[["a","b",""],["","dc",""],["","",""]] / paragraph()',
      ]).toContain(tableText(t.a)),
    id: 'typing in cells ‖ typing in cells',
    init: $initTable,
  },
  {
    a: () => {
      ($cell(0, 0).getFirstChild() as ElementNode).selectEnd();
      $insertTableRowAtSelection(true);
    },
    b: () => {
      ($cell(0, 1).getFirstChild() as ElementNode).selectEnd();
      $insertTableColumnAtSelection(true);
    },
    // Shown as stored: the inserted row lacks the inserted column, until
    // the next table command pads it.
    expected: t =>
      expect(tableText(t.a)).toBe(
        'table[["","","",""],["","",""],["","","",""],["","","",""]] / paragraph()',
      ),
    id: 'row insert ‖ column insert',
    init: $initTable,
  },
  {
    a: () => $selectIn([0], 13).insertText('by '),
    b: () => $wrapSelectionInMarkNode($selectIn([0], 8, 15), false, 'c1'),
    expected: 'paragraph("Revenue " mark<c1>("grew by 4%") " in Q3.")',
    id: 'MarkNode comment ‖ type',
    init: $initPara,
    limit:
      'MarkNode is an inline element with its own content: wrapping moves the text into it',
  },
];

const ORDERS: {name: string; ids: number[]; delivery: Delivery}[] = [
  {delivery: 'causal', ids: [1, 2, 3], name: 'A=1 B=2 causal'},
  {delivery: 'causal', ids: [2, 1, 3], name: 'A=2 B=1 causal'},
  {delivery: 'sender', ids: [1, 2, 3], name: 'A=1 B=2 per-sender'},
  {delivery: 'sender', ids: [2, 1, 3], name: 'A=2 B=1 per-sender'},
];

describe.each(ORDERS)('@lexical/y races, $name', ({ids, delivery}) => {
  for (const k of CASES) {
    test(k.id, async () => {
      const t = await setup(k.init, {delivery, ids});
      if (k.run) {
        await k.run(t);
      } else {
        t.offline();
        t.a.update(k.a!);
        t.b.update(k.b!);
        await t.sync();
      }
      await expectConverged(t.peers);
      if (k.limit !== undefined) {
        // Documented limit: record it, require only convergence.
        return;
      }
      if (typeof k.expected === 'string') {
        expect(t.a.describe()).toBe(k.expected);
      } else {
        k.expected(t);
      }
    });
  }
});

// AUDIT-U1: an undo of a format while a collaborator's plain text inside its
// range restored that format after itself (y.md Limits, Undo). Arriving as
// the undo is made, the restore keeps the format on the text after the
// typing: the undoing client cannot see it. Seen before the undo, the
// undoing client holds the restore and can end the value past it.
describe('@lexical/y undo of a format ‖ plain text typed inside its range', () => {
  const $init = () => $getRoot().append($p('one two'), $p('tail'));
  const bold = (t: Setup) => {
    t.a.update(() => void $selectIn([0], 0, 7).formatText('bold'));
  };
  const typePlain = (t: Setup) => {
    t.b.update(() => {
      const selection = $selectIn([0], 3);
      selection.format = 0;
      selection.insertText(' mid');
    });
  };
  for (const ids of [
    [1, 2, 3],
    [2, 1, 3],
  ]) {
    test(`AUDIT-U1 arriving as the undo is made: the text after the typing keeps the format (${ids})`, async () => {
      const t = await setup($init, {ids});
      bold(t);
      await t.sync();
      t.offline();
      typePlain(t);
      t.a.undo();
      await t.sync();
      await expectConverged(t.peers);
      expect(t.a.describe()).toBe(
        'paragraph("one mid" " two"{1}) / paragraph("tail")',
      );
    });
    test.fails(
      `AUDIT-U1 seen before the undo: the undo removes the format everywhere (${ids})`,
      async () => {
        const t = await setup($init, {ids});
        bold(t);
        await t.sync();
        typePlain(t);
        await t.sync();
        t.a.undo();
        await t.sync();
        await expectConverged(t.peers);
        expect(t.a.describe()).toBe(
          'paragraph("one mid two") / paragraph("tail")',
        );
      },
    );
  }
});
