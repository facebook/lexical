/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// #9646: a line whose first text node is bold (written by another client),
// made again as plain text with several words changed, while a collaborator
// bolds the word right after that node, which the remake keeps: with the
// collaborator's client id below the remaker's, the bold was lost on every
// client. The remake restored bold after its new text and, because another
// client's change opened that run, wrote a null of its own right after the
// run's end to bound the restore (Cursor#format, rule 5); the same write then
// removed the restore but left that null, which ended the collaborator's bold
// (Yjs put it after the collaborator's opener). A write that removes such a
// restore now removes its end too.
//
// #9650 (open): where the restore stays (plain text typed inside the run, or
// the format removed from part of it), its end is still needed and the race
// remains.

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  type ElementNode,
  type TextFormatType,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  expectConverged,
  freshReader,
  type Peer,
  setup,
} from '../../utils/harness';

const IDS = [
  [1, 2],
  [2, 1],
];
const FORMATS: TextFormatType[] = ['bold', 'italic', 'underline', 'code'];

const $line = () => $getRoot().getChildAtIndex(1) as ElementNode;
const formatted = (p: Peer, format: TextFormatType) =>
  p.read(() =>
    $line()
      .getAllTextNodes()
      .filter(n => n.hasFormat(format))
      .map(n => n.getTextContent())
      .join('|'),
  );
const text = (p: Peer) => p.read(() => $line().getTextContent());

/**
 * The line `old` (each piece formatted or plain), made again by A as
 * `made` (plain pieces, or [text, formatted]), while B gives `format` to
 * `victim`, a word of the old line the remake keeps; expects `victim` to end
 * with `format`, and every client and a fresh reader to agree.
 */
async function race(
  ids: number[],
  format: TextFormatType,
  old: [string, boolean][],
  made: [string, boolean][],
  victim: string,
  want: string,
) {
  const t = await setup(
    () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Title')),
        $createParagraphNode().append(
          ...old.map(([s, f]) => {
            const n = $createTextNode(s);
            return f ? n.toggleFormat(format) : n;
          }),
        ),
      );
    },
    {ids},
  );
  t.offline();
  t.a.update(() => {
    for (const o of $line().getChildren()) {
      o.remove();
    }
    $line().append(
      ...made.map(([s, f]) => {
        const n = $createTextNode(s);
        return f ? n.toggleFormat(format) : n;
      }),
    );
    $setSelection(null);
  });
  t.b.update(() => {
    const at = old
      .map(([s]) => s)
      .join('')
      .indexOf(victim);
    let acc = 0;
    for (const leaf of $line().getAllTextNodes()) {
      const size = leaf.getTextContentSize();
      const s0 = Math.max(at, acc);
      const s1 = Math.min(at + victim.length, acc + size);
      if (s1 > s0) {
        const parts = leaf.splitText(s0 - acc, s1 - acc);
        const mid = s0 - acc === 0 ? parts[0] : parts[1];
        if (!mid.hasFormat(format)) {
          mid.toggleFormat(format);
        }
      }
      acc += size;
    }
    $setSelection(null);
  });
  await t.sync();
  const fresh = await freshReader(t.a);
  const line = made.map(([s]) => s).join('');
  for (const p of [t.a, t.b, fresh]) {
    expect(text(p)).toBe(line);
    expect(formatted(p, format)).toBe(want);
  }
  await expectConverged(t.peers);
}

describe('#9646: a remade line, while a collaborator formats the word after a formatted run', () => {
  for (const ids of IDS) {
    for (const format of FORMATS) {
      // Reduced from a randomized session (seed 5540 of
      // RemadeTextStretches at 6,000 seeds).
      test(`${format}: the last word, after a formatted first node made plain (ids ${ids})`, () =>
        race(
          ids,
          format,
          [
            ['t552z, t860z t701z ', true],
            ['t167z', false],
          ],
          [['t490z t169z.  t611z. t167z', false]],
          't167z',
          't167z',
        ));
      test(`${format}: a word inside a node, split by the remake (ids ${ids})`, () =>
        race(
          ids,
          format,
          [
            ['t168z t435z  ', true],
            ['t782z t194z', false],
          ],
          [
            ['t477z.  t7', false],
            ['82z', false],
          ],
          't782z',
          't782z',
        ));
      test(`${format}: the run's words changed, the run kept formatted (ids ${ids})`, () =>
        race(
          ids,
          format,
          [
            ['aa bb ', true],
            ['cc dd', false],
          ],
          [
            ['xx yy ', true],
            ['cc dd', false],
          ],
          'cc',
          // The run and the word next to it: one node on every client.
          'xx yy cc',
        ));
      test(`${format}: the run's words changed and made plain (ids ${ids})`, () =>
        race(
          ids,
          format,
          [
            ['aa bb ', true],
            ['cc dd', false],
          ],
          [['xx yy cc dd', false]],
          'cc',
          'cc',
        ));
      test(`control: ${format}, a plain first node (ids ${ids})`, () =>
        race(
          ids,
          format,
          [
            ['t552z, t860z t701z ', false],
            ['t167z', false],
          ],
          [['t490z t169z.  t611z. t167z', false]],
          't167z',
          't167z',
        ));
    }
  }
});

/** A types or unformats inside a bold run while B bolds the word after it. */
async function inside(ids: number[], edit: 'type' | 'unbold') {
  const t = await setup(
    () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Title')),
        $createParagraphNode().append(
          $createTextNode('aa bb ').toggleFormat('bold'),
          $createTextNode('cc'),
        ),
      );
    },
    {ids},
  );
  t.offline();
  t.a.update(() => {
    const [first, rest] = ($line().getFirstChild() as TextNode).splitText(2);
    if (edit === 'type') {
      rest.insertBefore($createTextNode('X'));
    } else {
      first.toggleFormat('bold');
    }
    $setSelection(null);
  });
  t.b.update(() => {
    ($line().getChildren()[1] as TextNode).toggleFormat('bold');
    $setSelection(null);
  });
  await t.sync();
  for (const p of t.peers) {
    expect(formatted(p, 'bold').endsWith('cc')).toBe(true);
  }
  await expectConverged(t.peers);
}

describe('#9650: plain text typed inside a bold run, while a collaborator bolds the word after it', () => {
  for (const edit of ['type', 'unbold'] as const) {
    test(`${edit} inside the run (ids 1,2)`, () => inside([1, 2], edit));
    // #9650: the restore's own end, after the run's end, comes after the
    // collaborator's opener by client id.
    test.fails(`${edit} inside the run (ids 2,1)`, () => inside([2, 1], edit));
  }
});
