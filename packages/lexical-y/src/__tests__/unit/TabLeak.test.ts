/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// A tab's format items close another client's opener: a client that writes
// a tab and text right before another client's tab reuses that tab's
// `t: 'tab'` opener and opens it again for the other tab's character, and
// the other client's undo deletes its own items only, leaving the opener
// open across the next lines. Every reader showed their text as tabs.
// @vitest-environment node

import type * as Y from '@y/y';

import {$createCodeHighlightNode, $createCodeNode} from '@lexical/code';
import {$createHashtagNode, HashtagNode} from '@lexical/hashtag';
import {
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $selectIn,
  expectConverged,
  NODES,
  setup,
} from '../utils/harness';

const $t = (s: string) => $createTextNode(s);

function raw(doc: Y.Doc): string {
  const root = doc.get('lexical-y');
  let s = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (let it: any = root._start; it !== null; it = it.right) {
    if (it.deleted) continue;
    const c = it.content;
    const k = c.constructor.name;
    s +=
      k === 'ContentString'
        ? c.str
        : k === 'ContentType'
          ? c.type.name === '\u00b6'
            ? '¶'
            : `[${c.type.name}]`
          : k === 'ContentFormat'
            ? `{${c.key}=${JSON.stringify(c.value)}}`
            : `<${k}>`;
  }
  return s;
}

const A_EDITS: Record<string, () => void> = {
  // A bolds the whole line, tab included.
  boldAll: () => {
    const line = $block([0]);
    const texts = line.getAllTextNodes();
    const sel = (texts[0] as TextNode).select(0, 0);
    const last = texts[texts.length - 1] as TextNode;
    sel.focus.set(last.getKey(), last.getTextContentSize(), 'text');
    sel.formatText('bold');
  },

  // A bolds the text right before the tab.
  boldBefore: () => {
    $selectIn([0], 0, 9);
    const s = $getSelection();
    if ($isRangeSelection(s)) s.formatText('bold');
  },

  // A retypes the last word before the tab (selects it, types).
  replaceBefore: () => {
    $selectIn([0], 0, 8);
    const s = $getSelection();
    if ($isRangeSelection(s)) s.insertText('gathering');
  },

  // A types right before the tab.
  typeBefore: () => {
    $selectIn([0], 9);
    const s = $getSelection();
    if ($isRangeSelection(s)) s.insertText('X');
  },
};

const D_OPS: Record<string, (t: Awaited<ReturnType<typeof setup>>) => void> = {
  // D deletes its tab (what a Backspace after it removes).
  backspace: t =>
    t.b.update(() => {
      const line = $block([0]);
      const tab = line.getChildren().find(n => n.getType() === 'tab');
      if (tab !== undefined) {
        const prev = tab.getPreviousSibling();
        tab.remove();
        if (prev !== null && prev.getType() === 'text')
          (prev as TextNode).select();
      }
    }),

  // D deletes its own tab, the last one in line 1 (a Backspace after it).
  removeLastTab: t =>
    t.b.update(() => {
      const line = $block([0]);
      const tabs = line.getChildren().filter(n => n.getType() === 'tab');
      const tab = tabs[tabs.length - 1];
      if (tab !== undefined) {
        const prev = tab.getPreviousSibling();
        tab.remove();
        if (prev !== null && prev.getType() === 'text')
          (prev as TextNode).select();
      }
    }),

  undo: t => t.b.undo(),
};

describe('a tab whose closers serve another client', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    for (const aEdit of Object.keys(A_EDITS)) {
      for (const dOp of Object.keys(D_OPS)) {
        test(`D adds a tab, A ${aEdit}, D ${dOp} (ids ${ids})`, async () => {
          const t = await setup(
            () =>
              $getRoot().append(
                $createParagraphNode().append($t('meeting. ')),
                $createParagraphNode().append($t('Server kb556z one use')),
                $createParagraphNode().append($t('kc544z end')),
              ),
            {ids},
          );
          // D (peer b) presses Tab at the end of line 1.
          t.b.binding.undoManager?.stopCapturing();
          t.b.update(() => {
            const line = $block([0]) as ElementNode;
            line.selectEnd();
            const s = $getSelection();
            if ($isRangeSelection(s)) s.insertNodes([$createTabNode()]);
          });
          await t.sync();
          t.a.update(A_EDITS[aEdit]);
          await t.sync();
          const before = raw(t.a.doc);
          t.b.binding.undoManager?.stopCapturing();
          D_OPS[dOp](t);
          await t.sync();
          const shown = t.a.read(() => $getRoot().getTextContent());
          // eslint-disable-next-line no-console
          console.log(
            `${aEdit}/${dOp}/${ids}\n  raw before: ${before}\n  raw after:  ${raw(t.a.doc)}\n  shown: ${JSON.stringify(shown)}`,
          );
          expect(shown).toContain('Server kb556z one use');
          expect(shown).toContain('kc544z end');
          await expectConverged(t.peers);
        });
      }
    }
  }
});

