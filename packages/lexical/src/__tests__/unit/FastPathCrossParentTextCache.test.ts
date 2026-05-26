/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode, LinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
} from 'lexical';
import invariant from 'shared/invariant';
import {describe, expect, test} from 'vitest';

// Regression test for the $reconcileChildren suffix fast path computing a
// wrong previous-suffix length when a dirty child of the reconciled element
// moved to a *different* parent in the same update.
//
// `$cachedTextSize` reads an ElementNode's previous text size from its keyed
// `dom.__lexicalTextContent`. That DOM node is shared between the previous and
// next `keyToDOMMap`s and its cache is mutated in place during reconciliation.
// When an inline element moves cross-parent and is reconciled (and grows)
// under its new parent BEFORE its old parent's suffix walk runs, the old
// parent reads the new, larger size as if it were the previous size and
// slices too much off its cached text. The DOM stays correct, but the
// `RootNode.__cachedText` that backs `getTextContent()` silently desyncs.
describe('children fast path: cross-parent move and sibling text cache', () => {
  test('getTextContent matches the live tree after moving + merging a trailing link', () => {
    const errors: Error[] = [];
    using editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, LinkExtension],
      name: 'cross-parent-text-cache',
      onError: e => {
        errors.push(e);
      },
    });
    editor.setRootElement(document.createElement('div'));

    const URL = 'https://example.com';

    // P0 leads with a link of URL `URL`; P1 ends with another link of the same
    // URL wrapping a line break. P1 has >= 4 children so its reconcile engages
    // the children fast path. Root has 2 children (general path), so the bug
    // surfaces inside P1's reconcile.
    editor.update(
      () => {
        const root = $getRoot().clear();

        const p0 = $createParagraphNode();
        const leadingLink = $createLinkNode(URL);
        leadingLink.append($createTextNode('P0TEXT'));
        p0.append(leadingLink, $createTextNode('after'));

        const p1 = $createParagraphNode();
        const trailingLink = $createLinkNode(URL);
        trailingLink.append($createLineBreakNode());
        p1.append(
          $createTextNode('x'),
          $createLineBreakNode(),
          $createTextNode('y'),
          trailingLink,
        );

        root.append(p0, p1);
      },
      {discrete: true},
    );

    // Move P1's trailing link to the front of P0. It becomes adjacent to P0's
    // leading link (same URL) and the link normalizer merges them, so the
    // moved link grows from "\n" to "\nP0TEXT" under P0. P1 drops from 4 to 3
    // children (the size-delta suffix path), and its reconcile reads the moved
    // link's now-overwritten DOM text size.
    editor.update(
      () => {
        const root = $getRoot();
        const p0 = root.getFirstChildOrThrow();
        const p1 = root.getLastChildOrThrow();
        invariant($isElementNode(p0), 'p0 must be an ElementNode');
        invariant($isElementNode(p1), 'p1 must be an ElementNode');
        const trailingLink = p1.getLastChildOrThrow();
        p0.getFirstChildOrThrow().insertBefore(trailingLink);
      },
      {discrete: true},
    );

    expect(errors).toEqual([]);

    // `getTextContent()` on the root reads `RootNode.__cachedText`, which the
    // fast path maintains incrementally. Compare it against the text computed
    // fresh from the children (ElementNode.getTextContent walks the tree and
    // does not use the root cache). Read from the committed editor state (not
    // `editor.read`, which would flush any pending update first) so this
    // observation is the same snapshot the reconcile just produced.
    const {cached, fresh} = editor.getEditorState().read(
      () => {
        const root = $getRoot();
        return {
          cached: root.getTextContent(),
          fresh: root
            .getChildren()
            .map(child => child.getTextContent())
            .join('\n\n'),
        };
      },
      {editor},
    );

    expect(cached).toBe(fresh);
  });
});
