/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import type {Item} from '@y/y';

import {$addMarkID, $getNodeMarkIDs} from '@lexical/mark';
import {ContentFormat} from '@y/y';
import {
  $createTextNode,
  $getRoot,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $p,
  $selectIn,
  expectConverged,
  type Peer,
  setup,
} from '../utils/harness';
import {prepareMarkState as prepare} from '../utils/sizeOps';

// A client types uncommented text inside a word it commented itself, so its
// write restores the comment after that text and relies on the comment's own
// end (the null its comment wrote after the word) to end it. A collaborator
// that has not seen that text deletes the word and then deletes the
// comment's opener and end there, which for it bracket deleted content only,
// so deleting them changes nothing it shows. That second step is simulated
// with raw Yjs deletes (dropCommentItems): it stands for any concurrent
// deletion of that end, such as the bounded collapse a delete next to a run
// of deleted content runs (Cursor#collapseGap, which keeps a bounded number
// of the format items there), and isolates the condition this guards: the
// restore's run losing the end it relied on. Merged, the restore must still
// end where the comment ended, not run on over the rest of the document.

/** Each word of `peer`'s first line, with its comment ids. */
function words(peer: Peer): string {
  return peer.read(() =>
    ($block([0]).getAllTextNodes() as TextNode[])
      .flatMap(n => {
        const ids = $getNodeMarkIDs(n as LexicalNode);
        return n
          .getTextContent()
          .split(' ')
          .filter(w => w !== '')
          .map(w => (ids.length > 0 ? `${w}[${ids.join(',')}]` : w));
      })
      .join(' '),
  );
}

/** Delete `peer`'s live format items of comment `id` with raw Yjs deletes. */
function dropCommentItems(peer: Peer, id: string) {
  const doc = peer.doc;
  doc.transact(tr => {
    const walk = (type: {_start: Item | null}) => {
      for (let it = type._start; it !== null; it = it.right) {
        if (
          !it.deleted &&
          it.content instanceof ContentFormat &&
          it.content.key.endsWith(id)
        ) {
          it.delete(tr);
        }
        const content = it.content as {type?: {_start?: Item | null}};
        if (content.type !== undefined && content.type._start !== undefined) {
          walk(content.type as {_start: Item | null});
        }
      }
    };
    walk(doc.get('lexical-y') as unknown as {_start: Item | null});
  });
}

/** Insert uncommented `text` in `peer`'s first line right after `prefix`. */
function typeAfter(peer: Peer, prefix: string, text: string) {
  peer.update(() => {
    let acc = 0;
    for (const node of $block([0]).getAllTextNodes() as TextNode[]) {
      const s = node.getTextContent();
      const at =
        $block([0]).getTextContent().indexOf(prefix) + prefix.length - acc;
      if (at > 0 && at < s.length) {
        const [, tail] = node.splitText(at);
        tail.insertBefore($createTextNode(text));
        return;
      }
      acc += s.length;
    }
    throw new Error(`no "${prefix}" inside a text node`);
  });
}