describe("a tab written inside another client's tab run", () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    for (const dOp of ['undo', 'removeLastTab'] as const) {
      test(`D tabs after "the"; A inserts a tab and text before D's tab; D ${dOp} (ids ${ids})`, async () => {
        const t = await setup(
          () =>
            $getRoot().append(
              $createParagraphNode().append($t('the')),
              $createParagraphNode().append($t('Server kb556z one use')),
              $createParagraphNode().append($t('kc544z end')),
            ),
          {ids},
        );
        // D (peer b) presses Tab at the end of line 1.
        t.b.binding.undoManager?.stopCapturing();
        t.b.update(() => {
          const text = $block([0]).getFirstChild() as TextNode;
          text.select(3, 3);
          const s = $getSelection();
          if ($isRangeSelection(s)) s.insertNodes([$createTabNode()]);
        });
        await t.sync();
        // A puts its caret at the end of "the" (before D's tab), presses Tab
        // and types.
        t.a.update(() => {
          const text = $block([0]).getFirstChild() as TextNode;
          text.select(3, 3);
          const s = $getSelection();
          if ($isRangeSelection(s)) s.insertNodes([$createTabNode()]);
        });
        await t.sync();
        t.a.update(() => {
          const s = $getSelection();
          if ($isRangeSelection(s)) s.insertText('Like review');
        });
        await t.sync();
        const before = raw(t.a.doc);
        const shownBefore = t.a.read(() => $getRoot().getTextContent());
        t.b.binding.undoManager?.stopCapturing();
        D_OPS[dOp](t);
        await t.sync();
        const shown = t.a.read(() => $getRoot().getTextContent());
        // eslint-disable-next-line no-console
        console.log(
          `inside/${dOp}/${ids}\n  raw before: ${before}\n  shown before: ${JSON.stringify(shownBefore)}\n  raw after:  ${raw(t.a.doc)}\n  shown: ${JSON.stringify(shown)}`,
        );
        expect(shown).toContain('Server kb556z one use');
        expect(shown).toContain('kc544z end');
        await expectConverged(t.peers);
      });
    }
  }
});

describe('editing after a tab undo (the writer never writes inside another tab run)', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`after D's undo, A and B type in the lines the opener covers (ids ${ids})`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $createParagraphNode().append($t('the')),
            $createParagraphNode().append($t('Server kb556z one use')),
            $createParagraphNode().append($t('kc544z end')),
          ),
        {ids},
      );
      t.b.binding.undoManager?.stopCapturing();
      t.b.update(() => {
        const text = $block([0]).getFirstChild() as TextNode;
        text.select(3, 3);
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertNodes([$createTabNode()]);
      });
      await t.sync();
      t.a.update(() => {
        const text = $block([0]).getFirstChild() as TextNode;
        text.select(3, 3);
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertNodes([$createTabNode()]);
      });
      await t.sync();
      t.a.update(() => {
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText('Like review');
      });
      await t.sync();
      t.b.binding.undoManager?.stopCapturing();
      t.b.undo();
      await t.sync();
      // Edits inside the range the open `t="tab"` covers.
      t.a.update(() => {
        const text = $block([1]).getFirstChild() as TextNode;
        text.select(text.getTextContentSize(), text.getTextContentSize());
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText(' more');
      });
      t.b.update(() => {
        const text = $block([2]).getFirstChild() as TextNode;
        text.select(0, 0);
        const s = $getSelection();
        if ($isRangeSelection(s)) {
          s.insertText('Start ');
          s.insertNodes([$createTabNode()]);
        }
      });
      await t.sync();
      const shown = t.a.read(() => $getRoot().getTextContent());
      // A's tab was written before D's run (not inside it), so D's undo
      // left no opener: no `t` or `k` format is open past a line's end.
      expect(raw(t.a.doc)).not.toMatch(
        /\{t="tab"\}[^\t{]*\u00b6|review\{t="tab"\}/,
      );
      expect(shown).toContain('Server kb556z one use more');
      expect(shown).toContain('Start \tkc544z end');
      await expectConverged(t.peers);
    });
  }
});

