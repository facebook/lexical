/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createCodeNode, CodeNode} from '@lexical/code-core';
import {createHeadlessEditor} from '@lexical/headless';
import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {$createMarkNode, MarkNode} from '@lexical/mark';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  CODE,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $copyNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {assert, describe, expect, it} from 'vitest';

function createTestEditor() {
  return createHeadlessEditor({
    nodes: [
      CodeNode,
      LinkNode,
      ListNode,
      ListItemNode,
      HeadingNode,
      QuoteNode,
      MarkNode,
    ],
    onError(error) {
      throw error;
    },
  });
}

function parse(markdown: string) {
  const html: string[] = [];
  const links: string[] = [];
  const images: string[] = [];
  const definitions: string[] = [];
  const text: string[] = [];
  function visit(
    node:
      | ReturnType<typeof fromMarkdown>
      | ReturnType<typeof fromMarkdown>['children'][number],
  ) {
    if (node.type === 'html') html.push(node.value);
    if (node.type === 'link') links.push(node.url);
    if (node.type === 'image') images.push(node.url);
    if (node.type === 'definition') definitions.push(node.url);
    if (
      node.type === 'text' ||
      node.type === 'inlineCode' ||
      node.type === 'code'
    )
      text.push(node.value);
    if ('children' in node) node.children.forEach(visit);
  }
  visit(fromMarkdown(markdown));
  return {definitions, html, images, links, text: text.join('')};
}

function $links() {
  const result: string[] = [];
  function $visit(node: LexicalNode) {
    if ($isLinkNode(node)) result.push(node.getURL());
    if ($isElementNode(node)) node.getChildren().forEach($visit);
  }
  $visit($getRoot());
  return result;
}

function expectLiteral(markdown: string, text: string) {
  expect(parse(markdown)).toEqual({
    definitions: [],
    html: [],
    images: [],
    links: [],
    text,
  });
}

function formatProjection(markdown: string): string[] {
  const result: string[] = [];
  function visit(
    node:
      | ReturnType<typeof fromMarkdown>
      | ReturnType<typeof fromMarkdown>['children'][number],
    format: number,
  ) {
    if (node.type === 'strong') format |= 1;
    if (node.type === 'emphasis') format |= 2;
    if (node.type === 'inlineCode') format |= 16;
    if (node.type === 'text' || node.type === 'inlineCode') {
      result.push(...Array.from(node.value, char => `${format}:${char}`));
    }
    if ('children' in node)
      node.children.forEach(child => visit(child, format));
  }
  visit(fromMarkdown(markdown), 0);
  return result;
}

const LITERALS = [
  '# heading',
  '> quote',
  '- item',
  '+ item',
  '1. item',
  '1) item',
  '---',
  '===',
  '    code',
  '\tcode',
  'a\n# b',
  '<b>text</b>',
  '<https://example.com>',
  '<me@example.com>',
  '&#60;b&#62;',
  '&#x3c;b&#x3e;',
  '&lt;b&gt;',
  '&amp;#60;',
  '[label](https://example.com)',
  '![label](https://example.com)',
  '[label]: https://example.com',
  '[label][ref]',
  '[x](u) [ref]: /uri',
  'a]b[c',
  'rock & roll',
  String.raw`\<b>\&lt;\[x](u)`,
  String.raw`\\<b>\\&#60;`,
];

