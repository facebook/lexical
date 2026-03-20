/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {CodeExtension} from '@lexical/code-core';
import {buildEditorFromExtensions} from '@lexical/extension';
import {createHeadlessEditor} from '@lexical/headless';
import {$createLinkNode, $isLinkNode, LinkExtension} from '@lexical/link';
import {ListExtension} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  nestHeadingInBlockquote,
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  defineExtension,
  LexicalEditor,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

const MarkdownShortcutTestExtension = defineExtension({
  dependencies: [
    LinkExtension,
    RichTextExtension,
    ListExtension,
    CodeExtension,
  ],
  name: 'MarkdownShortcutTest',
  register: (editor_) => registerMarkdownShortcuts(editor_),
});

function typeMarkdown(editor: LexicalEditor, text: string) {
  editor.update(() => {
    const selection = $getSelection();
    if (!($isRangeSelection(selection) && selection.isCollapsed())) {
      $getRoot().selectEnd();
    }
  });
  for (const char of text) {
    editor.update(() => $getSelection()?.insertText(char), {discrete: true});
  }
  // Markdown shortcuts issues a cascading update that is not
  // discrete, so force sync reconciliation with a read.
  editor.read(() => {});
}

describe('LINK', () => {
  test('text before a markdown link is preserved', () => {
    const editor = buildEditorFromExtensions([MarkdownShortcutTestExtension]);
    typeMarkdown(editor, 'Start [test](url)');
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const children = paragraph.getChildren();
      expect(children.map((node) => node.getTextContent())).toEqual([
        'Start ',
        'test',
      ]);
      assert($isLinkNode(children[1]), 'Second child must be a LinkNode');
    });
  });

  test('formatted text before a markdown link is preserved', () => {
    const editor = buildEditorFromExtensions([MarkdownShortcutTestExtension]);
    typeMarkdown(editor, '**Bold** [Link](url)');

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const children = paragraph.getChildren();

      expect(children.map((node) => node.getTextContent())).toEqual([
        'Bold',
        ' ',
        'Link',
      ]);

      const linkNode = children[2];
      assert($isLinkNode(linkNode), 'Third child must be a LinkNode');
      expect(linkNode.getTextContent()).toBe('Link');
      expect(linkNode.getURL()).toBe('url');
    });
  });

  test('LINK is not too greedy if there is a preceding match that was not processed', () => {
    // https://github.com/facebook/lexical/issues/8129
    const editor = buildEditorFromExtensions([MarkdownShortcutTestExtension]);
    // Set up initial condition, since we are not typing a character at a time
    // it's not handled by markdown shortcuts in this update
    editor.update(
      () => {
        $getRoot()
          .selectEnd()
          .insertRawText(
            `[a](https://a.example.com) [b](https://b.example.com`,
          );
      },
      {discrete: true},
    );
    typeMarkdown(editor, ')');
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const children = paragraph.getChildren();

      expect(children.map((node) => node.getTextContent())).toEqual([
        '[a](https://a.example.com) ',
        'b',
      ]);

      const linkNode = children[1];
      assert($isLinkNode(linkNode), 'Second child must be a LinkNode');
      expect(linkNode.getTextContent()).toBe('b');
      expect(linkNode.getURL()).toBe('https://b.example.com');
    });
  });

  test('markdown link should not be created inside another link.', async () => {
    const editor = buildEditorFromExtensions([MarkdownShortcutTestExtension]);
    editor.update(
      () => {
        $getRoot()
          .selectEnd()
          .insertNodes([
            $createParagraphNode().append(
              $createLinkNode('link').append($createTextNode('hello')),
            ),
          ]);
      },
      {discrete: true},
    );

    // moves the cursor inside the link text: hell‸o
    editor.update(() => $getRoot().getAllTextNodes()[0].select(4, 4), {
      discrete: true,
    });

    typeMarkdown(editor, '[world](www)');

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const children = paragraph.getChildren();

      expect(children.length).toBe(1);

      const linkNode = children[0];
      assert($isLinkNode(linkNode), 'First child must be a LinkNode');
      expect(linkNode.getTextContent()).toBe('hell[world](www)o');
      expect(linkNode.getURL()).toBe('link');
    });
  });
});

