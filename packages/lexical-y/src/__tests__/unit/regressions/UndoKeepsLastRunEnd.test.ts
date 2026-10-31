/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// A collaborator types plain text inside a run of a value (a comment, a
// format, a style or a NodeState value); another deletes the text after it,
// which takes the run's own end and the restore the plain text's change
// wrote after it; the collaborator undoes its typing. The value ends where
// the deleted text began, never running on over the text after it (#9624):
// the undo keeps the null before the typed text when it is the last end of
// a run still open before it.

// The value an undo brings back covers exactly what it covered before:
// a collaborator removes a value, its author undoes it (and may write the
// same key later), a third client may delete text around the value's end,
// and the collaborator then undoes the removal. On main, with garbage
// collection on, the restored value runs on past its end (#9623), and with
// many comment ids or a concurrent undo of the end's change too (#9620):
// those cells are pinned as test.fails until the fix lands.
import {$toggleLink, LinkNode} from '@lexical/link';
import {$addMarkID, $getNodeMarkIDs, $removeMarkID} from '@lexical/mark';
import {$patchStyleText} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $isTextNode,
  $setState,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {
  $block,
  $p,
  $selectIn,
  expectConverged,
  freshReader,
  type Peer,
  type Setup,
  setup,
} from '../../utils/harness';
import {markState, prepareMarkState} from '../../utils/sizeOps';

const STATE = markState('lastend');
const TEXT = 'abcd Kilo bb cc Delta end';
type Kind =
  | 'comment'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'color'
  | 'state'
  | 'link';
function $give(kind: Kind, start: number, end: number, on: boolean, count = 1) {
  const s = $selectIn([0], start, end);
  if (kind === 'comment') {
    for (let i = 0; i < count; i++) {
      if (on) {
        $addMarkID(`c${i}`, s);
      } else {
        $removeMarkID(`c${i}`, s);
      }
    }
  } else if (kind === 'color') $patchStyleText(s, {color: on ? 'red' : null});
  else if (kind === 'state') {
    for (const n of s.extract()) if ($isTextNode(n)) $setState(n, STATE, on);
  } else if (kind === 'link') $toggleLink(on ? 'https://a.test' : null);
  else s.formatText(kind, on ? {bold: 1, italic: 2, underline: 8}[kind] : 0);
}
function chars(peer: Peer, kind: Kind): [string, boolean][][] {
  return peer.read(() =>
    $getRoot()
      .getChildren()
      .map(block =>
        (block as ElementNode).getAllTextNodes().flatMap((n: TextNode) => {
          const on =
            kind === 'comment'
              ? $getNodeMarkIDs(n).includes('c0')
              : kind === 'color'
                ? n.getStyle().includes('red')
                : kind === 'state'
                  ? $getState(n, STATE)
                  : kind === 'link'
                    ? n.getParents().some(parent => parent instanceof LinkNode)
                    : n.hasFormat(kind);
          return [...n.getTextContent()].map((c): [string, boolean] => [c, on]);
        }),
      ),
  );
}
async function check(
  t: Setup,
  kind: Kind,
  expected: string[],
  label: string,
  expectedText = [TEXT, 'untouched tail'],
) {
  const got = chars(t.a, kind);
  for (const p of t.peers) {
    expect(p.doc.store.pendingStructs, label + ' pending structs').toBe(null);
    expect(p.doc.store.pendingDs, label + ' pending deletes').toBe(null);
    expect(chars(p, kind), label).toEqual(got);
  }
  expect(
    got.map(cs => cs.map(([c]) => c).join('')),
    label + ' text',
  ).toEqual(expectedText);
  const fresh = await freshReader(t.a);
  try {
    expect(chars(fresh, kind), label + ' fresh').toEqual(got);
  } finally {
    fresh.stop();
  }
  expect(
    got.map(cs => cs.map(([c, on]) => (on ? '^' : c)).join('')),
    label,
  ).toEqual(expected);
}
function mask(text: string, start: number, end: number) {
  return text.slice(0, start) + '^'.repeat(end - start) + text.slice(end);
}
async function make(gc: boolean, ids: number[]) {
  const t = await setup(
    () =>
      $getRoot().append(
        $createParagraphNode().append($createTextNode(TEXT)),
        $createParagraphNode().append($createTextNode('untouched tail')),
      ),
    {ids, prepare: prepareMarkState},
  );
  for (const p of t.peers) p.doc.gc = gc;
  const sync = t.sync;
  t.sync = async () => {
    const before = t.peers.map(p => p.doc.store.getClock(p.doc.clientID));
    await sync();
    expect(
      t.peers.map(p => p.doc.store.getClock(p.doc.clientID)),
      'no writes while applying remote updates',
    ).toEqual(before);
  };
  return t;
}

