/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Block moves keep the moved items: a move record shows them at the new
// place. Each case runs headless with two editing peers and a third one,
// in both client id orders and with causal and per-sender delivery, and
// checks convergence, a fresh reader and the self-check.

import type {State} from '../../internal/State';

import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  type ListItemNode,
} from '@lexical/list';
import {$createHeadingNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createTableNodeWithDimensions,
  $isTableNode,
  type TableNode,
} from '@lexical/table';
import * as Y from '@y/y';
import {
  $create,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {moveReadStats} from '../../internal/MoveRead';
import {MOVE, Zones} from '../../internal/Moves';
import {
  $block,
  $createBoxNode,
  $locateIn,
  $p,
  $selectIn,
  type Delivery,
  expectConverged,
  type Peer,
  setup,
  WidgetNode,
} from '../utils/harness';

const ORDERS: {name: string; ids: number[]; delivery: Delivery}[] = [
  {delivery: 'causal', ids: [1, 2, 3], name: 'A=1 B=2 causal'},
  {delivery: 'causal', ids: [2, 1, 3], name: 'A=2 B=1 causal'},
  {delivery: 'sender', ids: [1, 2, 3], name: 'A=1 B=2 per-sender'},
  {delivery: 'sender', ids: [2, 1, 3], name: 'A=2 B=1 per-sender'},
];

const $createWidget = () => $create(WidgetNode);
const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));

/** Live move records anywhere in the document. */
function records(doc: Y.Doc): number {
  let n = 0;
  const visit = (y: Y.Node) => {
    for (let it = y._start; it !== null; it = it.right) {
      if (!it.deleted && it.content instanceof Y.ContentType) {
        if (it.content.type.name === MOVE) {
          n++;
        }
        visit(it.content.type as Y.Node);
      }
    }
  };
  visit(doc.get('lexical-y'));
  return n;
}

/** Characters deleted anywhere (a real move deletes none). */
function deletedChars(doc: Y.Doc): number {
  let n = 0;
  const visit = (y: Y.Node) => {
    for (let it = y._start; it !== null; it = it.right) {
      if (it.deleted && it.content instanceof Y.ContentString) {
        n += it.length;
      }
      if (it.content instanceof Y.ContentType) {
        visit(it.content.type as Y.Node);
      }
    }
  };
  visit(doc.get('lexical-y'));
  return n;
}

function $table(): TableNode {
  return $getRoot().getChildren().find($isTableNode) as TableNode;
}

