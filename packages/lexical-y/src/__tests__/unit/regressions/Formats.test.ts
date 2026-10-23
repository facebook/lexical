/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Regression cases for format findings of the #9400 soaks whose original
// repros were not committed. Each case is named after its finding. jsdom:
// the editors are attached to DOM roots, so the reconciler derives elements'
// text fields from the text it renders.

import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $setSelection,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {freshReader, type Peer, setup, shape} from '../../utils/harness';

function attach(peer: Peer) {
  const element = document.createElement('div');
  element.contentEditable = 'true';
  document.body.appendChild(element);
  peer.editor.setRootElement(element);
}

function withoutTextFields(json: unknown): unknown {
  if (Array.isArray(json)) {
    return json.map(withoutTextFields);
  }
  if (json !== null && typeof json === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(json)) {
      if (k !== 'textFormat' && k !== 'textStyle') {
        out[k] = withoutTextFields(v);
      }
    }
    return out;
  }
  return json;
}

const $item = (i: number) =>
  ($getRoot().getFirstChildOrThrow() as ElementNode).getChildAtIndex(
    i,
  ) as ElementNode;
const $linkText = (i: number) => {
  const link = $item(i).getFirstChildOrThrow();
  return (
    $isLinkNode(link) && $isElementNode(link)
      ? link.getFirstChildOrThrow()
      : link
  ) as TextNode;
};

// J-1: list items whose only child is a link serialize a textFormat the
// reconciler derives from the link's first text. Two clients formatting the
// first link at once, then each typing a character, made the self-check warn
// on those items' textFormat (locally on an untouched link-only item, and
// remotely on the edited one): every client and a fresh reader must show the
// same document, with no self-check warning.
describe('J-1: concurrent formatting in list items that hold only a link', () => {
  const edits: [string, () => void, () => void][] = [
    [
      'A italicizes "alpha" ‖ B un-bolds "beta gamma"',
      () => $linkText(0).select(0, 5).formatText('italic'),
      () => $linkText(0).select(6, 16).formatText('bold'),
    ],
    [
      'A and B both italicize "alpha"',
      () => $linkText(0).select(0, 5).formatText('italic'),
      () => $linkText(0).select(0, 5).formatText('italic'),
    ],
    [
      'A underlines "gamma" ‖ B italicizes "beta"',
      () => $linkText(0).select(11, 16).formatText('underline'),
      () => $linkText(0).select(6, 10).formatText('italic'),
    ],
  ];
  for (const [name, $editA, $editB] of edits) {
    test(`J-1 ${name}, then each types a character: no self-check warning`, async () => {
      const t = await setup(() => {
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createLinkNode('https://a.example').append(
                $createTextNode('alpha beta gamma').toggleFormat('bold'),
              ),
            ),
            $createListItemNode().append($createTextNode('plain item')),
            $createListItemNode().append(
              $createLinkNode('https://d.example').append(
                $createTextNode('delta epsilon')
                  .toggleFormat('bold')
                  .toggleFormat('underline'),
              ),
            ),
          ),
        );
      });
      t.peers.forEach(attach);
      await t.sync();
      t.offline();
      t.a.update($editA);
      t.b.update($editB);
      t.a.update(() => $linkText(0).select(0, 0).insertText('x'));
      t.b.update(() => $linkText(0).select(0, 0).insertText('y'));
      t.a.update(() => $setSelection(null));
      t.b.update(() => $setSelection(null));
      await t.sync();
      // Each client derives a link-only item's textFormat from the text it
      // reconciled there (a fresh reader from none), as Lexical does without
      // collaboration: compare the documents without those derived fields.
      const fresh = await freshReader(t.a);
      for (const p of [...t.peers, fresh]) {
        expect(p.errors).toEqual([]);
        expect(p.warnings).toEqual([]);
        expect(withoutTextFields(shape(p))).toEqual(
          withoutTextFields(shape(t.a)),
        );
      }
    });
  }
});