/** Plain text (no format, style, state or comment) at `offset` of the first line. */
function $plainAt(offset: number, text: string) {
  let left = offset;
  for (const node of $block([0]).getAllTextNodes() as TextNode[]) {
    const size = node.getTextContentSize();
    if (left <= size) {
      const plain = $createTextNode(text);
      if (left === size) {
        node.insertAfter(plain);
      } else if (left === 0) {
        node.insertBefore(plain);
      } else {
        node.splitText(left)[1].insertBefore(plain);
      }
      return;
    }
    left -= size;
  }
}

// "Kilo bb cc" has the value; "XY" is typed after "Kilo".
const RUN: [number, number] = [5, 15];
const AT = 9;
const TYPED = 'XY';
const WITH = TEXT.slice(0, AT) + TYPED + TEXT.slice(AT);
const DELETES: [number, number][][] = [
  [[11, 17]],
  [[11, 19]],
  [[11, 27]],
  [[12, 17]],
  [
    [11, 14],
    [11, 14],
  ],
];

/** The first line after the deletes and the undo of the typing, `^` where the value is. */
function extentAfter(deletes: [number, number][]) {
  let marked = [...WITH].map((c, i) =>
    (i >= RUN[0] && i < AT) ||
    (i >= AT + TYPED.length && i < RUN[1] + TYPED.length)
      ? '^'
      : c,
  );
  let typed = [...WITH].map((_, i) => i >= AT && i < AT + TYPED.length);
  for (const [from, to] of deletes) {
    marked = [...marked.slice(0, from), ...marked.slice(to)];
    typed = [...typed.slice(0, from), ...typed.slice(to)];
  }
  const text = [...WITH];
  let plain = text;
  for (const [from, to] of deletes) {
    plain = [...plain.slice(0, from), ...plain.slice(to)];
  }
  return {
    marked: marked.filter((_, i) => !typed[i]).join(''),
    text: plain.filter((_, i) => !typed[i]).join(''),
  };
}

for (const gc of [false, true]) {
  for (const ids of [
    [1, 2, 3],
    [3, 2, 1],
  ]) {
    for (const kind of [
      'comment',
      'bold',
      'italic',
      'underline',
      'color',
      'state',
    ] as Kind[]) {
      for (const owner of ['the typist', 'a collaborator'] as const) {
        test(`plain text typed inside a ${kind} run by ${owner}, its undo with no delete closes the hole gc=${gc} ids=${ids}`, async () => {
          const t = await make(gc, ids);
          try {
            (owner === 'the typist' ? t.a : t.b).update(() =>
              $give(kind, RUN[0], RUN[1], true),
            );
            await t.sync();
            t.a.update(() => $plainAt(AT, TYPED));
            await t.sync();
            t.a.undo();
            await t.sync();
            await check(
              t,
              kind,
              [mask(TEXT, RUN[0], RUN[1]), 'untouched tail'],
              'hole closed',
            );
          } finally {
            for (const p of t.peers) p.stop();
          }
        });
        for (const deletes of DELETES) {
          test(`plain text typed inside a ${kind} run by ${owner}, the rest of the run deleted ${JSON.stringify(deletes)}, the typing undone gc=${gc} ids=${ids}`, async () => {
            const t = await make(gc, ids);
            try {
              (owner === 'the typist' ? t.a : t.b).update(() =>
                $give(kind, RUN[0], RUN[1], true),
              );
              await t.sync();
              t.a.update(() => $plainAt(AT, TYPED));
              await t.sync();
              for (const [from, to] of deletes) {
                t.b.update(() => void $selectIn([0], from, to).removeText());
                await t.sync();
              }
              t.a.undo();
              await t.sync();
              const {marked, text} = extentAfter(deletes);
              await check(t, kind, [marked, 'untouched tail'], 'run end', [
                text,
                'untouched tail',
              ]);
            } finally {
              for (const p of t.peers) p.stop();
            }
          });
        }
      }
    }
  }
}