function $cell(r: number, c: number): ElementNode {
  return ($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(
    c,
  ) as ElementNode;
}

function tableText(peer: Peer): string {
  return peer.read(() =>
    JSON.stringify(
      $table()
        .getChildren()
        .map(r =>
          (r as ElementNode).getChildren().map(c => c.getTextContent()),
        ),
    ),
  );
}

describe.each(ORDERS)('@lexical/y moves, $name', ({ids, delivery}) => {
  const run = async (
    init: () => void,
    a: () => void,
    b: () => void,
    expected?: string,
  ) => {
    const t = await setup(init, {delivery, ids});
    t.offline();
    t.a.update(a);
    t.b.update(b);
    await t.sync();
    await expectConverged(t.peers, expected);
    return t;
  };

  test('a moved paragraph keeps its items: one record, nothing deleted', async () => {
    const t = await setup(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      {delivery, ids},
    );
    t.a.update(() => $block([0]).insertBefore($block([2])));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("three") / paragraph("one") / paragraph("two")',
    );
    expect(records(t.a.doc)).toBe(1);
    expect(deletedChars(t.a.doc)).toBe(0);
  });

  test('move ‖ type inside the moved paragraph', async () => {
    await run(
      () => $getRoot().append($p('Revenue grew 4% in Q3.'), $p('Second.')),
      () => $selectIn([0], 13).insertText('by '),
      () => $block([1]).insertAfter($block([0])),
      'paragraph("Second.") / paragraph("Revenue grew by 4% in Q3.")',
    );
  });

  test('move ‖ type at the start and at the end of the moved paragraph', async () => {
    await run(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      () => {
        $selectIn([0], 0).insertText('<');
        $selectIn([0], 4).insertText('>');
      },
      () => $block([2]).insertAfter($block([0])),
      'paragraph("two") / paragraph("three") / paragraph("<one>")',
    );
  });

  test('move ‖ move of the same paragraph: one copy', async () => {
    const t = await run(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      () => $block([2]).insertAfter($block([0])),
      () => $block([2]).insertBefore($block([0])),
    );
    const parts = t.a.describe().split(' / ').sort();
    expect(parts).toEqual([
      'paragraph("one")',
      'paragraph("three")',
      'paragraph("two")',
    ]);
  });

  test('move ‖ move of the same paragraph to two places, typing in it', async () => {
    const t = await setup(
      () => $getRoot().append($p('one'), $p('two'), $p('three'), $p('four')),
      {delivery, ids},
    );
    t.offline();
    t.a.update(() => {
      $block([3]).insertAfter($block([0]));
      $selectIn([3], 3).insertText('A');
    });
    t.b.update(() => {
      $block([2]).insertBefore($block([0]));
      $selectIn([1], 0).insertText('B');
    });
    await t.sync();
    await expectConverged(t.peers);
    const text = t.a.describe();
    expect(text.match(/one/g)?.length).toBe(1);
    expect(text).toContain('paragraph("BoneA")');
  });

  test('moves of neighbours: both apply', async () => {
    const t = await run(
      () => $getRoot().append($p('a'), $p('b'), $p('c'), $p('d')),
      () => $block([1]).insertAfter($block([0])),
      () => $block([2]).insertBefore($block([3])),
    );
    // Both moved into the same gap (after b, before c): either order.
    expect([
      'paragraph("b") / paragraph("a") / paragraph("d") / paragraph("c")',
      'paragraph("b") / paragraph("d") / paragraph("a") / paragraph("c")',
    ]).toContain(t.a.describe());
  });

  test('move ‖ delete of the moved paragraph: text typed in it survives', async () => {
    await run(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      () => {
        $block([2]).insertAfter($block([0]));
        $selectIn([2], 3).insertText('!');
      },
      () => $block([0]).remove(),
    );
  });

  test('move ‖ retype of the moved paragraph: both apply', async () => {
    await run(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      () => $block([2]).insertAfter($block([0])),
      () => $setBlocksType($selectIn([0], 1), () => $createHeadingNode('h2')),
      'paragraph("two") / paragraph("three") / heading[h2]("one")',
    );
  });

  test('move ‖ bold inside the moved paragraph: both apply', async () => {
    await run(
      () => $getRoot().append($p('one two'), $p('three')),
      () => $block([1]).insertAfter($block([0])),
      () => $selectIn([0], 0, 3).formatText('bold'),
      'paragraph("three") / paragraph("one"{1} " two")',
    );
  });

  test('Enter in the moved paragraph ‖ the move: both halves move', async () => {
    await run(
      () => $getRoot().append($p('one two'), $p('three'), $p('four')),
      () => $selectIn([0], 3).insertParagraph(),
      () => $block([2]).insertAfter($block([0])),
      'paragraph("three") / paragraph("four") / paragraph("one") / paragraph(" two")',
    );
  });

  test('Enter ‖ typing in the tail of a moved paragraph', async () => {
    const t = await setup(() => $getRoot().append($p('one two'), $p('three')), {
      delivery,
      ids,
    });
    t.a.update(() => $block([1]).insertAfter($block([0])));
    await t.sync();
    t.offline();
    t.a.update(() => $selectIn([1], 3).insertParagraph());
    t.b.update(() => $selectIn([1], 5).insertText('X'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("three") / paragraph("one") / paragraph(" tXwo")',
    );
  });

  test('Backspace join ‖ typing in a moved paragraph that is joined', async () => {
    const t = await setup(
      () => $getRoot().append($p('one'), $p('two'), $p('three')),
      {delivery, ids},
    );
    // Move "three" up, then join "two" into it (both in its range).
    t.a.update(() => $block([2]).insertBefore($block([1])));
    await t.sync();
    t.offline();
    t.a.update(() => $selectIn([2], 0).deleteCharacter(true));
    t.b.update(() => $selectIn([2], 1).insertText('X'));
    await t.sync();
    await expectConverged(t.peers);
    expect(t.a.describe()).toContain('X');
  });

  test('a list item moved up ‖ typing in it', async () => {
    await run(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('one'),
            $li('two'),
            $li('three'),
          ),
        ),
      () => {
        const list = $block([0]);
        list.getChildAtIndex(0)!.insertBefore(list.getChildAtIndex(2)!);
      },
      () => $selectIn([0, 2], 5).insertText('!'),
      'list[bullet](listitem("three!") listitem("one") listitem("two"))',
    );
  });

  test('a list item moved ‖ indented by a peer: both apply', async () => {
    await run(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('one'),
            $li('two'),
            $li('three'),
          ),
        ),
      () => {
        const list = $block([0]);
        list.getChildAtIndex(2)!.insertAfter(list.getChildAtIndex(0)!);
      },
      () => ($block([0]).getChildAtIndex(1) as ListItemNode).setIndent(1),
    );
  });

  test('a whole list moved ‖ a peer adds an item to it: the item moves too', async () => {
    const t = await run(
      () =>
        $getRoot().append(
          $p('top'),
          $createListNode('bullet').append($li('one'), $li('two')),
          $p('end'),
        ),
      () => $block([2]).insertAfter($block([1])),
      () => $selectIn([1, 0], 3).insertParagraph(),
    );
    const text = t.a.describe();
    expect(text.startsWith('paragraph("top") / paragraph("end") / list')).toBe(
      true,
    );
    expect(text).toContain('listitem("one") listitem() listitem("two")');
  });

  test('a list item moved between lists keeps typing', async () => {
    await run(
      () =>
        $getRoot().append(
          $createListNode('bullet').append($li('a1'), $li('a2')),
          $p('mid'),
          $createListNode('number').append($li('b1')),
        ),
      () => {
        const item = $block([0]).getChildAtIndex(1)!;
        $block([2]).getChildAtIndex(0)!.insertAfter(item);
      },
      () => $selectIn([0, 1], 2).insertText('!'),
      'list[bullet](listitem("a1")) / paragraph("mid") / list[number](listitem("b1") listitem("a2!"))',
    );
  });

  test('a table row moved ‖ typing in one of its cells', async () => {
    const t = await setup(
      () => {
        $getRoot().append($createTableNodeWithDimensions(3, 2, false));
      },
      {delivery, ids},
    );
    t.a.update(() => {
      ($cell(0, 0).getFirstChild() as ElementNode).append(
        $createTextNode('r0'),
      );
      ($cell(2, 0).getFirstChild() as ElementNode).append(
        $createTextNode('r2'),
      );
    });
    await t.sync();
    t.offline();
    t.a.update(() => {
      const table = $table();
      table.getChildAtIndex(0)!.insertBefore(table.getChildAtIndex(2)!);
    });
    t.b.update(() =>
      ($cell(2, 0).getFirstChild() as ElementNode).selectEnd().insertText('!'),
    );
    await t.sync();
    await expectConverged(t.peers);
    expect(tableText(t.a)).toBe('[["r2!",""],["r0",""],["",""]]');
  });

  test('a table column moved ‖ typing in a moved cell', async () => {
    const t = await setup(
      () => {
        $getRoot().append($createTableNodeWithDimensions(2, 3, false));
      },
      {delivery, ids},
    );
    t.a.update(() => {
      ($cell(0, 2).getFirstChild() as ElementNode).append(
        $createTextNode('c2'),
      );
      ($cell(1, 0).getFirstChild() as ElementNode).append(
        $createTextNode('c0'),
      );
    });
    await t.sync();
    t.offline();
    // Move the last column first (each row's cell).
    t.a.update(() => {
      for (const row of $table().getChildren() as ElementNode[]) {
        row.getChildAtIndex(0)!.insertBefore(row.getChildAtIndex(2)!);
      }
    });
    t.b.update(() =>
      ($cell(0, 2).getFirstChild() as ElementNode).selectEnd().insertText('!'),
    );
    await t.sync();
    await expectConverged(t.peers);
    expect(tableText(t.a)).toBe('[["c2!","",""],["","c0",""]]');
  });

  test('a container moved ‖ typing inside it', async () => {
    await run(
      () =>
        $getRoot().append(
          $p('top'),
          $createBoxNode('o').append($p('inside')),
          $p('end'),
        ),
      () => $block([2]).insertAfter($block([1])),
      () => $selectIn([1, 0], 6).insertText('!'),
      'paragraph("top") / paragraph("end") / test_box[o](paragraph("inside!"))',
    );
  });

  test('a block decorator moved ‖ typing next to it', async () => {
    await run(
      () => $getRoot().append($p('one'), $createWidget(), $p('two')),
      () => $block([2]).insertAfter($block([1])),
      () => $selectIn([0], 3).insertText('!'),
      'paragraph("one!") / paragraph("two") / test_widget',
    );
  });

  test('a move ‖ a move of the same block into a cell a peer removes: converges', async () => {
    // The move into the cell is a delete and a reinsert (another container):
    // its delete wins over the record, and the copy goes with the removed
    // column (a documented limit of moves across containers).
    const t = await setup(
      () => {
        $getRoot().append($createTableNodeWithDimensions(1, 2, false));
        $getRoot().append($p('moved'), $p('end'));
      },
      {delivery, ids},
    );
    t.offline();
    t.a.update(() => {
      $block([1]).insertAfter($block([2]));
      for (const row of $table().getChildren() as ElementNode[]) {
        row.getChildAtIndex(1)!.remove();
      }
    });
    t.b.update(() => {
      ($cell(0, 1).getFirstChild() as ElementNode).insertAfter($block([1]));
    });
    await t.sync();
    await expectConverged(t.peers);
  });

  test('a move of a line ‖ a join of the line after it, past a moved block', async () => {
    // "bb" and "aa" show elsewhere: the items of "bb" lie between "ext" and
    // "cc". B joins "cc" into "ext", deleting the marker of "ext", whose
    // text then shows in "cc" (the next line of its zone). A's record over
    // "ext" ends with that marker and takes the text back: the peers read
    // "cc" again although the end item right after the range is another
    // zone's.
    const t = await setup(
      () => $getRoot().append($p('aa'), $p('ext'), $p('bb'), $p('cc')),
      {delivery, ids},
    );
    t.a.update(() => $block([0]).insertBefore($block([2])));
    t.a.update(() => $block([3]).insertAfter($block([1])));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("bb") / paragraph("ext") / paragraph("cc") / paragraph("aa")',
    );
    t.offline();
    t.a.update(() => $block([0]).insertBefore($block([1])));
    t.b.update(() => $selectIn([2], 0).deleteCharacter(true));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("ext") / paragraph("bb") / paragraph("cc") / paragraph("aa")',
    );
  });

  test('a delete across list items, next to a moved block, keeps the rest of the list', async () => {
    // The heading's items stay before the list; its record shows it after
    // "c". Deleting from "a" to the end of "c" removes the item "b" of the
    // list (and "c"): the list keeps "a" although the heading now shows
    // between the list and "end".
    const t = await setup(
      () =>
        $getRoot().append(
          $p('zero'),
          $createHeadingNode('h2').append($createTextNode('h')),
          $createListNode('bullet').append($li('a'), $li('b')),
          $p('c'),
          $p('end'),
        ),
      {delivery, ids},
    );
    t.a.update(() => $block([4]).insertBefore($block([1])));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("zero") / list[bullet](listitem("a") listitem("b")) / paragraph("c") / heading[h2]("h") / paragraph("end")',
    );
    t.b.update(() => {
      const list = $block([1]);
      const a = (list.getFirstChild() as ElementNode).getFirstChild()!;
      const c = $block([2]).getFirstChild()!;
      const sel = $selectIn([2], 1);
      sel.anchor.set(a.getKey(), 1, 'text');
      sel.focus.set(c.getKey(), 1, 'text');
      sel.removeText();
    });
    await t.sync();
    await expectConverged(t.peers);
    expect(t.a.describe()).toContain('listitem("a")');
  });

  test('a move into a container (another sequence) converges', async () => {
    await run(
      () => $getRoot().append($p('one'), $createBoxNode('o').append($p('in'))),
      () => $block([1, 0]).insertAfter($block([0])),
      () => $selectIn([0], 3).insertText('!'),
    );
  });
});

