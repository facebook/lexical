/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createCodeNode, CodeHighlightNode, CodeNode} from '@lexical/code-core';
import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  registerMarkdownShortcuts,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isTableNode,
  TableCellHeaderStates,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  createEditor,
  defineExtension,
  type ElementNode,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it, onTestFinished} from 'vitest';

import {
  $createEquationNode,
  $isEquationNode,
  EquationNode,
} from '../../src/nodes/EquationNode';
import {$isImageNode, ImageNode} from '../../src/nodes/ImageNode';
import {
  BLOCK_EQUATION,
  EQUATION,
  IMAGE,
  PLAYGROUND_TRANSFORMERS,
  TABLE,
} from '../../src/plugins/MarkdownTransformers';

const EQUATION_TRANSFORMERS = [BLOCK_EQUATION, EQUATION];
const MarkdownShortcutTestExtension = defineExtension({
  dependencies: [RichTextExtension],
  name: 'MarkdownShortcutTest',
  nodes: [EquationNode],
  register: editor => registerMarkdownShortcuts(editor, EQUATION_TRANSFORMERS),
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
  editor.read(() => {});
}

describe('playground EQUATION markdown transformer', () => {
  it('exports inline equations with single dollar delimiters', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createEquationNode('x^2 + y^2 = z^2', true));
        $getRoot().append(paragraph);
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(EQUATION_TRANSFORMERS));

    expect(markdown).toBe('$x^2 + y^2 = z^2$');
  });

  it('exports block equations with double dollar delimiters', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        $getRoot().append($createEquationNode('x^2 + y^2 = z^2', false));
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(EQUATION_TRANSFORMERS));

    expect(markdown).toBe('$$\nx^2 + y^2 = z^2\n$$');
  });

  it('imports multiline double dollar equations as block equations', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        $convertFromMarkdownString(
          '$$\nx^2 + y^2 = z^2\n$$',
          EQUATION_TRANSFORMERS,
        );
      },
      {discrete: true},
    );

    editor.read(() => {
      const equation = $getRoot().getFirstChildOrThrow();
      assert($isEquationNode(equation), 'Root child must be an EquationNode');
      expect(equation.getEquation()).toBe('x^2 + y^2 = z^2');
      expect(equation.isInline()).toBe(false);
    });
  });

  it('imports single dollar equations as inline equations', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        $convertFromMarkdownString('$x^2 + y^2 = z^2$', EQUATION_TRANSFORMERS);
      },
      {discrete: true},
    );

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');

      const equation = paragraph.getFirstChildOrThrow();
      assert(
        $isEquationNode(equation),
        'Paragraph child must be an EquationNode',
      );
      expect(equation.getEquation()).toBe('x^2 + y^2 = z^2');
      expect(equation.isInline()).toBe(true);
    });
  });

  it('imports escaped dollars inside inline equations', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        $convertFromMarkdownString('$price = \\$5$', EQUATION_TRANSFORMERS);
      },
      {discrete: true},
    );

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');

      const equation = paragraph.getFirstChildOrThrow();
      assert(
        $isEquationNode(equation),
        'Paragraph child must be an EquationNode',
      );
      expect(equation.getEquation()).toBe('price = $5');
      expect(equation.isInline()).toBe(true);
    });
  });

  it('exports inline equations without creating block-equation ambiguity', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append(
          $createTextNode('$'),
          $createEquationNode('x^2 + y^2 = z^2', true),
          $createTextNode('$'),
        );
        $getRoot().append(paragraph);
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(EQUATION_TRANSFORMERS));

    expect(markdown).toBe('$$x^2 + y^2 = z^2$$');

    const nextEditor = createEditor({nodes: [EquationNode]});
    nextEditor.update(
      () => {
        $convertFromMarkdownString(markdown, EQUATION_TRANSFORMERS);
      },
      {discrete: true},
    );

    nextEditor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const children = paragraph.getChildren();
      expect(children.map(child => child.getTextContent())).toEqual([
        '$',
        'x^2 + y^2 = z^2',
        '$',
      ]);
      assert(
        $isEquationNode(children[1]),
        'Middle child must be an EquationNode',
      );
      expect(children[1].isInline()).toBe(true);
    });
  });

  it('exports inline equations containing dollar signs without block-equation ambiguity', () => {
    const editor = createEditor({nodes: [EquationNode]});

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createEquationNode('price = $5', true));
        $getRoot().append(paragraph);
      },
      {discrete: true},
    );

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(EQUATION_TRANSFORMERS));

    expect(markdown).toBe('$price = \\$5$');

    const nextEditor = createEditor({nodes: [EquationNode]});
    nextEditor.update(
      () => {
        $convertFromMarkdownString(markdown, EQUATION_TRANSFORMERS);
      },
      {discrete: true},
    );

    nextEditor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');

      const equation = paragraph.getFirstChildOrThrow();
      assert(
        $isEquationNode(equation),
        'Paragraph child must be an EquationNode',
      );
      expect(equation.getEquation()).toBe('price = $5');
      expect(equation.isInline()).toBe(true);
    });
  });

  it('uses a block equation when typing double dollar markdown', () => {
    using editor = buildEditorFromExtensions(MarkdownShortcutTestExtension);
    typeMarkdown(editor, '$$x^2 + y^2 = z^2$$');

    editor.read(() => {
      const equation = $getRoot().getFirstChildOrThrow();
      assert($isEquationNode(equation), 'Root child must be an EquationNode');
      expect(equation.getEquation()).toBe('x^2 + y^2 = z^2');
      expect(equation.isInline()).toBe(false);
    });
  });
});