describe.each([false, true])(
  'literal Markdown text (preserve newlines: %s)',
  preserve => {
    it.each(LITERALS)('round-trips %j at every node boundary', text => {
      for (let split = 0; split <= text.length; split++) {
        const editor = createTestEditor();
        editor.update(
          () =>
            $getRoot().append(
              $createParagraphNode().append(
                $createTextNode(text.slice(0, split)).setStyle('color: red'),
                $createTextNode(text.slice(split)).setStyle('color: blue'),
              ),
            ),
          {discrete: true},
        );
        for (let conversion = 0; conversion < 3; conversion++) {
          const markdown = editor.read(() =>
            $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
          );
          expectLiteral(markdown, text);
          editor.update(
            () =>
              $convertFromMarkdownString(
                markdown,
                TRANSFORMERS,
                undefined,
                preserve,
              ),
            {discrete: true},
          );
          expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
          expect(editor.read($links)).toEqual([]);
        }
      }
    });

    it.each(['<b>text</b>', '&#60;', '&lt;', '[label](u)', String.raw`\<b>`])(
      'keeps literal %j across formatting and wrapper boundaries',
      text => {
        for (let split = 1; split < text.length; split++) {
          const editor = createTestEditor();
          editor.update(
            () =>
              $getRoot().append(
                $createParagraphNode().append(
                  $createMarkNode(['m']).append(
                    $createTextNode(text.slice(0, split)).toggleFormat('bold'),
                  ),
                  $createTextNode(text.slice(split)),
                ),
              ),
            {discrete: true},
          );
          expectLiteral(
            editor.read(() =>
              $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
            ),
            text,
          );
        }
      },
    );

    it('keeps punctuation literal after copying, splitting, merging, editing and JSON', () => {
      const editor = createTestEditor();
      editor.update(
        () =>
          $convertFromMarkdownString(
            String.raw`\<b>\&lt;\[x\](u)`,
            TRANSFORMERS,
            undefined,
            preserve,
          ),
        {discrete: true},
      );
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow();
          assert($isElementNode(paragraph));
          const text = paragraph.getFirstChildOrThrow<TextNode>();
          const [first, second] = text.splitText(3);
          first.mergeWithSibling(second);
          const copy = $copyNode(first).setTextContent('<i>&#60;[new](u)</i>');
          paragraph.append(copy);
        },
        {discrete: true},
      );
      const text = editor.read(() => $getRoot().getTextContent());
      editor.setEditorState(
        editor.parseEditorState(
          JSON.stringify(editor.getEditorState().toJSON()),
        ),
      );
      expectLiteral(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
        ),
        text,
      );
    });

    it.each([false, true])(
      'escapes a partial selection (backward: %s)',
      backward => {
        const editor = createTestEditor();
        const text = '<b>&#60;[label](u)</b>';
        editor.update(
          () => {
            const node = $createTextNode('prefix ' + text + ' suffix');
            $getRoot().append($createParagraphNode().append(node));
            node.select(
              backward ? 7 + text.length : 7,
              backward ? 7 : 7 + text.length,
            );
          },
          {discrete: true},
        );
        expectLiteral(
          editor.read(() =>
            $convertSelectionToMarkdownString(
              TRANSFORMERS,
              $getSelection(),
              preserve,
            ),
          ),
          text,
        );
      },
    );

    it('keeps real links and a preceding exclamation mark distinct through wrappers', () => {
      const editor = createTestEditor();
      editor.update(
        () =>
          $getRoot().append(
            $createParagraphNode().append(
              $createMarkNode(['m']).append($createTextNode(String.raw`a\!`)),
              $createMarkNode(['m']).append(
                $createLinkNode('https://example.com/?q=&#65;').append(
                  $createTextNode('<a[b]> &amp;'),
                ),
              ),
            ),
          ),
        {discrete: true},
      );
      const markdown = editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
      );
      expect(parse(markdown)).toEqual({
        definitions: [],
        html: [],
        images: [],
        links: ['https://example.com/?q=&#65;'],
        text: String.raw`a\!<a[b]> &amp;`,
      });
      editor.update(
        () =>
          $convertFromMarkdownString(
            markdown,
            TRANSFORMERS,
            undefined,
            preserve,
          ),
        {discrete: true},
      );
      expect(editor.read($links)).toEqual(['https://example.com/?q=&#65;']);
    });
  },
);

