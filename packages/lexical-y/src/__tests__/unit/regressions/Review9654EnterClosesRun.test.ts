/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
// #9571 (D89): a local edit that writes the second quote's content again
// (Enter inside its paragraph) closes the outside link run there: it stores
// a null of the link before the paragraph it writes. Nothing is lost, and
// every reader shows the same content, with no link around the quote's
// paragraphs.
import * as Y from '@y/y';
import {$getRoot} from 'lexical';
import {expect, test} from 'vitest';

import {equalFresh, fixture, noLinks, q2} from './Review9654Fixtures';

/** The `w:link` format items in the root sequence, as `client:value`. */
function linkItems(doc: Y.Doc): string[] {
  const out: string[] = [];
  for (let it = doc.get('lexical-y')._start; it !== null; it = it.right) {
    if (
      !it.deleted &&
      it.content instanceof Y.ContentFormat &&
      it.content.key === 'w:link'
    ) {
      out.push(
        `${it.id.client === doc.clientID ? 'own' : 'other'}:${JSON.stringify(it.content.value)}`,
      );
    }
  }
  return out;
}

for (const gc of [false, true]) {
  test(`Enter in the second quote's paragraph stores a null of the link before it (gc=${gc})`, async () => {
    const t = await fixture({gc, variant: 'single'});
    expect(linkItems(t.a.doc).filter(s => s.startsWith('own'))).toEqual([]);
    t.a.update(() => {
      q2().getAllTextNodes()[0].select(2, 2).insertParagraph();
    });
    await t.sync();
    expect(linkItems(t.a.doc)).toContain('own:null');
    for (const peer of t.peers) {
      expect(
        peer.read(() => $getRoot().getChildAtIndex(2)!.getTextContent()),
      ).toBe('q2\n\n two');
      noLinks(peer);
      equalFresh(peer);
    }
  });
}