// The run's own value written again after the typed text (a collaborator's
// value over part of the range, then the typist's over all of it) is no
// end: undoing the typing joins the run again.
for (const gc of [false, true]) {
  for (const ids of [
    [1, 2, 3],
    [3, 2, 1],
  ]) {
    for (const kind of [
      'comment',
      'bold',
      'italic',
      'color',
      'state',
    ] as Kind[]) {
      test(`a ${kind} written again over a run with plain text typed in it, the typing undone gc=${gc} ids=${ids}`, async () => {
        const t = await make(gc, ids);
        try {
          t.b.update(() => $give(kind, 0, 4, true));
          await t.sync();
          t.a.update(() => $plainAt(3, 'xq'));
          await t.sync();
          t.a.update(() => $give(kind, 0, 10, true));
          await t.sync();
          t.a.update(() => $plainAt(5, 'zz'));
          await t.sync();
          t.a.undo();
          await t.sync();
          const text = TEXT.slice(0, 3) + 'xq' + TEXT.slice(3);
          await check(
            t,
            kind,
            [mask(text, 0, 10), 'untouched tail'],
            'one run',
            [text, 'untouched tail'],
          );
        } finally {
          for (const p of t.peers) p.stop();
        }
      });
    }
  }
}

// #9624 as reported: three comments and an italic word around the typed text.
function $showLine(peer: Peer): string {
  return peer.read(() =>
    $getRoot()
      .getChildren()
      .map((_, i) =>
        ($block([i]).getAllTextNodes() as TextNode[])
          .map(n => {
            const ids = $getNodeMarkIDs(n as LexicalNode);
            return (
              JSON.stringify(n.getTextContent()) +
              (ids.length > 0 ? `[${ids.join(',')}]` : '')
            );
          })
          .join(''),
      )
      .join(' / '),
  );
}

for (const ids of [
  [1, 2],
  [2, 1],
]) {
  test(`a comment does not run on after a collaborator deleted its end and the typing inside it is undone (#9624, ids ${ids})`, async () => {
    // one text node per word; "cccc " is italic
    const t = await setup(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            ...['aaa ', 'bbbb ', 'cccc ', 'ddddd ', 'eeeee ', 'ffff'].map(w =>
              $createTextNode(w).setFormat(w === 'cccc ' ? 'italic' : 0),
            ),
          ),
          $p('tail line'),
        ),
      {ids, prepare: prepareMarkState},
    );
    // B comments "bbbb cccc" (c1); A comments "cccc" (c2) and "cccc dd" (c3); B comments "dd ee" (c4)
    t.b.update(() => void $addMarkID('c1', $selectIn([0], 4, 13)));
    t.a.update(() => void $addMarkID('c2', $selectIn([0], 9, 13)));
    t.a.update(() => void $addMarkID('c3', $selectIn([0], 9, 16)));
    t.b.update(() => void $addMarkID('c4', $selectIn([0], 17, 22)));
    // A types plain (not italic, uncommented) "XYZ" right after "cccc", before the italic space
    t.a.update(() => {
      // the comments split "cccc " into "cccc" and " ": XYZ goes between them
      const node = ($block([0]).getAllTextNodes() as TextNode[]).find(
        n => n.getTextContent() === 'cccc',
      )!;
      node.insertAfter($createTextNode('XYZ'));
    });
    expect($showLine(t.a).split(' / ')[0]).toBe(
      '"aaa ""bbbb "[c1]"cccc"[c1,c2,c3]"XYZ"" "[c3]"dd"[c3]"d""dd ee"[c4]"eee ffff"',
    );
    // B deletes " dd" after "XYZ", then the next character; A undoes its "XYZ"
    t.b.update(() => void $selectIn([0], 16, 19).removeText());
    t.b.update(() => void $selectIn([0], 16, 17).removeText());
    t.a.undo();
    await t.sync();
    await expectConverged(t.peers);
    // nothing past "eeeee" was commented by anyone
    const [, tail] = $showLine(t.a).split(' / ');
    expect(tail).toBe('"tail line"');
  });
}
