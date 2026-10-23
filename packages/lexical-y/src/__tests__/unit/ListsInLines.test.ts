/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createLinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  type ListItemNode,
  type ListNode,
} from '@lexical/list';
import {$createHeadingNode} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $p,
  $selectIn,
  expectConverged,
  setup,
  shape,
} from '../utils/harness';

const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));
const $wrap = (list: ListNode) => $createListItemNode().append(list);

// Lexical keeps blocks pasted into a list item inside it, so a list item can
// hold lists of its own; the binding stores those as nodes inside the line.
describe('@lexical/y lists stored inside a line', () => {
  for (const order of ['p1 first', 'p2 first']) {
    test(`two peers adding a list to the same list item: the equal lists merge on every peer (${order})`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $createListNode('bullet').append($li('item'), $li('next')),
          ),
        {ids: [1, 2, 3]},
      );
      const [p1, p2] = t.peers;
      t.offline();
      const e1 = () =>
        p1.update(() =>
          $block([0, 0]).append($createListNode('check').append($li('x'))),
        );
      const e2 = () =>
        p2.update(() =>
          $block([0, 0]).append($createListNode('check').append($li('y'))),
        );
      if (order === 'p1 first') {
        e1();
        e2();
      } else {
        e2();
        e1();
      }
      await t.sync();
      await expectConverged(t.peers);
      const d = p1.describe();
      expect(d.match(/list\[check\]/g)).toHaveLength(1);
      expect(d).toContain('listitem[ ]("x")');
      expect(d).toContain('listitem[ ]("y")');
    });
  }

  test('text typed into an item a peer removed reads as an item of the list on every reader', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createTextNode('item'),
              $createListNode('check').append($li('x'), $li('y')),
            ),
          ),
        ),
      {ids: [1, 2, 3]},
    );
    const [p1, p2] = t.peers;
    t.offline();
    p1.update(() => $block([0, 0, 1, 1]).remove());
    p2.update(() => $selectIn([0, 0, 1, 1], 1).insertText('Z'));
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).toContain('Z');
    expect(p1.describe()).not.toContain('paragraph');
  });

  test('peers emptying a list held in a line: no peer and no fresh reader shows the empty list', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createTextNode('item'),
              $createListNode('check').append($li('x'), $li('y')),
            ),
          ),
        ),
      {ids: [1, 2, 3]},
    );
    const [p1, p2] = t.peers;
    t.offline();
    p1.update(() => $block([0, 0, 1, 0]).remove());
    p2.update(() => $block([0, 0, 1, 1]).remove());
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).not.toContain('list[check]');
  });
});

describe('@lexical/y lists stored inside a line, emptied', () => {
  test('a marker-only write on a line holding a list peers emptied raises no self-check warning', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('check').append(
            $createListItemNode(false).append(
              $createTextNode('item'),
              $createListNode('bullet').append($li('x'), $li('y')),
            ),
          ),
        ),
      {ids: [1, 2, 3]},
    );
    const [p1, p2] = t.peers;
    t.offline();
    p1.update(() => $block([0, 0, 1, 0]).remove());
    p2.update(() => $block([0, 0, 1, 1]).remove());
    await t.sync();
    // Only the line's marker changes (its checked field).
    p1.update(() => ($block([0, 0]) as ListItemNode).setChecked(true));
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).toBe('list[check](listitem[x]("item"))');
  });
});

