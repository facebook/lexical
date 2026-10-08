/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import type {Nodes as MdastNode, Root} from 'mdast';

import {
  buildEditorFromExtensions,
  configExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$isHeadingNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastGfmExtension,
  MdastShortcutsExtension,
} from '../../index';

// A tree transform may leave points with only lines and columns, the way
// some remark plugins rebuild positions.
const dropOffsets = (node: MdastNode) => {
  if (node.position) {
    delete node.position.start.offset;
    delete node.position.end.offset;
  }
  if ('children' in node) {
    node.children.forEach(dropOffsets);
  }
};

// One frozen position shared by every node, which a transform may also do.
const FROZEN = Object.freeze({
  end: Object.freeze({column: 1, line: 1}),
  start: Object.freeze({column: 1, line: 1}),
});
const freezePositions = (node: MdastNode) => {
  node.position = FROZEN;
  if ('children' in node) {
    node.children.forEach(freezePositions);
  }
};

function createEditor(
  transform: (tree: Root) => void,
  withShortcuts = false,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastGfmExtension,
        ...(withShortcuts ? [MdastShortcutsExtension] : []),
        configExtension(MdastExtension, {
          mdastExtensions: [{transforms: [transform]}],
        }),
      ],
      name: '[root]',
    }),
  );
}

describe('a tree whose points have no offsets', () => {
  // Each reads how it was written from the source, by offset.
  it.each([
    ['a setext heading', 'h\n='],
    ['a list marker', '* a\n* b'],
    ['a code fence', '~~~js\nx\n~~~'],
    ['a line break of spaces', 'a  \nb'],
    ['an autolink', '<https://example.com>'],
  ])('keeps %s as written', (_, markdown) => {
    using editor = createEditor(dropOffsets);
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    expect(editor.read(() => $convertToMarkdownString())).toBe(markdown);
  });

  it('keeps the text of a reference with no definition', () => {
    using editor = createEditor(dropOffsets);
    editor.update(() => $convertFromMarkdownString('[a][nope]'), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe('[a][nope]');
  });

  it('imports with a frozen position shared by its nodes', () => {
    // With no offset to read, the list marker is the default one.
    using editor = createEditor(freezePositions);
    editor.update(() => $convertFromMarkdownString('# h\n\n* a'), {
      discrete: true,
    });
    expect(editor.read(() => $convertToMarkdownString())).toBe('# h\n\n- a');
  });

  it.each([
    ['a block shortcut', ['#', ' '], '', true],
    ['an inline shortcut', ['a **b*', '*'], 'a b', false],
  ])('fires %s while typing', (_, chunks, text, isHeading) => {
    using editor = createEditor(dropOffsets, true);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    for (const chunk of chunks) {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(chunk);
          }
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      const block = $getRoot().getFirstChild();
      expect(block && block.getTextContent()).toBe(text);
      expect($isHeadingNode(block)).toBe(isHeading);
      if (!isHeading) {
        expect($getRoot().getAllTextNodes()[1].hasFormat('bold')).toBe(true);
      }
    });
  });
});
