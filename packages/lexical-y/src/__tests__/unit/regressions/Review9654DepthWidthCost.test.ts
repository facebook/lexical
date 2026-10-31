/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: n format wrappers nested around n paragraphs are taken apart in
// one walk (linear in wrappers and blocks).
import {LinkNode} from '@lexical/link';
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {$getRoot, ParagraphNode} from 'lexical';
import {expect, test, vi} from 'vitest';

import {readYState, seedYState} from '../../../headless';
import {NODES} from '../../utils/harness';
import {deep, p} from './Review9654Fixtures';

test('splitting nested wrappers visits each emitted block a bounded number of times', () => {
  const counts: number[] = [];
  for (const n of [8, 16, 32, 64]) {
    const wrappers = Array.from({length: n}, (_, i) => {
      const type = `audit_width_depth_${i}`;
      return class ShapeLink extends LinkNode {
        $config() {
          return this.config(type, {extends: LinkNode});
        }
      };
    });
    const config = {nodes: [...NODES, ...wrappers], schemaVersion: 1};
    const seed = seedYState(config, () =>
      $getRoot().append(
        $createQuoteNode({shadowRoot: true}).append(
          ...Array.from({length: n}, (_, i) => p(`body${i}`)),
        ),
      ),
    );
    const doc = new Y.Doc({gc: false});
    doc.cleanupFormatting = false;
    Y.applyUpdate(doc, seed);
    doc
      .get('lexical-y')
      .format(
        0,
        n,
        Object.fromEntries(
          wrappers.map((_, i) => [
            `w:audit_width_depth_${i}`,
            {url: `https://wrapper${i}.example`},
          ]),
        ),
      );
    let visits = 0;
    const original = ParagraphNode.prototype.isInline;
    const spy = vi
      .spyOn(ParagraphNode.prototype, 'isInline')
      .mockImplementation(function (this: ParagraphNode) {
        visits++;
        return original.call(this);
      });
    try {
      const shown = readYState(Y.encodeStateAsUpdate(doc), config, () =>
        deep($getRoot()),
      );
      expect(JSON.stringify(shown)).toContain(`"text":"body${n - 1}"`);
    } finally {
      spy.mockRestore();
      doc.destroy();
    }
    counts.push(visits);
  }
  expect(counts[3]).toBeLessThan(counts[2] * 2.5 + 128);
});