// Two peers moving one block concurrently leave two records of one range:
// the one of lower rank shows nothing (a later write deletes it). An edit
// made at the same time that removes the line boundary before it (a join, a
// removal of the block before while a peer types in it) leaves that record
// between the characters of one line. A later move of that line must still
// move all of its characters.
describe.each(ORDERS)(
  '@lexical/y moves: a record that shows nothing inside a moved line, $name',
  ({ids, delivery}) => {
    const $five = () =>
      $getRoot().append($p('M0'), $p('M1'), $p('M2'), $p('M3'), $p('M4'));
    /** Backspace at the start of block `i`: its text joins the previous. */
    const $join = (i: number) => {
      const prev = $block([i - 1]);
      const cur = $block([i]);
      prev.append(...cur.getChildren());
      cur.remove();
    };
    const moved =
      'paragraph("M4") / paragraph("M2") / paragraph(%) / paragraph("M3")';

    test('move ‖ move to the same place ‖ join, then the joined line moves', async () => {
      const t = await setup($five, {delivery, ids});
      t.offline();
      t.a.update(() => $block([1]).insertBefore($block([4])));
      t.b.update(() => $block([1]).insertBefore($block([4])));
      t.c.update(() => $join(1));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("M4") / paragraph("M0M1") / paragraph("M2") / paragraph("M3")',
      );
      t.c.update(() => $block([2]).insertAfter($block([1])));
      await t.sync();
      await expectConverged(t.peers, moved.replace('%', '"M0M1"'));
      expect(records(t.a.doc)).toBe(2);
    });

    test('move ‖ move to another place ‖ join, then the joined line moves', async () => {
      const t = await setup($five, {delivery, ids});
      t.offline();
      t.a.update(() => $block([1]).insertBefore($block([4])));
      t.b.update(() => $block([0]).insertBefore($block([4])));
      t.c.update(() => $join(1));
      await t.sync();
      t.c.update(() => $block([2]).insertAfter($block([1])));
      await t.sync();
      await expectConverged(t.peers, moved.replace('%', '"M0M1"'));
    });

    test('move ‖ move ‖ removal of the block before while typing in it, then the line moves', async () => {
      const t = await setup($five, {delivery, ids});
      t.offline();
      t.a.update(() => {
        $block([1]).insertBefore($block([4]));
        $selectIn([0], 2).insertText('X');
      });
      t.b.update(() => $block([1]).insertBefore($block([4])));
      t.c.update(() => $block([0]).remove());
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("M4") / paragraph("XM1") / paragraph("M2") / paragraph("M3")',
      );
      t.c.update(() => $block([2]).insertAfter($block([1])));
      await t.sync();
      await expectConverged(t.peers, moved.replace('%', '"XM1"'));
    });
  },
);

