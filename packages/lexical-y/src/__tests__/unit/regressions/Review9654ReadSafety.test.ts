/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
import * as Y from '@y/y';
import {$getRoot, $setSelection, type ElementNode} from 'lexical';
import {expect, test} from 'vitest';

import {equalFresh, fixture} from './Review9654Fixtures';
// #9571: an outside link run over two shadow-root quotes' paragraphs (one
// link, two nested links, or a link that also holds text before or after the
// second quote's paragraph), then a client deletes the first quote while a
// collaborator does nothing, types in the second quote or empties it: the
// delete writes only the first quote's text, every client shows the second
// quote's text (and the outside text, in a paragraph of its own), as a fresh
// read does. With text in the link (mixed), the write self-check reports the
// quote's line, as it does not model the paragraph a shadow root shows around
// inline content (#9656): pinned as that report.
for (const variant of [
  'none',
  'single',
  'nested',
  'mixed-before',
  'mixed-after',
])
  for (const gc of [false, true])
    for (const ids of [
      [1, 2],
      [2, 1],
    ])
      for (const delivery of ['causal', 'sender'] as const)
        for (const peerEdit of ['nothing', 'types', 'empties']) {
          test(`${variant} gc=${gc} ids=${ids} delivery=${delivery} peer=${peerEdit}`, async () => {
            const t = await fixture({delivery, gc, ids, variant});
            t.peers.forEach(equalFresh);
            const wrote = {del: '', ins: ''};
            t.b.doc.on('afterTransaction', (tr: Y.Transaction) => {
              if (!tr.local) return;
              Y.iterateStructsByIdSet(tr, tr.insertSet, s => {
                if (s instanceof Y.Item && s.content instanceof Y.ContentString)
                  wrote.ins += s.content.str;
              });
              Y.iterateStructsByIdSet(tr, tr.deleteSet, s => {
                if (s instanceof Y.Item && s.content instanceof Y.ContentString)
                  wrote.del += s.content.str;
              });
            });
            t.offline();
            t.b.update(() => {
              $getRoot().getChildAtIndex(1)!.remove();
              $setSelection(null);
            });
            if (peerEdit !== 'nothing')
              t.a.update(() => {
                const q = $getRoot().getChildAtIndex(2) as ElementNode;
                const text = q
                  .getAllTextNodes()
                  .find(n => n.getTextContent() === 'q2 two')!;
                if (peerEdit === 'types') text.selectEnd().insertText(' X');
                else text.setTextContent('');
                $setSelection(null);
              });
            await t.sync();
            expect.soft(wrote).toEqual({del: 'q1 one', ins: ''});
            const raw = variant.startsWith('mixed') ? ' RAW' : '';
            const text =
              peerEdit === 'empties'
                ? ''
                : `q2 two${peerEdit === 'types' ? ' X' : ''}`;
            for (const q of t.peers) {
              const shown = q.read(() =>
                ($getRoot().getChildAtIndex(1) as ElementNode).getTextContent(),
              );
              expect
                .soft(shown.replace(/\n/g, ''))
                .toBe(variant === 'mixed-before' ? raw + text : text + raw);
              equalFresh(q);
              const reports = q.warnings.filter(w => w.includes('self-check'));
              if (variant.startsWith('mixed'))
                for (const w of reports)
                  expect.soft(w).toMatch(/: text "(￼ RAW| RAW￼)" != "￼￼"$/);
              else expect.soft(reports).toEqual([]);
            }
            expect(t.a.json()).toEqual(t.b.json());
          });
        }
