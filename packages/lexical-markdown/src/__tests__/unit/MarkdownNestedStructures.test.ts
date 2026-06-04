/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode, CodeNode} from '@lexical/code-core';
import {createHeadlessEditor} from '@lexical/headless';
import {LinkNode} from '@lexical/link';
import {
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {$isQuoteNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$getRoot, ElementNode, LexicalNode} from 'lexical';
import {describe, expect, it} from 'vitest';

import {$convertFromMarkdownString, $convertToMarkdownString} from '../..';
import {TRANSFORMERS} from '../../MarkdownTransformers';

// Regression tests for #7084: Lexical markdown should support nested block
// structures (a blockquote inside a blockquote, and a fenced code block or
// blockquote inside a list item) on both import and export. Before the fix the
// inner block was kept as literal text (quotes) or pulled out of its parent
// (code in a list), so round-tripping and the imported node tree were wrong.

function createEditor() {
  return createHeadlessEditor({
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, LinkNode],
  });
}

function importMarkdown(markdown: string) {
  const editor = createEditor();
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  return editor;
}

function roundTrip(markdown: string): string {
  const editor = importMarkdown(markdown);
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(TRANSFORMERS));
}

function getOnlyChild(node: ElementNode): LexicalNode {
  const children = node.getChildren();
  return children[children.length - 1];
}

describe('core::nested markdown structures (#7084)', () => {
  describe('blockquote nested in a blockquote', () => {
    const markdown = '> Hello\n> > Nested';

    it('round-trips a nested blockquote', () => {
      expect(roundTrip(markdown)).toBe(markdown);
    });

    it('imports the inner blockquote as a nested QuoteNode, not literal text', () => {
      const editor = importMarkdown(markdown);
      editor.getEditorState().read(() => {
        const outerQuote = $getRoot().getFirstChild();
        expect($isQuoteNode(outerQuote)).toBe(true);
        const inner = getOnlyChild(outerQuote as ElementNode);
        expect($isQuoteNode(inner)).toBe(true);
        expect((inner as ElementNode).getTextContent()).toBe('Nested');
        // The inner ">" must not survive as literal text on the outer quote.
        expect((outerQuote as ElementNode).getChildren().length).toBe(3);
      });
    });
  });

  describe('fenced code block nested in a list item', () => {
    const markdown = '- item\n  ```js\n  code\n  ```';

    it('round-trips a code block nested in a list item', () => {
      expect(roundTrip(markdown)).toBe(markdown);
    });

    it('imports the code block inside the list item, not as a sibling of the list', () => {
      const editor = importMarkdown(markdown);
      editor.getEditorState().read(() => {
        const root = $getRoot();
        // The list must be the only top-level node (code not pulled out).
        expect(root.getChildrenSize()).toBe(1);
        const list = root.getFirstChild();
        expect($isListNode(list)).toBe(true);
        const item = (list as ElementNode).getFirstChild();
        expect($isListItemNode(item)).toBe(true);
        const code = getOnlyChild(item as ElementNode);
        expect($isCodeNode(code)).toBe(true);
        expect((code as ElementNode).getTextContent()).toBe('code');
      });
    });
  });

  describe('blockquote nested in a list item', () => {
    const markdown = '- item\n  > quoted';

    it('round-trips a blockquote nested in a list item', () => {
      expect(roundTrip(markdown)).toBe(markdown);
    });

    it('imports the blockquote inside the list item, not as literal text', () => {
      const editor = importMarkdown(markdown);
      editor.getEditorState().read(() => {
        const root = $getRoot();
        expect(root.getChildrenSize()).toBe(1);
        const list = root.getFirstChild();
        expect($isListNode(list)).toBe(true);
        const item = (list as ElementNode).getFirstChild();
        expect($isListItemNode(item)).toBe(true);
        const quote = getOnlyChild(item as ElementNode);
        expect($isQuoteNode(quote)).toBe(true);
        expect((quote as ElementNode).getTextContent()).toBe('quoted');
      });
    });
  });
});
