/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createCodeNode,
  $isCodeNode,
  CodeHighlightNode,
  CodeNode,
} from '@lexical/code-core';
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
  createEditor,
  defineExtension,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
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

  it.each([
    ['5*<br># b', ['5*', 'b']],
    ['_id<br>- x', ['_id', 'x']],
    ['a_b_<br># h', ['a_b_', 'h']],
    ['[TODO<br># b<br># c', ['[TODO', 'b', 'c']],
    ['$x*y$ z_<br># h', ['x*y z_', 'h']],
    ['[a](https://e.com/_a)<br># h', ['a', 'h']],
    ['***a** b*<br># h', ['a b', 'h']],
    ['a *<br># b', ['a *', 'b']],
  ])('reads the block after the <br> in %j', (body, blocks) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [blocks]]);
  });

  it('round-trips a link with an underscore in its URL before a heading', () => {
    const markdown = exportTable(() =>
      $cellOf(
        $createParagraphNode().append(
          $createLinkNode('https://e.com/_a').append($createTextNode('a')),
        ),
        $createHeadingNode('h1').append($createTextNode('b')),
      ),
    );
    using imported = importMarkdown(markdown);
    expect(markdown.split('\n')[2]).toBe(
      '| [a](https://e.com/_a)<br><br># b |',
    );
    expect(cellTexts(imported)).toEqual([[['h']], [['a', 'b']]]);
    expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
      markdown,
    );
  });

  it('still reads a block after a paragraph in a cell', () => {
    using editor = importMarkdown(
      ['| h |', '| --- |', '| **a** b<br># c |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [['a b', 'c']]]);
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
    ['````<br>a<br>````', 'a'],
    ['````<br>a ``` b<br>````', 'a ``` b'],
    ['````<br>```<br>x<br>````', '```\nx'],
  ])('reads the code block %j with a long fence', (body, code) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    editor.read(() => {
      const cell = $getRoot()
        .getLastChildOrThrow<ElementNode>()
        .getLastChildOrThrow<ElementNode>()
        .getFirstChildOrThrow<ElementNode>();
      expect(cell.getChildren().map(block => block.getType())).toEqual([
        'code',
      ]);
      expect(cell.getTextContent()).toBe(code);
    });
  });

  it('reads a list after an unopened ** before a <br>', () => {
    using editor = importMarkdown(
      ['| h |', '| --- |', '| x **<br>- y** |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [['x **', 'y**']]]);
  });

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
  ])('round-trips code block %j', code => {
    const markdown = exportTable(() =>
      $cellOf($createCodeNode('js').append($createTextNode(code))),
    );
    using imported = importMarkdown(markdown);
    imported.read(() => {
      const block = $getRoot().getLastDescendant()?.getParent();
      assert($isCodeNode(block), 'The cell must hold a code block');
      expect(block.getTextContent()).toBe(code);
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

  it('reads the line that opens a code block in a cell as code', () => {
    const markdown = [
      '| h |',
      '| --- |',
      '| ```js a\\\\\\|b<br>x<br>``` |',
    ].join('\n');
    using editor = importMarkdown(markdown);
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(markdown);
  });

  it('round-trips a code block with a pipe and a blank line in a cell', () => {
    const markdown = exportTable(() =>
      $cellOf($createCodeNode('js').append($createTextNode('a | b\n\nc'))),
    );
    expect(markdown.split('\n')[2]).toBe(
      '| ```js<br>a \\| b<br><br>c<br>``` |',
    );
    using imported = importMarkdown(markdown);
    imported.read(() => {
      const code = $getRoot().getLastDescendant()?.getParent();
      assert($isCodeNode(code), 'The cell must hold a code block');
      expect(code.getTextContent()).toBe('a | b\n\nc');
    });
  });

  it('round-trips a list in a cell', () => {
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
    // A list's text puts a blank line between its items.
    expect(cellTexts(imported)).toEqual([[['h']], [['x\n\ny']]]);
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
    expect(markdown.split('\n')[2]).toBe('| \\| x \\| |');
    using imported = importMarkdown(markdown);
    expect(cellTexts(imported)).toEqual([[['h']], [['| x |']]]);
  });

  it('round-trips a nested list in a cell', () => {
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

  it('keeps a lone delimiter row out of the table below it', () => {
    using editor = importMarkdown(['| --- |', '| a |'].join('\n'));
    editor.read(() => {
      const [first, table] = $getRoot().getChildren();
      expect($isParagraphNode(first) && first.getTextContent()).toBe('| --- |');
      assert($isTableNode(table), 'The row must be a table');
    });
  });

  it('round-trips a header row below the first', () => {
    const markdown = ['| a |', '| --- |', '| b |', '| --- |', '| c |'].join(
      '\n',
    );
    using editor = importMarkdown(markdown);
    expect(cellTexts(editor)).toEqual([[['a']], [['b']], [['c']]]);
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
