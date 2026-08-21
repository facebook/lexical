/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  ElementNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

class TestHeadingNode extends ElementNode {
  $config() {
    return this.config('test-heading', {extends: ElementNode});
  }

  createDOM(): HTMLElement {
    return document.createElement('h3');
  }

  updateDOM(): false {
    return false;
  }
}

describe('Regression #4815', () => {
  test('preserves a pasted block after consecutive line breaks', () => {
    const editor = createEditor({
      namespace: 'test',
      nodes: [TestHeadingNode],
      onError: error => {
        throw error;
      },
    });
    let pastedTextKey = '';

    editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        $getRoot().append(paragraph);

        const heading = new TestHeadingNode().append(
          $createTextNode('Heading 3'),
        );
        const pastedText = $createTextNode('Some paragraph');
        pastedTextKey = pastedText.getKey();

        paragraph
          .select(3, 3)
          .insertNodes([heading, $createParagraphNode().append(pastedText)]);
      },
      {discrete: true},
    );

    editor.read(() => {
      const rootChildren = $getRoot().getChildren();
      expect(rootChildren.map(node => node.getType())).toEqual([
        'paragraph',
        'test-heading',
        'paragraph',
        'paragraph',
      ]);
      expect(rootChildren.map(node => node.getTextContent())).toEqual([
        'Line of text\n',
        'Heading 3',
        'Some paragraph',
        'Paragraph 1',
      ]);

      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Expected RangeSelection');
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.key).toBe(pastedTextKey);
      expect(selection.anchor.offset).toBe('Some paragraph'.length);
    });
  });

  test('keeps the existing merge behavior after a single line break', () => {
    const editor = createEditor({
      namespace: 'test',
      nodes: [TestHeadingNode],
      onError: error => {
        throw error;
      },
    });

    editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        $getRoot().append(paragraph);

        paragraph
          .select(2, 2)
          .insertNodes([
            new TestHeadingNode().append($createTextNode('Heading 3')),
            $createParagraphNode().append($createTextNode('Some paragraph')),
          ]);
      },
      {discrete: true},
    );

    editor.read(() => {
      const rootChildren = $getRoot().getChildren();
      expect(rootChildren.map(node => node.getType())).toEqual([
        'paragraph',
        'paragraph',
      ]);
      expect(rootChildren.map(node => node.getTextContent())).toEqual([
        'Line of text\nHeading 3',
        'Some paragraphParagraph 1',
      ]);
    });
  });
});
