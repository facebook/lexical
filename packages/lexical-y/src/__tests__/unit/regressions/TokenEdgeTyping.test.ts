/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// One client turns a word into token or segmented text (a mention) while a
// collaborator types right before or right after that word (#9639). The
// collaborator's text is not part of the token: the token holds just the
// word, on every client, in both client id orders, whether the text is typed
// in one insert or a character at a time. Controls: typing after the next
// space, and typing after a word that was token text before. The typed
// text keeps its own formats and comments, and stays out when the first
// client undoes and redoes making the token (a redo writes the run's format
// items again, next to the typed text). Not covered: a node that was
// already a node of its own (an unmergeable or custom text node) made token
// or segmented text, typed after for one client id order (expected
// failures).

import {$addMarkID, $getNodeMarkIDs} from '@lexical/mark';
import {
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  type ElementNode,
  type TextModeType,
  TextNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {expectConverged, NODES, setup} from '../../utils/harness';
import {prepareMarkState} from '../../utils/sizeOps';

const $line = () => $getRoot().getFirstChildOrThrow() as ElementNode;

// "t1z t2z t3z t4z": t3z is 8..11.
const $typeAt = (at: number, text: string, oneAtATime: boolean) => {
  const n = $line().getFirstChildOrThrow() as TextNode;
  const selection = $createRangeSelection();
  selection.anchor.set(n.getKey(), at, 'text');
  selection.focus.set(n.getKey(), at, 'text');
  $setSelection(selection);
  if (oneAtATime) {
    for (const ch of text) {
      selection.insertText(ch);
    }
  } else {
    selection.insertText(text);
  }
  $setSelection(null);
};

const special = (t: Awaited<ReturnType<typeof setup>>) =>
  t.a.read(() =>
    $line()
      .getAllTextNodes()
      .filter(n => n.getMode() !== 'normal')
      .map(n => [n.getMode(), n.getTextContent()]),
  );

for (const mode of ['token', 'segmented'] as TextModeType[]) {
  for (const [where, at, text] of [
    ['after the word', 11, ' q9z'],
    ['before the word', 8, 'q9z '],
    ['after the next space (control)', 12, 'q9z '],
  ] as [string, number, string][]) {
    for (const oneAtATime of [false, true]) {
      for (const ids of [
        [1, 2],
        [2, 1],
      ]) {
        test(`A makes "t3z" ${mode} text || B types ${where}${oneAtATime ? ' a character at a time' : ''}, ids ${ids}`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append(
                  $createTextNode('t1z t2z t3z t4z'),
                ),
              );
            },
            {ids},
          );
          t.offline();
          t.a.update(() => {
            const n = $line().getFirstChildOrThrow() as TextNode;
            const [, mid] = n.splitText(8, 11);
            mid.setMode(mode);
            $setSelection(null);
          });
          t.b.update(() => $typeAt(at, text, oneAtATime));
          await t.sync();
          await expectConverged(t.peers);
          expect(t.a.read(() => $line().getTextContent())).toContain('q9z');
          expect(special(t)).toEqual([[mode, 't3z']]);
          // Later edits keep it so: B types on right next to its text, and A
          // at the end of the line.
          t.b.update(() => {
            const typed = $line()
              .getAllTextNodes()
              .find(n => n.getTextContent().includes('q9z'))!;
            const end = typed.getTextContent().indexOf('q9z') + 'q9z'.length;
            typed.select(end, end).insertText('x');
            $setSelection(null);
          });
          await t.sync();
          await expectConverged(t.peers);
          expect(t.a.read(() => $line().getTextContent())).toContain('q9zx');
          expect(special(t)).toEqual([[mode, 't3z']]);
          t.a.update(() => {
            const last = $line().getLastChildOrThrow() as TextNode;
            last.select(last.getTextContentSize(), last.getTextContentSize());
            last.selectEnd().insertText(' end');
            $setSelection(null);
          });
          await t.sync();
          await expectConverged(t.peers);
          expect(special(t)).toEqual([[mode, 't3z']]);
        });
      }
    }
  }
}

for (const mode of ['token', 'segmented'] as TextModeType[]) {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`B types right after a word that was ${mode} text before (control), ids ${ids}`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('t1z t2z '),
              $createTextNode('t3z').setMode(mode),
              $createTextNode(' t4z'),
            ),
          );
        },
        {ids},
      );
      t.b.update(() => {
        const token = $line().getChildAtIndex(1) as TextNode;
        token.select(3, 3);
        token.selectEnd().insertText('q9z');
        $setSelection(null);
      });
      await t.sync();
      await expectConverged(t.peers);
      expect(t.a.read(() => $line().getTextContent())).toContain('q9z');
      expect(special(t)).toEqual([[mode, 't3z']]);
    });
  }
}

