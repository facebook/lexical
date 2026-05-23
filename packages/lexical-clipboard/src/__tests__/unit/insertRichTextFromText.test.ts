/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertRichTextFromText,
  replaceContentWithRichText,
} from '@lexical/clipboard';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTabNode,
  $isTextNode,
  HISTORY_MERGE_TAG,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import {describe, expect, it} from 'vitest';

function createEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: '[insert-rich-text-from-text-test]',
    }),
  );
}

function $paragraphTextAt(index: number): string {
  const paragraph = $getRoot().getChildAtIndex(index);
  invariant(
    paragraph !== null && $isParagraphNode(paragraph),
    'expected paragraph at index %s',
    String(index),
  );
  return paragraph.getTextContent();
}

describe('$insertRichTextFromText', () => {
  it('splits multi-line text into separate paragraphs', () => {
    using editor = createEditor();
    editor.update(
      () =>
        $insertRichTextFromText(
          'first\nsecond\nthird',
          $getRoot().clear().select(),
        ),
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(3);
      expect($paragraphTextAt(0)).toBe('first');
      expect($paragraphTextAt(1)).toBe('second');
      expect($paragraphTextAt(2)).toBe('third');
    });
  });

  it('handles Windows-style CRLF newlines the same as LF', () => {
    using editor = createEditor();
    editor.update(
      () => $insertRichTextFromText('a\r\nb', $getRoot().clear().select()),
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(2);
      expect($paragraphTextAt(0)).toBe('a');
      expect($paragraphTextAt(1)).toBe('b');
    });
  });

  it('inserts a TabNode for tab characters', () => {
    using editor = createEditor();
    editor.update(
      () => $insertRichTextFromText('a\tb', $getRoot().clear().select()),
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      invariant($isParagraphNode(paragraph), 'expected paragraph');
      const children = paragraph.getChildren();
      expect(children).toHaveLength(3);
      invariant($isTextNode(children[0]), 'expected text');
      invariant($isTabNode(children[1]), 'expected tab');
      invariant($isTextNode(children[2]), 'expected text');
      expect(children[0].getTextContent()).toBe('a');
      expect(children[2].getTextContent()).toBe('b');
    });
  });

  it('preserves $insertDataTransferForRichText behavior for trailing newline (paragraph break is honored)', () => {
    using editor = createEditor();
    editor.update(
      () => $insertRichTextFromText('only\n', $getRoot().clear().select()),
      {discrete: true},
    );
    editor.read(() => {
      // Trailing newline yields a paragraph break; the helper does not
      // collapse it. Matches the legacy plain-text paste path.
      expect($getRoot().getChildrenSize()).toBe(2);
      expect($paragraphTextAt(0)).toBe('only');
      expect($paragraphTextAt(1)).toBe('');
    });
  });

  it('inserts nothing for an empty string input', () => {
    using editor = createEditor();
    editor.update(
      () => $insertRichTextFromText('', $getRoot().clear().select()),
      {discrete: true},
    );
    editor.read(() => {
      // After clear() the root has zero children; an empty input must not
      // add any. The stronger assertion catches a future regression that
      // would start inserting a paragraph on empty input.
      expect($getRoot().getChildrenSize()).toBe(0);
    });
  });
});

describe('replaceContentWithRichText', () => {
  it('clears existing content and inserts paragraphs', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createParagraphNode().append($createTextNode('previous')));
      },
      {discrete: true},
    );

    replaceContentWithRichText(editor, 'fresh\nlines');

    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(2);
      expect($paragraphTextAt(0)).toBe('fresh');
      expect($paragraphTextAt(1)).toBe('lines');
    });
  });

  it('runs node transforms on the inserted text', () => {
    using editor = createEditor();
    // Simulate the issue #7876 use case: a transform that rewrites a token.
    // Unlike `setEditorState`, the insertText path the helper takes routes
    // through the normal transform pipeline.
    editor.registerNodeTransform(TextNode, node => {
      const text = node.getTextContent();
      if (text.includes('{{name}}')) {
        node.setTextContent(text.replace('{{name}}', 'Ada'));
      }
    });

    replaceContentWithRichText(editor, 'hello {{name}}');

    editor.read(() => {
      expect($paragraphTextAt(0)).toBe('hello Ada');
    });
  });

  it('forwards update options to editor.update (HISTORY_MERGE_TAG case)', () => {
    using editor = createEditor();
    const tags: Set<string>[] = [];
    editor.registerUpdateListener(({tags: updateTags}) => {
      tags.push(new Set(updateTags));
    });

    replaceContentWithRichText(editor, 'restored', {
      discrete: true,
      tag: HISTORY_MERGE_TAG,
    });

    // The most recent update should carry the merge tag so history
    // extensions can fold it into the previous entry on boot-time restore.
    const last = tags[tags.length - 1];
    expect(last.has(HISTORY_MERGE_TAG)).toBe(true);
  });
});
