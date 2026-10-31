/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// #9636: `setTextContent` (and any text set whole without a caret) found an
// insertion or a deletion by its common start first, so where equal letters
// allowed it the edit landed inside words: `t1z t2z t3z` set to `t1z t3z`
// deleted `2z t`, and a collaborator's concurrent delete of `t2z` left
// `t1z 3z`. An insertion or a deletion of set text now goes to a word edge of
// the run of equal text it could be in, the first one (a word deleted with
// the space before it), unless the caret placed it.

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {expectConverged, flush, freshReader, setup} from '../../utils/harness';

const $node = () =>
  (
    $getRoot().getFirstChildOrThrow() as ElementNode
  ).getFirstChildOrThrow() as TextNode;
const $splice = (at: number, n: number, insert: string) => () => {
  const node = $node();
  const s = $createRangeSelection();
  s.anchor.set(node.getKey(), at, 'text');
  s.focus.set(node.getKey(), at + n, 'text');
  $setSelection(s);
  if (insert === '') {
    s.removeText();
  } else {
    s.insertText(insert);
  }
  $setSelection(null);
};

const IDS = [
  [1, 2],
  [2, 1],
];

describe('#9636: a word set away with setTextContent ‖ a collaborator edits next to it', () => {
  for (const ids of IDS) {
    for (const [name, base, set, at, n, insert, expected] of [
      ['both delete t2z', 't1z t2z t3z', 't1z t3z', 4, 3, '', 't1z t3z'],
      [
        'the peer types " q9z" after t2z',
        't1z t2z t3z',
        't1z t3z',
        7,
        0,
        ' q9z',
        't1z q9z t3z',
      ],
      [
        'both delete t3z of four',
        't1z t2z t3z t4z',
        't1z t2z t4z',
        8,
        3,
        '',
        't1z t2z t4z',
      ],
      [
        'set adds t2z ‖ the peer deletes t1z',
        't1z t3z',
        't1z t2z t3z',
        0,
        3,
        '',
        ' t2z t3z',
      ],
    ] as [string, string, string, number, number, string, string][]) {
      for (const timing of ['concurrent', 'unread'] as const) {
        test(`${name}, ${timing} (ids ${ids})`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode(base)),
              );
            },
            {ids},
          );
          t.offline();
          const $set = () => {
            $node().setTextContent(set);
            $setSelection(null);
          };
          if (timing === 'unread') {
            t.b.update($splice(at, n, insert));
            t.a.editor.update($set);
            await t.sync();
            await flush();
            await t.sync();
          } else {
            t.a.update($set);
            t.b.update($splice(at, n, insert));
            await t.sync();
          }
          const fresh = await freshReader(t.a);
          const texts = [...t.peers, fresh].map(p =>
            p.read(() => $getRoot().getTextContent()),
          );
          expect(texts).toEqual(texts.map(() => expected));
          await expectConverged(t.peers);
        });
      }
    }
  }
});

/** A seeded random integer below `n`. */
function random(seed: number): (n: number) => number {
  let s = seed >>> 0;
  return n => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return Math.floor((((x ^ (x >>> 14)) >>> 0) / 4294967296) * n);
  };
}

const SEEDS = Number(process.env.LEXICAL_Y_SEEDS || 150);