const ImageMarkdownTestExtension = defineExtension({
  dependencies: [RichTextExtension],
  name: 'ImageMarkdownTest',
  nodes: [ImageNode],
});

describe('playground IMAGE markdown transformer', () => {
  it('imports image with the same default maxWidth as $createImageNode', () => {
    using editor = buildEditorFromExtensions(ImageMarkdownTestExtension);

    editor.update(
      () => {
        $convertFromMarkdownString('![alt text](http://example.com/img.png)', [
          IMAGE,
        ]);
      },
      {discrete: true},
    );

    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isParagraphNode(paragraph), 'Root child must be a paragraph');
      const image = paragraph.getFirstChildOrThrow();
      assert($isImageNode(image), 'Paragraph child must be an ImageNode');
      expect(image.getAltText()).toBe('alt text');
      expect(image.__maxWidth).toBe(500);
    });
  });
});

// https://github.com/facebook/lexical/issues/9323
describe('playground TABLE markdown transformer', () => {
  const TableMarkdownTestExtension = defineExtension({
    dependencies: [RichTextExtension, TableExtension],
    name: 'TableMarkdownTest',
    nodes: [
      CodeNode,
      CodeHighlightNode,
      EquationNode,
      ImageNode,
      LinkNode,
      ListNode,
      ListItemNode,
    ],
  });

  function importMarkdown(
    markdown: string,
  ): ReturnType<typeof buildEditorFromExtensions> {
    const editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(() => $convertFromMarkdownString(markdown, [TABLE]), {
      discrete: true,
    });
    return editor;
  }

  function cellTexts(editor: LexicalEditor): string[][][] {
    return editor.read(() => {
      const table = $getRoot().getFirstChildOrThrow();
      assert($isTableNode(table), 'Root child must be a table');
      return table
        .getChildren()
        .map(row =>
          $isElementNode(row)
            ? row
                .getChildren()
                .map(cell =>
                  $isElementNode(cell)
                    ? cell.getChildren().map(p => p.getTextContent())
                    : [],
                )
            : [],
        );
    });
  }

  it.each([
    ['| h |\n| --- |\n| a | b |', [[['h']], [['a']]]],
    [
      '| a | b |\n| --- | --- |\n| x |',
      [
        [['a'], ['b']],
        [['x'], ['']],
      ],
    ],
  ])('gives a row of %j the header cells', (markdown, cells) => {
    using editor = importMarkdown(markdown);
    expect(editor.read(() => $getRoot().getChildrenSize())).toBe(1);
    expect(cellTexts(editor)).toEqual(cells);
  });

  it('reads a delimiter row padded with any whitespace', () => {
    using editor = importMarkdown('| a |\n|  ---  |\n| x |');
    expect(cellTexts(editor)).toEqual([[['a']], [['x']]]);
  });

  it('reads a row of dashes padded with other whitespace as a body row', () => {
    using editor = importMarkdown('| h |\n| --- |\n| \u00a0---\u00a0 |');
    expect(cellTexts(editor)).toEqual([[['h']], [['\u00a0---\u00a0']]]);
  });

  it('reads an escaped pipe at the end of a row as content', () => {
    using editor = importMarkdown('| a |\n| - |\n| x \\|');
    expect(cellTexts(editor)).toEqual([[['a']], [['x |']]]);
  });

  it.each([
    // An escaped row is text, and the row below has no delimiter row.
    ['\\| a |\n| b |', ['| a |', '| b |']],
    ['| --- |\n| a |', ['| --- |', '| a |']],
    // The delimiter row has a cell fewer than the header.
    ['| a | b |\n| --- |\n| c | d |', ['| a | b |', '| --- |', '| c | d |']],
  ])('reads %j as text, as GFM does', (markdown, lines) => {
    using editor = importMarkdown(markdown);
    expect(
      editor.read(() =>
        $getRoot()
          .getChildren()
          .map(node => node.getTextContent()),
      ),
    ).toEqual([lines.join('\n')]);
  });

  it('makes a table of a row typed into the editor', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableMarkdownTestExtension],
        name: 'TableShortcutTest',
        register: shortcutEditor =>
          registerMarkdownShortcuts(shortcutEditor, [TABLE]),
      }),
    );
    typeMarkdown(editor, '| a | ');
    expect(cellTexts(editor)).toEqual([[['a']]]);
  });

  it('leaves Enter after a row typed into the editor to insert its line', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableMarkdownTestExtension],
        name: 'TableShortcutTest',
        register: shortcutEditor =>
          registerMarkdownShortcuts(shortcutEditor, [TABLE]),
      }),
    );
    typeMarkdown(editor, '| a |');
    editor.update(
      () => {
        editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $getRoot()
          .getChildren()
          .map(node => [node.getType(), node.getTextContent()]),
      ),
    ).toEqual([
      ['paragraph', '| a |'],
      ['paragraph', ''],
    ]);
  });

  it.each([
    ['| a |\n| - |\n| x |  ', [[['a']], [['x']]]],
    ['   | a |\t\n | - |\n  | x |', [[['a']], [['x']]]],
  ])('reads the padded rows of %j', (markdown, cells) => {
    using editor = importMarkdown(markdown);
    expect(editor.read(() => $getRoot().getChildrenSize())).toBe(1);
    expect(cellTexts(editor)).toEqual(cells);
  });

  it.each([
    [() => $createEquationNode('x+y\n= z', false), '$x+y = z$'],
    [
      () => $createParagraphNode().append($createEquationNode('a\n b', true)),
      '$a b$',
    ],
  ])('writes an equation in a cell on its line, as %#', ($build, written) => {
    const markdown = exportTable(() => $cellOf($build() as ElementNode));
    expect(markdown.split('\n')[2]).toBe(`| ${written} |`);
    using imported = importMarkdown(markdown);
    imported.read(() => {
      const equation = $getRoot().getLastDescendant();
      assert($isEquationNode(equation), 'The cell must hold an equation');
      expect(equation.getEquation()).toBe(written.slice(1, -1));
    });
  });

  it('reads and writes the alignment of a delimiter row', () => {
    const markdown =
      '| a | b | c | d |\n| :-- | :-: | --: | --- |\n| 1 | 2 | 3 | 4 |';
    using editor = importMarkdown(markdown);
    expect(
      editor.read(() =>
        $getRoot()
          .getLastChildOrThrow<ElementNode>()
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
      ['left', 'center', 'right', ''],
      ['left', 'center', 'right', ''],
    ]);
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(
      markdown.replace(':-- | :-: | --: | ---', ':--- | :---: | ---: | ---'),
    );
  });

  it('writes the first row as the header of a table with none', () => {
    const markdown = exportTable(() =>
      $createTableNode().append(
        ...['a', 'b'].map(text =>
          $createTableRowNode().append(
            $createTableCellNode().append(
              $createParagraphNode().append($createTextNode(text)),
            ),
          ),
        ),
      ),
    );
    expect(markdown).toBe('| a |\n| --- |\n| b |');
  });

  function $cellOf(...blocks: ElementNode[]): TableNode {
    return $createTableNode().append(
      $createTableRowNode().append(
        $createTableCellNode(TableCellHeaderStates.ROW).append(
          $createParagraphNode().append($createTextNode('h')),
        ),
      ),
      $createTableRowNode().append($createTableCellNode().append(...blocks)),
    );
  }

  function exportTable($build: () => TableNode): string {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(() => $getRoot().clear().append($build()), {discrete: true});
    return editor.read(() => $convertToMarkdownString([TABLE]));
  }

  it('writes paragraphs and line breaks in a cell as <br> and escapes pipes', () => {
    const markdown = exportTable(() => {
      const table = $cellOf(
        $createParagraphNode().append($createTextNode('one')),
        $createParagraphNode().append(
          $createTextNode('two'),
          $createLineBreakNode(),
          $createTextNode('three'),
        ),
      );
      table
        .getLastChildOrThrow<ElementNode>()
        .append(
          $createTableCellNode().append(
            $createParagraphNode().append($createTextNode('x|y')),
          ),
        );
      return table;
    });
    expect(markdown).toBe(
      ['| h |  |', '| --- | --- |', '| one<br><br>two<br>three | x\\|y |'].join(
        '\n',
      ),
    );
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([
      [['h'], ['']],
      [['one', 'two\nthree'], ['x|y']],
    ]);
  });

  it('reads each spelling of <br> back', () => {
    using editor = importMarkdown(
      ['| a |', '| --- |', '| x<br/>y<BR /><br>z |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['a']], [['x\ny', 'z']]]);
  });

  // A GFM cell holds inline content only, so what reads as a block on a
  // line of its own is text after a <br>.
  it.each([
    ['5*<br># b', '5*\n# b'],
    ['_id<br>- x', '_id\n- x'],
    ['[TODO<br># b<br># c', '[TODO\n# b\n# c'],
    ['$x*y$ z_<br># h', 'x*y z_\n# h'],
    ['***a** b*<br># h', 'a b\n# h'],
    ['**a** b<br># c', 'a b\n# c'],
    ['````<br>a<br>````', '<br>a<br>'],
  ])('reads %j as inline content', (body, text) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [[text]]]);
  });

  it.each([
    [
      '**a<br>b**',
      [['a', 'bold'], 'linebreak', ['b', 'bold']],
      '**a**<br>**b**',
    ],
    [
      'x **<br>- y**',
      [['x ', ''], 'linebreak', ['- y', 'bold']],
      'x <br>**- y**',
    ],
    ['`a<br>b`', [['a<br>b', 'code']], '`a<br>b`'],
    ['\\<br>x', [['<br>x', '']], '\\<br>x'],
    ['\\\\<br>x', [['\\', ''], 'linebreak', ['x', '']], '\\\\<br>x'],
  ])('reads the <br> in %j as GFM does', (body, nodes, written) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    expect(
      editor.read(() =>
        $getRoot()
          .getLastChildOrThrow<ElementNode>()
          .getLastChildOrThrow<ElementNode>()
          .getFirstChildOrThrow<ElementNode>()
          .getFirstChildOrThrow<ElementNode>()
          .getChildren()
          .map(node =>
            $isTextNode(node)
              ? [
                  node.getTextContent(),
                  (['bold', 'code'] as const).find(format =>
                    node.hasFormat(format),
                  ) || '',
                ]
              : node.getType(),
          ),
      ),
    ).toEqual(nodes);
    // Export closes and reopens formatting around a line break.
    expect(
      editor.read(() => $convertToMarkdownString([TABLE])).split('\n')[2],
    ).toBe(`| ${written} |`);
  });

  it('writes a heading in a cell as the text GFM shows', () => {
    const markdown = exportTable(() =>
      $cellOf(
        $createParagraphNode().append(
          $createLinkNode('https://e.com/_a').append($createTextNode('a')),
        ),
        $createHeadingNode('h1').append($createTextNode('b')),
      ),
    );
    expect(markdown.split('\n')[2]).toBe(
      '| [a](https://e.com/_a)<br><br># b |',
    );
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([[['h']], [['a', '# b']]]);
    expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
      markdown,
    );
  });

  it.each([
    ['a&#8192;b', 'a\u2000b'],
    ['a&#08193;b<br>c', 'a\u2001b\nc'],
  ])('reads the reference in %j as text', (body, cell) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [[cell]]]);
  });

  it('writes a hard line break marked with a backslash as a bare <br>', () => {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        // A hard break imported (or pasted) from Markdown remembers its
        // `\` marker, which must not end up escaping the `<br>`.
        $convertFromMarkdownString('a\\\nb', TRANSFORMERS);
        const paragraph = $getRoot().getFirstChildOrThrow();
        const cell = $createTableCellNode(TableCellHeaderStates.ROW);
        paragraph.replace(
          $createTableNode().append($createTableRowNode().append(cell)),
        );
        cell.append(paragraph);
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(
      ['| a<br>b |', '| --- |'].join('\n'),
    );
  });

  it('writes the delimiter row of a single-column table', () => {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createTableNodeWithDimensions(2, 1, true));
      },
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(
      ['|  |', '| --- |', '|  |'].join('\n'),
    );
  });

  it.each(['a\\|b', 'a\\\\|b', 'a|b\\', '|q|'])(
    'round-trips the text %j in a cell',
    text => {
      const markdown = exportTable(() =>
        $cellOf($createParagraphNode().append($createTextNode(text))),
      );
      using imported = importMarkdown(markdown);
      expect(cellTexts(imported)).toEqual([[['h']], [[text]]]);
      expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
        markdown,
      );
    },
  );

  it.each(['a\\|b', 'a\\\\|b', 'a\\\\\\|b'])(
    'round-trips code %j with a backslash before a pipe',
    code => {
      const markdown = exportTable(() =>
        $cellOf(
          $createParagraphNode().append(
            $createTextNode(code).toggleFormat('code'),
          ),
        ),
      );
      using imported = importMarkdown(markdown);
      expect(cellTexts(imported)).toEqual([[['h']], [[code]]]);
      expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
        markdown,
      );
    },
  );

  it.each([
    'const x = `a\nb`;',
    '`a\nb`',
    '``a\nb``',
    'x `a\n\nb` y',
    'x `a\\|b` y',
    'a\\|b\\\\|c',
    'if x:\n  print(x)\n\treturn',
    '"""a  \nb"""',
    'x\\',
    'a \\\nb\\\\\nc',
    ' a ',
    '  ',
  ])('writes code block %j as a code span for each line', code => {
    const markdown = exportTable(() =>
      $cellOf($createCodeNode('js').append($createTextNode(code))),
    );
    using imported = importMarkdown(markdown);
    imported.read(() => {
      const cell = $getRoot()
        .getLastChildOrThrow<ElementNode>()
        .getLastChildOrThrow<ElementNode>()
        .getFirstChildOrThrow<ElementNode>();
      expect(cell.getTextContent()).toBe(code);
      // A tab is read as a TabNode of its own, outside the code.
      for (const text of cell.getAllTextNodes()) {
        expect(text.hasFormat('code') || $isTabNode(text)).toBe(true);
      }
    });
  });

  it.each(['**(b)**', '*(b)*'])(
    'keeps %j after a <br> whatever spaces the cell holds',
    body => {
      using editor = importMarkdown(
        [
          '| h |',
          '| --- |',
          `| a\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200ax<br>${body} |`,
        ].join('\n'),
      );
      editor.read(() => {
        const texts = $getRoot()
          .getLastChildOrThrow<ElementNode>()
          .getAllTextNodes();
        const last = texts[texts.length - 1];
        expect(last.getTextContent()).toBe('(b)');
        expect(last.hasFormat(body[1] === '*' ? 'bold' : 'italic')).toBe(true);
      });
    },
  );

  it('writes a code block with a pipe and a blank line in a cell', () => {
    const markdown = exportTable(() =>
      $cellOf($createCodeNode('js').append($createTextNode('a | b\n\nc'))),
    );
    expect(markdown.split('\n')[2]).toBe('| `a \\| b`<br><br>`c` |');
  });

  it('writes a list in a cell as the text GFM shows', () => {
    const markdown = exportTable(() =>
      $cellOf(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('x')),
          $createListItemNode().append($createTextNode('y')),
        ),
      ),
    );
    expect(markdown.split('\n')[2]).toBe('| - x<br>- y |');
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([[['h']], [['- x\n- y']]]);
  });

  it('writes a nested table in a cell as its lines', () => {
    const markdown = exportTable(() =>
      $cellOf(
        $createTableNode().append(
          $createTableRowNode().append(
            $createTableCellNode().append(
              $createParagraphNode().append($createTextNode('x')),
            ),
          ),
        ),
      ),
    );
    expect(markdown.split('\n')[2]).toBe('| \\| x \\|<br>\\| --- \\| |');
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([[['h']], [['| x |\n| --- |']]]);
  });

  it('round-trips the text of a nested list in a cell', () => {
    const markdown = exportTable(() =>
      $cellOf(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('x')),
          $createListItemNode().append(
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('y')),
            ),
          ),
        ),
      ),
    );
    expect(markdown.split('\n')[2]).toBe('| - x<br>    - y |');
    using imported = importMarkdown(markdown);
    expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
      markdown,
    );
  });

  it('reads a delimiter row below the first as a body row', () => {
    const markdown = ['| a |', '| --- |', '| b |', '| --- |', '| c |'].join(
      '\n',
    );
    using editor = importMarkdown(markdown);
    expect(cellTexts(editor)).toEqual([[['a']], [['b']], [['---']], [['c']]]);
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(markdown);
  });

  it('keeps an empty body row that reads like a delimiter row', () => {
    using editor = importMarkdown(
      ['| a | b |', '| --- | --- |', '|  |  |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([
      [['a'], ['b']],
      [[''], ['']],
    ]);
  });

  it.each(['-', ':-:', '---'])(
    'keeps a body row whose cells are only %j',
    text => {
      const markdown = exportTable(() =>
        $cellOf($createParagraphNode().append($createTextNode(text))),
      );
      using imported = importMarkdown(markdown);
      expect(cellTexts(imported)).toEqual([[['h']], [[text]]]);
    },
  );

  it('trims only spaces and tabs from a cell', () => {
    using editor = importMarkdown(['| h |', '| --- |', '|  a　 |'].join('\n'));
    expect(cellTexts(editor)).toEqual([[['h']], [[' a　']]]);
  });

  it('writes and reads long runs of spaces in a cell in linear time', () => {
    const text = `a${' '.repeat(1e5)}b`;
    const markdown = exportTable(() =>
      $cellOf($createParagraphNode().append($createTextNode(text))),
    );
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([[['h']], [[text]]]);
  });

  it('reads cells with transformers added to PLAYGROUND_TRANSFORMERS later', () => {
    const markdown = ['| h |', '| --- |', '| :) |'].join('\n');
    importMarkdown(markdown).dispose();
    const smiley: TextMatchTransformer = {
      dependencies: [],
      importRegExp: /:\)/,
      regExp: /:\)$/,
      replace: node => {
        node.setTextContent('\u263a');
      },
      type: 'text-match',
    };
    PLAYGROUND_TRANSFORMERS.push(smiley);
    onTestFinished(() => {
      PLAYGROUND_TRANSFORMERS.splice(
        PLAYGROUND_TRANSFORMERS.indexOf(smiley),
        1,
      );
    });
    using editor = importMarkdown(markdown);
    expect(cellTexts(editor)).toEqual([[['h']], [['\u263a']]]);
  });

  it('leaves the selection alone when it generates a table', () => {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        const text = $createTextNode('x');
        $getRoot().clear().append($createParagraphNode().append(text));
        text.select(1, 1);
        $generateNodesFromMarkdownString(
          '| a |\n| --- |\n| **b<br># c** |\n\n| d |\n| --- |\n| e |',
          [TABLE, ...PLAYGROUND_TRANSFORMERS],
        );
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'A range selection must remain');
        expect(selection.anchor.getNode().is(text)).toBe(true);
      },
      {discrete: true},
    );
  });
});