// A record that shows a block lies inside another line when the line
// around it changed concurrently: a peer joined the lines around it (the
// record is inside the joined range), or removed the line before it while
// another typed in that line (the record is after the typed text). Nothing
// can go between the block and that line there: a unit written after the
// block goes before the next line, or the block gets a record of its own
// where it shows; a moved line keeps its text before the record.
describe.each(ORDERS)(
  '@lexical/y moves: a record left inside a line, $name',
  ({ids, delivery}) => {
    test('a block shown from inside a joined line ‖ a new line right after it', async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $p('M0 abc'),
            $p('M1 def'),
            $p('M2 ghi'),
            $p('M3 jkl'),
          ),
        {delivery, ids},
      );
      t.offline();
      t.a.update(() => $block([0]).insertAfter($block([3])));
      t.b.update(() => $block([0]).insertAfter($block([2])));
      t.a.update(() => $block([2]).insertAfter($block([1])));
      // b joins "M2" (moved after "M0") into "M0": a's record of "M3",
      // written after "M1", is inside the joined range.
      t.b.update(() => {
        const prev = $block([0]);
        const cur = $block([1]);
        prev.append(...cur.getChildren());
        cur.remove();
      });
      await t.sync();
      t.a.update(() => $block([0]).insertAfter($p('NEW')));
      const intent = t.a.describe();
      await t.sync();
      await expectConverged(t.peers, intent);
    });

    test('a line typed into after a removal, shown around a record, moved', async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $p('M0 abc'),
            $p('M1 def'),
            $p('M2 ghi'),
            $p('M3 jkl'),
            $p('M4 mno'),
            $p('M5 pqr'),
          ),
        {delivery, ids},
      );
      t.offline();
      t.c.update(() => {
        const first = $block([0]);
        const second = $block([1]);
        $block([2]).insertAfter(first);
        first.insertAfter(second);
      });
      t.a.update(() => $block([2]).insertBefore($block([5])));
      t.b.update(() => $block([4]).remove());
      t.a.update(() => $selectIn([5], 5).insertText('X'));
      t.c.update(() => $block([4]).insertAfter($block([0])));
      t.a.update(() => $selectIn([5], 7).insertParagraph());
      await t.sync();
      // b moves the last two lines (one of them shows the text a typed into
      // the line b removed) after the first one.
      const n = t.b.read(() => $getRoot().getChildrenSize());
      t.b.update(() => {
        const first = $block([n - 2]);
        const second = $block([n - 1]);
        $block([0]).insertAfter(first);
        first.insertAfter(second);
      });
      const intent = t.b.describe();
      await t.sync();
      await expectConverged(t.peers, intent);
    });
  },
);

