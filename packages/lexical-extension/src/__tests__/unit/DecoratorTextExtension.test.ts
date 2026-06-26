/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  DecoratorTextExtension,
  DecoratorTextNode,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $selectAll,
  FORMAT_TEXT_COMMAND,
  TEXT_TYPE_TO_FORMAT,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

const BOLD = TEXT_TYPE_TO_FORMAT.bold;

describe('DecoratorTextExtension FORMAT_TEXT_COMMAND', () => {
  test('aligns DecoratorTextNode to not-bold when TextNode is bold', () => {
    // Regression: before the fix, DecoratorTextExtension would blindly toggle
    // the decorator independently of the TextNode alignment, producing opposite
    // format states across the two nodes.
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);

        const decorator = $create(DecoratorTextNode);
        // decorator starts not-bold (format = 0)
        const text = $createTextNode('hello');
        text.setFormat(BOLD); // TextNode starts bold
        paragraph.append(decorator, text);

        $selectAll();
      },
      dependencies: [DecoratorTextExtension, RichTextExtension],
      name: 'test',
    });

    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph));
      const children = paragraph.getChildren();
      const decorator = children[0] as DecoratorTextNode;
      const text = children[children.length - 1] as unknown as {
        getFormat(): number;
      };
      // TextNode (bold=1) drives firstNextFormat → bold=0.
      // DecoratorTextNode must align to bold=0 (not toggle independently to bold=1).
      expect(decorator.getFormat()).toBe(0);
      expect(text.getFormat()).toBe(0);
    });
  });

  test('aligns DecoratorTextNode to bold when TextNode is not-bold', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);

        const decorator = $create(DecoratorTextNode);
        decorator.setFormat(BOLD); // DecoratorTextNode starts bold
        const text = $createTextNode('hello');
        // TextNode starts not-bold (format = 0)
        paragraph.append(decorator, text);

        $selectAll();
      },
      dependencies: [DecoratorTextExtension, RichTextExtension],
      name: 'test',
    });

    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph));
      const children = paragraph.getChildren();
      const decorator = children[0] as DecoratorTextNode;
      const text = children[children.length - 1] as unknown as {
        getFormat(): number;
      };
      // TextNode (bold=0) drives firstNextFormat → bold=1.
      // DecoratorTextNode must align to bold=1 (not toggle independently to bold=0).
      expect(decorator.getFormat()).toBe(BOLD);
      expect(text.getFormat()).toBe(BOLD);
    });
  });

  test('removes bold from all nodes when every node in selection is already bold', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);

        const decorator = $create(DecoratorTextNode);
        decorator.setFormat(BOLD);
        const text = $createTextNode('hello');
        text.setFormat(BOLD);
        paragraph.append(decorator, text);

        $selectAll();
      },
      dependencies: [DecoratorTextExtension, RichTextExtension],
      name: 'test',
    });

    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph));
      const children = paragraph.getChildren();
      const decorator = children[0] as DecoratorTextNode;
      const text = children[children.length - 1] as unknown as {
        getFormat(): number;
      };
      expect(decorator.getFormat()).toBe(0);
      expect(text.getFormat()).toBe(0);
    });
  });
});
