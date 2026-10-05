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
import {$isLinkNode, LinkNode} from '@lexical/link';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isTableNode,
  TableCellHeaderStates,
  TableExtension,
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
  $isTextNode,
  createEditor,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

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
    nodes: [CodeNode, CodeHighlightNode, LinkNode],
  });

  function exportCells(): string {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        const header = $createTableRowNode().append(
          $createTableCellNode(TableCellHeaderStates.ROW).append(
            $createParagraphNode().append($createTextNode('a')),
          ),
          $createTableCellNode(TableCellHeaderStates.ROW).append(
            $createParagraphNode().append($createTextNode('b')),
          ),
        );
        const body = $createTableRowNode().append(
          $createTableCellNode().append(
            $createParagraphNode().append($createTextNode('one')),
            $createParagraphNode().append(
              $createTextNode('two'),
              $createLineBreakNode(),
              $createTextNode('three'),
            ),
          ),
          $createTableCellNode().append(
            $createParagraphNode().append($createTextNode('x|y')),
          ),
        );
        $getRoot().clear().append($createTableNode().append(header, body));
      },
      {discrete: true},
    );
    return editor.read(() => $convertToMarkdownString([TABLE]));
  }

  it('writes line breaks in a cell as <br> and escapes pipes', () => {
    expect(exportCells()).toBe(
      ['| a | b |', '| --- | --- |', '| one<br>two<br>three | x\\|y |'].join(
        '\n',
      ),
    );
  });

  it('reads <br>, escaped pipes and the legacy \\n back', () => {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        $convertFromMarkdownString(
          [
            '| a | b |',
            '| --- | --- |',
            '| one<br>two <br/> three | x\\|y\\nz |',
          ].join('\n'),
          [TABLE],
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      const table = $getRoot().getFirstChildOrThrow();
      assert($isTableNode(table), 'Root child must be a table');
      expect(
        table
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
          ),
      ).toEqual([
        [['a'], ['b']],
        [['one\ntwo\nthree'], ['x|y\nz']],
      ]);
      expect($convertToMarkdownString([TABLE])).toBe(
        [
          '| a | b |',
          '| --- | --- |',
          '| one<br>two<br>three | x\\|y<br>z |',
        ].join('\n'),
      );
    });
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

  it('keeps an escaped backslash before n when reading the legacy \\n', () => {
    using editor = importMarkdown(
      ['| a |', '| --- |', '| C:\\\\new |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['a']], [['C:\\new']]]);
  });

  it.each([
    ['`<br>`', '<br>', true],
    ['\\<br>', '<br>', false],
    ['`a\\|b`', 'a|b', true],
    ['`\\n`', '\\n', true],
  ])('keeps %s in a cell literal', (body, text, isCode) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [[text]]]);
    editor.read(() => {
      const cellText = $getRoot().getLastDescendant();
      assert($isTextNode(cellText), 'The cell must end in text');
      expect(cellText.hasFormat('code')).toBe(isCode);
    });
  });

  it.each(['a\\|b', 'a\\\\|b', 'a|b\\'])(
    'round-trips backslashes beside a pipe in a cell: %j',
    text => {
      using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createTableNode().append(
                $createTableRowNode().append(
                  $createTableCellNode(TableCellHeaderStates.ROW).append(
                    $createParagraphNode().append($createTextNode('h')),
                  ),
                ),
                $createTableRowNode().append(
                  $createTableCellNode().append(
                    $createParagraphNode().append($createTextNode(text)),
                  ),
                ),
              ),
            );
        },
        {discrete: true},
      );
      const markdown = editor.read(() => $convertToMarkdownString([TABLE]));
      using imported = importMarkdown(markdown);
      expect(cellTexts(imported)).toEqual([[['h']], [[text]]]);
      expect(imported.read(() => $convertToMarkdownString([TABLE]))).toBe(
        markdown,
      );
    },
  );

  it('escapes a literal <br> outside code spans and reads it back', () => {
    using editor = importMarkdown(
      ['| h |', '| --- |', '| `<br>` \\<br> a<br>b |'].join('\n'),
    );
    expect(cellTexts(editor)).toEqual([[['h']], [['<br> <br> a\nb']]]);
    expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(
      ['| h |', '| --- |', '| `<br>` \\<br> a<br>b |'].join('\n'),
    );
  });

  it.each([
    ['the legacy \\n', '```js\\nfoo\\nbar\\n```'],
    ['<br>', '```js<br>foo<br>bar<br>```'],
  ])('reads a code block in a cell written with %s', (_, body) => {
    using editor = importMarkdown(
      ['| h |', '| --- |', `| ${body} |`].join('\n'),
    );
    editor.read(() => {
      const cellCode = $getRoot().getAllTextNodes().at(-1)?.getParentOrThrow();
      assert($isCodeNode(cellCode), 'The cell must hold a code block');
      expect(cellCode.getLanguage()).toBe('js');
      expect(cellCode.getTextContent()).toBe('foo\nbar');
      expect($convertToMarkdownString([TABLE])).toBe(
        ['| h |', '| --- |', '| ```js<br>foo<br>bar<br>``` |'].join('\n'),
      );
    });
  });

  it.each([
    ['**', 'bold'],
    ['*', 'italic'],
    ['~~', 'strikethrough'],
  ] as const)(
    'keeps %s formatting across a <br> in a cell',
    (marker, format) => {
      const $cellShape = () => {
        const cell = $getRoot().getLastDescendant()?.getParentOrThrow();
        assert($isElementNode(cell), 'The cell must hold a paragraph');
        return cell
          .getChildren()
          .map(node =>
            $isTextNode(node)
              ? [node.getTextContent(), node.hasFormat(format)]
              : node.getType(),
          );
      };
      using editor = importMarkdown(
        ['| h |', '| --- |', `| ${marker}a<br>b${marker} |`].join('\n'),
      );
      expect(editor.read($cellShape)).toEqual([
        ['a', true],
        'linebreak',
        ['b', true],
      ]);
      // Export closes the formatting around the break, which reads back
      // the same way.
      const markdown = editor.read(() => $convertToMarkdownString([TABLE]));
      expect(markdown.split('\n')[2]).toBe(
        `| ${marker}a${marker}<br>${marker}b${marker} |`,
      );
      using reimported = importMarkdown(markdown);
      expect(reimported.read($cellShape)).toEqual(editor.read($cellShape));
    },
  );

  it.each([false, true])(
    'keeps a literal U+E000 in a cell (code: %s)',
    isCode => {
      using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
      editor.update(
        () => {
          const text = $createTextNode('a\uE000b');
          if (isCode) {
            text.toggleFormat('code');
          }
          $getRoot()
            .clear()
            .append(
              $createTableNode().append(
                $createTableRowNode().append(
                  $createTableCellNode(TableCellHeaderStates.ROW).append(
                    $createParagraphNode().append(text),
                  ),
                ),
              ),
            );
        },
        {discrete: true},
      );
      const body = isCode ? '`a\uE000b`' : 'a\uE000b';
      expect(editor.read(() => $convertToMarkdownString([TABLE]))).toBe(
        [`| ${body} |`, '| --- |'].join('\n'),
      );
    },
  );

  it.each([
    'const x = a*b;\nc;',
    '/* a */\nb;',
    'a\n\nb',
    'x = "<br>";\ny = "\\<br>";',
    '| p_q_r ~~s',
  ])('round-trips a code block in a cell: %j', code => {
    using editor = buildEditorFromExtensions(TableMarkdownTestExtension);
    editor.update(
      () => {
        const block = $createCodeNode('js');
        code.split('\n').forEach((line, i) => {
          if (i > 0) {
            block.append($createLineBreakNode());
          }
          if (line) {
            block.append($createTextNode(line));
          }
        });
        $getRoot()
          .clear()
          .append(
            $createTableNode().append(
              $createTableRowNode().append(
                $createTableCellNode(TableCellHeaderStates.ROW).append(block),
              ),
            ),
          );
      },
      {discrete: true},
    );
    const markdown = editor.read(() => $convertToMarkdownString([TABLE]));
    using reimported = importMarkdown(markdown);
    reimported.read(() => {
      const cellCode = $getRoot().getFirstDescendant()?.getParent();
      assert($isCodeNode(cellCode), 'The cell must hold a code block');
      expect(cellCode.getLanguage()).toBe('js');
      expect(cellCode.getTextContent()).toBe(code);
      expect($convertToMarkdownString([TABLE])).toBe(markdown);
    });
  });

  it('reads a link with a <br> in its text', () => {
    using editor = importMarkdown(
      ['| h |', '| --- |', '| [a<br>b](https://example.com) |'].join('\n'),
    );
    editor.read(() => {
      const link = $getRoot().getLastDescendant()?.getParent();
      assert($isLinkNode(link), 'The cell must hold a link');
      expect(link.getURL()).toBe('https://example.com');
      expect(
        link.getChildren().map(node => node.getTextContent() || node.getType()),
      ).toEqual(['a', '\n', 'b']);
      const markdown = $convertToMarkdownString([TABLE]);
      expect(markdown.split('\n')[2]).toBe('| [a<br>b](https://example.com) |');
    });
  });

  it('leaves a delimiter row with no table above it as text', () => {
    using editor = importMarkdown('| --- |');
    expect(
      editor.read(() =>
        $getRoot()
          .getChildren()
          .map(node => node.getTextContent()),
      ),
    ).toEqual(['| --- |']);
  });
});
