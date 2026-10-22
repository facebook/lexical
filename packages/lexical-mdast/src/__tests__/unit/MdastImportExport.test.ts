/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import type {Table} from 'mdast';

import {$createCodeNode} from '@lexical/code-core';
import {
  $createHorizontalRuleNode,
  buildEditorFromExtensions,
  configExtension,
  HorizontalRuleNode,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $getImportContextValue,
  $getRenderContextValue,
  $withImportContext,
  contextValue,
  createImportState,
} from '@lexical/html';
import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode, $isListNode} from '@lexical/list';
import {
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableRowNode,
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getCaretRange,
  $getRoot,
  $getSelection,
  $getTextPointCaret,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  $setSelectionFromCaretRange,
  defineExtension,
  type ElementNode,
  type LexicalNode,
  TEXT_TYPE_TO_FORMAT,
  type TextNode,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {gfmTableFromMarkdown} from 'mdast-util-gfm-table';
import {
  defaultHandlers,
  type Handle,
  type Handlers,
} from 'mdast-util-to-markdown';
import {gfmTable} from 'micromark-extension-gfm-table';
import {assert, describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertFromMdast,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  $convertToMdast,
  $generateNodesFromMarkdownString,
  $generateNodesFromMdast,
  ImportContextMarkdown,
  MdastAutolinkLiteralExtension,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastHeadingExtension,
  MdastHorizontalRuleExtension,
  MdastHtmlExtension,
  type MdastNode,
  MdastRichTextExtension,
  MdastShadowRootQuoteExtension,
  MdastStrikethroughExtension,
  MdastTableExtension,
  MdastTaskListExtension,
  RenderContextMarkdownSelection,
} from '../../index';

function createEditor(withTable = false): LexicalEditorWithDispose {
  // The caller is responsible for disposal (with `using`).
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        // GFM constructs under test that aren't part of CommonMark.
        MdastStrikethroughExtension,
        MdastTaskListExtension,
        MdastExtension,
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
  it('omits a node and its children when its import handler returns null', () => {
    using editor = buildEditorFromExtensions(
      configExtension(MdastExtension, {
        importRules: [
          {$import: () => null, type: 'strong'},
          {
            $import: (_node, context) => context.createText('lower-priority'),
            type: 'strong',
          },
        ],
      }),
    );
    editor.update(() => $convertFromMarkdownString('a **b** c'), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe('a  c');
  });

  describe('round-trips simple constructs', () => {
    const cases: [string, string][] = [
      ['paragraph', 'Hello world'],
      ['heading h1', '# Heading one'],
      ['heading h3', '### Heading three'],
      ['bold', '**bold**'],
      ['italic', '*italic*'],
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

  describe('overlapping inline formats (#4895)', () => {
    type Run = [text: string, format: number];

    /** Builds a one-paragraph document from explicit text-node format runs. */
    function overlapEditor(runs: Run[]): LexicalEditorWithDispose {
      // The caller is responsible for disposal (with `using`).
      const editor = createEditor();
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          for (const [text, format] of runs) {
            paragraph.append($createTextNode(text).setFormat(format));
          }
          $getRoot().clear().append(paragraph);
        },
        {discrete: true},
      );
      return editor;
    }

    /** Reads the document back as merged (text, format) runs. */
    function $textRuns(): Run[] {
      const out: Run[] = [];
      for (const node of $getRoot().getAllTextNodes()) {
        const format = node.getFormat();
        const text = node.getTextContent();
        const last = out[out.length - 1];
        if (last && last[1] === format) {
          last[0] += text;
        } else {
          out.push([text, format]);
        }
      }
      return out;
    }

    /**
     * Exports `runs`, asserts the serialized markdown, and verifies that
     * re-importing the export restores the same formatting.
     */
    function expectRoundTrip(runs: Run[], expected: string): void {
      using editor = overlapEditor(runs);
      const markdown = editor.read(() => $convertToMarkdownString());
      expect(markdown).toBe(expected);
      using reimported = createEditor();
      reimported.update(
        () => {
          $convertFromMarkdownString(markdown);
        },
        {discrete: true},
      );
      expect(reimported.read($textRuns)).toEqual(runs);
    }

    const BOLD = TEXT_TYPE_TO_FORMAT.bold;
    const ITALIC = TEXT_TYPE_TO_FORMAT.italic;
    const STRIKE = TEXT_TYPE_TO_FORMAT.strikethrough;
    const CODE = TEXT_TYPE_TO_FORMAT.code;

    it('round-trips bold overlapping italic (the issue example)', () => {
      expectRoundTrip(
        [
          ['he', 0],
          ['llo', BOLD],
          ['wor', BOLD | ITALIC],
          ['ld', ITALIC],
          ['!', 0],
        ],
        'he**llo*wor****ld*!',
      );
    });

    it('round-trips italic overlapping bold', () => {
      expectRoundTrip(
        [
          ['a', 0],
          ['b', ITALIC],
          ['c', ITALIC | BOLD],
          ['d', BOLD],
          ['e', 0],
        ],
        'a*b**c*****d**e',
      );
    });

    it('round-trips strikethrough overlapping bold', () => {
      expectRoundTrip(
        [
          ['a', STRIKE],
          ['b', STRIKE | BOLD],
          ['c', BOLD],
        ],
        '~~a**b**~~**c**',
      );
    });

    it('round-trips a code span inside a bold run', () => {
      expectRoundTrip(
        [
          ['a', BOLD],
          ['b', BOLD | CODE],
          ['c', BOLD],
        ],
        '**a`b`c**',
      );
    });
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

  describe('editor-created line breaks', () => {
    function exportBlock($block: () => LexicalNode): string {
      using editor = createEditor();
      editor.update(() => $getRoot().clear().append($block()), {
        discrete: true,
      });
      return editor.read(() => $convertToMarkdownString());
    }

    function exportParagraph($children: () => LexicalNode[]): string {
      return exportBlock(() => $createParagraphNode().append(...$children()));
    }

    function importText(markdown: string): string[] {
      using editor = createEditor();
      let text: string[] = [];
      editor.update(
        () => {
          text = $generateNodesFromMarkdownString(markdown).map(node =>
            node.getTextContent(),
          );
        },
        {discrete: true},
      );
      return text;
    }

    const cases: [string, () => LexicalNode[], string, string][] = [
      [
        'a single break stays a soft newline',
        () => [
          $createTextNode('a'),
          $createLineBreakNode(),
          $createTextNode('b'),
        ],
        'a\nb',
        'a\nb',
      ],
      [
        'consecutive breaks use hard breaks',
        () => [
          $createTextNode('a'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('b'),
        ],
        'a\\\n\\\nb',
        'a\n\nb',
      ],
      [
        'a leading break uses a hard break',
        () => [$createLineBreakNode(), $createTextNode('a')],
        '\\\na',
        '\na',
      ],
      [
        'only the breaks next to another break are hard',
        () => [
          $createTextNode('a'),
          $createLineBreakNode(),
          $createTextNode('b'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('c'),
        ],
        'a\nb\\\n\\\nc',
        'a\nb\n\nc',
      ],
    ];
    for (const [name, $children, markdown, text] of cases) {
      it(name, () => {
        expect(exportParagraph($children)).toBe(markdown);
        expect(importText(markdown)).toEqual([text]);
      });
    }

    it('does not add a backslash for trailing breaks', () => {
      expect(
        exportParagraph(() => [
          $createTextNode('a'),
          $createLineBreakNode(),
          $createLineBreakNode(),
        ]),
      ).not.toContain('\\');
    });

    const blockCases: [string, () => LexicalNode, string, string][] = [
      [
        'a break at the start of a link after text stays soft',
        () =>
          $createParagraphNode().append(
            $createTextNode('x'),
            $createLinkNode('https://e.com').append(
              $createLineBreakNode(),
              $createTextNode('y'),
            ),
          ),
        'x[\ny](https://e.com)',
        'x\ny',
      ],
      [
        'breaks at the end of a link with text after it are hard',
        () =>
          $createParagraphNode().append(
            $createLinkNode('https://e.com').append(
              $createTextNode('y'),
              $createLineBreakNode(),
              $createLineBreakNode(),
            ),
            $createTextNode('z'),
          ),
        '[y\\\n\\\n](https://e.com)z',
        'y\n\nz',
      ],
      [
        'leading and consecutive breaks in a quote are hard',
        () =>
          $createQuoteNode().append(
            $createLineBreakNode(),
            $createTextNode('a'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            $createTextNode('b'),
          ),
        '> \\\n> a\\\n> \\\n> b',
        '\na\n\nb',
      ],
      [
        'consecutive breaks in a list item are hard',
        () =>
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createTextNode('a'),
              $createLineBreakNode(),
              $createLineBreakNode(),
              $createTextNode('b'),
            ),
          ),
        '- a\\\n  \\\n  b',
        'a\n\nb',
      ],
    ];
    for (const [name, $block, markdown, text] of blockCases) {
      it(name, () => {
        expect(exportBlock($block)).toBe(markdown);
        expect(importText(markdown)).toEqual([text]);
      });
    }
  });

  describe('imported line breaks that end up first or next to another break', () => {
    const cases: [string, string, string][] = [
      ['two-space breaks around a deleted line', 'a  \nb  \nc', 'a\\\n\\\nc'],
      ['a two-space break whose line is deleted', 'a  \nb', '\\\nb'],
      ['soft breaks around a deleted line', 'a\nb\nc', 'a\\\n\\\nc'],
    ];
    for (const [name, source, markdown] of cases) {
      it(name, () => {
        using editor = createEditor();
        editor.update(() => $convertFromMarkdownString(source), {
          discrete: true,
        });
        editor.update(
          () => {
            const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
            const lines = paragraph
              .getChildren()
              .filter(node => !$isLineBreakNode(node));
            lines[lines.length === 3 ? 1 : 0].remove();
          },
          {discrete: true},
        );
        const text = editor.read(() => $getRoot().getTextContent());
        const exported = editor.read(() => $convertToMarkdownString());
        expect(exported).toBe(markdown);
        editor.update(() => $convertFromMarkdownString(exported), {
          discrete: true,
        });
        expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
      });
    }
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

  it.each([
    ['***both***', '**_both_**'],
    ['___both___', '__*both*__'],
  ])('writes bold italic %s as strong around emphasis', (markdown, out) => {
    // mdast-util-to-markdown alternates the markers of nested attention.
    expect(importExport(markdown)).toBe(out);
    expect(importExport(out)).toBe(out);
  });

  it('round-trips autolink literals without normalizing to <...>', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastAutolinkLiteralExtension,
          MdastExtension,
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
          configExtension(MdastExtension, {
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

  it('$generateNodesFromMdast returns detached nodes for a pre-parsed tree', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const nodes = $generateNodesFromMdast({
          children: [
            {
              children: [{type: 'text', value: 'Tree'}],
              depth: 2,
              type: 'heading',
            },
          ],
          type: 'root',
        });
        expect(nodes).toHaveLength(1);
        const heading = $assertNodeType(nodes[0], $isHeadingNode);
        expect(heading.isAttached()).toBe(false);
        expect(heading.getTextContent()).toBe('Tree');
      },
      {discrete: true},
    );
  });

  describe('$convertSelectionToMarkdownString', () => {
    /**
     * Imports `markdown`, selects from `anchor` to `focus` (offsets into the
     * document's text nodes, in order), and exports the selection.
     */
    function selectionExport(
      markdown: string,
      $select: (textNodes: TextNode[]) => void,
    ): string {
      using editor = createEditor();
      editor.update(
        () => {
          $convertFromMarkdownString(markdown);
          $select($getRoot().getAllTextNodes());
        },
        {discrete: true},
      );
      return editor.read(() => $convertSelectionToMarkdownString());
    }

    function $selectSpan(
      anchorNode: TextNode,
      anchorOffset: number,
      focusNode: TextNode,
      focusOffset?: number,
    ): void {
      $setSelectionFromCaretRange(
        $getCaretRange(
          $getTextPointCaret(anchorNode, 'next', anchorOffset),
          $getTextPointCaret(
            focusNode,
            'next',
            focusOffset === undefined ? 'next' : focusOffset,
          ),
        ),
      );
    }

    it('exports a partial text selection', () => {
      expect(
        selectionExport('Hello World', ([text]) => text.select(6, 11)),
      ).toBe('World');
    });

    it('keeps formatting on a selection spanning formatted text', () => {
      expect(
        selectionExport('Hello **Bold** World', ([plain, bold]) =>
          $selectSpan(plain, 0, bold),
        ),
      ).toBe('Hello **Bold**');
    });

    it('returns an empty string for a null or collapsed selection', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $convertFromMarkdownString('Hello World');
          $getRoot().getAllTextNodes()[0].select(5, 5);
        },
        {discrete: true},
      );
      editor.read(() => {
        expect($convertSelectionToMarkdownString()).toBe('');
        expect($convertSelectionToMarkdownString(null)).toBe('');
      });
    });

    it('exports a multi-paragraph selection and skips unselected blocks', () => {
      expect(
        selectionExport('One\n\nTwo\n\nThree', ([, two]) => two.select(0, 3)),
      ).toBe('Two');
      expect(
        selectionExport('One\n\nTwo\n\nThree', ([one, , three]) =>
          $selectSpan(one, 0, three),
        ),
      ).toBe('One\n\nTwo\n\nThree');
    });

    it('exports only the selected list items', () => {
      expect(
        selectionExport('- one\n- two\n- three', ([one, two]) =>
          $selectSpan(one, 0, two),
        ),
      ).toBe('- one\n- two');
    });

    it('keeps the heading structure for a partial heading selection', () => {
      expect(selectionExport('# Heading', ([text]) => text.select(0, 4))).toBe(
        '# Head',
      );
    });

    it('keeps the link wrapper when link text is partially selected', () => {
      expect(
        selectionExport(
          'before [link text](https://example.com) after',
          textNodes => textNodes[1].select(0, 4),
        ),
      ).toBe('[link](https://example.com)');
    });

    it('exposes the selection to contributed to-markdown handlers', () => {
      // A contributed root handler whose output depends on the export's
      // scope (e.g. appending end-of-document data like footnote
      // definitions) reads the selection through the render context:
      // null on a whole-document export, the BaseSelection on a selection
      // export.
      const probe: boolean[] = [];
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            configExtension(MdastExtension, {
              toMarkdownExtensions: [
                {
                  handlers: {
                    root: (node, parent, state, info) => {
                      probe.push(
                        $getRenderContextValue(
                          RenderContextMarkdownSelection,
                        ) !== null,
                      );
                      return defaultHandlers.root(node, parent, state, info);
                    },
                  },
                },
              ],
            }),
          ],
          name: '[selection-option]',
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString('hello world');
          $getRoot().getAllTextNodes()[0].select(0, 5);
        },
        {discrete: true},
      );
      editor.read(() => {
        expect($convertToMarkdownString()).toBe('hello world');
        expect($convertSelectionToMarkdownString()).toBe('hello');
      });
      expect(probe).toEqual([false, true]);
    });
  });

  describe('import context', () => {
    // The mdast walk runs under the same import-context mechanism the DOM
    // rules use: handlers read ambient state with $getImportContextValue
    // and layer state for their subtree with $withImportContext — nested
    // handlers (and DOM-rule sessions opened for raw HTML) see the layer,
    // siblings outside it do not.
    const probeState = createImportState('mdastProbe', () => 'default');

    it('runs handlers under ImportContextMarkdown with nested layering', () => {
      const seen: [string, boolean, string][] = [];
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            configExtension(MdastExtension, {
              importRules: [
                {
                  $import: (node, ctx) => {
                    seen.push([
                      'emphasis',
                      $getImportContextValue(ImportContextMarkdown),
                      $getImportContextValue(probeState),
                    ]);
                    return $withImportContext([
                      contextValue(probeState, 'layered'),
                    ])(() => ctx.importChildren(node));
                  },
                  type: 'emphasis',
                },
                {
                  $import: (node, ctx) => {
                    seen.push([
                      'strong',
                      $getImportContextValue(ImportContextMarkdown),
                      $getImportContextValue(probeState),
                    ]);
                    return ctx.importChildren(node);
                  },
                  type: 'strong',
                },
              ],
            }),
          ],
          name: '[import-context]',
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString('*em **inner*** and **outer**');
        },
        {discrete: true},
      );
      expect(seen).toEqual([
        // Every handler sees ImportContextMarkdown; the probe layer applies
        // to the emphasis subtree only.
        ['emphasis', true, 'default'],
        ['strong', true, 'layered'],
        ['strong', true, 'default'],
      ]);
      // The context does not leak outside the import operation.
      editor.read(() => {
        expect($getImportContextValue(ImportContextMarkdown)).toBe(false);
        expect($getImportContextValue(probeState)).toBe('default');
      });
    });
  });

  it('unwraps constructs the editor has no extension for', () => {
    // Headings only — no blockquote extension. `> quote` imports as its
    // children (a paragraph) instead of corrupting or dropping content.
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [MdastHeadingExtension, MdastExtension],
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
    it('gives the cells a short row lacks its columns alignment', () => {
      using editor = createEditor(true);
      editor.update(
        () => $convertFromMarkdownString('| a | b |\n| :-: | -: |\n| x |'),
        {discrete: true},
      );
      expect(
        editor.read(() =>
          $assertNodeType($getRoot().getFirstChild(), $isTableNode)
            .getChildren()
            .map(row =>
              $assertNodeType(row, $isElementNode)
                .getChildren()
                .map(cell =>
                  $assertNodeType(cell, $isElementNode).getFormatType(),
                ),
            ),
        ),
      ).toEqual([
        ['center', 'right'],
        ['center', 'right'],
      ]);
    });

    it('escapes the pipes of a nested table once when flattening it', () => {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastTableExtension,
            MdastHorizontalRuleExtension,
            configExtension(MdastExtension, {
              exportRules: [
                {
                  $export: () => ({type: 'html', value: '<b>a|b</b>'}),
                  type: HorizontalRuleNode,
                },
              ],
            }),
          ],
          name: '[nested-table-pipes]',
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString(
            '| x |\n| - |\n| y |\n\n| h |\n| - |\n| z |',
          );
          const [outer, inner] = $getRoot().getChildren<ElementNode>();
          $assertNodeType(
            inner.getLastChildOrThrow<ElementNode>().getFirstChild(),
            $isElementNode,
          )
            .clear()
            .append($createHorizontalRuleNode());
          $assertNodeType(
            outer.getLastChildOrThrow<ElementNode>().getFirstChild(),
            $isElementNode,
          )
            .clear()
            .append(inner);
        },
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '| x                |\n| ---------------- |\n| h<br><b>a\\|b</b> |',
      );
    });

    it('keeps a <hr> in a cell of an editor with no rule as text', () => {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [MdastRichTextExtension, MdastTableExtension],
          name: '[table-no-rule]',
        }),
      );
      editor.update(
        () => $convertFromMarkdownString('| a |\n| - |\n| x<hr>y |'),
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '| a       |\n| ------- |\n| x\\<hr>y |',
      );
    });

    it('drops the cells of a row past the header, as GFM does', () => {
      using editor = createEditor(true);
      editor.update(
        () => $convertFromMarkdownString('| h |\n| - |\n| a | b |'),
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '| h |\n| - |\n| a |',
      );
    });

    it('writes no alignment for a column whose paragraphs are justified', () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| :-: |\n| b |');
          for (const node of $getRoot().getAllTextNodes()) {
            node.getParentOrThrow<ElementNode>().setFormat('justify');
          }
        },
        {discrete: true},
      );
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '| a |\n| - |\n| b |',
      );
    });

    it('moves the column alignment a v0.52 state kept on the table to its cells', () => {
      using editor = createEditor(true);
      editor.update(
        () => $convertFromMarkdownString('| a | b |\n| - | - |\n| 1 | 2 |'),
        {discrete: true},
      );
      const json = editor.getEditorState().toJSON();
      json.root.children[0].$ = {mdastTableAlign: [null, 'right']};
      editor.setEditorState(editor.parseEditorState(json));
      // The alignment moves onto the cells, where editing changes it.
      const table = editor.getEditorState().toJSON().root.children[0];
      expect(table.$).toBeUndefined();
      // A parsed state no update has run on reads it from the table.
      expect(
        editor
          .parseEditorState(json)
          .read(() => $convertToMarkdownString(), {editor}),
      ).toBe('| a |  b |\n| - | -: |\n| 1 |  2 |');
      expect(
        editor.read(() =>
          $assertNodeType($getRoot().getFirstChild(), $isTableNode)
            .getAllTextNodes()
            .map(node =>
              node
                .getParentOrThrow()
                .getParentOrThrow<ElementNode>()
                .getFormatType(),
            ),
        ),
      ).toEqual(['', 'right', '', 'right']);
      expect(editor.read(() => $convertToMarkdownString())).toBe(
        '| a |  b |\n| - | -: |\n| 1 |  2 |',
      );
    });

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

    function editColumns(
      markdown: string,
      $edit: (row: ElementNode) => void,
    ): string {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString(markdown);
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          for (const row of table.getChildren()) {
            $edit($assertNodeType(row, $isElementNode));
          }
        },
        {discrete: true},
      );
      return editor.read(() => $convertToMarkdownString());
    }

    it('keeps each column its alignment when a column is removed', () => {
      expect(
        editColumns('| a | b |\n| :- | -: |\n| 1 | 2 |', row =>
          row.getFirstChildOrThrow().remove(),
        ),
      ).toBe('|  b |\n| -: |\n|  2 |');
    });

    it("renders column alignment as the cells' element format", () => {
      using editor = createEditor(true);
      editor.update(
        () =>
          $convertFromMarkdownString(
            '| a | b | c |\n| :- | :-: | - |\n| 1 | 2 | 3 |',
          ),
        {discrete: true},
      );
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        expect(
          table.getChildren().map(row =>
            $assertNodeType(row, $isElementNode)
              .getChildren()
              .map(cell =>
                $assertNodeType(cell, $isElementNode).getFormatType(),
              ),
          ),
        ).toEqual([
          ['left', 'center', ''],
          ['left', 'center', ''],
        ]);
      });
    });

    it('exports alignment set on a cell or on all of its blocks', () => {
      // A cell's own format (what FORMAT_ELEMENT_COMMAND sets on a table
      // selection) or the format its paragraphs share (what it sets with
      // the caret in one cell) aligns the cell.
      expect(
        editColumns('| a | b |\n| - | - |\n| 1 | 2 |', row => {
          const [first, second] = row.getChildren();
          $assertNodeType(first, $isElementNode).setFormat('right');
          for (const child of $assertNodeType(
            second,
            $isElementNode,
          ).getChildren()) {
            $assertNodeType(child, $isElementNode).setFormat('center');
          }
        }),
      ).toBe('|  a |  b  |\n| -: | :-: |\n|  1 |  2  |');
    });

    it("exports the alignment of a cell's blocks over its own", () => {
      expect(
        editColumns('| a |\n| :-: |\n| 1 |', row => {
          for (const child of $assertNodeType(
            row.getFirstChild(),
            $isElementNode,
          ).getChildren()) {
            $assertNodeType(child, $isElementNode).setFormat('right');
          }
        }),
      ).toBe('|  a |\n| -: |\n|  1 |');
    });

    it.each([
      ['| a |\n| - |\n| 1 |\n| 2 |', [1], '| a |\n| - |\n| 1 |\n| 2 |'],
      ['| a |\n| - |\n| 1 |', [1], '| a |\n| - |\n| 1 |'],
      [
        '| a |\n| - |\n| 1 |\n| 2 |',
        [1, 2],
        '|  a  |\n| :-: |\n|  1  |\n|  2  |',
      ],
    ])(
      'aligns a column that most of its cells are aligned in: %j, rows %j',
      (markdown, rows, expected) => {
        // GFM aligns columns, not cells, so aligning one cell doesn't align
        // the others in its column.
        expect(
          editColumns(markdown, row => {
            if (rows.includes(row.getIndexWithinParent())) {
              for (const child of $assertNodeType(
                row.getFirstChild(),
                $isElementNode,
              ).getChildren()) {
                $assertNodeType(child, $isElementNode).setFormat('center');
              }
            }
          }),
        ).toBe(expected);
      },
    );

    it('keeps a column aligned when a row is inserted above the header', () => {
      expect(
        editColumns('| a |\n| :-: |\n| 1 |\n| 2 |', row => {
          if (row.getIndexWithinParent() === 0) {
            row.insertBefore(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode().append($createTextNode('x')),
                ),
              ),
            );
          }
        }),
      ).toBe('|  x  |\n| :-: |\n|  a  |\n|  1  |\n|  2  |');
    });

    it('keeps a column aligned when rows are inserted below the header', () => {
      expect(
        editColumns('| a |\n| :-: |\n| 1 |', row => {
          if (row.getIndexWithinParent() === 1) {
            for (const text of ['x', 'y', 'z']) {
              row.insertBefore(
                $createTableRowNode().append(
                  $createTableCellNode().append(
                    $createParagraphNode().append($createTextNode(text)),
                  ),
                ),
              );
            }
          }
        }),
      ).toBe('|  a  |\n| :-: |\n|  x  |\n|  y  |\n|  z  |\n|  1  |');
    });

    it('aligns a column by its header cell alone', () => {
      expect(
        editColumns('| a |\n| - |\n| 1 |\n| 2 |', row => {
          if (row.getIndexWithinParent() === 0) {
            $assertNodeType(row.getFirstChild(), $isElementNode).setFormat(
              'right',
            );
          }
        }),
      ).toBe('|  a |\n| -: |\n|  1 |\n|  2 |');
    });

    it('aligns a column by most of its cells over its header cell', () => {
      expect(
        editColumns('| a |\n| -: |\n| 1 |\n| 2 |', row => {
          if (row.getIndexWithinParent() > 0) {
            $assertNodeType(row.getFirstChild(), $isElementNode).setFormat(
              'center',
            );
          }
        }),
      ).toBe('|  a  |\n| :-: |\n|  1  |\n|  2  |');
    });

    it('takes no header alignment from a selection without the header row', () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| 1 |\n| 2 |\n| 3 |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const [, first, , last] = table.getChildren();
          const $cell = (row: LexicalNode) =>
            $assertNodeType(
              $assertNodeType(row, $isElementNode).getFirstChild(),
              $isTableCellNode,
            );
          $cell(first).setFormat('right');
          $setSelection(
            $createTableSelectionFrom(table, $cell(first), $cell(last)),
          );
        },
        {discrete: true},
      );
      expect(editor.read(() => $convertSelectionToMarkdownString())).toBe(
        '| 1 |\n| - |\n| 2 |\n| 3 |',
      );
    });

    it("takes the header cell's alignment into a selection without it", () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| :-: |\n| 1 |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const [header, row] = table.getChildren();
          const $cell = (node: LexicalNode) =>
            $assertNodeType(
              $assertNodeType(node, $isElementNode).getFirstChild(),
              $isTableCellNode,
            );
          for (const text of ['2', '3']) {
            row.insertAfter(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode().append($createTextNode(text)),
                ),
              ),
            );
          }
          $cell(row).setFormat('');
          $setSelection(
            $createTableSelectionFrom(
              table,
              $cell(row),
              $cell(table.getLastChildOrThrow()),
            ),
          );
          expect($cell(header).getFormatType()).toBe('center');
        },
        {discrete: true},
      );
      expect(editor.read(() => $convertSelectionToMarkdownString())).toBe(
        '|  1  |\n| :-: |\n|  3  |\n|  2  |',
      );
    });

    it('gives an inserted column no alignment', () => {
      expect(
        editColumns('| a | b |\n| :- | -: |\n| 1 | 2 |', row =>
          row
            .getFirstChildOrThrow()
            .insertBefore(
              $createTableCellNode().append(
                $createParagraphNode().append($createTextNode('x')),
              ),
            ),
        ),
      ).toBe('| x | a  |  b |\n| - | :- | -: |\n| x | 1  |  2 |');
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
      expect(out).toContain('| foo<br>bar |');
    });

    function cellOf(markdown: string): string {
      // The second row's first cell, as exported.
      return markdown.split('\n')[2].replace(/^\| (.*?) *\|$/, '$1');
    }

    function exportCell(...$children: (() => LexicalNode)[]): string {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| x |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const lastRow = $assertNodeType(table.getLastChild(), $isElementNode);
          const cell = $assertNodeType(lastRow.getFirstChild(), $isElementNode);
          cell.clear().append(...$children.map($child => $child()));
        },
        {discrete: true},
      );
      return editor.read(() => $convertToMarkdownString());
    }

    const text = (value: string) => () =>
      $createParagraphNode().append($createTextNode(value));

    // https://github.com/facebook/lexical/issues/9323
    it('writes line breaks in a cell as <br>, never a newline', () => {
      const cases: [string, string][] = [
        [
          exportCell(() =>
            $createParagraphNode().append(
              $createTextNode('a'),
              $createLineBreakNode(),
              $createTextNode('b'),
            ),
          ),
          'a<br>b',
        ],
        [exportCell(text('a'), text('b')), 'a<br>b'],
        [exportCell(text('a'), text(''), text('b')), 'a<br><br>b'],
        [exportCell(text('a\nb')), 'a<br>b'],
        [
          exportCell(() =>
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('x')),
              $createListItemNode().append($createTextNode('y')),
            ),
          ),
          'x<br>y',
        ],
        [
          exportCell(() =>
            $createCodeNode().append(
              $createTextNode('l1'),
              $createLineBreakNode(),
              $createTextNode('l2'),
            ),
          ),
          '`l1`<br>`l2`',
        ],
        [
          exportCell(() =>
            $createParagraphNode().append(
              $createTextNode('c1\nc2').toggleFormat('code'),
            ),
          ),
          '`c1 c2`',
        ],
      ];
      for (const [out, expected] of cases) {
        expect(out.split('\n')).toHaveLength(3);
        expect(cellOf(out)).toBe(expected);
        expect(importExport(out, true)).toBe(out);
      }
    });

    it('writes a horizontal rule in a cell as <hr> and reads it back', () => {
      const out = exportCell(
        text('a'),
        () => $createHorizontalRuleNode(),
        text('b'),
      );
      expect(cellOf(out)).toBe('a<hr>b');
      using editor = createEditor(true);
      editor.update(() => $convertFromMarkdownString(out), {discrete: true});
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        const cell = $assertNodeType(
          table.getLastChildOrThrow<ElementNode>().getFirstChild(),
          $isElementNode,
        );
        expect(cell.getChildren().map(child => child.getType())).toEqual([
          'paragraph',
          'horizontalrule',
          'paragraph',
        ]);
      });
      expect(importExport(out, true)).toBe(out);
    });

    it('writes a rule inside a paragraph in a cell as <hr> and reads each back', () => {
      const out = exportCell(() =>
        $createParagraphNode().append(
          $createTextNode('a'),
          $createHorizontalRuleNode(),
          $createHorizontalRuleNode(),
          $createTextNode('b'),
        ),
      );
      expect(cellOf(out)).toBe('a<hr><hr>b');
      using editor = createEditor(true);
      editor.update(() => $convertFromMarkdownString(out), {discrete: true});
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        const cell = $assertNodeType(
          table.getLastChildOrThrow<ElementNode>().getFirstChild(),
          $isElementNode,
        );
        expect(cell.getChildren().map(child => child.getType())).toEqual([
          'paragraph',
          'horizontalrule',
          'horizontalrule',
          'paragraph',
        ]);
      });
    });

    it('writes no <br> beside a rule that ends or starts a paragraph in a cell', () => {
      const out = exportCell(
        () =>
          $createParagraphNode().append(
            $createTextNode('a'),
            $createHorizontalRuleNode(),
          ),
        () =>
          $createParagraphNode().append(
            $createHorizontalRuleNode(),
            $createTextNode('b'),
          ),
      );
      expect(cellOf(out)).toBe('a<hr><hr>b');
    });

    it('trims the whitespace an <hr> in a cell was written with', () => {
      const markdown = '| a |\n| - |\n| a <hr> b |';
      using editor = createEditor(true);
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(editor.read(() => $convertToMarkdownString()).split('\n')[2]).toBe(
        '| a<hr>b |',
      );
    });

    it('reads <br> in a cell as a paragraph boundary, with attributes too', () => {
      using editor = createEditor(true);
      editor.update(
        () => {
          $convertFromMarkdownString(
            '| a |\n| - |\n| x <br/> y<BR class="c" /><br>**z<br>w** |',
          );
        },
        {discrete: true},
      );
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        const lastRow = $assertNodeType(table.getLastChild(), $isElementNode);
        const cell = $assertNodeType(lastRow.getFirstChild(), $isElementNode);
        expect(cell.getChildren().map(p => p.getTextContent())).toEqual([
          'x',
          'y',
          '',
          'z\nw',
        ]);
      });
      expect(
        cellOf(
          importExport(
            '| a |\n| - |\n| x <br/> y<BR class="c" /><br>**z<br>w** |',
            true,
          ),
        ),
      ).toBe('x<br>y<br><br>**z<br>w**');
    });

    it.each([
      '**a<br>b**',
      '*x <br> y*',
      '~~a<br>*b<br>c*~~',
      '**a<br><br>b**',
    ])('keeps a <br> in formatting a line break in %j', cell => {
      const markdown = `| a |\n| - |\n| ${cell} |`;
      expect(cellOf(importExport(markdown, true))).toBe(cell);
    });

    it('keeps phrasing a block exports to at the top level of a cell', () => {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastTableExtension,
            configExtension(MdastExtension, {
              exportRules: [
                {
                  $export: () => ({alt: 'a', type: 'image', url: 'u'}),
                  type: HorizontalRuleNode,
                },
              ],
            }),
          ],
          name: '[root]',
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| b |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const cell = $assertNodeType(
            table.getLastChildOrThrow<ElementNode>().getFirstChild(),
            $isElementNode,
          );
          cell
            .clear()
            .append(
              $createHorizontalRuleNode(),
              $createHorizontalRuleNode(),
              $createParagraphNode().append($createTextNode('b')),
              $createHorizontalRuleNode(),
            );
        },
        {discrete: true},
      );
      // Phrasing after a block's line starts a line of its own.
      expect(editor.read(() => $convertToMarkdownString())).toContain(
        '| ![a](u)![a](u)<br>b<br>![a](u) |',
      );
    });

    it.each<[object, string]>([
      [{type: 'inlineMath', value: 'a|b'}, '$a\\|b$'],
      [{type: 'inlineCode', value: 'a|b'}, '`a\\|b`'],
      // A line end in code reads as a space in HTML too.
      [{type: 'inlineCode', value: 'a\nb'}, '`a b`'],
      [
        {type: 'html', value: '<!-- a|b --><b title="a|b">x|y</b>'},
        '<!-- a\\|b --><b title="a\\|b">x\\|y</b>',
      ],
    ])('writes %j in a cell as it is', (exported, written) => {
      expect(exportCellOf(exported, true)).toContain(`| ${written} |`);
    });

    it.each<[object, string]>([
      // A line end, which a cell has no form for.
      [{type: 'inlineMath', value: 'a\n+ b|c'}, '$a + b\\|c$'],
      [{type: 'html', value: '<pre>a\nb</pre>'}, '<pre>a b</pre>'],
      // A pipe after a backslash, which micromark reads otherwise.
      [{type: 'inlineMath', value: '\\|x\\|'}, '$\\\\\\|x\\\\\\|$'],
      [{type: 'inlineCode', value: 'a\\|b'}, '`a\\\\\\|b`'],
      [{type: 'html', value: '<i>a\\|b</i>'}, '<i>a\\\\\\|b</i>'],
      // A block that a cell holds as phrasing.
      [{type: 'math', value: 'a|b'}, '$a\\|b$'],
    ])('writes %j as HTML, or else on its row', (exported, written) => {
      const markdown = exportCellOf(exported);
      expect(markdown).toContain(`| ${written} |`);
      const [table] = fromMarkdown(markdown, {
        extensions: [gfmTable()],
        mdastExtensions: [gfmTableFromMarkdown()],
      }).children as Table[];
      expect(table.children.map(row => row.children.length)).toEqual([1, 1]);
      expect(exportCellOf(exported, true)).toMatch(/^<table>\n/);
    });

    /** The Markdown of a table whose cell holds what a node exports. */
    function exportCellOf(exported: object, html = false): string {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastTableExtension,
            ...(html ? [MdastHtmlExtension] : []),
            configExtension(MdastExtension, {
              exportRules: [
                {
                  $export: () =>
                    ({...exported, name: 'abbr'}) as unknown as MdastNode,
                  type: HorizontalRuleNode,
                },
              ],
              toMarkdownExtensions: [
                {
                  handlers: {
                    inlineMath: ((node: {value: string}) =>
                      `$${node.value}$`) as Handle,
                    math: ((node: {value: string}) =>
                      `$$\n${node.value}\n$$`) as Handle,
                  } as Partial<Handlers>,
                },
              ],
            }),
          ],
          name: '[root]',
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString('| a |\n| - |\n| b |');
          const table = $assertNodeType(
            $getRoot().getFirstChild(),
            $isTableNode,
          );
          const cell = $assertNodeType(
            table.getLastChildOrThrow<ElementNode>().getFirstChild(),
            $isElementNode,
          );
          cell.clear().append($createHorizontalRuleNode());
        },
        {discrete: true},
      );
      return editor.read(() => $convertToMarkdownString());
    }

    it('writes long runs in a cell in linear time', () => {
      const spaces = ' '.repeat(1e5);
      const html = `<span>a${spaces}b</span>`;
      expect(exportCellOf({type: 'html', value: html}, true)).toContain(html);
      const slashes = '\\'.repeat(1e5);
      expect(
        exportCellOf({type: 'inlineCode', value: slashes + 'a'}),
      ).toContain(slashes + 'a');
    });

    it('reads long runs of spaces in a cell in linear time', () => {
      const spaces = ' '.repeat(1e5);
      using editor = createEditor(true);
      editor.update(
        () =>
          $convertFromMarkdownString(`| a |\n| - |\n| a<br>b${spaces}c<br>d |`),
        {discrete: true},
      );
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        expect(table.getLastChildOrThrow().getTextContent()).toContain(
          `b${spaces}c`,
        );
      });
    });

    it('keeps spaces written as references at the edges of a cell', () => {
      using editor = createEditor(true);
      editor.update(
        () => $convertFromMarkdownString('| a |\n| - |\n| &#32;&#32;b&#32; |'),
        {discrete: true},
      );
      editor.read(() => {
        const table = $assertNodeType($getRoot().getFirstChild(), $isTableNode);
        expect(table.getLastChildOrThrow().getTextContent()).toBe('  b ');
      });
    });
  });

  describe('with MdastShadowRootQuoteExtension', () => {
    function shadowQuoteEditor(): LexicalEditorWithDispose {
      // The caller is responsible for disposal (with `using`).
      return buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastExtension,
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

  it.each(['foo\tbar', '**foo\tbar**'])(
    'round-trips tabs with their text format: %s',
    markdown => {
      using editor = createEditor();
      editor.update(
        () => {
          $convertFromMarkdownString(markdown);
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
        for (const child of paragraph.getChildren()) {
          expect($assertNodeType(child, $isTextNode).hasFormat('bold')).toBe(
            markdown.startsWith('**'),
          );
        }
        expect($convertToMarkdownString()).toBe(markdown);
      });
    },
  );

  it('tolerates explicitly-undefined config keys in configExtension', () => {
    using editor = buildEditorFromExtensions(
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
    editor.update(
      () => {
        $convertFromMarkdownString('# Still works');
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe('# Still works');
  });
});
