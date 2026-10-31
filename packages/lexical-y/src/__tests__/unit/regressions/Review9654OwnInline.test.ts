/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
import * as Y from '@y/y';
import {
  $getRoot,
  $getSlot,
  $getSlotNames,
  $setSelection,
  ElementNode,
  type LexicalNode,
} from 'lexical';
import {expect, test} from 'vitest';

import {fixture} from './Review9654Fixtures';

// #9571: the reader takes blocks out of format wrappers only (link runs made
// from format items), never out of an inline element stored as a node of its
// own: such a node, holding a paragraph and a slot, stays with both.
class AuditOwnInline extends ElementNode {
  $config() {
    return this.config('auditowninline', {extends: ElementNode});
  }
  isInline(): true {
    return true;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
}
function $slotTexts(n: LexicalNode): string[] {
  const out: string[] = [];
  for (const name of $getSlotNames(n)) {
    const slot = $getSlot(n, name)!;
    out.push(slot.getTextContent());
    out.push(...$slotTexts(slot));
  }
  if (n instanceof ElementNode)
    for (const c of n.getChildren()) out.push(...$slotTexts(c));
  return out;
}
for (const gc of [false, true])
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`own inline block-child slot survives read and unrelated delete gc=${gc} ids=${ids}`, async () => {
      const t = await fixture({
        gc,
        ids,
        nodes: [AuditOwnInline],
        variant: 'none',
      });
      await t.apply(root => {
        const at = t.paras()[1].at;
        root.delete(at, 1);
        const holder = new Y.Node('i:auditowninline');
        root.insert(at, [holder]);
        holder.setAttr('c', 'i');
        const body = new Y.Node('i:paragraph');
        holder.insert(0, [body]);
        body.setAttr('c', 'i');
        body.insert(0, 'q2 two');
        const slot = new Y.Node('b:paragraph');
        holder.setAttr('slot:note', slot);
        slot.setAttr('c', 'i');
        slot.insert(0, 'SLOT KEEP');
      });
      for (const q of t.peers)
        expect
          .soft(q.read(() => $slotTexts($getRoot())))
          .toEqual(['SLOT KEEP']);
      t.b.update(() => {
        $getRoot().getChildAtIndex(1)!.remove();
        $setSelection(null);
      });
      await t.sync();
      for (const q of t.peers)
        expect(q.read(() => $slotTexts($getRoot()))).toEqual(['SLOT KEEP']);
    });
  }
