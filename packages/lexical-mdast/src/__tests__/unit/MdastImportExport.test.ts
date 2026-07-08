/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$isLinkNode} from '@lexical/link';
import {$isListNode} from '@lexical/list';
import {$isHeadingNode, $isQuoteNode} from '@lexical/rich-text';
import {$isTableNode} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertFromMdast,
  $convertToMarkdownString,
  $convertToMdast,
  $generateNodesFromMarkdownString,
  MdastAutolinkLiteralExtension,
  MdastCommonMarkExtension,
  MdastExportExtension,
  MdastHeadingExtension,
  MdastImportExtension,
  MdastShadowRootQuoteExtension,
  MdastStrikethroughExtension,
  MdastTableExtension,
  MdastTaskListExtension,
} from '../../index';
import {$assertNodeType} from './utils';

function createEditor(withTable = false): LexicalEditorWithDispose {
  // The caller is responsible for disposal (with `using`).
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        // GFM constructs under test that aren't part of CommonMark.
        MdastStrikethroughExtension,
        MdastTaskListExtension,
        MdastExportExtension,
        ...(withTable ? [MdastTableExtension] : []),
      ],
      name: '[root]',
    }),
  );
}

function importExport(markdown: string, withTable = false): string {
  using editor = createEditor(withTable);
  editor.update(
    () => {
      $convertFromMarkdownString(markdown);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString());
}

describe('@lexical/mdast import/export', () => {
  describe('round-trips simple constructs', () => {
    const cases: [string, string][] = [
      ['paragraph', 'Hello world'],
      ['heading h1', '# Heading one'],
      ['heading h3', '### Heading three'],
      ['bold', '**bold**'],
      ['italic', '*italic*'],
      ['bold italic', '***both***'],
      ['inline code', '`code()`'],
      ['strikethrough (gfm)', '~~gone~~'],
      ['mixed inline', 'a **b** c *d* e `f`'],
      ['link', '[lexical](https://lexical.dev)'],
      ['link with title', '[lexical](https://lexical.dev "the title")'],
      ['blockquote', '> quoted text'],
      ['unordered list', '- one\n- two\n- three'],
      ['ordered list', '1. one\n2. two\n3. three'],
      ['task list', '- [x] done\n- [ ] todo'],
      ['soft line break in a paragraph', 'line one\nline two'],
      ['soft line break in a blockquote', '> line one\n> line two'],
      ['soft line break in a list item', '- line one\n  line two'],
      ['thematic break (dashes)', '---'],
      ['thematic break (stars)', '***'],
      ['thematic break (underscores)', '___'],
      ['autolink', '<https://example.com>'],
    ];
    for (const [name, markdown] of cases) {
      it(name, () => {
        expect(importExport(markdown)).toBe(markdown);
      });
    }
  });

  it('round-trips an ordered list with a custom start', () => {
    expect(importExport('5. five\n6. six')).toBe('5. five\n6. six');
  });

  it('round-trips a fenced code block with a language', () => {
    const markdown = '```js\nconst x = 1;\n```';
    expect(importExport(markdown)).toBe(markdown);
  });

  it('round-trips a multi-line fenced code block', () => {
    const markdown = '```\nline 1\nline 2\nline 3\n```';
    expect(importExport(markdown)).toBe(markdown);
  });

  it('imports a heading with inline formatting into the right structure', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('# Hello *world*');
      },
      {discrete: true},
    );
    editor.read(() => {
      const heading = $assertNodeType(
        $getRoot().getFirstChild(),
        $isHeadingNode,
      );
      expect(heading.getTag()).toBe('h1');
      expect(heading.getTextContent()).toBe('Hello world');
      const children = heading.getChildren();
      // "Hello " (plain) + "world" (italic)
      expect(children).toHaveLength(2);
      expect($assertNodeType(children[1], $isTextNode).getFormat()).not.toBe(0);
    });
  });

  it('imports nested unordered lists', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('- a\n- b\n  - b1\n  - b2\n- c');
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
      expect(list.getListType()).toBe('bullet');
      // a, b, (nested list wrapper), c
      expect(list.getChildrenSize()).toBe(4);
    });
  });

  it('keeps blank lines as paragraph separators (not empty paragraphs)', () => {
    expect(importExport('first\n\nsecond')).toBe('first\n\nsecond');
  });

  describe('preserves the original Markdown syntax', () => {
    const cases: [string, string][] = [
      ['star bullets', '* one\n* two'],
      ['plus bullets', '+ one\n+ two'],
      ['ordered list with ) delimiter', '1) one\n2) two'],
      ['tilde code fence', '~~~\ncode\n~~~'],
      ['tilde fence with language', '~~~js\nconst x = 1;\n~~~'],
      ['fence info-string meta', '```js title=x\nconst x = 1;\n```'],
      ['tilde fence with meta', '~~~python linenos\nprint(1)\n~~~'],
      ['backslash hard break', 'line one\\\nline two'],
      ['two-space hard break', 'line one  \nline two'],
      ['underscore italic', '_em_'],
      ['underscore bold', '__strong__'],
      ['underscore bold italic', '___both___'],
      ['underscore emphasis throughout', '_a_ and __b__ and _c_'],
      ['inline link whose text is its URL', '[https://a.dev](https://a.dev)'],
      ['setext h1', 'Title\n====='],
      ['setext h2', 'Title\n-----'],
      ['hard break inside a blockquote', '> line one\\\n> line two'],
      ['paragraph boundary inside a blockquote', '> para one\n>\n> para two'],
      ['hard break inside a list item', '- line one\\\n  line two'],
    ];
    for (const [name, markdown] of cases) {
      it(name, () => {
        expect(importExport(markdown)).toBe(markdown);
      });
    }

    it('keeps distinct bullet styles on different lists', () => {
      const markdown = '* a\n* b\n\n1. c\n\n- d\n- e';
      expect(importExport(markdown)).toBe(markdown);
    });

    it('keeps setext style when the content starts with #', () => {
      // `#foo\n====` is a setext h1 (no space after `#`, so not ATX). The
      // exporter escapes the leading `#` to keep it unambiguous, but the
      // heading must stay setext and the round-trip must be stable.
      const out = importExport('#foo\n====');
      expect(out).toMatch(/^\\?#foo\n=+$/);
      expect(importExport(out)).toBe(out);
    });

    it('normalizes mixed emphasis markers to the document delimiter', () => {
      // Emphasis/strong delimiters are document-level, so the first one wins.
      expect(importExport('_a_ and *b*')).toBe('_a_ and _b_');
      const out = importExport('_a_ and *b*');
      expect(importExport(out)).toBe(out); // and is stable
    });
  });

  it('round-trips autolink literals without normalizing to <...>', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastAutolinkLiteralExtension,
          MdastExportExtension,
        ],
        name: '[root]',
      }),
    );
    const roundTrip = (markdown: string): string => {
      editor.update(
        () => {
          $convertFromMarkdownString(markdown);
        },
        {discrete: true},
      );
      return editor.read(() => $convertToMarkdownString());
    };
    for (const markdown of [
      'see https://lexical.dev today',
      'visit www.example.com now',
      // A CommonMark autolink stays wrapped even with the literal grammar on.
      'wrapped <https://lexical.dev> stays',
    ]) {
      expect(roundTrip(markdown)).toBe(markdown);
    }
  });

  describe('mdast tree interop', () => {
    it('$convertToMdast exposes the mdast tree before serialization', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $convertFromMarkdownString('# Title\n\nSome *emphasis* here');
        },
        {discrete: true},
      );
      const tree = editor.read(() => $convertToMdast());
      expect(tree.type).toBe('root');
      expect(tree.children.map(child => child.type)).toEqual([
        'heading',
        'paragraph',
      ]);
      const heading = tree.children[0] as {depth: number};
      expect(heading.depth).toBe(1);
      const paragraph = tree.children[1] as {
        children: {type: string}[];
      };
      expect(paragraph.children.map(child => child.type)).toEqual([
        'text',
        'emphasis',
        'text',
      ]);
    });

    it('$convertFromMdast imports a programmatically-built tree', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $convertFromMdast({
            children: [
              {
                children: [{type: 'text', value: 'Built'}],
                depth: 2,
                type: 'heading',
              },
              {
                children: [{type: 'text', value: 'by hand'}],
                type: 'paragraph',
              },
            ],
            type: 'root',
          });
        },
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '## Built\n\nby hand',
      );
    });

    it('round-trips editor -> tree -> editor', () => {
      const markdown = '# Title\n\n- one\n- two\n\n> quoted';
      using source = createEditor();
      source.update(
        () => {
          $convertFromMarkdownString(markdown);
        },
        {discrete: true},
      );
      const tree = source.read(() => $convertToMdast());
      using target = createEditor();
      target.update(
        () => {
          $convertFromMdast(tree);
        },
        {discrete: true},
      );
      expect(target.read(() => $convertToMarkdownString())).toBe(markdown);
    });
  });

  it('applies contributed document-level toMarkdown options', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastExportExtension,
          configExtension(MdastImportExtension, {
            toMarkdownExtensions: [{bullet: '+'}],
          }),
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        // Imported via tree (no source), so no per-node bullet is recorded
        // and the document-level option decides.
        $convertFromMdast({
          children: [
            {
              children: [
                {
                  checked: null,
                  children: [
                    {
                      children: [{type: 'text', value: 'one'}],
                      type: 'paragraph',
                    },
                  ],
                  spread: false,
                  type: 'listItem',
                },
              ],
              ordered: false,
              spread: false,
              type: 'list',
            },
          ],
          type: 'root',
        });
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe('+ one');
  });

  it('$generateNodesFromMarkdownString returns detached nodes without touching the document', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('existing content');
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const nodes = $generateNodesFromMarkdownString('# Title\n\n- a\n- b');
        expect(nodes).toHaveLength(2);
        $assertNodeType(nodes[0], $isHeadingNode);
        $assertNodeType(nodes[1], $isListNode);
        expect(nodes[0].isAttached()).toBe(false);
        // The document is untouched by generation.
        expect($getRoot().getTextContent()).toBe('existing content');
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      'existing content',
    );
  });

  it('generated nodes can be inserted at an arbitrary position', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('before\n\nafter');
      },
      {discrete: true},
    );
    editor.update(
      () => {
        // Insert at an empty paragraph between the two existing blocks
        // (insertNodes at a text caret would merge inline content instead).
        const first = $assertNodeType(
          $getRoot().getFirstChild(),
          $isElementNode,
        );
        const target = $createParagraphNode();
        first.insertAfter(target);
        target.select();
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        selection.insertNodes(
          $generateNodesFromMarkdownString('> quoted **insert**'),
        );
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      'before\n\n> quoted **insert**\n\nafter',
    );
  });

  it('unwraps constructs the editor has no extension for', () => {
    // Headings only — no blockquote extension. `> quote` imports as its
    // children (a paragraph) instead of corrupting or dropping content.
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastHeadingExtension, MdastExportExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString('# Title\n\n> quoted text');
      },
      {discrete: true},
    );
    editor.read(() => {
      const types = $getRoot()
        .getChildren()
        .map(n => n.getType());
      expect(types).toEqual(['heading', 'paragraph']);
    });
    expect(editor.read(() => $convertToMarkdownString())).toBe(
      '# Title\n\nquoted text',
    );
  });

  it('imports an autolink literal (gfm) as a link', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastCommonMarkExtension, MdastAutolinkLiteralExtension],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString('see https://lexical.dev today');
      },
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $assertNodeType(
        $getRoot().getFirstChild(),
        $isElementNode,
      );
      const links = paragraph.getChildren().filter($isLinkNode);
      expect(links).toHaveLength(1);
      expect(links[0].getURL()).toBe('https://lexical.dev');
    });
  });

  it('is idempotent for a complex document', () => {
    const markdown = [
      '# Title',
      '',
      'A paragraph with **bold**, *italic* and `code`.',
      '',
      '> A quote',
      '',
      '- list a',
      '- list b',
      '',
      '1. one',
      '2. two',
      '',
      '```ts',
      'type X = number;',
      '```',
    ].join('\n');
    const once = importExport(markdown);
    const twice = importExport(once);
    expect(twice).toBe(once);
  });

  describe('with MdastTableExtension', () => {
    it('round-trips a GFM table', () => {
      const markdown = [
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '| 3 | 4 |',
      ].join('\n');
      const out = importExport(markdown, true);
      // Re-import to confirm the structure is stable.
      expect(importExport(out, true)).toBe(out);
      expect(out).toContain('| a | b |');
      expect(out).toContain('| 1 | 2 |');
    });

    it('imports a table into @lexical/table nodes', () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| h1 | h2 |\n| - | - |\n| a | b |');
        },
        {discrete: true},
      );
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        expect(table.getChildrenSize()).toBe(2);
      });
    });

    it('preserves column alignment', () => {
      const markdown = '| a | b | c |\n| :- | :-: | -: |\n| 1 | 2 | 3 |';
      const out = importExport(markdown, true);
      expect(out).toContain(':-');
      expect(out).toContain(':-:');
      expect(out).toContain('-:');
      expect(importExport(out, true)).toBe(out);
    });

    it('joins multi-paragraph cells instead of fusing their text', () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| foo |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const lastRow = $assertNodeType(table.getLastChild(), $isElementNode);
          const cell = $assertNodeType(lastRow.getFirstChild(), $isElementNode);
          const extra = $createParagraphNode();
          extra.append($createTextNode('bar'));
          cell.append(extra);
        },
        {discrete: true},
      );
      const out = editor.read(() => $convertToMarkdownString());
      expect(out).toContain('| foo bar |');
    });
  });

  describe('with MdastShadowRootQuoteExtension', () => {
    function shadowQuoteEditor(): LexicalEditorWithDispose {
      // The caller is responsible for disposal (with `using`).
      return buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastExportExtension,
            MdastShadowRootQuoteExtension,
          ],
          name: '[root]',
        }),
      );
    }

    function shadowImportExport(markdown: string): string {
      using editor = shadowQuoteEditor();
      editor.update(
        () => {
          $convertFromMarkdownString(markdown);
        },
        {discrete: true},
      );
      return editor.read(() => $convertToMarkdownString());
    }

    const cases: [string, string][] = [
      ['simple quote', '> quoted text'],
      ['multi-paragraph quote', '> para one\n>\n> para two'],
      ['quote with a nested list', '> intro\n>\n> - a\n> - b'],
      ['quote with a code block', '> before\n>\n> ```\n> code\n> ```'],
      ['nested quote', '> outer\n>\n> > inner'],
      ['quote with a heading', '> # Title\n>\n> body'],
      ['soft break stays soft', '> line one\n> line two'],
      ['hard break stays hard', '> line one\\\n> line two'],
    ];
    for (const [name, markdown] of cases) {
      it(name, () => {
        expect(shadowImportExport(markdown)).toBe(markdown);
      });
    }

    it('imports the quote as a shadow root with block children', () => {
      using editor = shadowQuoteEditor();
      editor.update(
        () => {
          $convertFromMarkdownString('> para one\n>\n> - a\n> - b');
        },
        {discrete: true},
      );
      editor.read(() => {
        const quote = $assertNodeType($getRoot().getFirstChild(), $isQuoteNode);
        expect(quote.isShadowRoot()).toBe(true);
        const types = quote.getChildren().map(n => n.getType());
        expect(types).toEqual(['paragraph', 'list']);
      });
    });
  });

  describe('reference links', () => {
    it('resolves full references against definitions', () => {
      expect(importExport('[foo][bar]\n\n[bar]: https://example.com')).toBe(
        '[foo](https://example.com)',
      );
    });

    it('resolves collapsed and shortcut references', () => {
      expect(importExport('[foo][]\n\n[foo]: https://example.com')).toBe(
        '[foo](https://example.com)',
      );
      expect(importExport('[foo]\n\n[foo]: https://example.com')).toBe(
        '[foo](https://example.com)',
      );
    });

    it('resolves references with titles', () => {
      expect(
        importExport('[foo][bar]\n\n[bar]: https://example.com "the title"'),
      ).toBe('[foo](https://example.com "the title")');
    });

    it('keeps unresolved references as literal text', () => {
      const out = importExport('[foo][nope]');
      expect(out).toContain('foo');
      expect(out).not.toContain('](');
    });
  });

  it('imports tab characters as TabNodes', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('foo\tbar');
      },
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $assertNodeType(
        $getRoot().getFirstChild(),
        $isElementNode,
      );
      const types = paragraph.getChildren().map(n => n.getType());
      expect(types).toEqual(['text', 'tab', 'text']);
    });
  });

  it('tolerates explicitly-undefined config keys in configExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastExportExtension,
          configExtension(MdastImportExtension, {
            importRules: undefined,
            mdastExtensions: undefined,
          }),
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString('# Still works');
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe('# Still works');
  });
});
