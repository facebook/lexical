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

import {
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$block, $selectIn, expectConverged, setup} from '../utils/harness';

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