// Joins and splits racing moves. A line joined with the line it shows
// next to, when the two live in different ranges (one of them moved), keeps
// both lines' items: an inline record shows the second line's text at the
// end of the first. Two peers making the same join write two records of the
// same range, and only one of them shows it, so the joined text shows once.
describe.each(ORDERS)(
  '@lexical/y joins and splits ‖ moves, $name',
  ({ids, delivery}) => {
    const $four = () =>
      $getRoot().append($p('zero'), $p('one'), $p('two'), $p('three'));
    /** "three" moved after "zero" and synced: zero / three / one / two. */
    const moved = async () => {
      const t = await setup($four, {delivery, ids});
      t.a.update(() => $block([0]).insertAfter($block([3])));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zero") / paragraph("three") / paragraph("one") / paragraph("two")',
      );
      t.offline();
      return t;
    };
    /** Backspace at the start of block `i`. */
    const $backspace = (i: number) => $selectIn([i], 0).deleteCharacter(true);
    /** Delete at the end of block `i`. */
    const $delete = (i: number) =>
      $selectIn([i], $block([i]).getTextContentSize()).deleteCharacter(false);
    const $enter = (i: number, at: number) =>
      $selectIn([i], at).insertParagraph();
    const letters = (peer: Peer) =>
      [...peer.read(() => $getRoot().getTextContent()).replace(/\s/g, '')]
        .sort()
        .join('');
    /** Every letter of `words` shows exactly once (no loss, no copy). */
    const expectOnce = (t: Awaited<ReturnType<typeof setup>>, words: string) =>
      expect(letters(t.a)).toBe([...words.replace(/\s/g, '')].sort().join(''));
    const ALL = 'zero one two three';
    const race = async (
      t: Awaited<ReturnType<typeof setup>>,
      a: () => void,
      b: () => void,
      expected?: string,
      words = ALL,
    ) => {
      t.a.update(a);
      t.b.update(b);
      await t.sync();
      await expectConverged(t.peers, expected);
      expectOnce(t, words);
      return t;
    };

    test('join ‖ join: Backspace at the start of a moved line on both peers', async () => {
      const t = await race(
        await moved(),
        () => $backspace(1),
        () => $backspace(1),
        'paragraph("zerothree") / paragraph("one") / paragraph("two")',
      );
      // The joined line stays editable as one line.
      t.b.update(() => $selectIn([0], 6).insertText('X'));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zerothXree") / paragraph("one") / paragraph("two")',
      );
    });

    test('join ‖ join: Delete at the end of the line before a moved line on both peers', async () => {
      await race(
        await moved(),
        () => $delete(0),
        () => $delete(0),
        'paragraph("zerothree") / paragraph("one") / paragraph("two")',
      );
    });

    test('join ‖ join: Backspace on one peer, Delete on the other', async () => {
      await race(
        await moved(),
        () => $backspace(1),
        () => $delete(0),
        'paragraph("zerothree") / paragraph("one") / paragraph("two")',
      );
    });

    test('join ‖ join: the line after a moved line joined into it on both peers', async () => {
      await race(
        await moved(),
        () => $backspace(2),
        () => $backspace(2),
        'paragraph("zero") / paragraph("threeone") / paragraph("two")',
      );
    });

    test('join ‖ join: a range deleted across a moved line on both peers', async () => {
      const $range = () => {
        const s = $selectIn([0], 2);
        const [node, offset] = $locateIn($block([1]), 2);
        s.focus.set(node.getKey(), offset, 'text');
        s.removeText();
      };
      await race(
        await moved(),
        $range,
        $range,
        'paragraph("zeree") / paragraph("one") / paragraph("two")',
        'zeree one two',
      );
    });

    test('join ‖ join of the lines around the place a line moved from', async () => {
      // zero / three / one / two: "two" joins into "one" (both native).
      await race(
        await moved(),
        () => $backspace(3),
        () => $backspace(3),
        'paragraph("zero") / paragraph("three") / paragraph("onetwo")',
      );
    });

    test('join ‖ join inside a moved range of two lines', async () => {
      const t = await setup($four, {delivery, ids});
      t.a.update(() => {
        $block([0]).insertBefore($block([2]));
        $block([0]).insertAfter($block([3]));
      });
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("two") / paragraph("three") / paragraph("zero") / paragraph("one")',
      );
      t.offline();
      await race(
        t,
        () => $backspace(1),
        () => $backspace(1),
        'paragraph("twothree") / paragraph("zero") / paragraph("one")',
      );
    });

    test('join ‖ split of the moved line', async () => {
      await race(
        await moved(),
        () => $backspace(1),
        () => $enter(1, 2),
        'paragraph("zeroth") / paragraph("ree") / paragraph("one") / paragraph("two")',
      );
    });

    test('join ‖ split of the line joined into a moved line', async () => {
      await race(
        await moved(),
        () => $backspace(2),
        () => $enter(2, 1),
        'paragraph("zero") / paragraph("threeo") / paragraph("ne") / paragraph("two")',
      );
    });

    test('join ‖ typing inside the moved line', async () => {
      await race(
        await moved(),
        () => $backspace(1),
        () => $selectIn([1], 2).insertText('X'),
        'paragraph("zerothXree") / paragraph("one") / paragraph("two")',
        ALL + 'X',
      );
    });

    test('join ‖ typing at the end of the line it joins', async () => {
      await race(
        await moved(),
        () => $backspace(1),
        () => $selectIn([0], 4).insertText('X'),
        undefined,
        ALL + 'X',
      );
    });

    test('join ‖ move of the joined line (no earlier move)', async () => {
      await race(
        await setup($four, {delivery, ids}).then(t => {
          t.offline();
          return t;
        }),
        () => $backspace(1),
        () => $block([2]).insertAfter($block([1])),
      );
    });

    test('join ‖ move of the line joined into (no earlier move)', async () => {
      await race(
        await setup($four, {delivery, ids}).then(t => {
          t.offline();
          return t;
        }),
        () => $backspace(2),
        () => $block([3]).insertAfter($block([1])),
      );
    });

    test('join ‖ move of the joined line to the top (no earlier move)', async () => {
      await race(
        await setup($four, {delivery, ids}).then(t => {
          t.offline();
          return t;
        }),
        () => $backspace(2),
        () => $block([0]).insertBefore($block([2])),
      );
    });

    test('join of a moved line ‖ the same line moved again', async () => {
      await race(
        await moved(),
        () => $backspace(1),
        () => $block([3]).insertAfter($block([1])),
      );
    });

    test('join into a moved line ‖ the moved line moved again', async () => {
      await race(
        await moved(),
        () => $backspace(2),
        () => $block([3]).insertAfter($block([1])),
      );
    });

    test('split at the start, middle and end of a line ‖ its move', async () => {
      for (const at of [0, 2, 3]) {
        const t = await setup($four, {delivery, ids});
        t.offline();
        await race(
          t,
          () => $enter(1, at),
          () => $block([3]).insertAfter($block([1])),
        );
        expect(t.a.describe()).toContain('paragraph("three") / paragraph(');
      }
    });

    test('split of a moved line ‖ the line moved again', async () => {
      await race(
        await moved(),
        () => $enter(1, 2),
        () => $block([3]).insertAfter($block([1])),
        'paragraph("zero") / paragraph("one") / paragraph("two") / paragraph("th") / paragraph("ree")',
      );
    });

    test('split ‖ split at the same place in a moved line', async () => {
      await race(
        await moved(),
        () => $enter(1, 2),
        () => $enter(1, 2),
      );
    });

    test('split of a joined line inside its moved part, then typing in both halves', async () => {
      const t = await moved();
      t.a.update(() => $backspace(1));
      t.a.update(() => $enter(0, 6));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zeroth") / paragraph("ree") / paragraph("one") / paragraph("two")',
      );
      t.offline();
      await race(
        t,
        () => $selectIn([0], 6).insertText('A'),
        () => $selectIn([1], 0).insertText('B'),
        'paragraph("zerothA") / paragraph("Bree") / paragraph("one") / paragraph("two")',
        ALL + 'AB',
      );
    });

    const splitAfterJoin = async () => {
      const t = await moved();
      t.a.update(() => $backspace(1));
      t.a.update(() => $enter(0, 6));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zeroth") / paragraph("ree") / paragraph("one") / paragraph("two")',
      );
      t.offline();
      return t;
    };
    test('move of a line split after a join, typing in it in the same update', async () => {
      const t = await splitAfterJoin();
      t.a.update(() => {
        $block([3]).insertAfter($block([1]));
        $selectIn([3], 1).insertText('X');
      });
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zeroth") / paragraph("one") / paragraph("two") / paragraph("rXee")',
      );
      expectOnce(t, ALL + 'X');
    });
    test('move of a line split after a join ‖ typing in it', async () => {
      const t = await splitAfterJoin();
      await race(
        t,
        () => $block([3]).insertAfter($block([1])),
        () => $selectIn([1], 1).insertText('X'),
        'paragraph("zeroth") / paragraph("one") / paragraph("two") / paragraph("rXee")',
        ALL + 'X',
      );
    });
    test('move ‖ move of a line split after a join', async () => {
      const t = await splitAfterJoin();
      await race(
        t,
        () => $block([3]).insertAfter($block([1])),
        () => $block([2]).insertBefore($block([1])),
        undefined,
        ALL,
      );
    });
    test('move of a line ending inside a joined range, then typing in its first part', async () => {
      const t = await moved();
      t.a.update(() => $backspace(1));
      t.a.update(() => $enter(0, 6));
      await t.sync();
      t.offline();
      // zeroth / ree / one / two: move "zeroth" (ends inside the range) last
      t.a.update(() => $block([3]).insertAfter($block([0])));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("ree") / paragraph("one") / paragraph("two") / paragraph("zeroth")',
      );
      t.a.update(() => $selectIn([3], 2).insertText('X'));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("ree") / paragraph("one") / paragraph("two") / paragraph("zeXroth")',
      );
      t.a.update(() => $selectIn([3], 5).insertText('Y'));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("ree") / paragraph("one") / paragraph("two") / paragraph("zeXroYth")',
      );
      expectOnce(t, ALL + 'XY');
    });
    /** zero and two joined around "one", which moved to the end: "zerotwo" is not one range. */
    const interrupted = async () => {
      const t = await setup($four, {delivery, ids});
      t.a.update(() => $block([3]).insertAfter($block([1])));
      await t.sync();
      t.a.update(() => $backspace(1));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zerotwo") / paragraph("three") / paragraph("one")',
      );
      t.offline();
      return t;
    };
    test('move of a line another zone interrupts ‖ typing in both parts', async () => {
      const t = await interrupted();
      await race(
        t,
        () => $block([2]).insertAfter($block([0])),
        () => {
          $selectIn([0], 2).insertText('X');
          $selectIn([0], 7).insertText('Y');
        },
        'paragraph("three") / paragraph("one") / paragraph("zeXrotwYo")',
        ALL + 'XY',
      );
    });
    test('join into a moved line of a line another zone interrupts ‖ typing in it', async () => {
      const t = await interrupted();
      // three moved to the top first (synced), then joined with zerotwo
      t.a.update(() => $block([0]).insertBefore($block([1])));
      await t.sync();
      t.offline();
      await race(
        t,
        () => $delete(0),
        () => $selectIn([1], 2).insertText('X'),
        'paragraph("threezeXrotwo") / paragraph("one")',
        ALL + 'X',
      );
    });
    test('join ‖ join of a line another zone interrupts', async () => {
      const t = await interrupted();
      t.a.update(() => $block([0]).insertBefore($block([1])));
      await t.sync();
      t.offline();
      await race(
        t,
        () => $delete(0),
        () => $delete(0),
        'paragraph("threezerotwo") / paragraph("one")',
      );
    });
    test('join across a move ‖ an undo that restores a line inside the joined range', async () => {
      // A peer's undo of a removal puts the restored line's items inside the
      // range the join's inline record shows: the joined line ends at the
      // restored line's marker, and every walk must stop there (a fuzz case).
      const t = await setup(
        () => $getRoot().append($p('M0'), $p('M1'), $p('M2'), $p('M3')),
        {delivery, ids},
      );
      t.b.update(() => $block([0]).insertAfter($block([2])));
      await t.sync();
      t.offline();
      t.a.update(() => $block([2]).remove());
      t.b.undo();
      t.a.undo();
      t.c.update(() => $block([0]).insertBefore($block([3])));
      t.c.update(() => $selectIn([3], 2).insertText('X'));
      t.c.update(() => $backspace(3));
      await t.sync();
      await expectConverged(t.peers);
      const text = t.a.describe();
      for (const token of ['M0', 'M1', 'M2', 'M3', 'X']) {
        expect(text.split(token).length - 1).toBe(1);
      }
    });

    test('undo of a join across a move, with a peer typing in the moved part', async () => {
      const t = await moved();
      t.a.update(() => $backspace(1));
      t.b.update(() => $selectIn([1], 5).insertText('!'));
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zerothree!") / paragraph("one") / paragraph("two")',
      );
      t.a.undo();
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zero") / paragraph("three!") / paragraph("one") / paragraph("two")',
      );
      t.a.binding.redo();
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("zerothree!") / paragraph("one") / paragraph("two")',
      );
    });
  },
);
describe('@lexical/y moves: reading a change of records', () => {
  const counts = () => ({...moveReadStats, reasons: {}});

  test('a move, its undo and its redo are read where they change', async () => {
    const t = await setup(() => {
      for (let i = 0; i < 60; i++) {
        $getRoot().append($p(`p${i}`));
      }
    });
    for (const [from, to] of [
      [5, 40],
      [50, 2],
      [10, 30],
      [33, 7],
    ]) {
      t.a.update(() => $block([to]).insertAfter($block([from])));
    }
    await t.sync();
    await expectConverged(t.peers);
    const before = counts();
    t.a.update(() => $block([3]).insertAfter($block([45])));
    await t.sync();
    t.a.undo();
    await t.sync();
    t.a.binding.redo();
    await t.sync();
    await expectConverged(t.peers);
    // b reads the move, both read the undo and the redo.
    expect(moveReadStats.full - before.full).toBe(0);
    expect(moveReadStats.incremental - before.incremental).toBe(5);
  });

  test('Enter and Backspace in a container with moved blocks are read where they change', async () => {
    const t = await setup(() => {
      for (let i = 0; i < 40; i++) {
        $getRoot().append($p(`p${i}`));
      }
    });
    t.a.update(() => $block([30]).insertAfter($block([5])));
    t.a.update(() => $block([3]).insertAfter($block([20])));
    await t.sync();
    const before = counts();
    // Enter in a moved paragraph, then Backspace to join it again; the same
    // in a paragraph that did not move.
    t.a.update(() => $selectIn([4], 1).insertParagraph());
    await t.sync();
    t.a.update(() => $selectIn([5], 0).deleteCharacter(true));
    await t.sync();
    t.b.update(() => $selectIn([10], 2).insertParagraph());
    await t.sync();
    t.b.update(() => $selectIn([11], 0).deleteCharacter(true));
    await t.sync();
    await expectConverged(t.peers);
    expect(moveReadStats.full - before.full).toBe(0);
    expect(moveReadStats.incremental - before.incremental).toBe(4);
  });

  test('list items moved, undone and redone are read where they change', async () => {
    const t = await setup(() => {
      const list = $createListNode('bullet');
      for (let i = 0; i < 20; i++) {
        list.append($li(`i${i}`));
      }
      $getRoot().append($p('before'), list, $p('after'));
    });
    const $item = (i: number) =>
      ($block([1]) as ElementNode).getChildAtIndex(i) as ListItemNode;
    t.a.update(() => $item(3).insertAfter($item(15)));
    t.a.update(() => $item(12).insertBefore($item(1)));
    await t.sync();
    const before = counts();
    t.a.update(() => $item(18).insertAfter($item(4)));
    await t.sync();
    t.a.undo();
    await t.sync();
    t.a.binding.redo();
    await t.sync();
    await expectConverged(t.peers);
    expect(moveReadStats.full - before.full).toBe(0);
    expect(moveReadStats.incremental - before.incremental).toBe(5);
  });
});

