/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  defineExtension,
  type ParagraphNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {clearFormatting} from '../../src/plugins/ToolbarPlugin/utils';

function createEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: 'test',
    }),
  );
}

const $getFirstParagraph = (): ParagraphNode => {
  const paragraph = $getRoot().getFirstChild();
  assert($isParagraphNode(paragraph), 'Expected a ParagraphNode');
  return paragraph;
};

describe('clearFormatting (Toolbar)', () => {
  test('clears text and block formatting when all content is selected', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const text = $createTextNode('Hello World');
        text.toggleFormat('bold');
        const paragraph = $createParagraphNode().append(text);
        paragraph.setFormat('center');
        paragraph.setIndent(1);
        $getRoot().clear().append(paragraph);
        text.select(0, 'Hello World'.length);
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const paragraph = $getFirstParagraph();
      expect(paragraph.getFormatType()).toBe('');
      expect(paragraph.getIndent()).toBe(0);
      const text = paragraph.getFirstChild();
      assert($isTextNode(text), 'Expected a TextNode');
      expect(text.hasFormat('bold')).toBe(false);
    });
  });

  test('keeps block formatting when the selection is partial', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const text = $createTextNode('Hello World');
        text.toggleFormat('bold');
        const paragraph = $createParagraphNode().append(text);
        paragraph.setFormat('center');
        paragraph.setIndent(1);
        $getRoot().clear().append(paragraph);
        text.select(0, 'Hello'.length);
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const paragraph = $getFirstParagraph();
      expect(paragraph.getFormatType()).toBe('center');
      expect(paragraph.getIndent()).toBe(1);
      const [selected, rest] = paragraph.getChildren();
      assert($isTextNode(selected), 'Expected a TextNode');
      assert($isTextNode(rest), 'Expected a TextNode');
      expect(selected.hasFormat('bold')).toBe(false);
      expect(rest.hasFormat('bold')).toBe(true);
    });
  });

  test('clears block formatting of an empty block with a collapsed selection', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.setFormat('center');
        paragraph.setIndent(1);
        $getRoot().clear().append(paragraph);
        paragraph.select();
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const paragraph = $getFirstParagraph();
      expect(paragraph.getFormatType()).toBe('');
      expect(paragraph.getIndent()).toBe(0);
    });
  });

  test('clears block but not text formatting with a collapsed selection in text (#7383)', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const text = $createTextNode('Hello World');
        text.toggleFormat('bold');
        const paragraph = $createParagraphNode().append(text);
        paragraph.setFormat('right');
        paragraph.setIndent(1);
        $getRoot().clear().append(paragraph);
        text.select('Hello World'.length, 'Hello World'.length);
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const paragraph = $getFirstParagraph();
      expect(paragraph.getFormatType()).toBe('');
      expect(paragraph.getIndent()).toBe(0);
      const text = paragraph.getFirstChild();
      assert($isTextNode(text), 'Expected a TextNode');
      expect(text.hasFormat('bold')).toBe(true);
    });
  });

  test('clears block formatting only for fully selected blocks across paragraphs', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const firstText = $createTextNode('first');
        const secondText = $createTextNode('second');
        const firstParagraph = $createParagraphNode().append(firstText);
        firstParagraph.setFormat('center');
        const secondParagraph = $createParagraphNode().append(secondText);
        secondParagraph.setFormat('right');
        $getRoot().clear().append(firstParagraph, secondParagraph);
        firstText
          .select(0, 0)
          .setTextNodeRange(firstText, 0, secondText, 'sec'.length);
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const [firstParagraph, secondParagraph] = $getRoot().getChildren();
      assert($isParagraphNode(firstParagraph), 'Expected a ParagraphNode');
      assert($isParagraphNode(secondParagraph), 'Expected a ParagraphNode');
      expect(firstParagraph.getFormatType()).toBe('');
      expect(secondParagraph.getFormatType()).toBe('right');
    });
  });

  test('clears block formatting only for fully selected blocks with a backward selection', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const firstText = $createTextNode('first');
        const secondText = $createTextNode('second');
        const firstParagraph = $createParagraphNode().append(firstText);
        firstParagraph.setFormat('center');
        const secondParagraph = $createParagraphNode().append(secondText);
        secondParagraph.setFormat('right');
        $getRoot().clear().append(firstParagraph, secondParagraph);
        firstText
          .select(0, 0)
          .setTextNodeRange(secondText, 'sec'.length, firstText, 0);
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const [firstParagraph, secondParagraph] = $getRoot().getChildren();
      assert($isParagraphNode(firstParagraph), 'Expected a ParagraphNode');
      assert($isParagraphNode(secondParagraph), 'Expected a ParagraphNode');
      expect(firstParagraph.getFormatType()).toBe('');
      expect(secondParagraph.getFormatType()).toBe('right');
    });
  });

  test('handles a selection that starts at an empty heading (#8666)', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const heading = $createHeadingNode('h1');
        const text = $createTextNode('second');
        const paragraph = $createParagraphNode().append(text);
        paragraph.setFormat('right');
        $getRoot().clear().append(heading, paragraph);
        // The anchor is an element point on the heading, which is
        // replaced with a paragraph during clearFormatting
        heading.select(0, 0).focus.set(text.getKey(), 'sec'.length, 'text');
      },
      {discrete: true},
    );

    editor.update(() => clearFormatting(editor), {discrete: true});

    editor.read(() => {
      const [firstParagraph, secondParagraph] = $getRoot().getChildren();
      assert($isParagraphNode(firstParagraph), 'Expected a ParagraphNode');
      assert($isParagraphNode(secondParagraph), 'Expected a ParagraphNode');
      expect(secondParagraph.getFormatType()).toBe('right');
    });
  });
});