describe('@lexical/y nested list canonical form', () => {
  test('a list type change that joins two wrapper items also joins the lists they hold', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('top'),
            $wrap(
              $createListNode('bullet').append(
                $li('a'),
                $wrap($createListNode('check').append($li('b'))),
              ),
            ),
            $wrap(
              $createListNode('number').append(
                $wrap(
                  $createListNode('check').append(
                    $wrap($createListNode('check').append($li('c'))),
                  ),
                ),
                $li('d'),
              ),
            ),
          ),
        ),
      {ids: [1, 2]},
    );
    const [p1] = t.peers;
    p1.update(() => ($block([0, 1, 0]) as ListNode).setListType('number'));
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).toBe(
      'list[bullet](listitem("top") listitem(list[number](listitem("a") listitem(list[check](listitem[ ]("b") listitem[ ](list[check](listitem[ ]("c"))))) listitem("d"))))',
    );
  });

  test('moving away the item between two wrapper items joins their nested lists', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('a'),
            $wrap($createListNode('bullet').append($li('b'))),
            $li('c'),
            $wrap($createListNode('bullet').append($li('d'))),
          ),
        ),
      {ids: [1, 2]},
    );
    const [p1] = t.peers;
    p1.update(() => {
      const c = $block([0, 2]);
      $getRoot().append($createListNode('number').append(c));
    });
    await t.sync();
    await expectConverged(t.peers);
    expect(p1.describe()).toBe(
      'list[bullet](listitem("a") listitem(list[bullet](listitem("b") listitem("d")))) / list[number](listitem("c"))',
    );
  });

  test("a wrapper item's and a nested list's text format reach every peer", async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('a'),
            $wrap($createListNode('check').append($li('b'))),
          ),
        ),
      {ids: [1, 2]},
    );
    const [p1, p2] = t.peers;
    p1.update(() => {
      const wrapper = $block([0, 1]);
      wrapper.setTextFormat(8);
      (wrapper.getFirstChild() as ElementNode).setTextFormat(8);
    });
    await t.sync();
    await expectConverged(t.peers);
    expect(JSON.stringify(shape(p2))).toContain('"textFormat":8');
  });

  test('each of two adjacent wrapper items reads its own fields', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('number').append(
            $li('a'),
            $wrap($createListNode('bullet').append($li('b'))),
            $wrap(
              $createListNode('number').append(
                $wrap($createListNode('bullet').append($li('c'))),
              ),
            ),
          ),
        ),
      {ids: [1, 2]},
    );
    const [p1] = t.peers;
    p1.update(() => {
      const second = $block([0, 2]);
      second.setTextFormat(8);
      (second.getFirstChild() as ElementNode).setTextFormat(8);
    });
    await t.sync();
    await expectConverged(t.peers);
  });
});

describe('@lexical/y inline details', () => {
  test('a link holding only a line break keeps its text format on every peer', async () => {
    const t = await setup(() => $getRoot().append($p('x')), {ids: [1, 2]});
    const [p1, p2] = t.peers;
    p1.update(() => {
      const link = $createLinkNode('https://a.x').append(
        $createLineBreakNode(),
      );
      link.setTextFormat(8);
      $block([0]).append(link);
    });
    await t.sync();
    await expectConverged(t.peers);
    expect(JSON.stringify(shape(p2))).toContain('"textFormat":8');
  });

  for (const order of ['p1 first', 'p2 first']) {
    // The setup (a heading held in a list item) cannot be built any more:
    // the normalization lifts the heading out of the list item.
    test.skip(`joining a block held in a line into the line ‖ deleting the line's text keeps the joined text whole (${order})`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $createListNode('bullet').append(
              $createListItemNode().append(
                $createTextNode('x'),
                $createListNode('check').append($li('<1>')),
                $createHeadingNode('h2').append($createTextNode('<2>')),
              ),
            ),
          ),
        {ids: [1, 2]},
      );
      const [p1, p2] = t.peers;
      t.offline();
      const e1 = () =>
        p1.update(() => {
          // Backspace at the start of the heading: the caret ends up
          // before the joined text.
          const item = $block([0, 0]);
          const first = $block([0, 0, 1, 0]).getFirstChild() as TextNode;
          const heading = item.getChildAtIndex(2) as ElementNode;
          const sel = $createRangeSelection();
          sel.anchor.set(first.getKey(), 3, 'text');
          sel.focus.set(heading.getFirstChild()!.getKey(), 0, 'text');
          $setSelection(sel);
          sel.removeText();
        });
      const e2 = () =>
        p2.update(() => $selectIn([0, 0, 1, 0], 0, 3).removeText());
      if (order === 'p1 first') {
        e1();
        e2();
      } else {
        e2();
        e1();
      }
      await t.sync();
      await expectConverged(t.peers);
      expect(p1.describe()).toContain('<2>');
      expect(p1.describe()).not.toContain('><2');
    });
  }

  test('text typed at the end of a line equal to its last character lands at the caret', async () => {
    const t = await setup(() => $getRoot().append($p('ab')), {ids: [1, 2]});
    const [p1] = t.peers;
    p1.update(() => {
      $selectIn([0], 1).insertText('b');
    });
    await t.sync();
    await expectConverged(t.peers, 'paragraph("abb")');
  });
});