describe('@lexical/y a restore of a comment its own client opened', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`ends where the comment ended when a collaborator's delete drops the comment's end (ids ${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($p('aa Kilo bb cc'), $p('tail line')),
        {ids, prepare},
      );
      t.a.update(() => void $addMarkID('c1', $selectIn([0], 3, 7)));
      await t.sync();
      expect(words(t.a)).toBe('aa Kilo[c1] bb cc');
      t.offline();
      // A types uncommented "X" inside its own commented word
      t.a.update(() => {
        const node = ($block([0]).getAllTextNodes() as TextNode[]).find(n =>
          n.getTextContent().startsWith('Kilo'),
        )!;
        const [, tail] = node.splitText(2);
        tail.insertBefore($createTextNode('X'));
      });
      expect(words(t.a)).toBe('aa Ki[c1] X lo[c1] bb cc');
      // B deletes the word, then drops the comment's items around it
      t.b.update(() => void $selectIn([0], 3, 8).removeText());
      dropCommentItems(t.b, 'c1');
      expect(words(t.b)).toBe('aa bb cc');
      await t.sync();
      await expectConverged(t.peers);
      // A's "X" is uncommented, and so is everything after it
      expect(words(t.a)).toBe('aa Xbb cc');
      expect(
        t.a.read(() =>
          ($block([1]).getAllTextNodes() as TextNode[]).some(
            n => $getNodeMarkIDs(n).length > 0,
          ),
        ),
      ).toBe(false);
    });
    test(`ends where the comment ended when the comment was written with a hole in it (ids ${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($p('aa Kilo bb cc'), $p('tail line')),
        {ids, prepare},
      );
      // One write: the comment, with uncommented "X" inside it, so the
      // comment's end ends the run its restore after "X" opens
      t.a.update(() => {
        $addMarkID('c1', $selectIn([0], 3, 7));
        const node = ($block([0]).getAllTextNodes() as TextNode[]).find(n =>
          n.getTextContent().startsWith('Kilo'),
        )!;
        const [, tail] = node.splitText(2);
        tail.insertBefore($createTextNode('X'));
      });
      await t.sync();
      expect(words(t.a)).toBe('aa Ki[c1] X lo[c1] bb cc');
      t.offline();
      // A types uncommented "Y" inside "lo"
      t.a.update(() => {
        const node = ($block([0]).getAllTextNodes() as TextNode[]).find(
          n => n.getTextContent() === 'lo',
        )!;
        const [, tail] = node.splitText(1);
        tail.insertBefore($createTextNode('Y'));
      });
      expect(words(t.a)).toBe('aa Ki[c1] X l[c1] Y o[c1] bb cc');
      t.b.update(() => void $selectIn([0], 3, 9).removeText());
      dropCommentItems(t.b, 'c1');
      expect(words(t.b)).toBe('aa bb cc');
      await t.sync();
      await expectConverged(t.peers);
      expect(words(t.a)).toBe('aa Ybb cc');
    });
    // S9-12: two writes of A each type uncommented text inside A's own
    // comment, and each restore gets a null of A's own right after the
    // comment's end (rule 5). B, which has not seen A undo both, deletes the
    // rest of the comment and then the text after it: its collapse keeps the
    // last two nulls and must also keep the comment's own end, which A's
    // undo does not remove.
    test(`S9-12: ends where the comment ended when its author undoes two writes inside it while a collaborator deletes past its end (ids ${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($p('aa Kilometer bb cc dd'), $p('tail line')),
        {ids, prepare},
      );
      t.a.update(() => void $addMarkID('c1', $selectIn([0], 3, 12)));
      await t.sync();
      typeAfter(t.a, 'Kil', 'X');
      typeAfter(t.a, 'KilXome', 'Y');
      await t.sync();
      expect(words(t.a)).toBe('aa Kil[c1] X ome[c1] Y ter[c1] bb cc dd');
      t.offline();
      t.a.undo();
      t.a.undo();
      expect(words(t.a)).toBe('aa Kilometer[c1] bb cc dd');
      // B deletes "ter", then " bb"
      t.b.update(() => void $selectIn([0], 11, 14).removeText());
      t.b.update(() => void $selectIn([0], 11, 14).removeText());
      expect(words(t.b)).toBe('aa Kil[c1] X ome[c1] Y cc dd');
      await t.sync();
      await expectConverged(t.peers);
      expect(words(t.a)).toBe('aa Kilome[c1] cc dd');
      expect(
        t.a.read(() =>
          ($block([1]).getAllTextNodes() as TextNode[]).some(
            n => $getNodeMarkIDs(n).length > 0,
          ),
        ),
      ).toBe(false);
    });
  }
});

describe('@lexical/y S9-12 with several authors', () => {
  for (const ids of [
    [1, 2, 3],
    [3, 2, 1],
    [2, 1, 3],
    [1, 3, 2],
  ]) {
    // As above, and B also typed uncommented "Z" inside the comment, so its
    // null sits after the comment's end too; C deletes, A and B undo.
    test(`S9-12: ends where the comment ended when two authors undo their writes inside it while a third deletes past its end (ids ${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($p('aa Kilometer bb cc dd'), $p('tail line')),
        {ids, prepare},
      );
      t.a.update(() => void $addMarkID('c1', $selectIn([0], 3, 12)));
      await t.sync();
      typeAfter(t.b, 'K', 'Z');
      await t.sync();
      typeAfter(t.a, 'KZil', 'X');
      typeAfter(t.a, 'KZilXome', 'Y');
      await t.sync();
      expect(words(t.a)).toBe('aa K[c1] Z il[c1] X ome[c1] Y ter[c1] bb cc dd');
      t.offline();
      t.a.undo();
      t.a.undo();
      t.b.undo();
      // C deletes "ter", then " bb"
      t.c.update(() => void $selectIn([0], 12, 15).removeText());
      t.c.update(() => void $selectIn([0], 12, 15).removeText());
      expect(words(t.c)).toBe('aa K[c1] Z il[c1] X ome[c1] Y cc dd');
      await t.sync();
      await expectConverged(t.peers);
      expect(words(t.a)).toBe('aa Kilome[c1] cc dd');
      expect(
        t.a.read(() =>
          ($block([1]).getAllTextNodes() as TextNode[]).some(
            n => $getNodeMarkIDs(n).length > 0,
          ),
        ),
      ).toBe(false);
    });
  }
});