describe('@lexical/y moves and undo', () => {
  test('undo of a move restores the position and keeps a peer typing', async () => {
    const t = await setup(() =>
      $getRoot().append($p('one'), $p('two'), $p('three')),
    );
    t.a.update(() => $block([0]).insertBefore($block([2])));
    await t.sync();
    t.b.update(() => $selectIn([0], 5).insertText('!'));
    await t.sync();
    t.a.undo();
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("one") / paragraph("two") / paragraph("three!")',
    );
    expect(records(t.a.doc)).toBe(0);
    t.a.binding.redo();
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("three!") / paragraph("one") / paragraph("two")',
    );
  });

  test('undo of a second move of a block puts it back where the first left it', async () => {
    const t = await setup(() =>
      $getRoot().append($p('a'), $p('b'), $p('c'), $p('d')),
    );
    t.a.update(() => $block([0]).insertBefore($block([3])));
    t.a.update(() => $block([2]).insertAfter($block([0])));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("a") / paragraph("b") / paragraph("d") / paragraph("c")',
    );
    t.a.undo();
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("d") / paragraph("a") / paragraph("b") / paragraph("c")',
    );
    t.a.undo();
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("a") / paragraph("b") / paragraph("c") / paragraph("d")',
    );
  });

  test('undo of deleting a moved block restores it', async () => {
    const t = await setup(() => $getRoot().append($p('a'), $p('b'), $p('c')));
    t.a.update(() => $block([0]).insertBefore($block([2])));
    await t.sync();
    t.a.update(() => $block([0]).remove());
    await t.sync();
    await expectConverged(t.peers, 'paragraph("a") / paragraph("b")');
    t.a.undo();
    await t.sync();
    await expectConverged(t.peers);
    expect(t.a.describe().split(' / ').sort()).toEqual([
      'paragraph("a")',
      'paragraph("b")',
      'paragraph("c")',
    ]);
  });
});

