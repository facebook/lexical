/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: taking blocks out of a format wrapper looks at the wrapper's
// children a bounded number of times (linear in the blocks).
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {$getRoot, ElementNode} from 'lexical';
import {expect, test, vi} from 'vitest';

import {readYState, seedYState} from '../../../headless';
import {NODES} from '../../utils/harness';
import {deep, p} from './Review9654Fixtures';

test('total child enumeration is linear for one wrapper over 64/128/256 blocks', () => {
  const counts: number[] = [];
  const cfg = {
    namespace: 'cost',
    nodes: NODES,
    onError: (e: Error) => {
      throw e;
    },
    schemaVersion: 1,
  };
  for (const n of [64, 128, 256]) {
    const state = seedYState(cfg, () => {
      $getRoot().append(
        $createQuoteNode({shadowRoot: true}).append(
          ...Array.from({length: n}, (_, i) => p('p' + i)),
        ),
      );
    });
    const doc = new Y.Doc({gc: false});
    doc.cleanupFormatting = false;
    Y.applyUpdate(doc, state);
    const root = doc.get('lexical-y');
    root.format(0, n, {'w:link': {url: 'https://outside.example'}});
    let visits = 0;
    const orig = ElementNode.prototype.getChildren;
    const spy = vi
      .spyOn(ElementNode.prototype, 'getChildren')
      .mockImplementation(function (this: ElementNode) {
        const result = orig.call(this);
        visits += result.length;
        return result;
      });
    try {
      readYState(Y.encodeStateAsUpdate(doc), cfg, () => deep($getRoot()));
    } finally {
      spy.mockRestore();
      doc.destroy();
    }
    counts.push(visits);
  }
  if (process.env.REVIEW9654_VERBOSE === '1')
    console.warn('CHILD_VISITS', counts);
  expect(counts[1]).toBeLessThan(counts[0] * 2.5 + 256);
  expect(counts[2]).toBeLessThan(counts[1] * 2.5 + 256);
});
