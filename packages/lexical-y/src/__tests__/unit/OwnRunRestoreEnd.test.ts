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
  }
});