describe('BLOCK QUOTE + HEADING', () => {
  const nestableTransformers = nestHeadingInBlockquote(TRANSFORMERS);

  const NestableHeadingExtension = defineExtension({
    dependencies: [
      LinkExtension,
      RichTextExtension,
      ListExtension,
      CodeExtension,
    ],
    name: 'NestableHeadingTest',
    register: (editor_) =>
      registerMarkdownShortcuts(editor_, nestableTransformers),
  });

  test('typing "> # SOME HEADER" creates a heading inside a quote when nestHeadingInBlockquote is used (issue #7407)', () => {
    const editor = buildEditorFromExtensions([NestableHeadingExtension]);
    typeMarkdown(editor, '> # SOME HEADER');
    editor.read(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChildOrThrow();
      assert($isQuoteNode(firstChild), 'Root child must be a QuoteNode');
      const quoteChild = firstChild.getFirstChildOrThrow();
      assert($isHeadingNode(quoteChild), 'Quote child must be a HeadingNode');
      expect(quoteChild.getTag()).toBe('h1');
      expect(quoteChild.getTextContent()).toBe('SOME HEADER');
    });
  });

  test('typing "> # SOME HEADER" replaces the quote with a heading by default', () => {
    const editor = buildEditorFromExtensions([MarkdownShortcutTestExtension]);
    typeMarkdown(editor, '> # SOME HEADER');
    editor.read(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChildOrThrow();
      assert(
        $isHeadingNode(firstChild),
        'Root child must be a HeadingNode (default behavior)',
      );
      expect(firstChild.getTag()).toBe('h1');
      expect(firstChild.getTextContent()).toBe('SOME HEADER');
    });
  });

  test('import: "> # heading" produces a HeadingNode inside a QuoteNode', () => {
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode],
    });

    editor.update(
      () => {
        $convertFromMarkdownString('> # SOME HEADER', nestableTransformers);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChildOrThrow();
      assert($isQuoteNode(firstChild), 'Root child must be a QuoteNode');
      const quoteChild = firstChild.getFirstChildOrThrow();
      assert($isHeadingNode(quoteChild), 'Quote child must be a HeadingNode');
      expect(quoteChild.getTag()).toBe('h1');
      expect(quoteChild.getTextContent()).toBe('SOME HEADER');
    });
  });

  test('export: HeadingNode inside QuoteNode produces "> # heading"', () => {
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode],
    });

    editor.update(
      () => {
        const heading = $createHeadingNode('h2').append(
          $createTextNode('SOME HEADER'),
        );
        const quote = $createQuoteNode().append(heading);
        $getRoot().clear().append(quote);
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(nestableTransformers));

    expect(markdown).toBe('> ## SOME HEADER');
  });

  test('round-trip: import then export preserves "> # heading"', () => {
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode],
    });

    const input = '> ### SOME HEADER';

    editor.update(
      () => {
        $convertFromMarkdownString(input, nestableTransformers);
      },
      {discrete: true},
    );

    const output = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(nestableTransformers));

    expect(output).toBe(input);
  });

  test('import: "> # heading" followed by "> text" produces correct structure', () => {
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode],
    });

    editor.update(
      () => {
        $convertFromMarkdownString(
          '> # HEADING\n> some text',
          nestableTransformers,
        );
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChildOrThrow();
      assert($isQuoteNode(firstChild), 'First child must be a QuoteNode');
      const quoteChild = firstChild.getFirstChildOrThrow();
      assert(
        $isHeadingNode(quoteChild),
        'First quote child must be a HeadingNode',
      );
      expect(quoteChild.getTag()).toBe('h1');
      expect(quoteChild.getTextContent()).toBe('HEADING');
      expect(firstChild.getTextContent()).toContain('some text');
    });
  });

  test('export: QuoteNode with heading and text falls back to default quote export', () => {
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode],
    });

    editor.update(
      () => {
        const heading = $createHeadingNode('h1').append(
          $createTextNode('HEADING'),
        );
        const quote = $createQuoteNode().append(
          heading,
          $createLineBreakNode(),
          $createTextNode('some text'),
        );
        $getRoot().clear().append(quote);
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(nestableTransformers));

    expect(markdown).toBe('> HEADING\n> some text');
  });
});