// Text a composition holds back (see Hidden) under a tab's opener left open:
// the shown text reads as it does with nothing held back, plain, so the
// writer does not write needless type and segment closers around it.
describe('shown text next to held-back text under an open tab opener', () => {
  test('reads with the attributes it has with nothing held back', async () => {
    const {Doc} = await import('@y/y');
    const {Hidden} = await import('../../internal/Hidden');
    const {Atoms, readAtoms} = await import('../../internal/Inline');
    const doc = new Doc();
    const root = doc.get('t');
    root.insert(0, 'x\tY', {k: 'seg', t: 'tab'});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let item: any = root._start;
    while (item !== null && typeof item.content.str !== 'string') {
      item = item.right;
    }
    const read = (hide: boolean) => {
      const hidden = new Hidden('composed');
      if (hide) {
        hidden.add(item.id.client, item.id.clock + 2, 1);
      }
      const atoms = new Atoms();
      readAtoms(root._start, null, new Map(), atoms, hidden);
      return atoms;
    };
    const shown = read(true);
    const all = read(false);
    expect(shown.text).toBe('x\t');
    expect(shown.runs.map(r => [r.start, r.end, r.attrs])).toEqual(
      all.runs
        .filter(r => r.start < 2)
        .map(r => [r.start, Math.min(r.end, 2), r.attrs]),
    );
    expect(shown.runs[0].attrs).toEqual({});
  });
});

