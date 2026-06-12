/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import invariant from '@lexical/internal/invariant';
import {$createLinkNode, LinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  ElementNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// An element whose inline-ness is mutable state read through `getLatest()`. A
// non-last suffix sibling that flips block<->inline changes the double line
// break that the suffix-length walk must subtract from the cached parent text;
// reading `isInline()` against the next state (the flipped value) instead of
// the previous one silently desyncs `RootNode.__cachedText`.
class FlipInlineNode extends ElementNode {
  __inline: boolean = false;
  $config() {
    return this.config('flip-inline', {extends: ElementNode});
  }
  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__inline = prevNode.__inline;
  }
  createDOM(): HTMLElement {
    return document.createElement(this.__inline ? 'span' : 'div');
  }
  updateDOM(): false {
    return false;
  }
  isInline(): boolean {
    return this.getLatest().__inline;
  }
  setInline(inline: boolean): void {
    this.getWritable().__inline = inline;
  }
  canBeEmpty(): boolean {
    return false;
  }
}

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

  // Regression test for the *other* `isInline()` in the suffix-length walk:
  // the one deciding the double line break BETWEEN suffix siblings (not the one
  // inside a moved element's `getTextContentSize()`). When a non-last suffix
  // element's `isInline()` is state-dependent (routes through `getLatest()`)
  // and flips between the previous and next states, the walk must read it
  // against the *previous* state — otherwise it uses the next-state value,
  // computes the wrong double-line-break length, and silently desyncs
  // `RootNode.__cachedText`. (This call cannot throw — a removed sibling is
  // always the last of the suffix, where `isInline()` is skipped — so the
  // failure mode is a wrong cached value, not an error.)
  test('flipping a non-last suffix element block<->inline keeps the cache in sync', () => {
    const errors: Error[] = [];
    using editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension],
      name: 'suffix-sibling-isinline',
      nodes: [FlipInlineNode],
      onError: e => {
        errors.push(e);
      },
    });
    editor.setRootElement(document.createElement('div'));

    // P: [text, lineBreak, E(block), text]. 4 children -> fast path. E is a
    // non-last block element, so P's previous text carries a double line break
    // after it. The line break keeps the text nodes from merging.
    editor.update(
      () => {
        const root = $getRoot().clear();
        const p = $createParagraphNode();
        const e = new FlipInlineNode();
        e.append($createTextNode('e'));
        p.append(
          $createTextNode('a'),
          $createLineBreakNode(),
          e,
          $createTextNode('z'),
        );
        root.append(p);
      },
      {discrete: true},
    );

    // size-0 update: flip E to inline (dropping its trailing double line break)
    // and dirty the last text node so [E, "z"] is the reconciled suffix. The
    // suffix walk asks E.isInline() for the inter-sibling double line break;
    // against the next state it answers "inline" (no break) while the cached
    // parent text still holds the previous "block" break.
    editor.update(
      () => {
        const p = $getRoot().getLastChildOrThrow();
        invariant($isElementNode(p), 'p must be an ElementNode');
        const e = p.getChildren()[2];
        invariant(e instanceof FlipInlineNode, 'e must be a FlipInlineNode');
        e.setInline(true);
        const last = p.getLastChildOrThrow();
        invariant($isTextNode(last), 'last child must be a text node');
        last.toggleFormat('bold');
      },
      {discrete: true},
    );

    expect(errors).toEqual([]);

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