// The property: a line of words that share letters (`t<n>z`, one or two
// digits) is set with setTextContent to the line with one word deleted or
// inserted, while a collaborator deletes a word, or types a word after a
// word (a space, then the word) or before one (the word, then a space),
// concurrently or before the setter read it, in either client id order.
// Every word of the result is a whole word (no word split or glued to
// another), a word either of them deleted stays deleted, a word either of
// them added is there once, and every client and a fresh reader agree. One
// exception, counted apart and documented (y.md, Limits): a word typed right
// against a word the set deletes, on the side of the space the set deletes
// with it, is glued to the word beyond (`t1z t2z t3z` set to `t1z t3z`
// deletes ` t2z`, and a word typed before `t2z` joins `t1z`; a line's first
// word has no space before it, so its space after it goes).
describe('#9636: set text and a collaborator edit keep every word whole', () => {
  for (const timing of ['concurrent', 'unread'] as const) {
    for (const edit of ['delete', 'type after', 'type before'] as const) {
      test(`${timing}: one word deleted or inserted by setTextContent ‖ the peer ${edit}s a word`, async () => {
        const failures: string[] = [];
        let gluedCount = 0;
        for (let seed = 1; seed <= SEEDS; seed++) {
          const rnd = random(
            seed * 104729 + (timing === 'unread' ? 7 : 0) + edit.length,
          );
          const count = 3 + rnd(5);
          const numbers = new Set<number>();
          while (numbers.size < count + 2) {
            numbers.add(1 + rnd(30));
          }
          const [made, typed, ...words] = [...numbers].map(x => `t${x}z`);
          const old = words.join(' ');
          const target = rnd(words.length);
          const insertSet = rnd(2) === 0;
          const next = insertSet
            ? [...words.slice(0, target), made, ...words.slice(target)]
            : words.filter((_, i) => i !== target);
          // The peer's word: any old word (for a delete, one the set keeps).
          const choices = words.filter(
            (w, i) => edit !== 'delete' || insertSet || i !== target,
          );
          const victim = choices[rnd(choices.length)];
          const vAt =
            old.split(' ').slice(0, words.indexOf(victim)).join(' ').length +
            (words.indexOf(victim) > 0 ? 1 : 0);
          const ids = rnd(2) === 0 ? [1, 2] : [2, 1];
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode(old)),
              );
            },
            {ids},
          );
          t.offline();
          const $set = () => {
            $node().setTextContent(next.join(' '));
            $setSelection(null);
          };
          const $peer =
            edit === 'delete'
              ? $splice(vAt, victim.length, '')
              : edit === 'type after'
                ? $splice(vAt + victim.length, 0, ` ${typed}`)
                : $splice(vAt, 0, `${typed} `);
          if (timing === 'unread') {
            t.b.update($peer);
            t.a.editor.update($set);
            await t.sync();
            await flush();
            await t.sync();
          } else {
            t.a.update($set);
            t.b.update($peer);
            await t.sync();
          }
          const fresh = await freshReader(t.a);
          const texts = [...t.peers, fresh].map(p =>
            p.read(() => $getRoot().getTextContent()),
          );
          const got = texts[0].split(/ +/).filter(Boolean);
          const problems: string[] = [];
          if (new Set(texts).size > 1) {
            problems.push(`diverged ${JSON.stringify(texts)}`);
          }
          // A word typed against the deleted word, glued to its neighbour.
          const gone = insertSet ? null : words[target];
          const glued = (w: string) =>
            gone !== null &&
            (victim === gone ||
              words[words.indexOf(gone) - 1] === victim ||
              words[words.indexOf(gone) + 1] === victim) &&
            (w.startsWith(typed) || w.endsWith(typed)) &&
            next.includes(
              w.startsWith(typed)
                ? w.slice(typed.length)
                : w.slice(0, -typed.length),
            );
          for (const w of got.filter(glued)) {
            got.splice(
              got.indexOf(w),
              1,
              ...(w.startsWith(typed)
                ? [typed, w.slice(typed.length)]
                : [w.slice(0, -typed.length), typed]),
            );
            gluedCount++;
          }
          for (const w of got) {
            if (!/^t\d+z$/.test(w)) {
              problems.push(`"${w}" not a word`);
            }
          }
          const want = new Set(next);
          if (edit === 'delete') {
            want.delete(victim);
          } else {
            want.add(typed);
          }
          for (const w of want) {
            if (got.filter(x => x === w).length !== 1) {
              problems.push(`"${w}" x${got.filter(x => x === w).length}`);
            }
          }
          for (const w of got) {
            if (!want.has(w)) {
              problems.push(`"${w}" came back`);
            }
          }
          if (problems.length > 0) {
            failures.push(
              `seed ${seed} ids ${ids} "${old}" -> "${next.join(' ')}"; ${edit} "${victim}": ${JSON.stringify(texts[0])}: ${problems.join(', ')}`,
            );
          }
        }
        expect(failures).toEqual([]);
        if (process.env.LEXICAL_Y_VERBOSE) {
          // eslint-disable-next-line no-console
          console.log(`glued ${gluedCount} of ${SEEDS}`);
        }
      }, 120_000);
    }
  }
});
