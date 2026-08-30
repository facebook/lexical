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
import {$convertToMarkdownString} from '@lexical/markdown';
import {
  $createHeadingNode,
  $createQuoteNode,
  RichTextExtension,
  ShadowRootQuoteRule,
} from '@lexical/rich-text';
import {JSDOM} from 'jsdom';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  configExtension,
  defineExtension,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, test} from 'vitest';

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