for (const mode of ['token', 'segmented'] as TextModeType[]) {
  for (const side of ['before', 'after'] as const) {
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`A makes "word" ${mode} text || B types bold, commented text ${side} it, ids ${ids}`, async () => {
        const t = await setup(
          () =>
            $getRoot().append(
              $createParagraphNode().append($createTextNode('aa word zz')),
            ),
          {ids, prepare: prepareMarkState},
        );
        const $typed = () =>
          $line()
            .getAllTextNodes()
            .filter(n => n.getTextContent().includes('X'))
            .map(n => ({
              bold: n.hasFormat('bold'),
              comments: $getNodeMarkIDs(n),
              mode: n.getMode(),
              text: n.getTextContent(),
            }));
        const expected = [
          {bold: true, comments: ['edge'], mode: 'normal', text: 'X'},
        ];
        try {
          t.offline();
          t.a.update(() => {
            const n = $line().getFirstChildOrThrow() as TextNode;
            const [, word] = n.splitText(3, 7);
            word.setMode(mode);
            $setSelection(null);
          });
          t.b.update(() => {
            const n = $line().getFirstChildOrThrow() as TextNode;
            const at = side === 'before' ? 3 : 7;
            const selection = n.select(at, at);
            selection.format = 1;
            selection.insertText('X');
            const x = $line()
              .getAllTextNodes()
              .find(text => text.getTextContent() === 'X')!;
            $addMarkID('edge', x.select(0, 1));
            $setSelection(null);
          });
          expect(t.b.read($typed)).toEqual(expected);
          await t.sync();
          await expectConverged(t.peers);
          for (const p of t.peers) {
            expect(p.read($typed)).toEqual(expected);
          }
        } finally {
          for (const p of t.peers) {
            p.stop();
          }
        }
      });
    }
  }
}

class CustomText extends TextNode {
  $config() {
    return this.config('token-edge-custom-text', {extends: TextNode});
  }
}

for (const kind of ['custom', 'unmergeable'] as const) {
  for (const mode of ['token', 'segmented'] as TextModeType[]) {
    for (const side of ['before', 'after'] as const) {
      for (const ids of [
        [1, 2],
        [2, 1],
      ]) {
        // Not covered (see the top): text typed after a node that was
        // already one of its own lands inside its mode for this order.
        const known = side === 'after' && ids[0] === 2;
        (known ? test.fails : test)(
          `A makes an existing ${kind} node ${mode} text || B types ${side} it, ids ${ids}`,
          async () => {
            const t = await setup(
              () => {
                const word =
                  kind === 'custom'
                    ? $create(CustomText).setTextContent('word')
                    : $createTextNode('word').toggleUnmergeable();
                $getRoot().append(
                  $createParagraphNode().append(
                    $createTextNode('aa '),
                    word,
                    $createTextNode(' zz'),
                  ),
                );
              },
              {ids, nodes: [...NODES, CustomText]},
            );
            try {
              t.offline();
              t.a.update(() => {
                ($line().getChildAtIndex(1) as TextNode).setMode(mode);
                $setSelection(null);
              });
              t.b.update(() => {
                const n = (
                  side === 'before'
                    ? $line().getFirstChildOrThrow()
                    : $line().getLastChildOrThrow()
                ) as TextNode;
                const at = side === 'before' ? 3 : 0;
                n.select(at, at).insertText(
                  side === 'before' ? 'extra words ' : ' extra words',
                );
                $setSelection(null);
              });
              await t.sync();
              await expectConverged(t.peers);
              expect(t.a.read(() => $line().getTextContent())).toBe(
                side === 'before'
                  ? 'aa extra words word zz'
                  : 'aa word extra words zz',
              );
              expect(
                t.a.read(() =>
                  $line()
                    .getAllTextNodes()
                    .filter(n => n.getTextContent().includes('extra'))
                    .map(n => n.getMode()),
                ),
              ).toEqual(['normal']);
            } finally {
              for (const p of t.peers) {
                p.stop();
              }
            }
          },
        );
      }
    }
  }
}

for (const mode of ['token', 'segmented'] as TextModeType[]) {
  for (const side of ['before', 'after'] as const) {
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`A makes "word" ${mode} text || B types ${side} it, then A undoes, redoes and deletes the token, ids ${ids}`, async () => {
        const t = await setup(
          () =>
            $getRoot().append(
              $createParagraphNode().append($createTextNode('aa word zz')),
            ),
          {ids},
        );
        try {
          t.offline();
          t.a.update(() => {
            const n = $line().getFirstChildOrThrow() as TextNode;
            const [, word] = n.splitText(3, 7);
            word.setMode(mode);
            $setSelection(null);
          });
          t.b.update(() => {
            const n = $line().getFirstChildOrThrow() as TextNode;
            const at = side === 'before' ? 3 : 7;
            n.select(at, at).insertText('X');
            $setSelection(null);
          });
          await t.sync();
          expect(special(t)).toEqual([[mode, 'word']]);
          t.a.undo();
          await t.sync();
          expect(special(t)).toEqual([]);
          t.a.binding.redo();
          await t.sync();
          await expectConverged(t.peers);
          expect(special(t)).toEqual([[mode, 'word']]);
          t.a.update(() => {
            $line()
              .getAllTextNodes()
              .find(n => n.getTextContent() === 'word')!
              .remove();
            $setSelection(null);
          });
          await t.sync();
          await expectConverged(t.peers);
          expect(t.a.read(() => $line().getTextContent())).toBe('aa X zz');
        } finally {
          for (const p of t.peers) {
            p.stop();
          }
        }
      });
    }
  }
}
