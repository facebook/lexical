/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LinkNode} from '@lexical/link';
import {$createQuoteNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';
import {expect, onTestFinished} from 'vitest';

import {readYState} from '../../../headless';
import {NODES, type Peer, setup} from '../../utils/harness';
/** A second link type, for two link wrappers nested around blocks. */
export class AuditLink extends LinkNode {
  $config() {
    return this.config('auditlink', {extends: LinkNode});
  }
}
export const $p = (text: string) =>
  $createParagraphNode().append($createTextNode(text));
/** @deprecated renamed to {@link $p} by @lexical/eslint-plugin rules-of-lexical */
export const p = $p;
export function $deep(node: LexicalNode): unknown {
  const result: Record<string, unknown> = {...node.exportJSON()};
  if ($isElementNode(node)) result.children = node.getChildren().map($deep);
  const names = $getSlotNames(node);
  if (names.length) {
    const slots: Record<string, unknown> = {};
    for (const name of names) slots[name] = $deep($getSlot(node, name)!);
    result.$slots = slots;
  }
  return result;
}
/** @deprecated renamed to {@link $deep} by @lexical/eslint-plugin rules-of-lexical */
export const deep = $deep;
export function equalFresh(q: Peer) {
  expect(q.doc.store.pendingStructs).toBeNull();
  expect(q.doc.store.pendingDs).toBeNull();
  const want = readYState(
    Y.encodeStateAsUpdate(q.doc),
    {
      nodes: q.nodes,
      schemaVersion: 1,
    },
    () => $deep($getRoot()),
  );
  expect(q.read(() => $deep($getRoot()))).toEqual(want);
}
export function noLinkOn(q: Peer, text = 'q2 two') {
  q.read(() => {
    for (const n of $getRoot().getAllTextNodes())
      if (n.getTextContent().includes(text)) {
        for (
          let ancestor = n.getParent();
          ancestor;
          ancestor = ancestor.getParent()
        )
          expect(
            ancestor instanceof LinkNode,
            `${text} in ${q.describe()}`,
          ).toBe(false);
      }
  });
}
export async function fixture(
  opts: {
    ids?: number[];
    delivery?: 'causal' | 'sender';
    gc?: boolean;
    withBlockIds?: boolean;
    container?: () => ElementNode;
    nodes?: typeof NODES;
    variant?: string;
  } = {},
) {
  const t = await setup(
    () =>
      $getRoot().append(
        $p('Title'),
        $createQuoteNode({shadowRoot: true}).append($p('q1 one')),
        $createQuoteNode({shadowRoot: true}).append($p('q2 two')),
        $p('end'),
      ),
    {
      delivery: opts.delivery,
      ids: opts.ids,
      nodes: [...NODES, AuditLink, ...(opts.nodes ?? [])],
      withBlockIds: opts.withBlockIds,
    },
  );
  onTestFinished(() =>
    t.peers.forEach(q => {
      q.stop();
      q.doc.destroy();
    }),
  );
  for (const q of t.peers) q.doc.gc = opts.gc ?? false;
  const outside = new Y.Doc({gc: opts.gc ?? false});
  outside.cleanupFormatting = false;
  onTestFinished(() => outside.destroy());
  Y.applyUpdate(outside, Y.encodeStateAsUpdate(t.a.doc));
  const paras = () => {
    const out: {at: number; node: Y.Node}[] = [];
    let at = 0;
    const root = outside.get('lexical-y');
    for (let it = root._start; it; it = it.right) {
      if (it.deleted || !it.countable) continue;
      if (
        it.content instanceof Y.ContentType &&
        String(it.content.type.name).startsWith('i:')
      )
        out.push({at, node: it.content.type});
      at += it.length;
    }
    return out;
  };
  const apply = async (fn: (root: Y.Node) => void) => {
    const sv = Y.encodeStateVector(outside);
    outside.transact(() => fn(outside.get('lexical-y')));
    const upd = Y.encodeStateAsUpdate(outside, sv);
    for (const q of t.peers) Y.applyUpdate(q.doc, upd, 'net');
    await t.sync();
  };
  const variant = opts.variant ?? 'single';
  await apply(root => {
    const [a, b] = paras();
    const attrs: Record<string, unknown> = {
      'w:link': {url: 'https://o.example'},
    };
    if (variant === 'nested') attrs['w:auditlink'] = {url: 'https://n.example'};
    if (variant !== 'none') root.format(a.at, b.at + 1 - a.at, attrs);
    if (variant.startsWith('mixed'))
      root.insert(b.at + (variant === 'mixed-after' ? 1 : 0), ' RAW', attrs);
  });
  return {...t, apply, outside, paras};
}
export const $q2 = () =>
  $getRoot()
    .getChildren()
    .find(n => n.getTextContent().includes('q2 two')) as ElementNode;
/** @deprecated renamed to {@link $q2} by @lexical/eslint-plugin rules-of-lexical */
export const q2 = $q2;
