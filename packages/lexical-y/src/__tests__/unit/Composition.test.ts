/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $p,
  $selectIn,
  expectConverged,
  type Peer,
  setup,
} from '../utils/harness';

// IME composition, as Lexical sees it: a composition key on the text node,
// the node's text updated at each step (from the DOM), and the key cleared at
// the end. While a peer's remote insert lands in the composing line, the line's
// nodes must not change (the browser composes into that DOM text); the insert
// shows when the composition ends, and nothing is lost or misplaced.

function $text(path: number[]): TextNode {
  const node = ($block(path) as ElementNode).getFirstChild();
  if (!$isTextNode(node)) {
    throw new Error('no text');
  }
  return node;
}

/** Start composing at `offset` of the first text node of line `path`. */
function compositionStart(peer: Peer, path: number[], offset: number) {
  peer.update(() => {
    const node = $text(path);
    node.select(offset, offset);
    $setCompositionKey(node.getKey());
  });
}

/** One composition step: the composed text is now `composed`. */
function compositionStep(
  peer: Peer,
  path: number[],
  at: number,
  previous: string,
  composed: string,
) {
  peer.update(() => {
    const node = $text(path);
    const text = node.getTextContent();
    node.setTextContent(
      text.slice(0, at) + composed + text.slice(at + previous.length),
    );
    node.select(at + composed.length, at + composed.length);
  });
}

function compositionEnd(peer: Peer) {
  peer.update(() => $setCompositionKey(null));
}

function lineText(peer: Peer, path: number[]): string {
  return peer.read(() => $block(path).getTextContent());
}

function caretOffsetAfter(peer: Peer, token: string): boolean {
  return peer.read(() => {
    const s = $getSelection();
    if (!$isRangeSelection(s) || !s.isCollapsed()) {
      return false;
    }
    const node = s.anchor.getNode();
    return node.getTextContent().slice(0, s.anchor.offset).endsWith(token);
  });
}

