/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Ownership scans: the binding decides that an item belongs to a write or a
// client (a run's own end, a hole a write opened, the run ends an undo
// keeps). These cells give that decision neighbours of the SAME client from
// DIFFERENT writes: B gives "Kilo" a value, types plain " zz" elsewhere,
// gives "cc" the same value, then undoes 0 to 3 of those writes while A,
// at the same time, edits inside "Kilo" (types plain text, removes the value
// from "il", or deletes a letter). Every value kind: bold, code, a comment
// (set-valued NodeState) and a link. Both client id orders.
//
// The contract, from a model of the edits rather than from another tree:
// the peers converge on what a fresh reader of the document shows; text
// that nobody gave the value never has it (it never runs on past a range a
// write gave it); text a live write gave the value keeps it, unless A
// removed it there; text a collaborator typed plain stays plain. Text inside
// a range whose write was undone may keep the value after A's concurrent
// edit (a documented limit of undo), so the model leaves it free.

import {$isLinkNode, $toggleLink} from '@lexical/link';
import {$addMarkID, $getNodeMarkIDs, $removeMarkID} from '@lexical/mark';
import {
  $createTextNode,
  $getRoot,
  $setSelection,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $locateIn,
  $p,
  $selectIn,
  expectConverged,
  type Peer,
  setup,
} from '../../utils/harness';
import {prepareMarkState} from '../../utils/sizeOps';

type Value = 'bold' | 'code' | 'comment' | 'link';
type Edit = 'type plain' | 'remove the value' | 'delete a letter';

const VALUES: Value[] = ['bold', 'code', 'comment', 'link'];
const EDITS: Edit[] = ['type plain', 'remove the value', 'delete a letter'];
const LINE = 'aa Kilo bb cc dd';
const KILO: [number, number] = [3, 7];
const CC: [number, number] = [11, 13];
const IL: [number, number] = [4, 6];

function $give(value: Value, from: number, to: number) {
  const selection = $selectIn([0], from, to);
  if (value === 'comment') {
    $addMarkID('c1', selection);
  } else if (value === 'link') {
    $toggleLink('https://example.com');
  } else {
    selection.format = (selection.anchor.getNode() as TextNode).getFormat();
    selection.formatText(value);
  }
  $setSelection(null);
}

function $remove(value: Value, from: number, to: number) {
  const selection = $selectIn([0], from, to);
  if (value === 'comment') {
    $removeMarkID('c1', selection);
  } else if (value === 'link') {
    $toggleLink(null);
  } else {
    selection.format = (selection.anchor.getNode() as TextNode).getFormat();
    selection.formatText(value);
  }
  $setSelection(null);
}

/** Inserts an unformatted text node at `offset` of the first line. */
function $insertPlainAt(offset: number, text: string) {
  const [node, at] = $locateIn($block([0]), offset);
  const plain = $createTextNode(text);
  if (at === 0) {
    node.insertBefore(plain);
  } else if (at === node.getTextContentSize()) {
    node.insertAfter(plain);
  } else {
    node.splitText(at)[1].insertBefore(plain);
  }
}

function $has(value: Value, node: TextNode): boolean {
  switch (value) {
    case 'comment':
      return $getNodeMarkIDs(node as LexicalNode).includes('c1');
    case 'link':
      return $isLinkNode(node.getParent());
    default:
      return node.hasFormat(value);
  }
}

/** Each character of a line with whether it has the value. */
function chars(peer: Peer, value: Value, line: number): [string, boolean][] {
  return peer.read(() =>
    ($block([line]).getAllTextNodes() as TextNode[]).flatMap(node =>
      Array.from(node.getTextContent(), c => [c, $has(value, node)] as const),
    ),
  ) as [string, boolean][];
}

type Origin = {kind: 'line'; index: number} | {kind: 'zz'} | {kind: 'A'};

/**
 * The model: the text the edits leave, and for each character whether it
 * must have the value (true), must not (false), or may either (null).
 */
function model(
  value: Value,
  edit: Edit,
  undos: number,
): {text: string; want: (boolean | null)[]} {
  const kiloLive = undos < 3;
  const zzLive = undos < 2;
  const ccLive = undos < 1;
  const out: [string, Origin][] = [];
  for (let i = 0; i < LINE.length; i++) {
    if (edit === 'delete a letter' && i === 5) {
      continue;
    }
    if (edit === 'type plain' && i === 5) {
      out.push(['X', {kind: 'A'}]);
    }
    if (zzLive && i === 10) {
      for (const c of ' zz') {
        out.push([c, {kind: 'zz'}]);
      }
    }
    out.push([LINE[i], {index: i, kind: 'line'}]);
  }
  const want = out.map(([, origin]): boolean | null => {
    if (origin.kind === 'zz') {
      return false;
    }
    if (origin.kind === 'A') {
      // Typed plain; inside a link node it is part of the link.
      return value === 'link' ? null : false;
    }
    const i = origin.index;
    if (i >= KILO[0] && i < KILO[1]) {
      if (!kiloLive) {
        return null;
      }
      return !(edit === 'remove the value' && i >= IL[0] && i < IL[1]);
    }
    if (i >= CC[0] && i < CC[1]) {
      return ccLive;
    }
    return false;
  });
  return {text: out.map(([c]) => c).join(''), want};
}

describe('ownership scans: one client writes the value, types, writes it again', () => {
  for (const value of VALUES) {
    for (const edit of EDITS) {
      for (let undos = 0; undos <= 3; undos++) {
        for (const ids of [
          [1, 2],
          [2, 1],
        ]) {
          test(`${value}, A ${edit} inside the first run, B undoes ${undos} (ids ${ids})`, async () => {
            const t = await setup(
              () => $getRoot().append($p(LINE), $p('tail line')),
              {ids, prepare: prepareMarkState},
            );
            t.b.update(() => $give(value, ...KILO));
            await t.sync();
            t.b.update(() => $insertPlainAt(10, ' zz'));
            await t.sync();
            t.b.update(() => $give(value, 14, 16));
            await t.sync();
            t.offline();
            for (let i = 0; i < undos; i++) {
              t.b.undo();
            }
            t.a.update(() => {
              if (edit === 'type plain') {
                $insertPlainAt(5, 'X');
              } else if (edit === 'remove the value') {
                $remove(value, ...IL);
              } else {
                const [node, at] = $locateIn($block([0]), 5);
                node.spliceText(at, 1, '');
              }
            });
            await t.sync();
            await expectConverged(t.peers);
            const expected = model(value, edit, undos);
            const line = chars(t.a, value, 0);
            const problems: string[] = [];
            if (line.map(([c]) => c).join('') !== expected.text) {
              problems.push(
                `text ${JSON.stringify(line.map(([c]) => c).join(''))} != ${JSON.stringify(expected.text)}`,
              );
            } else {
              line.forEach(([c, got], i) => {
                const want = expected.want[i];
                if (want !== null && want !== got) {
                  problems.push(
                    `"${c}" at ${i} ${got ? 'has' : 'lacks'} the ${value}`,
                  );
                }
              });
            }
            if (chars(t.a, value, 1).some(([, got]) => got)) {
              problems.push(`the next line has the ${value}`);
            }
            expect(problems).toEqual([]);
          });
        }
      }
    }
  }
});
