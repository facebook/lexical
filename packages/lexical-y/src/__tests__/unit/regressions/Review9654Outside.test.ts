/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571: outside a shadow root, the reader keeps a link run around a
// quote's paragraph as it is (the rule is for shadow roots only).
import * as Y from '@y/y';
import {expect, test} from 'vitest';

import {equalFresh, fixture} from './Review9654Fixtures';

for (const gc of [false, true]) {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`the same stored shape outside shadow roots stays unchanged gc=${gc} ids=${ids}`, async () => {
      const t = await fixture({gc, ids});
      await t.apply(root => {
        let changed = 0;
        for (let it = root._start; it; it = it.right) {
          if (
            !it.deleted &&
            it.content instanceof Y.ContentType &&
            it.content.type.getAttr('t') === 'quote'
          ) {
            it.content.type.setAttr('s:shadowRoot', false);
            changed++;
          }
        }
        expect(changed).toBe(2);
      });
      for (const q of t.peers) {
        expect(q.describe()).toBe(
          'paragraph("Title") / quote(link<https://o.example>(paragraph("q1 one"))) / quote(link<https://o.example>(paragraph("q2 two"))) / paragraph("end")',
        );
        equalFresh(q);
      }
    });
  }
}