describe('Markdown import escapes and references', () => {
  it.each([
    ['hello world   \n\nnext paragraph', 'hello world   '],
    ['   hello world\n\nnext paragraph', '   hello world'],
  ])(
    'exports the whitespace retained by default normalization: %j',
    (markdown, firstText) => {
      const editor = createTestEditor();
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(
        editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
      ).toBe(firstText);
      const visible = editor.read(() => $getRoot().getTextContent());
      const written = editor.read(() => $convertToMarkdownString());
      const first = fromMarkdown(written).children[0];
      assert(first.type === 'paragraph');
      expect(first.children).toMatchObject([{type: 'text', value: firstText}]);
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(visible);
    },
  );

  it('preserves clipped leading whitespace as text without inventing formatting', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const first = $createTextNode('a  ')
          .toggleFormat('bold')
          .setStyle('color: red');
        const second = $createTextNode('b').toggleFormat('bold');
        $getRoot().append($createParagraphNode().append(first, second));
        first.select(1).setTextNodeRange(first, 1, second, 1);
      },
      {discrete: true},
    );
    const written = editor.read(() =>
      $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection()),
    );
    expect(parse(written).text).toBe('  b');
    expect(formatProjection(written)).toEqual(['0: ', '0: ', '1:b']);
  });

  it.each([
    [String.raw`\&#60;`, '&#60;'],
    [String.raw`\&#x3c;`, '&#x3c;'],
    [String.raw`\&lt;`, '&lt;'],
    ['&#38;#60;', '&#60;'],
    ['&amp;lt;', '&lt;'],
    ['&#60;b&#62;', '<b>'],
    ['&#x3c;b&#x3e;', '<b>'],
    ['&lt;b&gt;', '<b>'],
    ['&NotEqualTilde;', '\u2242\u0338'],
    ['&#0;', '\uFFFD'],
    ['&#xD800;', '\uFFFD'],
    ['&#1114112;', '\uFFFD'],
    ['&#12345678;', '&#12345678;'],
    ['&nosuch;', '&nosuch;'],
  ])('reads %j once, including detached import', (markdown, text) => {
    const editor = createTestEditor();
    editor.update(
      () => {
        $convertFromMarkdownString(markdown);
        expect($getRoot().getTextContent()).toBe(text);
        const [paragraph] = $generateNodesFromMarkdownString(markdown);
        expect(paragraph.getTextContent()).toBe(text);
      },
      {discrete: true},
    );
    expectLiteral(
      editor.read(() => $convertToMarkdownString()),
      text,
    );
  });

  it.each([
    String.raw`\[label](u)`,
    String.raw`[label\](u)`,
    String.raw`\[label\](u)`,
  ])('does not read escaped brackets as link syntax: %j', markdown => {
    const editor = createTestEditor();
    editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
    expect(editor.read($links)).toEqual([]);
    expectLiteral(
      editor.read(() => $convertToMarkdownString()),
      '[label](u)',
    );
  });

  it.each(['a&#32;', 'a&#9;', 'a\n&#32;b', '# a&#32;', '- a&#32;', '> a&#32;'])(
    'preserves entity-produced whitespace: %j',
    markdown => {
      const editor = createTestEditor();
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      const expected = parse(markdown).text.replace(/\n/g, '');
      expect(
        editor.read(() => $getRoot().getTextContent()).replace(/\n/g, ''),
      ).toBe(expected);
    },
  );

  it.each([false, true])(
    'preserves all bold/italic run boundaries (wrappers: %s)',
    wrappers => {
      for (const preserve of [false, true])
        for (const text of [
          'abcd',
          '`x`',
          '<b>',
          '&lt;',
          '&#60;',
          '[x](u)',
          String.raw`\<b>`,
        ]) {
          for (let split = 1; split < text.length; split++) {
            for (const left of [0, 1, 2, 3, 16, 17, 18, 19])
              for (const right of [0, 1, 2, 3, 16, 17, 18, 19]) {
                const editor = createTestEditor();
                editor.update(
                  () => {
                    const first = $createTextNode(text.slice(0, split))
                      .setFormat(left)
                      .setStyle('color: red');
                    const second = $createTextNode(text.slice(split))
                      .setFormat(right)
                      .setStyle('color: blue');
                    $getRoot().append(
                      $createParagraphNode().append(
                        ...(wrappers
                          ? [
                              $createMarkNode(['left']).append(first),
                              $createMarkNode(['right']).append(second),
                            ]
                          : [first, second]),
                      ),
                    );
                  },
                  {discrete: true},
                );
                const markdown = editor.read(() =>
                  $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
                );
                expect(
                  parse(markdown),
                  JSON.stringify({left, markdown, right, split, text}),
                ).toEqual({
                  definitions: [],
                  html: [],
                  images: [],
                  links: [],
                  text,
                });
                expect(
                  formatProjection(markdown),
                  JSON.stringify({left, markdown, right, split, text}),
                ).toEqual([
                  ...Array.from(
                    text.slice(0, split),
                    char => `${left}:${char}`,
                  ),
                  ...Array.from(text.slice(split), char => `${right}:${char}`),
                ]);
              }
          }
        }
    },
  );
});

