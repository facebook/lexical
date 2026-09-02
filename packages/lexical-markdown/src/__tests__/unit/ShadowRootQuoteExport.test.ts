/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createCodeNode, CodeExtension} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {DOMImportExtension} from '@lexical/html';
import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  ListExtension,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  createQuoteTransformer,
  QUOTE,
  type Transformer,
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
  $isParagraphNode,
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
  const BLOCK_QUOTE_TRANSFORMERS: Transformer[] = TRANSFORMERS.map(
    transformer =>
      transformer === QUOTE
        ? createQuoteTransformer({
            shadowRoot: true,
            transformers: () => BLOCK_QUOTE_TRANSFORMERS,
          })
        : transformer,
  );

  const RichTextListExtension = defineExtension({
    dependencies: [RichTextExtension, ListExtension, CodeExtension],
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

  test('selection inside a nested quote is exported', () => {
    using editor = buildRichEditor();
    let markdown = '';
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode('aaa'));
        $getRoot()
          .clear()
          .append(
            $createQuoteNode({shadowRoot: true}).append(
              $createQuoteNode({shadowRoot: true}).append(paragraph),
            ),
          );
        const selection = $createRangeSelection();
        const text = paragraph.getFirstChildOrThrow();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 3, 'text');
        markdown = $convertSelectionToMarkdownString(undefined, selection);
      },
      {discrete: true},
    );
    expect(markdown).toBe('> > aaa');
  });

  test('selection inside a quoted list item is exported', () => {
    using editor = buildRichEditor();
    let markdown = '';
    editor.update(
      () => {
        const item = $createListItemNode().append($createTextNode('one'));
        $getRoot()
          .clear()
          .append(
            $createQuoteNode({shadowRoot: true}).append(
              $createListNode('bullet').append(item),
            ),
          );
        const selection = $createRangeSelection();
        const text = item.getFirstChildOrThrow();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 3, 'text');
        markdown = $convertSelectionToMarkdownString(undefined, selection);
      },
      {discrete: true},
    );
    expect(markdown).toBe('> - one');
  });

  test('a lazy continuation line joins the innermost nested block', () => {
    using editor = buildRichEditor();
    editor.update(
      () =>
        $convertFromMarkdownString(
          '> > inner\ncontinued',
          BLOCK_QUOTE_TRANSFORMERS,
        ),
      {discrete: true},
    );
    expect(
      editor.read(() => $convertToMarkdownString(BLOCK_QUOTE_TRANSFORMERS)),
    ).toBe('> > inner\n> > continued');
  });

  test('a quoted list round trips instead of becoming literal text', () => {
    using editor = buildRichEditor();
    const input = '> - one\n> - two';
    editor.update(
      () => $convertFromMarkdownString(input, BLOCK_QUOTE_TRANSFORMERS),
      {discrete: true},
    );
    editor.read(() => {
      const quote = $getRoot().getFirstChildOrThrow();
      assert($isQuoteNode(quote), 'Root child must be a QuoteNode');
      assert(
        $isListNode(quote.getFirstChildOrThrow()),
        'Quote child must be a ListNode',
      );
    });
    expect(
      editor.read(() => $convertToMarkdownString(BLOCK_QUOTE_TRANSFORMERS)),
    ).toBe(input);
  });

  test('a quoted list stays literal when the set has no list transformers', () => {
    using editor = buildRichEditor();
    const NO_LIST_TRANSFORMERS: Transformer[] = TRANSFORMERS.filter(
      transformer =>
        transformer.type !== 'element' ||
        !transformer.dependencies.some(klass => klass.getType() === 'list'),
    ).map(transformer =>
      transformer === QUOTE
        ? createQuoteTransformer({
            shadowRoot: true,
            transformers: () => NO_LIST_TRANSFORMERS,
          })
        : transformer,
    );
    editor.update(
      () => $convertFromMarkdownString('> - one', NO_LIST_TRANSFORMERS),
      {discrete: true},
    );
    editor.read(() => {
      const quote = $getRoot().getFirstChildOrThrow();
      assert($isQuoteNode(quote), 'Root child must be a QuoteNode');
      assert(
        !$isListNode(quote.getFirstChildOrThrow()),
        'The excluded list transformers must not run inside the quote',
      );
      expect(quote.getTextContent()).toBe('- one');
    });
  });

  test('a code block inside a quote keeps its fences on export', () => {
    using editor = buildRichEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createQuoteNode({shadowRoot: true}).append(
              $createCodeNode('js').append($createTextNode('const x = 1;')),
            ),
          );
      },
      {discrete: true},
    );
    expect(
      editor.read(() => $convertToMarkdownString(BLOCK_QUOTE_TRANSFORMERS)),
    ).toBe('> ```js\n> const x = 1;\n> ```');
  });

  test('lazy continuation continues a quoted list item', () => {
    using editor = buildRichEditor();
    editor.update(
      () =>
        $convertFromMarkdownString(
          '> - one\ncontinued',
          BLOCK_QUOTE_TRANSFORMERS,
        ),
      {discrete: true},
    );
    editor.read(() => {
      const quote = $getRoot().getFirstChildOrThrow();
      assert($isQuoteNode(quote), 'Root child must be a QuoteNode');
      const list = quote.getFirstChildOrThrow();
      assert($isListNode(list), 'Quote child must be a ListNode');
      expect(list.getChildrenSize()).toBe(1);
      expect(list.getTextContent()).toBe('one\ncontinued');
    });
  });

  test('lazy continuation does not merge into a quoted heading', () => {
    using editor = buildRichEditor();
    editor.update(
      () =>
        $convertFromMarkdownString(
          '> # Title\ncontinued',
          BLOCK_QUOTE_TRANSFORMERS,
        ),
      {discrete: true},
    );
    editor.read(() => {
      const [quote, paragraph] = $getRoot().getChildren();
      assert($isQuoteNode(quote), 'First child must be a QuoteNode');
      expect(quote.getTextContent()).toBe('Title');
      assert(
        $isParagraphNode(paragraph),
        'The unquoted line must stay its own paragraph',
      );
      expect(paragraph.getTextContent()).toBe('continued');
    });
  });
});