describe('@lexical/y moves: selection and details', () => {
  test('a caret in a paragraph a peer moves stays in it', async () => {
    const t = await setup(() =>
      $getRoot().append($p('one'), $p('two'), $p('three')),
    );
    t.b.update(() => $selectIn([2], 2));
    t.a.update(() => $block([0]).insertBefore($block([2])));
    await t.sync();
    t.b.read(() => {
      const sel = $getSelection();
      expect($isRangeSelection(sel)).toBe(true);
      if ($isRangeSelection(sel)) {
        expect(sel.anchor.getNode().getTextContent()).toBe('three');
        expect(sel.anchor.offset).toBe(2);
      }
    });
    t.b.update(() => $getSelection()!.insertText('X'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("thXree") / paragraph("one") / paragraph("two")',
    );
  });

  test('moving a list item to the start of its list writes one record', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $createListNode('bullet').append($li('a'), $li('b'), $li('c')),
      ),
    );
    const before = deletedChars(t.a.doc);
    t.a.update(() => {
      const list = $block([0]);
      list.getFirstChild()!.insertBefore(list.getLastChild()!);
    });
    await t.sync();
    await expectConverged(
      t.peers,
      'list[bullet](listitem("c") listitem("a") listitem("b"))',
    );
    expect(records(t.a.doc)).toBe(1);
    expect(deletedChars(t.a.doc)).toBe(before);
    t.a.read(() => {
      expect($isListItemNode($block([0]).getFirstChild())).toBe(true);
    });
  });

  test('the first move marks the document with layout 2', async () => {
    const t = await setup(() => $getRoot().append($p('one'), $p('two')));
    const root = t.a.doc.get('lexical-y');
    const record = (r: Y.Node) =>
      Object.keys(r.getAttrs())
        .filter(k => k.startsWith('lexical-y:'))
        .sort();
    expect(record(root)).toEqual(['lexical-y:1']);
    t.a.update(() => $selectIn([1], 3).insertText('!'));
    expect(record(root)).toEqual(['lexical-y:1']);
    // The version is recorded in the transaction that writes the record.
    const transactions: string[][] = [];
    t.a.doc.on('afterTransaction', tr => {
      transactions.push([
        tr.changed.has(root) ? 'root' : '',
        record(root).join(','),
      ]);
    });
    t.a.update(() => $block([0]).insertBefore($block([1])));
    expect(record(root)).toEqual(['lexical-y:1', 'lexical-y:2']);
    expect(root.getAttr('lexical-y:2')).toBe(true);
    expect(transactions[0]).toEqual(['root', 'lexical-y:1,lexical-y:2']);
    await t.sync();
    for (const p of t.peers) {
      expect(record(p.doc.get('lexical-y'))).toEqual([
        'lexical-y:1',
        'lexical-y:2',
      ]);
      expect(p.binding.status).toBe('active');
    }
    // Undoing the move keeps the record (it only grows).
    t.a.binding.undoManager!.stopCapturing();
    t.a.binding.undo();
    expect(record(root)).toEqual(['lexical-y:1', 'lexical-y:2']);
    t.a.binding.redo();
    await expectConverged(t.peers, 'paragraph("two!") / paragraph("one")');
  });

  test('a document that never moves anything has no record', async () => {
    const t = await setup(() => $getRoot().append($p('one'), $p('two')));
    t.a.update(() => $selectIn([1], 3).insertParagraph());
    t.a.update(() => $selectIn([1], 0).deleteCharacter(true));
    await t.sync();
    await expectConverged(t.peers);
    expect(records(t.a.doc)).toBe(0);
  });
});

