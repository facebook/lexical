/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: every catalog shape as a quote's block under an outside link run
// keeps its payload when another quote is deleted.
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {$getRoot} from 'lexical';
import {expect, onTestFinished, test} from 'vitest';

import {CATALOG_NODES, NODE_SHAPES} from '../../catalog/nodes';
import {setup} from '../../utils/harness';
import {deep, equalFresh, p} from './Review9654Fixtures';

const mask = (value: unknown) =>
  JSON.parse(JSON.stringify(value), (k, v) =>
    k === 'editorState' ? 'nested-editor' : v,
  );
for (const shape of NODE_SHAPES)
  for (const gc of [false, true])
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`catalog ${shape.name} gc=${gc} ids=${ids}`, async () => {
        const t = await setup(
          () =>
            $getRoot().append(
              p('Title'),
              $createQuoteNode({shadowRoot: true}).append(p('q1 one')),
              $createQuoteNode({shadowRoot: true}).append(shape.$block()),
              p('end'),
            ),
          {
            ids,
            nodes: [...CATALOG_NODES],
            withBlockIds: shape.tags.includes('nested-editor'),
          },
        );
        onTestFinished(() =>
          t.peers.forEach(q => {
            q.stop();
            q.doc.destroy();
          }),
        );
        t.peers.forEach(q => (q.doc.gc = gc));
        const before = mask(
          t.a.read(() => deep($getRoot().getChildAtIndex(2)!)),
        );
        const d = new Y.Doc({gc});
        d.cleanupFormatting = false;
        onTestFinished(() => d.destroy());
        Y.applyUpdate(d, Y.encodeStateAsUpdate(t.a.doc));
        const sv = Y.encodeStateVector(d);
        const root = d.get('lexical-y');
        const atoms: number[] = [];
        let at = 0;
        for (let it = root._start; it; it = it.right) {
          if (it.deleted || !it.countable) continue;
          if (
            it.content instanceof Y.ContentType &&
            String(it.content.type.name).startsWith('i:')
          )
            atoms.push(at);
          at += it.length;
        }
        expect(atoms.length).toBeGreaterThanOrEqual(2);
        d.transact(() =>
          root.format(atoms[0], atoms[atoms.length - 1] + 1 - atoms[0], {
            'w:link': {url: 'https://outside.example'},
          }),
        );
        const update = Y.encodeStateAsUpdate(d, sv);
        for (const q of t.peers) Y.applyUpdate(q.doc, update, 'net');
        await t.sync();
        for (const q of t.peers)
          expect(
            mask(q.read(() => deep($getRoot().getChildAtIndex(2)!))),
          ).toEqual(before);
        // Removing only the other quote cannot change any payload in this one.
        t.b.update(() => $getRoot().getChildAtIndex(1)!.remove());
        await t.sync();
        for (const q of t.peers) {
          expect(
            mask(q.read(() => deep($getRoot().getChildAtIndex(1)!))),
          ).toEqual(before);
          if (!shape.tags.includes('nested-editor')) equalFresh(q);
          expect(
            q.warnings.filter(
              w => w.includes('self-check') && !w.includes('.editorState.'),
            ),
          ).toEqual([]);
        }
      });
    }
