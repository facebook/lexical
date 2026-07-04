/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {HeadingNode, QuoteNode} from '@lexical/rich-text';
import type {ElementNode, LexicalEditor, TextNode} from 'lexical';

import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {LinkNode} from '@lexical/link';
import {ListNode} from '@lexical/list';
import {TableNode} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {describe, expect, it, onTestFinished} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastShadowRootQuoteExtension,
  MdastTableExtension,
} from '../../index';

function createEditor(withTable = false): LexicalEditor {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: withTable
        ? [MdastCommonMarkExtension, MdastTableExtension]
        : [MdastCommonMarkExtension],
      name: '[root]',
    }),
  );
  onTestFinished(() => editor.dispose());
  return editor;
}

function importExport(markdown: string, withTable = false): string {
  const editor = createEditor(withTable);
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
    const editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('# Hello *world*');
      },
      {discrete: true},
    );
    editor.read(() => {
      const heading = $getRoot().getFirstChild() as HeadingNode;
      expect(heading.getType()).toBe('heading');
      expect(heading.getTag()).toBe('h1');
      expect(heading.getTextContent()).toBe('Hello world');
      const children = heading.getChildren();
      // "Hello " (plain) + "world" (italic)
      expect(children).toHaveLength(2);
      expect((children[1] as TextNode).getFormat()).not.toBe(0);
    });
  });

  it('imports nested unordered lists', () => {
    const editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('- a\n- b\n  - b1\n  - b2\n- c');
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect(list.getType()).toBe('list');
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

  it('imports an autolink literal (gfm) as a link', () => {
    const editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('see https://lexical.dev today');
      },
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $getRoot().getFirstChild() as ElementNode;
      const links = paragraph.getChildren().filter(n => n.getType() === 'link');
      expect(links).toHaveLength(1);
      expect((links[0] as LinkNode).getURL()).toBe('https://lexical.dev');
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
      const editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| h1 | h2 |\n| - | - |\n| a | b |');
        },
        {discrete: true},
      );
      editor.read(() => {
        const table = $getRoot().getFirstChild() as TableNode;
        expect(table.getType()).toBe('table');
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
      const editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| foo |');
          const table = $getRoot().getFirstChild() as TableNode;
          const lastRow = table.getLastChild() as ElementNode;
          const cell = lastRow.getFirstChild() as ElementNode;
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
    function shadowQuoteEditor(): LexicalEditor {
      const editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastShadowRootQuoteExtension,
          ],
          name: '[root]',
        }),
      );
      onTestFinished(() => editor.dispose());
      return editor;
    }

    function shadowImportExport(markdown: string): string {
      const editor = shadowQuoteEditor();
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
      const editor = shadowQuoteEditor();
      editor.update(
        () => {
          $convertFromMarkdownString('> para one\n>\n> - a\n> - b');
        },
        {discrete: true},
      );
      editor.read(() => {
        const quote = $getRoot().getFirstChild() as QuoteNode;
        expect(quote.getType()).toBe('quote');
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
    const editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString('foo\tbar');
      },
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $getRoot().getFirstChild() as ElementNode;
      const types = paragraph.getChildren().map(n => n.getType());
      expect(types).toEqual(['text', 'tab', 'text']);
    });
  });

  it('tolerates explicitly-undefined config keys in configExtension', () => {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          configExtension(MdastExtension, {
            importRules: undefined,
            mdastExtensions: undefined,
          }),
        ],
        name: '[root]',
      }),
    );
    onTestFinished(() => editor.dispose());
    editor.update(
      () => {
        $convertFromMarkdownString('# Still works');
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe('# Still works');
  });
});
