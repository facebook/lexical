/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code-core';
import {
  CodeShikiExtension,
  loadCodeLanguage,
  loadCodeTheme,
} from '@lexical/code-shiki';
import {buildEditorFromExtensions} from '@lexical/extension';
import {$convertFromMarkdownString, TRANSFORMERS} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function createEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension, CodeShikiExtension],
      name: 'code-shiki-retain-selection-test',
    }),
  );
}

/**
 * Shiki loads grammars and themes asynchronously, so the highlight transform
 * that rewrites the code block's children only runs once those settle.
 */
async function settleHighlighting(): Promise<void> {
  await loadCodeLanguage('javascript');
  await loadCodeTheme('one-light');
  await Promise.resolve();
}

function $describeCaret() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return {selection: String(selection)};
  }
  const anchorNode = selection.anchor.getNode();
  return {
    blocks: $getRoot()
      .getChildren()
      .map(child => child.getType()),
    inCodeBlock:
      $isCodeNode(anchorNode) || anchorNode.getParents().some($isCodeNode),
    offset: selection.anchor.offset,
    text: anchorNode.getTextContent(),
  };
}

/**
 * $convertFromMarkdownString only moves the caret when there already is one,
 * which is the case when a user pastes markdown into a focused editor.
 */
function $seedSelection(): void {
  const paragraph = $createParagraphNode();
  $getRoot().clear().append(paragraph);
  paragraph.selectEnd();
}

describe('Shiki highlighting only retains a selection it owns (#6305)', () => {
  test('importing markdown that ends in a code block leaves the caret at the document start', async () => {
    using editor = createEditor();

    editor.update($seedSelection, {discrete: true});
    editor.update(
      () => {
        $convertFromMarkdownString(
          'hello world\n\n```\necho hello world\n```',
          TRANSFORMERS,
        );
      },
      {discrete: true},
    );
    await settleHighlighting();

    expect(editor.read($describeCaret)).toEqual({
      blocks: ['paragraph', 'code'],
      inCodeBlock: false,
      offset: 0,
      text: 'hello world',
    });
  });

  test('the caret is not dragged into the last of several imported code blocks', async () => {
    using editor = createEditor();

    editor.update($seedSelection, {discrete: true});
    editor.update(
      () => {
        $convertFromMarkdownString(
          'hello world\n\n```\nfirst\n```\n\nmiddle\n\n```\nlast\n```',
          TRANSFORMERS,
        );
      },
      {discrete: true},
    );
    await settleHighlighting();

    expect(editor.read($describeCaret)).toEqual({
      blocks: ['paragraph', 'code', 'paragraph', 'code'],
      inCodeBlock: false,
      offset: 0,
      text: 'hello world',
    });
  });
});
