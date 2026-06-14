/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
} from '@lexical/html';
import {
  $createNodeSelection,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getSlotNames,
  $isParagraphNode,
  $setSelection,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {ReviewExtension} from '../../src/plugins/ReviewExtension';
import {
  $createReviewNode,
  $isReviewNode,
  ReviewNode,
} from '../../src/plugins/ReviewExtension/ReviewNode';

// ReviewExtension brings its own DOM import pipeline (CoreImportExtension + its
// import rule), so the runtime extension alone is a self-contained importer.
const ReviewImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [ReviewExtension],
  name: '[test-review-import]',
  nodes: [ReviewNode],
});

// A Review with the demo author / body text typed in and a rating set. The
// model seeds empty fields (the hints are CSS placeholders), so content tests
// populate it here.
function $createReviewWithContent(): ReviewNode {
  const review = $createReviewNode();
  const author = $getSlot(review, 'author');
  assert($isParagraphNode(author), 'author slot must be a bare paragraph');
  author.append($createTextNode('Jane Doe'));
  const body = review.getChildren()[0];
  assert($isParagraphNode(body), 'body must be a paragraph');
  body.append($createTextNode('Loved it'));
  review.setRating(4);
  return review;
}

function $importHtml(html: string): void {
  $getRoot().clear().select();
  const dom = new DOMParser().parseFromString(html, 'text/html');
  $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
}

describe('ReviewNode HTML round-trip', () => {
  it('round-trips the author slot, body children, and rating through HTML export -> DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(ReviewImportTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createReviewWithContent());
      },
      {discrete: true},
    );
    const html = editor.read(() => $generateHtmlFromNodes(editor, null));

    // The author rides in its named wrapper; the rating — NodeState, not a
    // child or slot — rides a data attribute. The body is regular ElementNode
    // children, so it serializes through the normal child path with no wrapper.
    expect(html).toContain('data-lexical-slot="author"');
    expect(html).toContain('data-rating="4"');
    expect(html).not.toContain('data-lexical-slot="body"');

    editor.update(() => $importHtml(html), {discrete: true});

    editor.read(() => {
      const review = $getRoot().getFirstChild();
      assert($isReviewNode(review), 'Imported node must be a ReviewNode');
      expect($getSlotNames(review)).toEqual(['author']);
      expect($getSlot(review, 'author')?.getTextContent()).toBe('Jane Doe');
      expect(review.getChildren()[0]?.getTextContent()).toBe('Loved it');
      // ReviewNode.exportDOM emits only the author wrapper; the body rides the
      // outer $appendNodesToHTML child recursion. If it also appended the body
      // itself, re-import would double 'Loved it'.
      expect(review.getChildrenSize()).toBe(1);
      // The rating NodeState rode the data attribute.
      expect(review.getRating()).toBe(4);
    });
  });

  // A whole-host NodeSelection of an element carries its children and state by
  // default, so the body and rating ride along when the whole Review is
  // promoted (both clipboard formats are written; external paste picks
  // text/html).
  it('keeps the body and rating in HTML export when the Review is in a NodeSelection', () => {
    using editor = buildEditorFromExtensions(ReviewImportTestExtension);

    let html = '';
    editor.update(
      () => {
        const review = $createReviewWithContent();
        $getRoot().clear().append(review);
        const selection = $createNodeSelection();
        selection.add(review.getKey());
        $setSelection(selection);
        html = $generateHtmlFromNodes(editor, selection);
      },
      {discrete: true},
    );

    expect(html).toContain('Jane Doe');
    expect(html).toContain('Loved it');
    expect(html).toContain('data-rating="4"');
  });

  // A Review div with no author wrapper must not resurrect the seeded author
  // paragraph: the author slot arrives empty, never content the source HTML did
  // not carry. The rating still rides its attribute.
  it('does not fabricate the seeded author when importing a Review without an author wrapper', () => {
    using editor = buildEditorFromExtensions(ReviewImportTestExtension);

    editor.update(
      () =>
        $importHtml(
          '<div class="lexical-review-node" data-rating="2"><p>Body only</p></div>',
        ),
      {discrete: true},
    );

    editor.read(() => {
      const review = $getRoot().getFirstChild();
      assert($isReviewNode(review), 'Top-level node must be a ReviewNode');
      expect(review.getChildren()[0]?.getTextContent()).toBe('Body only');
      expect($getSlot(review, 'author')?.getTextContent()).toBe('');
      expect(review.getRating()).toBe(2);
    });
  });

  // The rating is untrusted in hand-authored HTML, so the import rule clamps it
  // to the 0–5 the widget can represent rather than storing a stray value.
  it('clamps an out-of-range rating on import', () => {
    using editor = buildEditorFromExtensions(ReviewImportTestExtension);

    editor.update(
      () =>
        $importHtml(
          '<div class="lexical-review-node" data-rating="99"><p>x</p></div>',
        ),
      {discrete: true},
    );

    editor.read(() => {
      const review = $getRoot().getFirstChild();
      assert($isReviewNode(review), 'Top-level node must be a ReviewNode');
      expect(review.getRating()).toBe(5);
    });
  });

  // A Review div with no data-rating defaults to 0 (the NodeState default),
  // not NaN from the absent attribute.
  it('defaults the rating to 0 when the attribute is absent', () => {
    using editor = buildEditorFromExtensions(ReviewImportTestExtension);

    editor.update(
      () => $importHtml('<div class="lexical-review-node"><p>x</p></div>'),
      {discrete: true},
    );

    editor.read(() => {
      const review = $getRoot().getFirstChild();
      assert($isReviewNode(review), 'Top-level node must be a ReviewNode');
      expect(review.getRating()).toBe(0);
    });
  });
});
