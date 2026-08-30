/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode, TextNode} from 'lexical';

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

import {$createTestInlineElementNode, TestInlineElementNode} from '../utils';

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

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: 'test',
    nodes: [TestHeadingNode, TestInlineElementNode],
    onError: error => {
      throw error;
    },
  });
}

/**
 * Builds the document with $buildDocument, places the selection with
 * $placeSelection and pastes a heading followed by a paragraph at it.
 */
function $pasteBlocks(
  editor: LexicalEditor,
  $buildDocument: () => LexicalNode[],
  $placeSelection: () => void,
): void {
  editor.update(
    () => {
      $getRoot().append(...$buildDocument());
      $placeSelection();
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Expected RangeSelection');
      selection.insertNodes([
        new TestHeadingNode().append($createTextNode('Heading 3')),
        $createParagraphNode().append($createTextNode('Some paragraph')),
      ]);
    },
    {discrete: true},
  );
}

/** The root children as `type("textContent")`, one entry per block. */
function $describeRoot(): string[] {
  return $getRoot()
    .getChildren()
    .map(node => `${node.getType()}(${JSON.stringify(node.getTextContent())})`);
}

/** The collapsed selection as `"textContent"@offset`. */
function $describeSelection(): string {
  const selection = $getSelection();
  assert($isRangeSelection(selection), 'Expected RangeSelection');
  expect(selection.isCollapsed()).toBe(true);
  return `${JSON.stringify(selection.anchor.getNode().getTextContent())}@${
    selection.anchor.offset
  }`;
}

describe('Regression #4815', () => {
  test('preserves a pasted block at the end of a paragraph after consecutive line breaks', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    $pasteBlocks(
      editor,
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createLineBreakNode(),
        );
        return [paragraph];
      },
      () => paragraph.select(3, 3),
    );

    editor.read(() => {
      // The line the caret sat on is consumed by the paste, so the line break
      // that terminated it goes with it and the empty line above survives.
      // The heading keeps its own block and the split leaves no empty
      // paragraph behind.
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraph")',
      ]);
      expect($describeSelection()).toBe('"Some paragraph"@14');
    });
  });

  test('preserves a pasted block before text that follows consecutive line breaks', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    $pasteBlocks(
      editor,
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        return [paragraph];
      },
      () => paragraph.select(3, 3),
    );

    editor.read(() => {
      // The text after the insertion point still joins the last pasted block,
      // as it does for any other mid-paragraph paste.
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
      expect($describeSelection()).toBe('"Some paragraphParagraph 1"@14');
    });
  });

  test('preserves a pasted block for a text point at the start of the line', () => {
    const editor = createTestEditor();
    let text: TextNode;

    $pasteBlocks(
      editor,
      () => {
        text = $createTextNode('Paragraph 1');
        return [
          $createParagraphNode().append(
            $createTextNode('Line of text'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            text,
          ),
        ];
      },
      () => text.select(0, 0),
    );

    editor.read(() => {
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('preserves a pasted block inside an inline element at the start of the line', () => {
    const editor = createTestEditor();
    let text: TextNode;

    $pasteBlocks(
      editor,
      () => {
        text = $createTextNode('Paragraph 1');
        return [
          $createParagraphNode().append(
            $createTextNode('Line of text'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            $createTestInlineElementNode().append(text),
          ),
        ];
      },
      () => text.select(0, 0),
    );

    editor.read(() => {
      // The empty line is still the block boundary even though the point sits
      // one inline element deep.
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('preserves a pasted block when replacing a selection that starts after the empty line', () => {
    const editor = createTestEditor();
    let text: TextNode;

    $pasteBlocks(
      editor,
      () => {
        text = $createTextNode('Paragraph 1');
        return [
          $createParagraphNode().append(
            $createTextNode('Line of text'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            text,
          ),
        ];
      },
      // Pasting over a selection that starts where the caret would have been
      // has to agree with the collapsed case above.
      () => text.select(0, 'Paragraph'.length),
    );

    editor.read(() => {
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraph 1")',
      ]);
    });
  });

  test('preserves every line break of a longer run', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    $pasteBlocks(
      editor,
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        return [paragraph];
      },
      () => paragraph.select(4, 4),
    );

    editor.read(() => {
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n\\n")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('preserves a pasted block after a single line break', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    $pasteBlocks(
      editor,
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        return [paragraph];
      },
      () => paragraph.select(2, 2),
    );

    editor.read(() => {
      // One line break is enough: the point is at the start of its line, so
      // there is nothing to its left for the heading to be flattened into.
      expect($describeRoot()).toEqual([
        'paragraph("Line of text")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('gives a lone pasted paragraph its own block at the start of a line', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    editor.update(
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Line of text'),
          $createLineBreakNode(),
          $createTextNode('Paragraph 1'),
        );
        $getRoot().append(paragraph);
        paragraph.select(2, 2);
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.insertNodes([
          $createParagraphNode().append($createTextNode('Some paragraph')),
        ]);
      },
      {discrete: true},
    );

    editor.read(() => {
      // A line-broken line becomes its own block like any other, which is
      // what pasting at the start of a paragraph already does.
      expect($describeRoot()).toEqual([
        'paragraph("Line of text")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('keeps the existing merge behavior at the start of a block', () => {
    const editor = createTestEditor();
    let paragraph: ElementNode;

    $pasteBlocks(
      editor,
      () => {
        paragraph = $createParagraphNode().append(
          $createTextNode('Paragraph 1'),
        );
        return [
          $createParagraphNode().append($createTextNode('Above')),
          paragraph,
        ];
      },
      () => paragraph.select(0, 0),
    );

    editor.read(() => {
      // Unchanged: a point at the start of a block already kept the heading,
      // and the line-break rule above is the same behavior one line in.
      expect($describeRoot()).toEqual([
        'paragraph("Above")',
        'test-heading("Heading 3")',
        'paragraph("Some paragraphParagraph 1")',
      ]);
    });
  });

  test('keeps the existing merge behavior in the middle of a line', () => {
    const editor = createTestEditor();
    let text: TextNode;

    $pasteBlocks(
      editor,
      () => {
        text = $createTextNode('Paragraph 1');
        return [
          $createParagraphNode().append(
            $createTextNode('Line of text'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            text,
          ),
        ];
      },
      // The empty line is no longer adjacent to the insertion point, so this
      // is an ordinary mid-line paste.
      () => text.select(2, 2),
    );

    editor.read(() => {
      expect($describeRoot()).toEqual([
        'paragraph("Line of text\\n\\nPaHeading 3")',
        'paragraph("Some paragraphragraph 1")',
      ]);
    });
  });
});
