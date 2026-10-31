/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: inline text at every depth of nested format wrappers opens each
// wrapper once (linear in depth).
import {LinkNode} from '@lexical/link';
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {$getRoot, ElementNode} from 'lexical';
import {expect, test, vi} from 'vitest';

import {readYState, seedYState} from '../../../headless';
import {NODES} from '../../utils/harness';
import {deep, p} from './Review9654Fixtures';

test('taking apart wrappers with inline text at every depth is linear in depth', () => {
  const counts: number[] = [];
  for (const depth of [8, 16, 32, 64]) {
    const wrappers = Array.from({length: depth}, (_, i) => {
      const type = `audit_open_${i}`;
      return class OpenLink extends LinkNode {
        $config() {
          return this.config(type, {extends: LinkNode});
        }
      };
    });
    const config = {nodes: [...NODES, ...wrappers], schemaVersion: 1};
    const doc = new Y.Doc({gc: false});
    doc.cleanupFormatting = false;
    Y.applyUpdate(
      doc,
      seedYState(config, () =>
        $getRoot().append(
          $createQuoteNode({shadowRoot: true}).append(p('BODY')),
        ),
      ),
    );
    const root = doc.get('lexical-y');
    const attrs = (n: number) =>
      Object.fromEntries(
        Array.from({length: n}, (_, i) => [
          `w:audit_open_${i}`,
          {url: `https://w${i}.example`},
        ]),
      );
    doc.transact(() => {
      for (let i = 0; i < depth; i++) root.insert(i, 'L', attrs(i + 1));
      root.format(depth, 1, attrs(depth));
      for (let i = 0; i < depth; i++)
        root.insert(depth + 1 + i, 'R', attrs(depth - i));
    });
    // Children enumerated during the read (each wrapper's once when it is
    // taken apart).
    let reads = 0;
    const original = ElementNode.prototype.getChildren;
    const spy = vi
      .spyOn(ElementNode.prototype, 'getChildren')
      .mockImplementation(function (this: ElementNode) {
        reads++;
        return original.call(this);
      });
    try {
      const shown = readYState(Y.encodeStateAsUpdate(doc), config, () =>
        deep($getRoot()),
      );
      const texts: string[] = [];
      const collect = (value: unknown): void => {
        if (typeof value !== 'object' || value === null) return;
        const node = value as {text?: unknown; children?: unknown[]};
        if (typeof node.text === 'string') texts.push(node.text);
        for (const child of node.children ?? []) collect(child);
      };
      collect(shown);
      expect(texts.join('')).toBe(
        'L'.repeat(depth) + 'BODY' + 'R'.repeat(depth),
      );
    } finally {
      spy.mockRestore();
      doc.destroy();
    }
    counts.push(reads);
  }
  expect(counts[0]).toBeGreaterThan(0);
  expect(counts[3]).toBeLessThan(counts[2] * 2.5 + 128);
});