describe('intentional syntax', () => {
  it.each([false, true])(
    'respects custom exporters between code runs (selection: %s)',
    selected => {
      for (const mode of ['raw', 'format', 'empty']) {
        const editor = createTestEditor();
        editor.update(
          () => {
            const nodes = ['a', 'b', 'c'].map((value, index) =>
              $createTextNode(value)
                .toggleFormat('code')
                .setStyle(`order: ${index}`),
            );
            $getRoot().append($createParagraphNode().append(...nodes));
            if (selected)
              nodes[0].select(0).setTextNodeRange(nodes[0], 0, nodes[2], 1);
          },
          {discrete: true},
        );
        const calls: string[] = [];
        const custom: TextMatchTransformer = {
          dependencies: [],
          export(node, _children, format) {
            if (!$isTextNode(node)) return null;
            calls.push(node.getTextContent());
            if (node.getTextContent() !== 'b') return null;
            return mode === 'empty'
              ? ''
              : mode === 'raw'
                ? '<b>owned</b>'
                : `|${format(node, node.getTextContent())}|`;
          },
          regExp: /$^/,
          type: 'text-match',
        };
        const transformers = [custom, ...TRANSFORMERS];
        const written = editor.read(() =>
          selected
            ? $convertSelectionToMarkdownString(transformers, $getSelection())
            : $convertToMarkdownString(transformers),
        );
        expect(calls, mode).toEqual(['a', 'b', 'c']);
        expect(written, mode).toBe(
          mode === 'empty'
            ? '`ac`'
            : mode === 'raw'
              ? '`a`<b>owned</b>`c`'
              : '`a`|`b`|`c`',
        );
      }
    },
  );

  it('respects a custom wrapper exporter and calls its child exporters once', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a').toggleFormat('code'),
            $createMarkNode(['custom']).append(
              $createTextNode('b').toggleFormat('code'),
            ),
            $createTextNode('c').toggleFormat('code'),
          ),
        ),
      {discrete: true},
    );
    const calls: string[] = [];
    const custom: TextMatchTransformer = {
      dependencies: [],
      export(node, children) {
        calls.push(node.getTextContent());
        return node instanceof MarkNode ? `{${children(node)}}` : null;
      },
      regExp: /$^/,
      type: 'text-match',
    };
    expect(
      editor.read(() => $convertToMarkdownString([custom, ...TRANSFORMERS])),
    ).toBe('`a`{`b`}`c`');
    expect(calls).toEqual(['a', 'b', 'b', 'c']);
  });

  it.each([false, true])(
    'preserves source line endings and literal backslashes (preserve: %s)',
    preserve => {
      for (const markdown of [
        'foo\\\nbar',
        'foo\\\\\nbar',
        'foo\\\\\\\nbar',
        'foo  \nbar',
        'foo&#92;\nbar',
        'foo&#32;&#32;\nbar',
        '`foo\\`\nbar',
        '> foo\\\n> bar',
        '- foo\\\n- bar',
      ]) {
        const editor = createTestEditor();
        editor.update(
          () =>
            $convertFromMarkdownString(
              markdown,
              TRANSFORMERS,
              undefined,
              preserve,
            ),
          {discrete: true},
        );
        const written = editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, preserve),
        );
        expect(parse(written), JSON.stringify({markdown, written})).toEqual(
          parse(markdown),
        );
        const breaks = (value: string) =>
          JSON.stringify(fromMarkdown(value), (key, item) =>
            key === 'position' ? undefined : item,
          ).match(/"type":"break"/g)?.length ?? 0;
        expect(breaks(written)).toBe(breaks(markdown));
      }
    },
  );

  it('keeps preserved break state on blocks across copy, text edits, JSON and selection', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $convertFromMarkdownString('foo\\\nbar', TRANSFORMERS, undefined, true),
      {discrete: true},
    );
    editor.update(
      () => {
        const first = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(first));
        const clone = $copyNode(first);
        clone.append(...first.getChildren().map(child => $copyNode(child)));
        first.replace(clone);
        const text = clone.getFirstChildOrThrow<TextNode>();
        const [left, right] = text.splitText(1);
        left.mergeWithSibling(right).setTextContent('foo<b>');
      },
      {discrete: true},
    );
    editor.setEditorState(
      editor.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())),
    );
    expect(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
    ).toBe('foo\\<b>\\\nbar');
    editor.update(
      () => {
        const first = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(first));
        first.getFirstChildOrThrow<TextNode>().select(0, 6);
      },
      {discrete: true},
    );
    expectLiteral(
      editor.read(() =>
        $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection(), true),
      ),
      'foo<b>',
    );
    editor.update(() => $getRoot().getLastChildOrThrow().remove(), {
      discrete: true,
    });
    expectLiteral(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
      'foo<b>',
    );
  });

  it('clips a code run across styled nodes and empty inline wrappers', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const left = $createTextNode('prefix <b>')
          .toggleFormat('code')
          .setStyle('color: red');
        const right = $createTextNode('&lt; suffix')
          .toggleFormat('code')
          .setStyle('color: blue');
        $getRoot().append(
          $createParagraphNode().append(
            $createMarkNode(['a']).append(left),
            $createMarkNode(['empty']),
            $createMarkNode(['b']).append(right),
          ),
        );
        const selection = left.select(7);
        selection.setTextNodeRange(left, 7, right, 4);
      },
      {discrete: true},
    );
    expect(
      parse(
        editor.read(() =>
          $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection()),
        ),
      ),
    ).toEqual({
      definitions: [],
      html: [],
      images: [],
      links: [],
      text: '<b>&lt;',
    });
  });

  it('keeps a literal exclamation mark before a link across an empty wrapper', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('!'),
            $createMarkNode(['empty']),
            $createLinkNode('u').append($createTextNode('label')),
          ),
        ),
      {discrete: true},
    );
    expect(parse(editor.read(() => $convertToMarkdownString())).images).toEqual(
      [],
    );
  });

  it.each([
    'line\rtitle',
    'line\ntitle',
    'line\r\ntitle',
    'literal&#10; &amp;',
  ])('keeps a link title literal: %j', title => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            $createLinkNode('https://example.com', {title}).append(
              $createTextNode('x'),
            ),
          ),
        ),
      {discrete: true},
    );
    const markdown = editor.read(() => $convertToMarkdownString());
    expect(markdown).not.toMatch(/[\r\n]/);
    const paragraph = fromMarkdown(markdown).children[0];
    assert(paragraph.type === 'paragraph');
    const link = paragraph.children[0];
    assert(link.type === 'link');
    expect(link.title).toBe(title);
    editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
    expect(
      editor.read(() => {
        const linkNode = $getRoot().getFirstDescendant();
        return linkNode?.getParent();
      }),
    ).toBeDefined();
    expect(
      editor.read(() => {
        const text = $getRoot().getFirstDescendant();
        const parent = text?.getParent();
        assert($isLinkNode(parent));
        return parent.getTitle();
      }),
    ).toBe(title);
  });

  it.each([
    ['<https://example.com>', 'https://example.com', 'https://example.com'],
    ['<me+tag@example.com>', 'me+tag@example.com', 'mailto:me+tag@example.com'],
    [
      String.raw`<https://example.com/\*&amp;>`,
      String.raw`https://example.com/\*&amp;`,
      String.raw`https://example.com/\*&amp;`,
    ],
  ])('represents an autolink as a LinkNode: %j', (markdown, text, url) => {
    const editor = createTestEditor();
    editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
    expect(editor.read($links)).toEqual([url]);
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    expect(parse(editor.read(() => $convertToMarkdownString()))).toEqual({
      definitions: [],
      html: [],
      images: [],
      links: [url],
      text,
    });
  });

  it.each(['`<b>&#60;[x](u)\\*</b>`', '```\n<b>&#60;[x](u)\\*</b>\n```'])(
    'keeps code literal: %j',
    markdown => {
      const editor = createTestEditor();
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(parse(editor.read(() => $convertToMarkdownString()))).toEqual(
        parse(markdown),
      );
    },
  );

  it('preserves intentional raw output from an explicit custom transformer', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createCodeNode('raw-markdown').append(
            $createTextNode('<b>text</b>'),
          ),
        ),
      {discrete: true},
    );
    const transformers = [
      {
        ...CODE,
        export: (node: LexicalNode) =>
          node instanceof CodeNode && node.getLanguage() === 'raw-markdown'
            ? node.getTextContent()
            : null,
      },
      ...TRANSFORMERS,
    ];
    expect(editor.read(() => $convertToMarkdownString(transformers))).toBe(
      '<b>text</b>',
    );
  });
});
