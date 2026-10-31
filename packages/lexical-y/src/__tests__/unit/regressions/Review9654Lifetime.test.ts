/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: after the reader shows a quote's paragraph out of an outside link
// run, local edits (typing, Enter, moves into containers, collapse, copy and
// paste) and undo/redo keep every client equal to a fresh read with no link
// shown; the outside writer adding linked text next to the paragraph does not
// bring the link back around it.
import type {QuoteNode} from '@lexical/rich-text';

import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
} from '@lexical/clipboard';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
} from '@lexical/table';
import {
  $createNodeSelection,
  $getEditor,
  $getRoot,
  $setSelection,
  type ElementNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {$createLayoutContainerNode} from '../../../../../lexical-playground/src/nodes/LayoutContainerNode';
import {$createLayoutItemNode} from '../../../../../lexical-playground/src/nodes/LayoutItemNode';
import {$createCollapsibleContainerNode} from '../../../../../lexical-playground/src/plugins/CollapsibleExtension/CollapsibleContainerNode';
import {$createCollapsibleContentNode} from '../../../../../lexical-playground/src/plugins/CollapsibleExtension/CollapsibleContentNode';
import {$createCollapsibleTitleNode} from '../../../../../lexical-playground/src/plugins/CollapsibleExtension/CollapsibleTitleNode';
import {$createDownstreamComponent} from '../../catalog/downstream';
import {CATALOG_NODES} from '../../catalog/nodes';
import {$createBoxNode} from '../../utils/harness';
import {
  equalFresh,
  fixture,
  noLinkOn,
  noLinks,
  p,
  q2,
} from './Review9654Fixtures';

const ops: Record<string, () => void> = {
  after: () => q2().getAllTextNodes()[0].selectEnd().insertText('X'),
  'append-paragraph': () => q2().append(p('X')),
  before: () => q2().getAllTextNodes()[0].select(0, 0).insertText('X'),
  collapse: () => {
    (q2() as QuoteNode).collapseAtStart();
  },
  'copy-paste': () => {
    const q = q2();
    const s = $createNodeSelection();
    s.add(q.getKey());
    $setSelection(s);
    const data = $generateJSONFromSelectedNodes($getEditor(), s);
    const ns = $generateNodesFromSerializedNodes(data.nodes);
    $getRoot().append(...ns);
    $setSelection(null);
  },
  'direct-shadow-text': () => q2().selectEnd().insertText('X'),
  enter: () => q2().getAllTextNodes()[0].select(2, 2).insertParagraph(),
  inside: () => q2().getAllTextNodes()[0].select(2, 2).insertText('X'),
  'into-box': () => {
    const q = q2();
    const box = $createBoxNode('audit');
    q.insertBefore(box);
    box.append(q);
  },
  'into-cell': () => {
    const q = q2();
    const table = $createTableNode();
    const cell = $createTableCellNode();
    table.append($createTableRowNode().append(cell));
    q.insertBefore(table);
    cell.append(q);
  },
  'into-collapsible': () => {
    const q = q2();
    const next = q.getNextSibling()!;
    q.remove();
    next.insertBefore(
      $createCollapsibleContainerNode(true).append(
        $createCollapsibleTitleNode().append(p('Title')),
        $createCollapsibleContentNode().append(q),
      ),
    );
  },
  'into-layout': () => {
    const q = q2();
    const next = q.getNextSibling()!;
    q.remove();
    next.insertBefore(
      $createLayoutContainerNode('1fr').append(
        $createLayoutItemNode().append(q),
      ),
    );
  },
  'into-slot': () => {
    const q = q2();
    const next = q.getNextSibling()!;
    q.remove();
    next.insertBefore($createDownstreamComponent('callout', {body: [q]}));
  },
  'lift-block': () => {
    const q = q2();
    q.insertAfter(q.getFirstChild()!);
    q.remove();
  },
  'toggle-shadow-off': () => {
    (q2() as QuoteNode).setIsShadowRoot(false);
  },
  'type-outside': () => {
    ($getRoot().getFirstChild() as ElementNode)
      .getFirstChild()!
      .selectEnd()
      .insertText('X');
  },
};
for (const gc of [false, true])
  for (const ids of [
    [1, 2],
    [2, 1],
  ])
    for (const delivery of ['causal', 'sender'] as const)
      for (const op of Object.keys(ops)) {
        test(`${op} gc=${gc} ids=${ids} delivery=${delivery}`, async () => {
          const t = await fixture({delivery, gc, ids, nodes: CATALOG_NODES});
          t.peers.forEach(equalFresh);
          t.a.update(ops[op]);
          equalFresh(t.a);
          await t.sync();
          t.peers.forEach(equalFresh);
          const state = t.a.read(() => $getRoot().getTextContent());
          expect(state).toContain('q2');
          // Never let a hidden link start applying to untouched text.
          t.peers.forEach(q => noLinks(q));
          t.a.undo();
          await t.sync();
          t.peers.forEach(equalFresh);
          t.peers.forEach(q => noLinkOn(q));
          t.a.binding.redo();
          await t.sync();
          t.peers.forEach(equalFresh);
          t.peers.forEach(q => noLinks(q));
          for (const q of t.peers)
            expect(q.warnings.filter(w => w.includes('self-check'))).toEqual(
              [],
            );
        });
      }
for (const side of ['before', 'after'])
  for (const gc of [false, true])
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`outside writer adds linked text ${side} gc=${gc} ids=${ids}`, async () => {
        const t = await fixture({gc, ids});
        t.peers.forEach(equalFresh);
        t.peers.forEach(q => noLinkOn(q));
        await t.apply(root => {
          const b = t.paras()[1];
          root.insert(b.at + (side === 'after' ? 1 : 0), ' RAW', {
            'w:link': {url: 'https://o.example'},
          });
        });
        t.peers.forEach(equalFresh);
        t.peers.forEach(q => noLinkOn(q));
      });
    }