describe('@lexical/y moves: cached ownership', () => {
  /**
   * Ownership as reads see it (cached, checked again only after a
   * transaction starts or is cleaned up) is the ownership of the document as
   * it is now, record by record and item by item, in every container.
   */
  function expectFreshOwnership(peers: Peer[]) {
    for (const peer of peers) {
      const state = (peer.binding as unknown as {state: State}).state;
      const stale: string[] = [];
      const visit = (y: Y.Node) => {
        const cached = state.zonesOf(y);
        const fresh = new Zones(peer.doc, y);
        const id = (z: Y.Item | null) =>
          z === null ? 'native' : `${z.id.client}:${z.id.clock}`;
        const active = (z: Zones | null) =>
          (z === null ? [] : z.active)
            .filter(r => r.p !== Infinity)
            .map(r => id(r.item))
            .join(' ');
        if (active(cached) !== active(fresh)) {
          stale.push(`active: ${active(cached)}, now ${active(fresh)}`);
        }
        for (let it = y._start; it !== null; it = it.right) {
          const was = cached === null ? null : cached.ownerOf(it);
          const now = fresh.active.length === 0 ? null : fresh.ownerOf(it);
          if (was !== now) {
            stale.push(`${id(it)}: ${id(was)}, now ${id(now)}`);
          }
          if (!it.deleted && it.content instanceof Y.ContentType) {
            visit(it.content.type as Y.Node);
          }
        }
      };
      visit(peer.doc.get('lexical-y'));
      expect(stale).toEqual([]);
    }
  }

  const paragraphs = (n: number) => () => {
    for (let i = 0; i < n; i++) {
      $getRoot().append($p(`p${i}`));
    }
  };

  test('across undo and redo of moves, with a peer typing in between', async () => {
    const t = await setup(paragraphs(12));
    t.a.update(() => $block([9]).insertAfter($block([2])));
    t.a.update(() => $block([0]).insertBefore($block([5])));
    await t.sync();
    expectFreshOwnership(t.peers);
    for (let round = 0; round < 3; round++) {
      t.b.update(() => $selectIn([0], 2).insertText(`${round}`));
      t.a.undo();
      expectFreshOwnership([t.a]);
      await t.sync();
      expectFreshOwnership(t.peers);
      t.a.binding.redo();
      expectFreshOwnership([t.a]);
      await t.sync();
      expectFreshOwnership(t.peers);
    }
    t.b.update(() => $block([11]).insertAfter($block([0])));
    t.a.undo();
    await t.sync();
    expectFreshOwnership(t.peers);
    await expectConverged(t.peers);
  });

  test('records that arrive out of order', async () => {
    // A moves p1; B, which has A's record, moves p1 again (its record
    // replaces A's); C gets B's record and A's deletion by B before A's
    // record itself.
    const t = await setup(paragraphs(8), {
      delivery: 'sender',
      ids: [1, 2, 3],
    });
    t.offline();
    t.a.update(() => $block([6]).insertAfter($block([1])));
    for (const u of t.b.pending.get(t.a) ?? []) {
      Y.applyUpdate(t.b.doc, u, t.b.net);
    }
    t.b.pending.delete(t.a);
    t.b.update(() => $block([0]).insertBefore($block([6])));
    expectFreshOwnership([t.a, t.b]);
    await t.sync();
    expectFreshOwnership(t.peers);
    t.c.update(() => $selectIn([0], 2).insertText('!'));
    await t.sync();
    expectFreshOwnership(t.peers);
    await expectConverged(t.peers);
    expect(t.a.describe().startsWith('paragraph("p1!")')).toBe(true);
    expect(records(t.c.doc)).toBe(1);
  });

  test('a record whose anchors arrive late', async () => {
    // A splits p3 (the second half's marker and text are A's new items);
    // B moves that half; C gets B's record before A's items.
    const t = await setup(paragraphs(8), {
      delivery: 'sender',
      ids: [1, 2, 3],
    });
    t.offline();
    t.a.update(() => {
      $selectIn([3], 2).insertText(' new');
      $selectIn([3], 2).insertParagraph();
    });
    for (const u of t.b.pending.get(t.a) ?? []) {
      Y.applyUpdate(t.b.doc, u, t.b.net);
    }
    t.b.pending.delete(t.a);
    t.b.update(() => $block([0]).insertBefore($block([4])));
    for (const u of t.c.pending.get(t.b) ?? []) {
      Y.applyUpdate(t.c.doc, u, t.c.net);
    }
    t.c.pending.delete(t.b);
    expectFreshOwnership(t.peers);
    t.c.update(() => $selectIn([1], 1).insertText('?'));
    expectFreshOwnership([t.c]);
    await t.sync();
    expectFreshOwnership(t.peers);
    await expectConverged(t.peers);
    expect(t.a.describe().startsWith('paragraph(" new")')).toBe(true);
  });

  test.each([false, true])(
    'text anchors split by typing (gc: %s)',
    async gc => {
      // zero / three / one / two, "three" joined into "zero" and split
      // again inside the joined range: ranges that end in text, which typing
      // splits (the end anchor's item changes).
      const t = await setup(() =>
        $getRoot().append($p('zero'), $p('one'), $p('two'), $p('three')),
      );
      for (const p of t.peers) {
        p.doc.gc = gc;
      }
      t.a.update(() => $block([0]).insertAfter($block([3])));
      await t.sync();
      t.a.update(() => $selectIn([1], 0).deleteCharacter(true));
      t.a.update(() => $selectIn([0], 6).insertParagraph());
      await t.sync();
      expectFreshOwnership(t.peers);
      t.a.update(() => $block([3]).insertAfter($block([0])));
      expectFreshOwnership([t.a]);
      await t.sync();
      expectFreshOwnership(t.peers);
      // B keeps a caret in the line A types in.
      t.b.update(() => $selectIn([3], 3));
      for (const [at, text] of [
        [2, 'X'],
        [5, 'Y'],
        [1, 'Z'],
        [8, 'W'],
      ] as const) {
        t.a.update(() => $selectIn([3], at).insertText(text));
        expectFreshOwnership([t.a]);
        await t.sync();
        expectFreshOwnership(t.peers);
      }
      t.b.update(() => $selectIn([3], 4).insertText('V'));
      expectFreshOwnership([t.b]);
      await t.sync();
      expectFreshOwnership(t.peers);
      await expectConverged(
        t.peers,
        'paragraph("ree") / paragraph("one") / paragraph("two") / paragraph("zZeXVroYtWh")',
      );
    },
  );

  test('a moved block and its old neighbour deleted, with gc', async () => {
    const t = await setup(paragraphs(10));
    for (const p of t.peers) {
      p.doc.gc = true;
    }
    t.a.update(() => $block([8]).insertAfter($block([5])));
    await t.sync();
    expectFreshOwnership(t.peers);
    // p0..p4 p6 p7 p8 p5 p9: B deletes p4 and p5 (the record's range and
    // the item before it), which Yjs merges when it cleans up.
    t.b.update(() => {
      $block([8]).remove();
      $block([4]).remove();
    });
    expectFreshOwnership([t.b]);
    await t.sync();
    expectFreshOwnership(t.peers);
    t.a.update(() => $selectIn([4], 1).insertText('x'));
    await t.sync();
    expectFreshOwnership(t.peers);
    await expectConverged(t.peers);
  });

  test('anchors merged by garbage collection', async () => {
    const t = await setup(paragraphs(10));
    for (const p of t.peers) {
      p.doc.gc = true;
    }
    // The record starts after p4's marker and ends with p5's marker.
    t.a.update(() => $block([8]).insertAfter($block([5])));
    await t.sync();
    expectFreshOwnership(t.peers);
    // Deleting p4 (and the text after p5's start) lets Yjs merge the
    // deleted items, the anchors among them, when it cleans up.
    t.b.update(() => $block([4]).remove());
    t.b.update(() => $selectIn([3], 1, 2).removeText());
    expectFreshOwnership([t.b]);
    await t.sync();
    expectFreshOwnership(t.peers);
    t.a.update(() => $selectIn([7], 2).insertText('x'));
    t.b.update(() => $selectIn([3], 1).insertText('y'));
    await t.sync();
    expectFreshOwnership(t.peers);
    t.b.update(() => $block([0]).insertBefore($block([7])));
    t.a.undo();
    await t.sync();
    expectFreshOwnership(t.peers);
    await expectConverged(t.peers);
  });
});
