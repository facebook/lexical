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
import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {$createMarkNode, MarkNode} from '@lexical/mark';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  CODE,
  type ElementTransformer,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$createHeadingNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $copyNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  HISTORY_PUSH_TAG,
  type LexicalNode,
  REDO_COMMAND,
  UNDO_COMMAND,
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
          const text = paragraph.getFirstChildOrThrow();
          assert($isTextNode(text));
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
  it.each([' ', 'a ', ' a', '\t', 'a\t', '\ta', '\u00a0'])(
    'uses code fences rather than content whitespace for flanking: %j',
    value => {
      for (const format of [16, 17, 18, 19])
        for (const before of [false, true]) {
          const editor = createTestEditor();
          editor.update(
            () => {
              const code = $createTextNode(value).setFormat(format);
              const text = $createTextNode('b');
              $getRoot().append(
                $createParagraphNode().append(
                  ...(before ? [text, code] : [code, text]),
                ),
              );
            },
            {discrete: true},
          );
          const expected = Array.from(value, char => `${format}:${char}`);
          const written = editor.read(() => $convertToMarkdownString());
          expect(
            formatProjection(written),
            JSON.stringify({before, format, value, written}),
          ).toEqual(before ? ['0:b', ...expected] : [...expected, '0:b']);
        }
    },
  );

  it.each(['😀', '€', '∑', '©', '🧭', '$', '+'])(
    'keeps symbol boundaries unambiguous to Markdown parsers: %s',
    symbol => {
      for (const format of [1, 2, 3, 17, 18, 19])
        for (const before of [false, true]) {
          const editor = createTestEditor();
          editor.update(
            () => {
              const plain = $createTextNode(symbol);
              const styled = $createTextNode('!').setFormat(format);
              $getRoot().append(
                $createParagraphNode().append(
                  ...(before ? [styled, plain] : [plain, styled]),
                ),
              );
            },
            {discrete: true},
          );
          const expected = Array.from(symbol, char => `0:${char}`);
          const written = editor.read(() => $convertToMarkdownString());
          expect(
            formatProjection(written),
            JSON.stringify({before, format, symbol, written}),
          ).toEqual(
            before
              ? [`${format}:!`, ...expected]
              : [...expected, `${format}:!`],
          );
          editor.update(() => $convertFromMarkdownString(written), {
            discrete: true,
          });
          expect(
            formatProjection(editor.read(() => $convertToMarkdownString())),
          ).toEqual(
            before
              ? [`${format}:!`, ...expected]
              : [...expected, `${format}:!`],
          );
        }
    },
  );

  it.each(['format', 'children', 'repeat', 'decline', 'opaque'])(
    'retains callback delegation and owned syntax boundaries: %s',
    mode => {
      const editor = createTestEditor();
      editor.update(
        () =>
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('a').toggleFormat('bold').setStyle('order: 0'),
              $createMarkNode(['custom']).append(
                $createTextNode('b').toggleFormat('bold').setStyle('order: 1'),
              ),
              $createTextNode('c').setStyle('order: 2'),
            ),
          ),
        {discrete: true},
      );
      const calls: string[] = [];
      const custom: TextMatchTransformer = {
        dependencies: [],
        export(node, children, format) {
          if ($isTextNode(node)) calls.push(node.getTextContent());
          if (!(node instanceof MarkNode)) return null;
          if (mode === 'children' || mode === 'decline') {
            const value = children(node);
            return mode === 'decline' ? null : value;
          }
          const text = node.getFirstChildOrThrow();
          assert($isTextNode(text));
          const value = format(text, text.getTextContent());
          return mode === 'repeat'
            ? value + value
            : mode === 'opaque'
              ? 'prefix' + value
              : value;
        },
        regExp: /$^/,
        type: 'text-match',
      };
      const written = editor.read(() =>
        $convertToMarkdownString([custom, ...TRANSFORMERS]),
      );
      expect(formatProjection(written)).toEqual([
        '1:a',
        ...(mode === 'opaque' ? Array.from('prefix', char => `0:${char}`) : []),
        '1:b',
        ...(mode === 'repeat' ? ['1:b'] : []),
        '0:c',
      ]);
      expect(calls).toEqual(
        mode === 'children' || mode === 'decline'
          ? ['a', 'b', 'c']
          : ['a', 'c'],
      );
    },
  );

  it('delegates repetitions of a combined callback sequence', () => {
    for (const left of [0, 1, 2, 3])
      for (const right of [0, 1, 2, 3]) {
        const editor = createTestEditor();
        editor.update(
          () =>
            $getRoot().append(
              $createParagraphNode().append(
                $createMarkNode(['group']).append(
                  $createMarkNode(['left']).append(
                    $createTextNode('a').setFormat(left),
                  ),
                  $createMarkNode(['right']).append(
                    $createTextNode('b').setFormat(right),
                  ),
                ),
              ),
            ),
          {discrete: true},
        );
        const calls: string[] = [];
        const custom: TextMatchTransformer = {
          dependencies: [],
          export(node, children) {
            if ($isTextNode(node)) calls.push(node.getTextContent());
            if (!(node instanceof MarkNode) || node.getIDs()[0] !== 'group')
              return null;
            const value = node
              .getChildren()
              .map(child => {
                assert($isElementNode(child));
                return children(child);
              })
              .join('');
            return value + value;
          },
          regExp: /$^/,
          type: 'text-match',
        };
        const written = editor.read(() =>
          $convertToMarkdownString([custom, ...TRANSFORMERS]),
        );
        expect(
          formatProjection(written),
          JSON.stringify({left, right, written}),
        ).toEqual([`${left}:a`, `${right}:b`, `${left}:a`, `${right}:b`]);
        expect(calls).toEqual(['a', 'b']);
      }
  });

  it.each(['format', 'children', 'decline', 'concatenate'])(
    'preserves generated custom callback transitions: %s',
    mode => {
      for (const left of [0, 1, 2, 3, 16, 17, 18, 19])
        for (const right of [0, 1, 2, 3, 16, 17, 18, 19])
          for (const values of [
            ['a', 'b'],
            ['!', 'b'],
            ['a', '!'],
          ]) {
            const editor = createTestEditor();
            editor.update(
              () =>
                $getRoot().append(
                  $createParagraphNode().append(
                    $createTextNode(values[0])
                      .setFormat(left)
                      .setStyle('order: 0'),
                    $createMarkNode(['custom']).append(
                      $createTextNode(values[1])
                        .setFormat(right)
                        .setStyle('order: 1'),
                      ...(mode === 'concatenate'
                        ? [
                            $createTextNode('c')
                              .setFormat(left)
                              .setStyle('order: 2'),
                          ]
                        : []),
                    ),
                    $createTextNode('d').setFormat(right).setStyle('order: 3'),
                  ),
                ),
              {discrete: true},
            );
            const calls: string[] = [];
            const custom: TextMatchTransformer = {
              dependencies: [],
              export(node, children, format) {
                if ($isTextNode(node)) calls.push(node.getTextContent());
                if (!(node instanceof MarkNode)) return null;
                if (mode === 'format') {
                  const text = node.getFirstChildOrThrow();
                  assert($isTextNode(text));
                  return format(text, text.getTextContent());
                }
                if (mode === 'concatenate')
                  return node
                    .getChildren()
                    .map(text => {
                      assert($isTextNode(text));
                      return format(text, text.getTextContent());
                    })
                    .join('');
                const result = children(node);
                return mode === 'decline' ? null : result;
              },
              regExp: /$^/,
              type: 'text-match',
            };
            const written = editor.read(() =>
              $convertToMarkdownString([custom, ...TRANSFORMERS]),
            );
            expect(
              formatProjection(written),
              JSON.stringify({left, mode, right, values, written}),
            ).toEqual([
              ...Array.from(values[0], char => `${left}:${char}`),
              ...Array.from(values[1], char => `${right}:${char}`),
              ...(mode === 'concatenate' ? [`${left}:c`] : []),
              `${right}:d`,
            ]);
            expect(calls).toEqual(
              mode === 'children' || mode === 'decline'
                ? [values[0], values[1], 'd']
                : [values[0], 'd'],
            );
          }
    },
  );

  it.each([0, 1, 2])(
    'preserves generated four-run sequences (wrapper pattern: %s)',
    wrapper => {
      for (const values of [
        ['a', 'b', 'c', 'd'],
        ['<', 'b', '>', 'x'],
        ['&', '#', '6', '0;'],
        ['©', '!', '∑', '$'],
      ]) {
        for (let sequence = 0; sequence < 256; sequence++)
          for (const withCode of [false, true]) {
            const formats = [0, 1, 2, 3].map(
              index =>
                ((sequence >> (index * 2)) & 3) |
                (withCode && (sequence + index) % 3 === 0 ? 16 : 0),
            );
            const editor = createTestEditor();
            editor.update(
              () => {
                const nodes = values.map((text, index) =>
                  $createTextNode(text)
                    .setFormat(formats[index])
                    .setStyle(`order: ${index}`),
                );
                const children =
                  wrapper === 0
                    ? nodes
                    : wrapper === 1
                      ? nodes.map((node, index) =>
                          $createMarkNode([String(index)]).append(node),
                        )
                      : [
                          $createMarkNode(['group']).append(nodes[0], nodes[1]),
                          nodes[2],
                          $createMarkNode(['tail']).append(nodes[3]),
                        ];
                $getRoot().append($createParagraphNode().append(...children));
              },
              {discrete: true},
            );
            const written = editor.read(() => $convertToMarkdownString());
            expect(
              formatProjection(written),
              JSON.stringify({formats, values, written}),
            ).toEqual(
              values.flatMap((value, index) =>
                Array.from(value, char => `${formats[index]}:${char}`),
              ),
            );
          }
      }
    },
    30000,
  );

  it('keeps hard-break structure through split, join, history and JSON', () => {
    const editor = createTestEditor();
    const unregister = registerHistory(editor, createEmptyHistoryState(), 0);
    try {
      const original = 'foo\\\nbar\nbaz';
      editor.update(
        () =>
          $convertFromMarkdownString(original, TRANSFORMERS, undefined, true),
        {discrete: true, tag: HISTORY_PUSH_TAG},
      );
      editor.update(
        () => {
          const text = $getRoot()
            .getAllTextNodes()
            .find(node => node.getTextContent() === 'bar');
          assert(text);
          text.select(1, 1);
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.insertParagraph();
        },
        {discrete: true, tag: HISTORY_PUSH_TAG},
      );
      const split = 'foo\\\nb\nar\nbaz';
      expect(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, true),
        ),
      ).toBe(split);
      editor.update(
        () => {
          const text = $getRoot()
            .getAllTextNodes()
            .find(node => node.getTextContent() === 'ar');
          assert(text);
          text.select(0, 0);
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.deleteCharacter(true);
        },
        {discrete: true, tag: HISTORY_PUSH_TAG},
      );
      expect(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, true),
        ),
      ).toBe(original);
      editor.update(() => editor.dispatchCommand(UNDO_COMMAND, undefined), {
        discrete: true,
      });
      expect(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, true),
        ),
      ).toBe(split);
      editor.update(() => editor.dispatchCommand(REDO_COMMAND, undefined), {
        discrete: true,
      });
      expect(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, true),
        ),
      ).toBe(original);
      editor.setEditorState(
        editor.parseEditorState(
          JSON.stringify(editor.getEditorState().toJSON()),
        ),
      );
      expect(
        editor.read(() =>
          $convertToMarkdownString(TRANSFORMERS, undefined, true),
        ),
      ).toBe(original);
    } finally {
      unregister();
    }
  });

  it.each([false, true])(
    'uses emitted neighbours for three formatted runs (wrappers: %s)',
    wrappers => {
      for (const values of [
        ['a', 'b', 'c'],
        ['<', 'b', '>'],
        ['&', '#', '60;'],
        ['😀', '!', '€'],
      ]) {
        for (const left of [0, 1, 2, 3, 16, 17, 18, 19])
          for (const middle of [0, 1, 2, 3, 16, 17, 18, 19])
            for (const right of [0, 1, 2, 3, 16, 17, 18, 19]) {
              const formats = [left, middle, right];
              const editor = createTestEditor();
              editor.update(
                () =>
                  $getRoot().append(
                    $createParagraphNode().append(
                      ...values.map((value, index) => {
                        const text = $createTextNode(value)
                          .setFormat(formats[index])
                          .setStyle(`order: ${index}`);
                        return wrappers
                          ? $createMarkNode([String(index)]).append(text)
                          : text;
                      }),
                    ),
                  ),
                {discrete: true},
              );
              const written = editor.read(() => $convertToMarkdownString());
              expect(
                formatProjection(written),
                JSON.stringify({formats, values, written}),
              ).toEqual(
                values.flatMap((value, index) =>
                  Array.from(value, char => `${formats[index]}:${char}`),
                ),
              );
            }
      }
    },
  );

  it('ignores an omitted formatted node when choosing delimiters', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a'),
            $createTextNode('omitted')
              .toggleFormat('bold')
              .setStyle('color: red'),
            $createTextNode('c').toggleFormat('bold'),
          ),
        ),
      {discrete: true},
    );
    const custom: TextMatchTransformer = {
      dependencies: [],
      export: node =>
        $isTextNode(node) && node.getTextContent() === 'omitted' ? '' : null,
      regExp: /$^/,
      type: 'text-match',
    };
    expect(
      formatProjection(
        editor.read(() => $convertToMarkdownString([custom, ...TRANSFORMERS])),
      ),
    ).toEqual(['0:a', '1:c']);
  });

  it.each([
    {formats: [1, 2, 18]},
    {formats: [2, 1, 17]},
    {formats: [3, 2, 18]},
  ])(
    'reimports disjoint formatting before code with formats %j',
    ({formats}) => {
      for (const values of [
        ['a', 'b', 'c'],
        ['!', 'x', '!'],
        ['<', 'b', '>'],
      ]) {
        const editor = createTestEditor();
        editor.update(
          () =>
            $getRoot().append(
              $createParagraphNode().append(
                ...values.map((value, index) =>
                  $createTextNode(value)
                    .setFormat(formats[index])
                    .setStyle(`order: ${index}`),
                ),
              ),
            ),
          {discrete: true},
        );
        const expected = values.flatMap((value, index) =>
          Array.from(value, char => `${formats[index]}:${char}`),
        );
        for (let round = 0; round < 3; round++) {
          const written = editor.read(() => $convertToMarkdownString());
          expect(
            formatProjection(written),
            JSON.stringify({formats, values, written}),
          ).toEqual(expected);
          editor.update(() => $convertFromMarkdownString(written), {
            discrete: true,
          });
          expect(
            editor.read(() =>
              $getRoot()
                .getAllTextNodes()
                .flatMap(node =>
                  Array.from(
                    node.getTextContent(),
                    char => `${node.getFormat()}:${char}`,
                  ),
                ),
            ),
          ).toEqual(expected);
        }
      }
    },
  );

  it('reimports code beside escaped backtick runs across formatting boundaries', () => {
    for (let slashes = 0; slashes < 4; slashes++)
      for (let ticks = 1; ticks < 4; ticks++)
        for (const format of [0, 1, 2, 3])
          for (const codeFormat of [16, 17, 18, 19])
            for (const content of ['b', '`b', 'b`', '`b`', '``b', 'b\\', '\\b'])
              for (const codeFirst of [false, true]) {
                const editor = createTestEditor();
                const prefix =
                  (codeFirst ? '' : 'a') +
                  '\\'.repeat(slashes) +
                  '`'.repeat(ticks);
                editor.update(
                  () =>
                    $getRoot().append(
                      $createParagraphNode().append(
                        // Keep this inline control distinct from CODE's legacy
                        // single-line triple-fence block syntax at line start.
                        $createTextNode('z'),
                        ...(codeFirst
                          ? [
                              $createTextNode(content).setFormat(codeFormat),
                              $createTextNode(prefix).setFormat(format),
                            ]
                          : [
                              $createTextNode(prefix).setFormat(format),
                              $createTextNode(content).setFormat(codeFormat),
                            ]),
                      ),
                    ),
                  {discrete: true},
                );
                const plainProjection = Array.from(
                  prefix,
                  char => `${format}:${char}`,
                );
                const codeProjection = Array.from(
                  content,
                  char => `${codeFormat}:${char}`,
                );
                const expected = codeFirst
                  ? ['0:z', ...codeProjection, ...plainProjection]
                  : ['0:z', ...plainProjection, ...codeProjection];
                for (let round = 0; round < 3; round++) {
                  const written = editor.read(() => $convertToMarkdownString());
                  expect(
                    formatProjection(written),
                    JSON.stringify({
                      codeFirst,
                      codeFormat,
                      content,
                      format,
                      prefix,
                      written,
                    }),
                  ).toEqual(expected);
                  editor.update(() => $convertFromMarkdownString(written), {
                    discrete: true,
                  });
                  expect(
                    editor.read(() =>
                      $getRoot()
                        .getAllTextNodes()
                        .flatMap(node =>
                          Array.from(
                            node.getTextContent(),
                            char => `${node.getFormat()}:${char}`,
                          ),
                        ),
                    ),
                    JSON.stringify({
                      codeFirst,
                      codeFormat,
                      content,
                      format,
                      prefix,
                      written,
                    }),
                  ).toEqual(expected);
                }
              }
  }, 30000);

  it('review regression: preserves three overlapping format runs', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a').setFormat(3),
            $createTextNode('b').setFormat(1),
            $createTextNode('c').setFormat(2),
          ),
        ),
      {discrete: true},
    );
    expect(
      formatProjection(editor.read(() => $convertToMarkdownString())),
    ).toEqual(['3:a', '1:b', '2:c']);
  });

  it.each(['# foo\\\nbar', 'foo\\\n\nbar', '- foo\\\n- bar'])(
    'review regression: retains literal backslashes at block boundaries: %j',
    markdown => {
      const editor = createTestEditor();
      editor.update(
        () =>
          $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true),
        {discrete: true},
      );
      const written = editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      );
      expect(parse(written)).toEqual(parse(markdown));
    },
  );

  it('review regression: deleting a break does not transfer it to the following boundary', () => {
    const editor = createTestEditor();
    const markdown = 'foo\\\nbar\nbaz';
    editor.update(
      () => $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true),
      {discrete: true},
    );
    const snapshot = editor.getEditorState();
    editor.update(
      () => {
        const text = $getRoot()
          .getAllTextNodes()
          .find(node => node.getTextContent() === 'bar');
        assert(text);
        text.select(0, 0);
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        selection.deleteCharacter(true);
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
    ).toBe('foobar\nbaz');
    editor.setEditorState(snapshot);
    expect(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
    ).toBe(markdown);
  });

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

  it('exports a partially selected heading through custom exporters once', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const text = $createTextNode('abc');
        $getRoot().append($createHeadingNode('h1').append(text));
        text.select(1, 2);
      },
      {discrete: true},
    );
    const calls: string[] = [];
    const custom: TextMatchTransformer = {
      dependencies: [],
      export(node) {
        if ($isTextNode(node)) calls.push(node.getTextContent());
        return null;
      },
      regExp: /$^/,
      type: 'text-match',
    };
    expect(
      editor.read(() =>
        $convertSelectionToMarkdownString(
          [custom, ...TRANSFORMERS],
          $getSelection(),
        ),
      ),
    ).toBe('# b');
    expect(calls).toEqual(['abc']);
  });

  it.each([false, true])(
    'shares block child export previews across declining inspectors (selection: %s)',
    selected => {
      const editor = createTestEditor();
      editor.update(
        () => {
          const text = $createTextNode('abc');
          $getRoot().append($createHeadingNode('h1').append(text));
          if (selected) text.select(1, 2);
        },
        {discrete: true},
      );
      const calls: string[] = [];
      const custom: TextMatchTransformer = {
        dependencies: [],
        export(node) {
          if ($isTextNode(node)) calls.push(node.getTextContent());
          return null;
        },
        regExp: /$^/,
        type: 'text-match',
      };
      const inspector: ElementTransformer = {
        dependencies: [],
        export(node, children) {
          if (node instanceof HeadingNode) children(node);
          return null;
        },
        regExp: /$^/,
        replace() {},
        type: 'element',
      };
      const transformers = [inspector, {...inspector}, custom, ...TRANSFORMERS];
      const written = editor.read(() =>
        selected
          ? $convertSelectionToMarkdownString(transformers, $getSelection())
          : $convertToMarkdownString(transformers),
      );
      expect(written).toBe(selected ? '# b' : '# abc');
      expect(calls).toEqual(['abc']);
    },
  );

  it.each([false, true])(
    'shares child export previews across declining inspectors (selection: %s)',
    selected => {
      const editor = createTestEditor();
      editor.update(
        () => {
          const text = $createTextNode('abc');
          $getRoot().append(
            $createParagraphNode().append(
              $createMarkNode(['outer']).append(
                $createMarkNode(['inner']).append(text),
              ),
            ),
          );
          if (selected) text.select(1, 2);
        },
        {discrete: true},
      );
      const calls: string[] = [];
      const custom: TextMatchTransformer = {
        dependencies: [],
        export(node) {
          if ($isTextNode(node)) calls.push(node.getTextContent());
          return null;
        },
        regExp: /$^/,
        type: 'text-match',
      };
      const inspector: TextMatchTransformer = {
        dependencies: [],
        export(node, children) {
          if (node instanceof MarkNode) children(node);
          return null;
        },
        regExp: /$^/,
        type: 'text-match',
      };
      const transformers = [inspector, {...inspector}, custom, ...TRANSFORMERS];
      const written = editor.read(() =>
        selected
          ? $convertSelectionToMarkdownString(transformers, $getSelection())
          : $convertToMarkdownString(transformers),
      );
      expect(written).toBe(selected ? 'b' : 'abc');
      expect(calls).toEqual(['abc']);
    },
  );

  it.each([false, true])(
    'shares classification for overlapping child previews (subset first: %s)',
    subsetFirst => {
      const editor = createTestEditor();
      editor.update(
        () =>
          $getRoot().append(
            $createParagraphNode().append(
              $createMarkNode(['group']).append(
                $createMarkNode(['subset']).append($createTextNode('b')),
                $createTextNode('c'),
              ),
            ),
          ),
        {discrete: true},
      );
      const calls: string[] = [];
      const custom: TextMatchTransformer = {
        dependencies: [],
        export(node, children) {
          if ($isTextNode(node)) calls.push(node.getTextContent());
          if (!(node instanceof MarkNode) || node.getIDs()[0] !== 'group')
            return null;
          const subset = node.getFirstChildOrThrow();
          assert(subset instanceof MarkNode);
          if (subsetFirst) children(subset);
          const whole = children(node);
          if (!subsetFirst) children(subset);
          return whole;
        },
        regExp: /$^/,
        type: 'text-match',
      };
      expect(
        editor.read(() => $convertToMarkdownString([custom, ...TRANSFORMERS])),
      ).toBe('bc');
      expect(calls).toEqual(['b', 'c']);
    },
  );

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

  it('keeps hard-break nodes through copying, text edits, JSON, deletion and selection', () => {
    const editor = createTestEditor();
    editor.update(
      () =>
        $convertFromMarkdownString(
          'foo\\\nbar\nbaz',
          TRANSFORMERS,
          undefined,
          true,
        ),
      {discrete: true},
    );
    editor.update(
      () => {
        const first = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(first));
        const clone = $copyNode(first);
        clone.append(...first.getChildren().map(child => $copyNode(child)));
        first.replace(clone);
        const text = clone.getFirstChildOrThrow();
        assert($isTextNode(text));
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
    ).toBe('foo\\<b>\\\nbar\nbaz');
    editor.update(
      () => {
        const first = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(first));
        const text = first.getFirstChildOrThrow();
        assert($isTextNode(text));
        text.select(0, 6);
      },
      {discrete: true},
    );
    expectLiteral(
      editor.read(() =>
        $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection(), true),
      ),
      'foo<b>',
    );
    editor.update(
      () => {
        const first = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(first));
        first.getChildAtIndex(1)?.remove();
        $getRoot().getLastChildOrThrow().remove();
      },
      {discrete: true},
    );
    expectLiteral(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
      'foo<b>bar',
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
