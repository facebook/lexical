/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {HeadingNode} from '@lexical/rich-text';
import type {ElementNode, LexicalEditor, TextNode} from 'lexical';

import {buildEditorFromExtensions} from '@lexical/extension';
import {LinkNode} from '@lexical/link';
import {ListNode} from '@lexical/list';
import {TableNode} from '@lexical/table';
import {$getRoot, defineExtension} from 'lexical';
import {describe, expect, it, onTestFinished} from 'vitest';

import {
  $convertFromMarkdownStringViaExtension,
  $convertToMarkdownStringViaExtension,
  MdastCommonMarkExtension,
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
      $convertFromMarkdownStringViaExtension(markdown);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownStringViaExtension());
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
        $convertFromMarkdownStringViaExtension('# Hello *world*');
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
        $convertFromMarkdownStringViaExtension('- a\n- b\n  - b1\n  - b2\n- c');
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

  it('imports an autolink literal (gfm) as a link', () => {
    const editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownStringViaExtension('see https://lexical.dev today');
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
          $convertFromMarkdownStringViaExtension(
            '| h1 | h2 |\n| - | - |\n| a | b |',
          );
        },
        {discrete: true},
      );
      editor.read(() => {
        const table = $getRoot().getFirstChild() as TableNode;
        expect(table.getType()).toBe('table');
        expect(table.getChildrenSize()).toBe(2);
      });
    });
  });
});
