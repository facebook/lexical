/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: taking blocks out of nested format wrappers looks at each wrapper's
// children once per read (linear in the nesting depth).
import {LinkNode} from '@lexical/link';
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {$getRoot, ElementNode} from 'lexical';
import {expect, test, vi} from 'vitest';

import {readYState, seedYState} from '../../../headless';
import {NODES} from '../../utils/harness';
import {deep, p} from './Review9654Fixtures';

test('enumerating nested format wrappers is linear in nesting depth', () => {
  const counts: number[] = [];
  for (const depth of [8, 16, 32, 64, 128]) {
    const nodes = Array.from({length: depth}, (_, i) => {
      const name = `audit_depth_${i}`;
      return class DepthLink extends LinkNode {
        $config() {
          return this.config(name, {extends: LinkNode});
        }
      };
    });
    const config = {nodes: [...NODES, ...nodes], schemaVersion: 1};
    const state = seedYState(config, () => {
      $getRoot().append($createQuoteNode({shadowRoot: true}).append(p('body')));
    });
    const doc = new Y.Doc({gc: false});
    doc.cleanupFormatting = false;
    Y.applyUpdate(doc, state);
    const attrs = Object.fromEntries(
      nodes.map((_, i) => [
        `w:audit_depth_${i}`,
        {url: `https://wrapper${i}.example`},
      ]),
    );
    doc.get('lexical-y').format(0, 1, attrs);
    let visits = 0;
    const original = ElementNode.prototype.getChildren;
    const spy = vi
      .spyOn(ElementNode.prototype, 'getChildren')
      .mockImplementation(function (this: ElementNode) {
        const result = original.call(this);
        visits += result.length;
        return result;
      });
    try {
      readYState(Y.encodeStateAsUpdate(doc), config, () => deep($getRoot()));
    } finally {
      spy.mockRestore();
      doc.destroy();
    }
    counts.push(visits);
  }
  expect(counts[4]).toBeLessThan(counts[3] * 2.5 + 128);
});
