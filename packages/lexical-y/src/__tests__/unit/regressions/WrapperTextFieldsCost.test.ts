/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// A remote change that leaves n formatted wrappers holding no text (a
// collaborator deletes the text in a mark inside each of n links, keeping a
// line break) shows each wrapper's stored text fields: the formats stored at
// the marks are found in one pass along the document, not one per wrapper
// from its start (see $unstoredWrapperTextFields). Counted as the items the
// read checks (isGone), which grow linearly with n.

import {$createLinkNode} from '@lexical/link';
import {$createMarkNode} from '@lexical/mark';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
} from 'lexical';
import {expect, test, vi} from 'vitest';

import {expectConverged, setup} from '../../utils/harness';

const counter = vi.hoisted(() => ({on: false, visits: 0}));

vi.mock('../../../internal/Seen', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../../internal/Seen')>();
  return {
    ...original,
    isGone: (...args: Parameters<typeof original.isGone>) => {
      if (counter.on) {
        counter.visits++;
      }
      return original.isGone(...args);
    },
  };
});

test('wrappers a remote delete leaves without text are settled in linear time', async () => {
  const visits: number[] = [];
  for (const n of [32, 64, 128]) {
    const t = await setup(() => {
      for (let i = 0; i < n; i++) {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('before '),
            $createLinkNode(`https://link${i}.test`).append(
              $createMarkNode([`c${i}`]).append(
                $createTextNode(`word${i}`),
                $createLineBreakNode(),
              ),
            ),
            $createTextNode(' after'),
          ),
        );
      }
    });
    try {
      t.b.update(() => {
        const texts = $getRoot().getAllTextNodes();
        const last = texts[texts.length - 1];
        const selection = texts[0].select(0, 0);
        selection.focus.set(last.getKey(), last.getTextContentSize(), 'text');
        selection.formatText('bold');
        $setSelection(null);
      });
      await t.sync();
      t.offline();
      t.a.update(() => {
        for (const text of $getRoot().getAllTextNodes()) {
          if (text.getTextContent().startsWith('word')) {
            text.remove();
          }
        }
        $setSelection(null);
      });
      counter.visits = 0;
      counter.on = true;
      await t.sync();
      counter.on = false;
      visits.push(counter.visits);
      await expectConverged(t.peers);
    } finally {
      counter.on = false;
      for (const p of t.peers) {
        p.stop();
      }
    }
  }
  // Doubling n doubles the work (about 2x); one pass per wrapper from the
  // start of the document would quadruple it.
  expect(visits[1] / visits[0]).toBeLessThan(3);
  expect(visits[2] / visits[1]).toBeLessThan(3);
}, 60_000);
