/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// Every undo or redo press changes what the document shows, or takes every
// step there is (see YBinding#applyUndo). Random sessions: two clients
// type, delete, format and comment words of two lines, taking turns or
// concurrently, each write a step of its own; then one client presses undo
// until its stack is empty, and redo until that one is, and every press
// must change what a fresh read of its document shows or empty the stack.
// UNDO_PRESS_SEEDS sets the number of sessions (default 60),
// UNDO_PRESS_SEED_START the first.

import {$addMarkID, $getNodeMarkIDs, $removeMarkID} from '@lexical/mark';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {mulberry32} from '../utils/fuzz';
import {
  $block,
  $selectIn,
  expectConverged,
  freshReader,
  type Peer,
  setup,
} from '../utils/harness';
import {prepareMarkState as prepare} from '../utils/sizeOps';

const SEEDS = Number(process.env.UNDO_PRESS_SEEDS ?? 60);
const START = Number(process.env.UNDO_PRESS_SEED_START ?? 1);
const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'kilo', 'lima', 'echo'];
const FORMATS: TextFormatType[] = ['bold', 'italic', 'underline'];

function view(peer: Peer): string {
  return peer.read(() =>
    $getRoot()
      .getChildren()
      .map((_, l) =>
        ($block([l]).getAllTextNodes() as TextNode[])
          .map(n => {
            const ids = $getNodeMarkIDs(n as LexicalNode)
              .slice()
              .sort();
            return `${n.getTextContent()}{${n.getFormat()}}[${ids.join(',')}]`;
          })
          .join(''),
      )
      .join(' / '),
  );
}

async function freshView(peer: Peer): Promise<string> {
  const f = await freshReader(peer);
  const v = view(f);
  f.stop();
  return v;
}

function size(peer: Peer, line: number): number {
  return peer.read(() => $block([line]).getTextContentSize());
}

async function session(seed: number, ids: number[]) {
  const rand = mulberry32(seed);
  const int = (n: number) => Math.floor(rand() * n);
  const t = await setup(
    () => {
      for (let l = 0; l < 2; l++) {
        const p = $createParagraphNode();
        for (let i = 0; i < 6; i++) {
          p.append(
            $createTextNode(WORDS[int(WORDS.length)] + (i < 5 ? ' ' : '')),
          );
        }
        $getRoot().append(p);
      }
    },
    {ids, prepare},
  );
  for (const p of t.peers) {
    p.binding.undoManager!.clear();
  }
  let comment = 0;
  for (let op = 0; op < 14; op++) {
    if (rand() < 0.25) {
      t.offline();
    }
    const peer = rand() < 0.5 ? t.a : t.b;
    const line = int(2);
    const n = size(peer, line);
    if (n === 0) {
      continue;
    }
    const from = int(n);
    const to = Math.min(n, from + 1 + int(8));
    const kind = rand();
    peer.update(() => {
      if (kind < 0.3) {
        $selectIn([line], from).insertText(WORDS[int(WORDS.length)]);
      } else if (kind < 0.45) {
        const at = $selectIn([line], from);
        const node = at.anchor.getNode() as TextNode;
        const [, tail] =
          at.anchor.offset > 0 && at.anchor.offset < node.getTextContentSize()
            ? node.splitText(at.anchor.offset)
            : [node, null];
        (tail ?? node).insertBefore($createTextNode('Q' + op));
      } else if (kind < 0.7) {
        $selectIn([line], from, to).removeText();
      } else if (kind < 0.82) {
        $selectIn([line], from, to).formatText(FORMATS[int(3)]);
      } else if (kind < 0.94) {
        $addMarkID(`c${comment++}`, $selectIn([line], from, to));
      } else if (comment > 0) {
        $removeMarkID(`c${int(comment)}`, $selectIn([line], 0, n));
      }
      $setSelection(null);
    });
    peer.binding.undoManager!.stopCapturing();
    if (rand() < 0.5) {
      await t.sync();
    }
  }
  await t.sync();
  const um = t.a.binding.undoManager!;
  const failures: string[] = [];
  for (const undo of [true, false]) {
    for (let press = 0; press < 40; press++) {
      const stack = undo ? um.undoStack : um.redoStack;
      if (stack.length === 0) {
        break;
      }
      const before = await freshView(t.a);
      if (undo) {
        t.a.binding.undo();
      } else {
        t.a.binding.redo();
      }
      const after = await freshView(t.a);
      if (after === before && stack.length > 0) {
        failures.push(`${undo ? 'undo' : 'redo'} press ${press}`);
      }
    }
  }
  await t.sync();
  await expectConverged(t.peers);
  t.peers.forEach(p => p.stop());
  return failures;
}

describe('@lexical/y an undo or redo press changes what the document shows or empties its stack', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`random sessions (ids ${ids})`, async () => {
      const bad: string[] = [];
      for (let seed = START; seed < START + SEEDS; seed++) {
        const failures = await session(seed, ids);
        if (failures.length > 0) {
          bad.push(`seed ${seed}: ${failures.join(', ')}`);
        }
      }
      expect(bad).toEqual([]);
    }, 600_000);
  }
});
