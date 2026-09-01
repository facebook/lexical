/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {DOMImportExtension} from '@lexical/html';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  createQuoteTransformer,
  QUOTE,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isQuoteNode,
  RichTextExtension,
  ShadowRootQuoteRule,
} from '@lexical/rich-text';
import {JSDOM} from 'jsdom';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getEditor,
  $getRoot,
  configExtension,
  defineExtension,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions([RichTextExtension]);
}

function $markdownFor(
  editor: LexicalEditor,
  $build: () => ElementNode,
): string {
  editor.update(
    () => {
      $getRoot().clear().append($build());
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString());
}

describe('shadow root quote export', () => {
  test('each block child is exported on its own quoted line', () => {
    using editor = buildEditor();
    expect(
      $markdownFor(editor, () =>
        $createQuoteNode({shadowRoot: true}).append(
          $createParagraphNode().append($createTextNode('first')),
          $createParagraphNode().append($createTextNode('second')),
        ),
      ),
    ).toBe('> first\n> second');
  });

  test('a heading child keeps its markdown syntax', () => {
    using editor = buildEditor();
    expect(
      $markdownFor(editor, () =>
        $createQuoteNode({shadowRoot: true}).append(
          $createHeadingNode('h2').append($createTextNode('HEADING')),
          $createParagraphNode().append($createTextNode('some text')),
        ),
      ),
    ).toBe('> ## HEADING\n> some text');
  });

  test('every line of a multi-line block child is prefixed', () => {
    using editor = buildEditor();
    expect(
      $markdownFor(editor, () =>
        $createQuoteNode({shadowRoot: true}).append(
          $createHeadingNode('h1').append(
            $createTextNode('first'),
            $createLineBreakNode(),
            $createTextNode('second'),
          ),
        ),
      ),
    ).toBe('> # first\n> second');
  });

  test('a nested shadow root quote keeps its own prefix', () => {
    using editor = buildEditor();
    expect(
      $markdownFor(editor, () =>
        $createQuoteNode({shadowRoot: true}).append(
          $createQuoteNode({shadowRoot: true}).append(
            $createParagraphNode().append($createTextNode('inner')),
          ),
        ),
      ),
    ).toBe('> > inner');
  });

  test('an inline content quote is unchanged', () => {
    using editor = buildEditor();
    expect(
      $markdownFor(editor, () =>
        $createQuoteNode().append(
          $createTextNode('first'),
          $createLineBreakNode(),
          $createTextNode('second'),
        ),
      ),
    ).toBe('> first\n> second');
  });

  test('a blockquote imported with ShadowRootQuoteRule round trips', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          RichTextExtension,
          configExtension(DOMImportExtension, {rules: [ShadowRootQuoteRule]}),
        ],
        name: 'shadow-root-quote-host',
      }),
    );
    editor.update(
      () => {
        const dep = getExtensionDependencyFromEditor(
          $getEditor(),
          DOMImportExtension,
        );
        const dom = new JSDOM(
          '<!doctype html><html><body><blockquote><p>first</p><p>second</p></blockquote></body></html>',
        );
        $getRoot()
          .clear()
          .append(...dep.output.$generateNodesFromDOM(dom.window.document));
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      '> first\n> second',
    );
  });
});

describe('shadow root quote export regressions', () => {
  const BLOCK_QUOTE_TRANSFORMERS = TRANSFORMERS.map(transformer =>
    transformer === QUOTE
      ? createQuoteTransformer({shadowRoot: true})
      : transformer,
  );

  const RichTextListExtension = defineExtension({
    dependencies: [RichTextExtension, ListExtension],
    name: 'shadow-root-quote-export-test',
  });

  function buildRichEditor() {
    return buildEditorFromExtensions([RichTextListExtension]);
  }

  test('a nested quote round trips instead of flattening to literal text', () => {
    using editor = buildRichEditor();
    const input = '> > inner';
    editor.update(
      () => $convertFromMarkdownString(input, BLOCK_QUOTE_TRANSFORMERS),
      {discrete: true},
    );
    editor.read(() => {
      const outer = $getRoot().getFirstChildOrThrow();
      assert($isQuoteNode(outer), 'Root child must be a QuoteNode');
      const inner = outer.getFirstChildOrThrow();
      assert($isQuoteNode(inner), 'Quote child must be a nested QuoteNode');
      expect(inner.isShadowRoot()).toBe(true);
      expect(inner.getTextContent()).toBe('inner');
    });
    expect(
      editor.read(() => $convertToMarkdownString(BLOCK_QUOTE_TRANSFORMERS)),
    ).toBe(input);
  });

  test('consecutive lines at the same nesting depth join one quote', () => {
    using editor = buildRichEditor();
    const input = '> > one\n> > two';
    editor.update(
      () => $convertFromMarkdownString(input, BLOCK_QUOTE_TRANSFORMERS),
      {discrete: true},
    );
    expect(
      editor.read(() => $convertToMarkdownString(BLOCK_QUOTE_TRANSFORMERS)),
    ).toBe(input);
  });

  test('a list inside a shadow root quote keeps its markers', () => {
    using editor = buildRichEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createQuoteNode({shadowRoot: true}).append(
              $createListNode('bullet').append(
                $createListItemNode().append($createTextNode('one')),
                $createListItemNode().append($createTextNode('two')),
              ),
            ),
          );
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      '> - one\n> - two',
    );
  });

  test('selection export skips blocks that are outside the selection', () => {
    using editor = buildRichEditor();
    let markdown = '';
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode('B'));
        $getRoot()
          .clear()
          .append(
            $createQuoteNode({shadowRoot: true}).append(
              $createHeadingNode('h1').append($createTextNode('A')),
              paragraph,
            ),
          );
        const selection = $createRangeSelection();
        const text = paragraph.getFirstChildOrThrow();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 1, 'text');
        markdown = $convertSelectionToMarkdownString(undefined, selection);
      },
      {discrete: true},
    );
    expect(markdown).toBe('> B');
  });
});
