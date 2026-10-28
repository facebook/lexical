/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createQuoteNode,
  $isQuoteNode,
  QuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  defineExtension,
  KEY_ENTER_COMMAND,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: 'quote-shadow-root-host',
    }),
  );
}

describe('QuoteNode shadow root opt-in', () => {
  test('isShadowRoot() defaults to false and serializes nothing', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const quoteNode = $createQuoteNode();
        expect(quoteNode.isShadowRoot()).toBe(false);
        expect('shadowRoot' in quoteNode.exportJSON()).toBe(false);
      },
      {discrete: true},
    );
  });

  test('opt-in with $createQuoteNode and setIsShadowRoot', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const quoteNode = $createQuoteNode({shadowRoot: true});
        expect(quoteNode.isShadowRoot()).toBe(true);
        expect(quoteNode.exportJSON().shadowRoot).toBe(true);
        quoteNode.setIsShadowRoot(false);
        expect(quoteNode.isShadowRoot()).toBe(false);
        expect('shadowRoot' in quoteNode.exportJSON()).toBe(false);
        quoteNode.setIsShadowRoot(true);
        expect(quoteNode.isShadowRoot()).toBe(true);
      },
      {discrete: true},
    );
  });

  test('shadow root round-trips through JSON', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const quoteNode = $createQuoteNode({shadowRoot: true});
        const imported = QuoteNode.importJSON(quoteNode.exportJSON());
        expect(imported.isShadowRoot()).toBe(true);
        const importedDefault = QuoteNode.importJSON(
          $createQuoteNode().exportJSON(),
        );
        expect(importedDefault.isShadowRoot()).toBe(false);
      },
      {discrete: true},
    );
  });

  test('collapseAtStart() lifts blocks out of a shadow root quote', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const root = $getRoot();
        const quoteNode = $createQuoteNode({shadowRoot: true});
        quoteNode.append(
          $createParagraphNode().append($createTextNode('a')),
          $createParagraphNode().append($createTextNode('b')),
        );
        root.clear().append(quoteNode);
        quoteNode.collapseAtStart();
        const children = root.getChildren();
        expect(children.length).toBe(2);
        expect(children.every($isParagraphNode)).toBe(true);
        expect(children.map(node => node.getTextContent())).toEqual(['a', 'b']);
      },
      {discrete: true},
    );
  });

  test('getTopLevelElement() stops at a shadow root quote', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const root = $getRoot();
        const quoteNode = $createQuoteNode({shadowRoot: true});
        const paragraph = $createParagraphNode().append($createTextNode('a'));
        quoteNode.append(paragraph);
        root.clear().append(quoteNode);
        expect(paragraph.getTopLevelElementOrThrow().is(paragraph)).toBe(true);
        quoteNode.setIsShadowRoot(false);
        expect(paragraph.getTopLevelElementOrThrow().is(quoteNode)).toBe(true);
      },
      {discrete: true},
    );
  });
});

/** A paragraph's text, or the blocks of a shadow root quote. */
type Block = string | Block[];

function $createBlock(block: Block): LexicalNode {
  return typeof block === 'string'
    ? $createParagraphNode().append(
        ...(block === '' ? [] : [$createTextNode(block)]),
      )
    : $createQuoteNode({shadowRoot: true}).append(...block.map($createBlock));
}

function $describeBlock(node: LexicalNode): Block {
  if ($isQuoteNode(node)) {
    assert(node.isShadowRoot(), 'every quote should be a shadow root');
    return node.getChildren().map($describeBlock);
  }
  assert($isParagraphNode(node), 'every block should be a paragraph');
  return node.getTextContent();
}

/** The child indexes from the root down to `node`. */
function $getPath(node: LexicalNode): number[] {
  const path: number[] = [];
  for (let n = node; !$isRootNode(n); n = n.getParentOrThrow()) {
    path.unshift(n.getIndexWithinParent());
  }
  return path;
}

/**
 * Puts the root's blocks in place, with the caret at the end of the line at
 * `caretPath`, and presses Enter. Returns the blocks after it, and the path of
 * the line that holds the caret.
 */
function pressEnter(
  blocks: Block[],
  caretPath: number[],
): {blocks: Block[]; caret: number[]} {
  using editor = buildEditor();
  editor.update(
    () => {
      let line: LexicalNode = $getRoot()
        .clear()
        .append(...blocks.map($createBlock));
      for (const index of caretPath) {
        assert($isElementNode(line));
        const child = line.getChildAtIndex(index);
        assert(child !== null);
        line = child;
      }
      assert($isParagraphNode(line));
      line.selectEnd();
    },
    {discrete: true},
  );
  editor.dispatchCommand(KEY_ENTER_COMMAND, null);
  return editor.read(() => {
    const selection = $getSelection();
    assert($isRangeSelection(selection) && selection.isCollapsed());
    return {
      blocks: $getRoot().getChildren().map($describeBlock),
      caret: $getPath(selection.anchor.getNode()),
    };
  });
}

describe('Enter in a shadow root quote', () => {
  test('on a line with text, adds a line to the quote', () => {
    expect(pressEnter([['a']], [0, 0])).toEqual({
      blocks: [['a', '']],
      caret: [0, 1],
    });
  });

  test('on an empty last line, moves the line after the quote', () => {
    expect(pressEnter([['a', '']], [0, 1])).toEqual({
      blocks: [['a'], ''],
      caret: [1],
    });
  });

  test('on an empty first line, moves the line before the quote', () => {
    expect(pressEnter([['', 'b']], [0, 0])).toEqual({
      blocks: ['', ['b']],
      caret: [0],
    });
  });

  test('on an empty line in the middle, splits the quote in two', () => {
    expect(pressEnter([['a', '', 'b']], [0, 1])).toEqual({
      blocks: [['a'], '', ['b']],
      caret: [1],
    });
  });

  test('on the only line of the quote, an empty one, removes the quote', () => {
    expect(pressEnter([['']], [0, 0])).toEqual({
      blocks: [''],
      caret: [0],
    });
  });

  test('in a nested quote, moves the line to the outer quote', () => {
    expect(pressEnter([[['a', '']]], [0, 0, 1])).toEqual({
      blocks: [[['a'], '']],
      caret: [0, 1],
    });
  });
});