// Nodes Lexical keeps apart from an equal neighbour (a tab, token and
// segmented text) are stored as runs with a segment key. A node written
// right next to another client's node of the same kind, inside that node's
// run, must state its own type and formats: the other client's undo deletes
// the run's opener and closers, and a node that relied on them was read as
// another node (a tab as a "\t" in the text before it, a token as plain
// text).
describe("a node kept apart written next to another client's", () => {
  // Every kind of text node stored with a segment key: a tab, text in
  // token and segmented mode (with and without a format), and TextNode
  // subclasses (a hashtag; a code highlight token in a code block).
  const KINDS = [
    'tab',
    'token',
    'segmented',
    'bold token',
    'hashtag',
    'code-highlight',
  ] as const;
  type Kind = (typeof KINDS)[number];
  const $make = (kind: Kind, text: string): LexicalNode => {
    switch (kind) {
      case 'tab':
        return $createTabNode();
      case 'hashtag':
        return $createHashtagNode(`#${text}`);
      case 'code-highlight':
        return $createCodeHighlightNode(text, 'keyword');
      default: {
        const node = $createTextNode(text).setMode(
          kind === 'segmented' ? 'segmented' : 'token',
        );
        return kind === 'bold token' ? node.setFormat('bold') : node;
      }
    }
  };
  const isKind = (kind: Kind, n: LexicalNode): boolean =>
    kind === 'tab' || kind === 'hashtag' || kind === 'code-highlight'
      ? n.getType() === kind
      : n.getType() === 'text' && (n as TextNode).getMode() !== 'normal';
  const $kindNodes = (kind: Kind): LexicalNode[] =>
    $block([0])
      .getChildren()
      .filter(n => isKind(kind, n));
  const describeKind = (n: LexicalNode) => JSON.stringify(n.exportJSON());
  for (const container of ['paragraph', 'code'] as const) {
    for (const kind of KINDS) {
      // Code highlight tokens live in code blocks; a code block holds
      // tabs and code highlight tokens only.
      const inCode = kind === 'tab' || kind === 'code-highlight';
      const inParagraph = kind !== 'code-highlight';
      if (container === 'code' ? !inCode : !inParagraph) {
        continue;
      }
      for (const side of ['after', 'before'] as const) {
        for (const op of ['undo', 'remove'] as const) {
          for (const ids of [
            [1, 2],
            [2, 1],
          ]) {
            test(`${container}: B adds a ${kind}, A adds one ${side} it, B ${op}s (ids ${ids})`, async () => {
              const t = await setup(
                () =>
                  $getRoot().append(
                    (container === 'code'
                      ? $createCodeNode()
                      : $createParagraphNode()
                    ).append($t('ab'), $make(kind, 'PP'), $t('cd')),
                    $createParagraphNode().append($t('next line')),
                  ),
                {ids, nodes: [...NODES, HashtagNode]},
              );
              // B adds its node right before the first one.
              let bKey = '';
              t.b.update(() => {
                const bs = $make(kind, 'BB');
                $kindNodes(kind)[0].insertBefore(bs);
                bKey = bs.getKey();
              });
              await t.sync();
              // A adds its node right after (or before) B's.
              t.a.update(() => {
                const bs = $kindNodes(kind)[0];
                const mine = $make(kind, 'AA');
                if (side === 'after') {
                  bs.insertAfter(mine);
                } else {
                  bs.insertBefore(mine);
                }
              });
              const want = t.a.read(() =>
                $kindNodes(kind)
                  .filter((_n, i) => i !== (side === 'after' ? 0 : 1))
                  .map(describeKind),
              );
              if (op === 'undo') {
                t.b.undo();
              } else {
                t.b.update(() => {
                  $getNodeByKey(bKey)?.remove();
                });
              }
              await t.sync();
              for (const peer of t.peers) {
                expect(
                  peer.read(() => $kindNodes(kind).map(describeKind)),
                ).toEqual(want);
                // No tab character outside a tab node.
                expect(
                  peer.read(() =>
                    $block([0])
                      .getChildren()
                      .filter(
                        n =>
                          n.getType() !== 'tab' &&
                          n.getTextContent().includes('\t'),
                      )
                      .map(n => n.getTextContent()),
                  ),
                ).toEqual([]);
              }
              await expectConverged(t.peers);
            });
          }
        }
      }
    }
  }
});

// A tab's run holds one "\t" when one writer wrote it, but concurrent writes
// can leave two clients' "\t" under one tab opener (a tab restored by an undo
// next to another client's tab in the same run). Each "\t" is a tab: read
// as one tab node, one character was not shown and the self-check reported
// the line.
describe('tab characters under one tab opener', () => {
  for (const container of ['paragraph', 'code'] as const) {
    test(`${container}: two "\\t" in one run read as two tabs`, async () => {
      const t = await setup(() =>
        $getRoot().append(
          (container === 'code'
            ? $createCodeNode()
            : $createParagraphNode()
          ).append($t('ab'), $createTabNode(), $t('cd')),
          $createParagraphNode().append($t('next line')),
        ),
      );
      // Another client writes a "\t" right after the tab's "\t", inside its
      // run: Yjs gives it the run's type and segment key.
      const root = t.b.doc.get('lexical-y');
      let segment: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (let it: any = root._start; it !== null; it = it.right) {
        if (!it.deleted && it.content.key === 'k' && it.content.value) {
          segment = it.content.value;
          break;
        }
      }
      expect(segment).not.toBe(null);
      t.b.doc.transact(() => {
        root.insert(3, '\t', {k: segment, t: 'tab'});
      });
      expect(raw(t.b.doc)).toContain('\t\t');
      await t.sync();
      for (const peer of t.peers) {
        expect(
          peer.read(() =>
            $block([0])
              .getChildren()
              .map(n => n.getType()),
          ),
        ).toEqual(['text', 'tab', 'tab', 'text']);
      }
      // Both still edit the line.
      t.a.update(() => {
        $selectIn([0], 0, 0);
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText('X');
      });
      t.b.update(() => {
        const last = $block([0]).getLastChild() as TextNode;
        last.select(last.getTextContentSize(), last.getTextContentSize());
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText('Y');
      });
      await t.sync();
      expect(t.a.read(() => $block([0]).getTextContent())).toBe('Xab\t\tcdY');
      await expectConverged(t.peers);
    });
  }
});