describe('@lexical/y IME composition with concurrent remote edits', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    for (const [where, at, expected] of [
      ['before', 0, 'XYi1z 東京i2z i3z'],
      ['right before', 3, 'i1zXY 東京i2z i3z'],
      ['after', -1, 'i1z 東京i2z i3zXY'],
    ] as const) {
      test(`a peer inserts ${where} the composition (ids ${ids})`, async () => {
        const t = await setup(() => $getRoot().append($p('i1z i2z i3z')), {
          ids,
        });
        compositionStart(t.a, [0], 4);
        compositionStep(t.a, [0], 4, '', 't');
        await t.sync();
        compositionStep(t.a, [0], 4, 't', 'とう');
        await t.sync();
        const $at = (n: number) =>
          at < 0 ? $block([0]).selectEnd() : $selectIn([0], at + n);
        t.b.update(() => $at(0).insertText('X'));
        await t.sync();
        // The composing line keeps its nodes while composing.
        expect(lineText(t.a, [0])).toBe('i1z とうi2z i3z');
        t.b.update(() => $at(1).insertText('Y'));
        compositionStep(t.a, [0], 4, 'とう', 'とうきょう');
        await t.sync();
        expect(lineText(t.a, [0])).toBe('i1z とうきょうi2z i3z');
        compositionStep(t.a, [0], 4, 'とうきょう', '東京');
        compositionEnd(t.a);
        await t.sync();
        await expectConverged(t.peers, `paragraph("${expected}")`);
        expect(caretOffsetAfter(t.a, '東京')).toBe(true);
        // Typing after the composition lands after it.
        t.a.update(() => {
          const s = $getSelection();
          if ($isRangeSelection(s)) {
            s.insertText('!');
          }
        });
        await t.sync();
        await expectConverged(
          t.peers,
          `paragraph("${expected.replace('東京', '東京!')}")`,
        );
      });
    }

    test(`a peer inserts inside the composed text (ids ${ids})`, async () => {
      const t = await setup(() => $getRoot().append($p('ab')), {ids});
      compositionStart(t.a, [0], 1);
      compositionStep(t.a, [0], 1, '', 'にほ');
      await t.sync();
      t.b.update(() => $selectIn([0], 2).insertText('Q'));
      await t.sync();
      expect(lineText(t.a, [0])).toBe('aにほb');
      compositionStep(t.a, [0], 1, 'にほ', '日本');
      compositionEnd(t.a);
      await t.sync();
      // The peer's character stays, next to the replaced composition.
      const text = lineText(t.a, [0]);
      expect(text.includes('Q')).toBe(true);
      expect(text.replace('Q', '')).toBe('a日本b');
      await expectConverged(t.peers);
    });

    test(`other lines update while composing (ids ${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($p('one'), $p('two'), $p('three')),
        {ids},
      );
      compositionStart(t.a, [1], 3);
      compositionStep(t.a, [1], 3, '', 'k');
      await t.sync();
      t.b.update(() => {
        $selectIn([0], 3).insertText('!');
        $selectIn([2], 0).insertText('>');
        $selectIn([1], 0).insertText('*');
      });
      await t.sync();
      expect(lineText(t.a, [0])).toBe('one!');
      expect(lineText(t.a, [2])).toBe('>three');
      expect(lineText(t.a, [1])).toBe('twok');
      compositionStep(t.a, [1], 3, 'k', 'か');
      compositionEnd(t.a);
      await t.sync();
      await expectConverged(
        t.peers,
        'paragraph("one!") / paragraph("*twoか") / paragraph(">three")',
      );
    });

    test(`a structural edit of the composing line is read at once (ids ${ids})`, async () => {
      const t = await setup(() => $getRoot().append($p('one two')), {ids});
      compositionStart(t.a, [0], 7);
      compositionStep(t.a, [0], 7, '', 'n');
      await t.sync();
      t.b.update(() => $selectIn([0], 3).insertParagraph());
      await t.sync();
      expect(t.a.read(() => $getRoot().getChildrenSize())).toBe(2);
      t.a.update(() => {
        const node = $text([1]);
        node.setTextContent(' twoに');
        node.select(6, 6);
        $setCompositionKey(null);
      });
      await t.sync();
      await expectConverged(t.peers, 'paragraph("one") / paragraph(" twoに")');
    });

    test(`a deletion in the composing line is read at once (ids ${ids})`, async () => {
      const t = await setup(() => $getRoot().append($p('abc def')), {ids});
      compositionStart(t.a, [0], 7);
      compositionStep(t.a, [0], 7, '', 'x');
      await t.sync();
      t.b.update(() => $selectIn([0], 0, 4).removeText());
      await t.sync();
      expect(lineText(t.a, [0])).toBe('defx');
      compositionEnd(t.a);
      await t.sync();
      await expectConverged(t.peers, 'paragraph("defx")');
    });
  }

  test('a composition in a new text node next to formatted text', async () => {
    const t = await setup(() => $getRoot().append($p('ab')));
    t.a.update(() => {
      const line = $block([0]) as ElementNode;
      const node = $createTextNode('k');
      node.toggleFormat('bold');
      line.append(node);
      node.select(1, 1);
      $setCompositionKey(node.getKey());
    });
    t.a.update(() => {
      const node = ($block([0]) as ElementNode).getLastChild() as TextNode;
      node.setTextContent('か');
      node.select(1, 1);
    });
    await t.sync();
    t.b.update(() => $selectIn([0], 0).insertText('Z'));
    await t.sync();
    expect(lineText(t.a, [0])).toBe('abか');
    compositionEnd(t.a);
    await t.sync();
    await expectConverged(t.peers);
    expect(lineText(t.a, [0])).toBe('Zabか');
  });

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    for (const where of ['start of line 2', 'end of line 1'] as const) {
      test(`a peer joins the lines while composing at the ${where} (ids ${ids})`, async () => {
        const t = await setup(() => $getRoot().append($p('j1z'), $p('j2z')), {
          ids,
        });
        const line = where === 'start of line 2' ? 1 : 0;
        const at = where === 'start of line 2' ? 0 : 3;
        compositionStart(t.a, [line], at);
        compositionStep(t.a, [line], at, '', 'に');
        await t.sync();
        const key = t.a.read(() => $text([line]).getKey());
        // The peer presses Backspace at the start of line 2.
        t.b.update(() => {
          const first = $block([0]) as ElementNode;
          const second = $block([1]) as ElementNode;
          first.append(...second.getChildren());
          second.remove();
        });
        await t.sync();
        // The composed node keeps its key and text (the browser composes
        // into its DOM text node); the peer's text sits next to it.
        t.a.read(() => {
          const node = $getNodeByKey(key);
          expect($isTextNode(node) && node.isAttached()).toBe(true);
          expect((node as TextNode).getTextContent()).toBe(
            where === 'start of line 2' ? 'にj2z' : 'j1zに',
          );
        });
        expect(lineText(t.a, [0])).toBe('j1zにj2z');
        t.a.update(() => {
          const node = $getNodeByKey(key) as TextNode;
          const text = node.getTextContent();
          node.setTextContent(text.replace('に', '日本'));
          node.select(at + 2, at + 2);
        });
        compositionEnd(t.a);
        await t.sync();
        await expectConverged(t.peers, 'paragraph("j1z日本j2z")');
      });
    }
  }

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`a peer joins the lines after typing into the composing line (ids ${ids})`, async () => {
      // The peer's insert into the composing line is held back (not shown
      // until the composition ends); the join then reads the line again, so
      // it shows everything: what the editor shows and what it holds back
      // must stay complementary (the self-check compares them on the next
      // local write).
      const t = await setup(() => $getRoot().append($p('j1z'), $p('j2z')), {
        ids,
      });
      compositionStart(t.a, [1], 0);
      compositionStep(t.a, [1], 0, '', 'に');
      await t.sync();
      const key = t.a.read(() => $text([1]).getKey());
      t.b.update(() => $block([1]).selectEnd().insertText('Z'));
      await t.sync();
      expect(lineText(t.a, [1])).toBe('にj2z');
      t.b.update(() => {
        const first = $block([0]) as ElementNode;
        const second = $block([1]) as ElementNode;
        first.append(...second.getChildren());
        second.remove();
      });
      await t.sync();
      expect(lineText(t.a, [0])).toBe('j1zにj2zZ');
      t.a.update(() => {
        const node = $getNodeByKey(key) as TextNode;
        node.setTextContent(node.getTextContent().replace('に', '日本'));
        node.select(2, 2);
      });
      expect(t.a.warnings).toEqual([]);
      compositionEnd(t.a);
      await t.sync();
      await expectConverged(t.peers, 'paragraph("j1z日本j2zZ")');
    });
  }
});
