/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// Reading a line of n token or segmented runs finds their edges (see
// RunEdges in Inline.ts) in one pass along the line, not one per run to the
// line's end. Counted as the items' `right` links followed while reading
// the line, which grow linearly with n: for runs written with their text
// and for runs a later edit made from existing text.

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  type ElementNode,
  type TextModeType,
  type TextNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {Atoms, readAtoms} from '../../../internal/Inline';
import {setup} from '../../utils/harness';

async function visits(
  n: number,
  mode: TextModeType,
  made: boolean,
): Promise<number> {
  const t = await setup(
    () => {
      const p = $createParagraphNode();
      for (let i = 0; i < n; i++) {
        p.append(
          $createTextNode('x').setMode(made ? 'normal' : mode),
          $createTextNode(' '),
        );
      }
      $getRoot().append(p);
    },
    {ids: [1]},
  );
  try {
    if (made) {
      t.a.update(() => {
        const p = $getRoot().getFirstChildOrThrow() as ElementNode;
        for (const text of p.getChildren() as TextNode[]) {
          if (text.getTextContent() === 'x') {
            text.setMode(mode);
          }
        }
        $setSelection(null);
      });
    }
    const root = t.a.doc.get('lexical-y') as unknown as {
      _start: {right: unknown} | null;
    };
    let reads = 0;
    const restores: (() => void)[] = [];
    for (
      let it = root._start as {right: unknown} | null;
      it !== null;
      it = it.right as {right: unknown} | null
    ) {
      const item = it;
      const descriptor = Object.getOwnPropertyDescriptor(item, 'right')!;
      const value = item.right;
      Object.defineProperty(item, 'right', {
        configurable: true,
        get() {
          reads++;
          return value;
        },
      });
      restores.push(() => Object.defineProperty(item, 'right', descriptor));
    }
    const atoms = new Atoms();
    try {
      readAtoms(
        root._start as Parameters<typeof readAtoms>[0],
        null,
        new Map(),
        atoms,
      );
    } finally {
      for (const restore of restores) {
        restore();
      }
    }
    expect(atoms.text.replace(/\ufffc/g, '')).toBe('x '.repeat(n));
    return reads;
  } finally {
    t.a.stop();
  }
}

for (const mode of ['token', 'segmented'] as TextModeType[]) {
  for (const made of [false, true]) {
    test(`reading a line of ${mode} runs ${made ? 'made from existing text' : 'written with their text'} follows a linear number of links`, async () => {
      const a = await visits(32, mode, made);
      const b = await visits(64, mode, made);
      const c = await visits(128, mode, made);
      expect(b / a).toBeLessThan(2.6);
      expect(c / b).toBeLessThan(2.6);
    });
  }
}
