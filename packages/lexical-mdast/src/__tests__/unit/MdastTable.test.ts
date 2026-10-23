/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableSelectionFrom,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type SerializedTableCellNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
  type TableRowNode,
} from '@lexical/table';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  configExtension,
  defineExtension,
  type ElementNode,
  FORMAT_ELEMENT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  IS_BOLD,
  type SerializedElementNode,
  TextNode,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {defaultHandlers} from 'mdast-util-to-markdown';
import {assert, describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertFromMdast,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  $convertToMdast,
  MdastAutolinkLiteralExtension,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastShortcutsExtension,
  MdastStrictTableExtension,
  MdastTableExtension,
  MdastTaskListExtension,
} from '../../index';

function createEditor(strict: boolean): LexicalEditorWithDispose {
  // The caller is responsible for disposal (with `using`).
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastExtension,
        strict ? MdastStrictTableExtension : MdastTableExtension,
      ],
      name: '[root]',
      theme: {tableScrollableWrapper: 'table-wrapper'},
    }),
  );
}

function $table(): TableNode {
  return $assertNodeType($getRoot().getFirstChild(), $isTableNode);
}

function $cells(table = $table()): TableCellNode[][] {
  return table
    .getChildren()
    .filter($isTableRowNode)
    .map(row => row.getChildren().filter($isTableCellNode));
}

/** Imports `markdown`, applies `$edit`, and exports the document. */
function convert(markdown: string, $edit?: () => void, strict = true): string {
  using editor = createEditor(strict);
  editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
  if ($edit) {
    editor.update($edit, {discrete: true});
  }
  return editor.read(() => $convertToMarkdownString());
}

const table = (...rows: string[]) => rows.join('\n');

describe('MdastTableExtension', () => {
  it('round-trips a GFM table', () => {
    const markdown = table(
      '| a | b   |',
      '| - | --- |',
      '| 1 | 2   |',
      '| 3 | *4* |',
    );
    expect(convert(markdown, undefined, false)).toBe(markdown);
  });

  it('gives each row the header row’s cells', () => {
    expect(
      convert(
        table('| a | b |', '| - | - |', '| 1 | 2 | 3 |', '| x |'),
        undefined,
        false,
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |', '| x |   |'));
  });

  it('reads alignment into the cells of each column and writes it back', () => {
    using editor = createEditor(false);
    const markdown = table(
      '| a | b |  c | d |',
      '| :- | :-: | -: | - |',
      '| 1 | 2 | 3 | 4 |',
    );
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    editor.read(() => {
      for (const row of $cells()) {
        expect(row.map(cell => cell.getFormatType())).toEqual([
          'left',
          'center',
          'right',
          '',
        ]);
      }
      expect($convertToMarkdownString()).toBe(
        table(
          '| a  |  b  |  c | d |',
          '| :- | :-: | -: | - |',
          '| 1  |  2  |  3 | 4 |',
        ),
      );
    });
  });

  it('reads <br> in a cell as a line break and writes it back', () => {
    using editor = createEditor(false);
    editor.update(
      () =>
        $convertFromMarkdownString(
          table('| a |', '| - |', '| x<br>y **p<BR/>q** <br class="c">z |'),
        ),
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $assertNodeType(
        $cells()[1][0].getFirstChild(),
        $isParagraphNode,
      );
      expect(
        paragraph
          .getChildren()
          .map(child =>
            $isLineBreakNode(child) ? '\n' : child.getTextContent(),
          )
          .join(''),
      ).toBe('x\ny p\nq \nz');
      expect($convertToMarkdownString()).toBe(
        table(
          '| a                           |',
          '| --------------------------- |',
          '| x<br>y **p**<br>**q** <br>z |',
        ),
      );
    });
  });

  it('reads and writes the pipes in a cell as GFM does', () => {
    using editor = createEditor(false);
    editor.update(
      () =>
        $convertFromMarkdownString(
          table(
            '| a |',
            '| - |',
            '| a\\|b `c\\|d` <span title="e\\|f"> <http://g\\|h> [i](j\\|k) |',
          ),
        ),
      {discrete: true},
    );
    editor.read(() => {
      expect($cells()[1][0].getTextContent()).toBe(
        'a|b c|d <span title="e|f"> http://g|h i',
      );
      // Raw HTML imports as text without MdastHtmlExtension.
      expect($convertToMarkdownString()).toBe(
        table(
          '| a                                                        |',
          '| -------------------------------------------------------- |',
          '| a\\|b `c\\|d` \\<span title="e\\|f"> <http://g\\|h> [i](j\\|k) |',
        ),
      );
    });
  });

  it('writes the blocks of a cell as lines', () => {
    expect(
      convert(
        table('| a |', '| - |', '| x |'),
        () => {
          $cells()[1][0].append(
            $createHeadingNode('h2').append($createTextNode('h')),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('i1')),
              $createListItemNode().append(
                $createLinkNode('https://lexical.dev').append(
                  $createTextNode('i2'),
                ),
              ),
            ),
            $createParagraphNode(),
            $createParagraphNode().append($createTextNode('z')),
          );
        },
        false,
      ),
    ).toBe(
      table(
        '| a                                                  |',
        '| -------------------------------------------------- |',
        '| x<br>h<br>i1<br>[i2](https://lexical.dev)<br><br>z |',
      ),
    );
  });

  it('reads a row span of 0 as the rest of the rows', () => {
    expect(
      convert(
        table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'),
        () => {
          const [, [one], [three]] = $cells();
          three.remove();
          one.setRowSpan(0);
        },
        false,
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |', '|   | 4 |'));
  });

  it('writes the block decorators of a cell after the table', () => {
    expect(
      convert(
        table('| a |', '| - |', '| x |'),
        () => {
          $cells()[1][0].append($createHorizontalRuleNode());
        },
        false,
      ),
    ).toBe(table('| a |', '| - |', '| x |', '', '***'));
  });

  it('writes the alignment of the first aligned row', () => {
    expect(
      convert(
        table('| a | b |', '| :-: | -: |', '| 1 | 2 |'),
        () => {
          $insertTableRowAtNode($cells()[0][0], false);
        },
        false,
      ),
    ).toBe(
      table('|     |    |', '| :-: | -: |', '|  a  |  b |', '|  1  |  2 |'),
    );
  });

  it('writes the alignment of the text in a cell as its column’s', () => {
    expect(
      convert(
        table('| a | b |', '| - | - |', '| 1 | 2 |'),
        () => {
          $assertNodeType(
            $cells()[0][1].getFirstChild(),
            $isElementNode,
          ).setFormat('center');
        },
        false,
      ),
    ).toBe(table('| a |  b  |', '| - | :-: |', '| 1 |  2  |'));
  });

  it('skips a row where a selection reaches only a block decorator', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'),
        );
        const [, [one], [three, four]] = $cells();
        three.remove();
        one.setRowSpan(2);
        four.getFirstChildOrThrow().insertBefore($createHorizontalRuleNode());
        const selection = one.getAllTextNodes()[0].select(0, 0);
        selection.focus.set(four.getKey(), 1, 'element');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        [table('| 1 | 2 |', '| - | - |'), '***'].join('\n\n'),
      );
    });
  });

  it('skips a row where a selection reaches only a cell’s block decorator', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'),
        );
        const [, [one], [three, four]] = $cells();
        three.remove();
        one.setRowSpan(2);
        four.clear().append($createHorizontalRuleNode());
        const selection = one.getAllTextNodes()[0].select(0, 0);
        selection.focus.set(four.getKey(), 1, 'element');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        [table('| 1 | 2 |', '| - | - |'), '***'].join('\n\n'),
      );
    });
  });

  it('writes a column unaligned when the text in its header is', () => {
    expect(
      convert(
        table('| a | b |', '| :-: | - |', '| 1 | 2 |'),
        () =>
          $assertNodeType(
            $cells()[0][0].getFirstChild(),
            $isElementNode,
          ).setFormat('justify'),
        false,
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('writes a column unaligned when the text in its cell is', () => {
    expect(
      convert(
        table('| a | b |', '| :-: | - |', '| 1 | 2 |'),
        () => {
          $assertNodeType(
            $cells()[0][0].getFirstChild(),
            $isElementNode,
          ).setFormat('start');
          $assertNodeType(
            $cells()[1][0].getFirstChild(),
            $isElementNode,
          ).setFormat('start');
        },
        false,
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('writes the alignment of the text in a cell over the cell’s', () => {
    expect(
      convert(
        table('| a |', '| :-: |', '| 1 |'),
        () => {
          $assertNodeType(
            $cells()[0][0].getFirstChild(),
            $isElementNode,
          ).setFormat('right');
        },
        false,
      ),
    ).toBe(table('|  a |', '| -: |', '|  1 |'));
  });

  it('writes a row a merged cell spans with an empty cell', () => {
    expect(
      convert(
        table('| a |', '| - |', '| 1 |', '| 2 |'),
        () => {
          const [, [one], [two]] = $cells();
          two.remove();
          one.setRowSpan(2);
        },
        false,
      ),
    ).toBe(table('| a |', '| - |', '| 1 |', '|   |'));
  });

  it('writes a merged cell with empty cells where it spans', () => {
    expect(
      convert(
        table('| a | b | c |', '| :- | - | - |', '| 1 | 2 | 3 |'),
        () => {
          const [[a, b], [one, two]] = $cells();
          b.remove();
          a.setColSpan(2);
          two.remove();
          one.setColSpan(2);
        },
        false,
      ),
    ).toBe(table('| a  |   | c |', '| :- | - | - |', '| 1  |   | 3 |'));
  });

  it('skips what isn’t a row or cell', () => {
    expect(
      convert(
        table('| a |', '| - |', '| 1 |'),
        () => {
          $table().append($createParagraphNode());
          $table()
            .getFirstChildOrThrow<TableRowNode>()
            .append($createTextNode('x'));
        },
        false,
      ),
    ).toBe(table('| a |', '| - |', '| 1 |'));
  });

  it('reads and writes escaped pipes in autolink literals', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastAutolinkLiteralExtension,
          MdastTableExtension,
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () =>
        $convertFromMarkdownString(
          table('| a |', '| - |', '| http://a.dev/b\\|c |'),
        ),
      {discrete: true},
    );
    editor.read(() => {
      const link = $assertNodeType(
        $cells()[1][0].getFirstChildOrThrow<ElementNode>().getFirstChild(),
        $isLinkNode,
      );
      expect(link.getURL()).toBe('http://a.dev/b|c');
      expect(link.getTextContent()).toBe('http://a.dev/b|c');
      expect($convertToMarkdownString()).toBe(
        table(
          '| a                 |',
          '| ----------------- |',
          '| http://a.dev/b\\|c |',
        ),
      );
    });
  });

  it('escapes the pipes in raw HTML in a cell after any backslashes', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastTableExtension,
          // Raw HTML imports as text without MdastHtmlExtension; this writes
          // it back as raw HTML.
          configExtension(MdastExtension, {
            exportRules: [
              {
                $export: node =>
                  $isTextNode(node) && node.getTextContent().startsWith('<')
                    ? {type: 'html', value: node.getTextContent()}
                    : null,
                type: TextNode,
              },
            ],
          }),
        ],
        name: '[root]',
      }),
    );
    const markdown = table(
      '| a                                     |',
      '| ------------------------------------- |',
      '| <span title="\\|"> <span title="\\\\\\|"> |',
    );
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    editor.read(() => {
      const html = '<span title="|"> <span title="\\\\|">';
      expect($cells()[1][0].getTextContent()).toBe(html);
      // The escapes are written with the cell, not kept in its mdast.
      const [tableNode] = $convertToMdast().children;
      assert(tableNode.type === 'table');
      expect(tableNode.children[1].children[0].children).toEqual([
        {type: 'html', value: html},
      ]);
      expect($convertToMarkdownString()).toBe(markdown);
    });
    // A pipe after an odd run of backslashes, which a cell can't hold, isn't
    // where GFM ends the cell, so it's written as it is.
    editor.update(
      () => {
        $cells()[1][0].getAllTextNodes()[0].setTextContent('<i title="\\|">');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table(
          '| a              |',
          '| -------------- |',
          '| <i title="\\|"> |',
        ),
      );
    });
  });

  it('keeps the spaces at the edges of a cell', () => {
    const markdown = table(
      '| a                  |',
      '| ------------------ |',
      '| &#x20; x<br> &#x9; |',
    );
    using editor = createEditor(false);
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    editor.read(() => {
      expect($cells()[1][0].getTextContent()).toBe('  x\n \t');
      expect($convertToMarkdownString()).toBe(markdown);
    });
    // A backslash before the space stays a backslash.
    editor.update(
      () => {
        $cells()[1][0]
          .clear()
          .append($createParagraphNode().append($createTextNode('x\\ ')));
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('| a         |', '| --------- |', '| x\\\\&#x20; |'),
      );
    });
  });

  it('writes the empty lines at the edges of a cell', () => {
    expect(
      convert(
        table('| a |', '| - |', '| x |'),
        () => {
          const [cell] = $cells()[1];
          cell.getFirstChildOrThrow().insertBefore($createParagraphNode());
          cell.append($createParagraphNode());
        },
        false,
      ),
    ).toBe(table('| a         |', '| --------- |', '| <br>x<br> |'));
  });

  it('writes the lines of a cell a selection reaches', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        const y = $createTextNode('y');
        cell.append(
          $createParagraphNode(),
          $createParagraphNode().append(y),
          $createParagraphNode(),
        );
        y.select(0, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('y');
    });
  });

  it('writes the blocks a selection in a cell reaches as paragraphs', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        const y = $createTextNode('y');
        cell.append($createParagraphNode().append(y));
        const selection = cell.getAllTextNodes()[0].select(0, 0);
        selection.focus.set(y.getKey(), 1, 'text');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('x\n\ny');
    });
  });

  it('exports a table from an editor state read without an editor', () => {
    using editor = createEditor(false);
    const markdown = table('| a |', '| - |', '| 1 |');
    editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
    const {output} = getExtensionDependencyFromEditor(editor, MdastExtension);
    expect(
      editor.getEditorState().read(() => output.$convertToMarkdownString()),
    ).toBe(markdown);
  });

  it('writes whole tables in a document export during a selection export', () => {
    let whole: string[] = [];
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          configExtension(MdastExtension, {
            toMarkdownExtensions: [
              {
                handlers: {
                  root(node, parent, state, info) {
                    whole = $convertToMdast().children.map(({type}) => type);
                    return defaultHandlers.root(node, parent, state, info);
                  },
                },
              },
            ],
          }),
          MdastTableExtension,
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString(table('| x |', '| - |'));
        $cells()[0][0].getAllTextNodes()[0].select(0, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('x');
    });
    expect(whole).toEqual(['table']);
  });

  it('writes a table selection of one cell as a table', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | -: |', '| 1 | 2 |'),
        );
        const [, [, two]] = $cells();
        $setSelection($createTableSelectionFrom($table(), two, two));
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        table('|  2 |', '| -: |'),
      );
    });
  });

  it('writes a one-cell table a selection holds whole', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| x |', '| - |'));
        $getRoot().select(0, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(table('| x |', '| - |'));
    });
  });

  it('writes the nodes a selection in a cell reaches in order', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        const y = $createTextNode('y');
        cell.append(
          $createHorizontalRuleNode(),
          $createParagraphNode().append(y),
        );
        const selection = cell.getAllTextNodes()[0].select(0, 0);
        selection.focus.set(y.getKey(), 1, 'text');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('x\n\n***\n\ny');
    });
    editor.update(
      () => {
        const selection = $createNodeSelection();
        selection.add(
          $assertNodeType(
            $cells()[1][0].getChildAtIndex(1),
            $isHorizontalRuleNode,
          ).getKey(),
        );
        $setSelection(selection);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('***');
    });
  });

  it('writes a nested table a selection stays in', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        const inner = $createTextNode('inner');
        cell.append(
          $createTableNode().append(
            $createTableRowNode().append(
              $createTableCellNode().append(
                $createParagraphNode().append(inner),
              ),
            ),
          ),
        );
        inner.select(0, 5);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('inner');
    });
  });

  it('imports a table with no rows as nothing', () => {
    using editor = createEditor(false);
    editor.update(
      () =>
        $convertFromMdast({
          children: [{children: [], type: 'table'}],
          type: 'root',
        }),
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getChildren().some($isTableNode)).toBe(false);
    });
  });

  it('keeps a line break in a cell a break in mdast', () => {
    using editor = createEditor(false);
    editor.update(
      () => $convertFromMarkdownString(table('| a |', '| - |', '| x<br>y |')),
      {discrete: true},
    );
    editor.read(() => {
      const [tableNode] = $convertToMdast().children;
      assert(tableNode.type === 'table');
      expect(
        tableNode.children[1].children[0].children.map(child => child.type),
      ).toEqual(['text', 'break', 'text']);
    });
  });

  it('writes nothing of a cell a selection doesn’t reach', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | - |', '| 1 | x |', '| 3 | 4 |'),
        );
        const [, [one, x], [, four]] = $cells();
        x.clear().append($createParagraphNode(), $createParagraphNode());
        four.append($createHorizontalRuleNode());
        one.getAllTextNodes()[0].select(0, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('1');
    });
    // A block decorator alone is written without its table.
    editor.update(
      () => {
        const rule = $cells()[2][1].getLastChildOrThrow();
        const selection = $createNodeSelection();
        selection.add(rule.getKey());
        $setSelection(selection);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('***');
    });
  });

  it('exports only the rows and columns a selection reaches', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'),
        );
        $cells()[2][0].getAllTextNodes()[0].select(0, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('3');
    });
  });

  it('writes the content of a merged cell a selection stays in', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| foo | b |', '| - | - |', '| 1 | 2 |'),
        );
        const [[foo, b]] = $cells();
        b.remove();
        foo.setColSpan(2);
        foo.getAllTextNodes()[0].select(0, 3);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe('foo');
    });
  });

  it('writes a table a selection leaves or holds whole', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          ['before', table('| a |', '| - |'), 'after'].join('\n\n'),
        );
        $getRoot().select(0, $getRoot().getChildrenSize());
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        ['before', table('| a |', '| - |'), 'after'].join('\n\n'),
      );
    });
    editor.update(
      () => {
        const [before] = $getRoot().getAllTextNodes();
        const selection = before.select(2, 2);
        const tableNode = $assertNodeType(
          $getRoot().getChildAtIndex(1),
          $isTableNode,
        );
        selection.focus.set($cells(tableNode)[0][0].getKey(), 1, 'element');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        ['fore', table('| a |', '| - |')].join('\n\n'),
      );
    });
  });

  it('exports only the columns a table selection spans', () => {
    using editor = createEditor(false);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b | c |', '| - | :-: | -: |', '| 1 | 2 | 3 |'),
        );
        const [, [, two, three]] = $cells();
        $setSelection($createTableSelectionFrom($table(), two, three));
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        table('|  2  |  3 |', '| :-: | -: |'),
      );
    });
  });
});

describe('MdastStrictTableExtension', () => {
  it('inserts a line break for Enter in a cell', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| xy |'));
        $cells()[1][0].getAllTextNodes()[0].select(1, 1);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('| a      |', '| ------ |', '| x<br>y |'),
      );
    });
  });

  it('joins the blocks put into a cell into lines of one paragraph', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const empty = $createParagraphNode();
        $cells()[1][0].append(
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('i1')),
          ),
          $createHorizontalRuleNode(),
          empty,
        );
        empty.select();
      },
      {discrete: true},
    );
    editor.read(() => {
      const [cell] = $cells()[1];
      const paragraph = $assertNodeType(cell.getFirstChild(), $isParagraphNode);
      expect(cell.getChildrenSize()).toBe(1);
      expect(paragraph.getTextContent()).toBe('x\ni1\n');
      // The rule moved out of the table, and the caret to the empty line.
      expect($isHorizontalRuleNode($table().getNextSibling())).toBe(true);
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.getNode().is(paragraph)).toBe(true);
      expect(selection.anchor.offset).toBe(paragraph.getChildrenSize());
    });
  });

  it('keeps a caret before a block decorator before the line after it', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [, [cell]] = $cells();
        cell.append(
          $createHorizontalRuleNode(),
          $createParagraphNode().append($createTextNode('after')),
        );
        cell.select(1, 1);
      },
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $assertNodeType(
        $cells()[1][0].getFirstChild(),
        $isParagraphNode,
      );
      expect(paragraph.getTextContent()).toBe('x\nafter');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.getNode().is(paragraph)).toBe(true);
      expect(selection.anchor.offset).toBe(2);
    });
  });

  it.each([true, false])(
    'leaves out a table with no cells (strict: %s)',
    strict => {
      expect(
        convert(
          ['before', table('| a |', '| - |', '| 1 |'), 'after'].join('\n\n'),
          () => {
            $cells($assertNodeType($getRoot().getChildAtIndex(1), $isTableNode))
              .flat()
              .forEach(cell => cell.remove());
          },
          strict,
        ),
      ).toBe('before\n\nafter');
    },
  );

  it('keeps the first row the header row', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| 1 |'));
        $insertTableRowAtNode($cells()[0][0], false);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($cells().map(([cell]) => cell.getHeaderStyles())).toEqual([
        TableCellHeaderStates.ROW,
        TableCellHeaderStates.NO_STATUS,
        TableCellHeaderStates.NO_STATUS,
      ]);
    });
  });

  it('adds no line for a block of only block decorators in a cell', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        $cells()[1][0].append(
          $createQuoteNode().append($createHorizontalRuleNode()),
        );
      }),
    ).toBe([table('| a | b |', '| - | - |', '| 1 | 2 |'), '***'].join('\n\n'));
  });

  it('splits merged cells, keeping the alignment of their columns', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () => {
        const [[a, b], [one, two]] = $cells();
        b.remove();
        a.setColSpan(2);
        two.remove();
        one.setColSpan(2);
      }),
    ).toBe(table('|  a  |   |', '| :-: | - |', '|  1  |   |'));
  });

  it('splits a merged cell loaded with a span past the last row', () => {
    using editor = createEditor(true);
    editor.update(
      () =>
        $convertFromMarkdownString(table('| a |', '| - |', '| 1 |', '| 2 |')),
      {discrete: true},
    );
    const json = editor.getEditorState().toJSON();
    const [header] = (json.root.children[0] as SerializedElementNode)
      .children as SerializedElementNode[];
    (header.children[0] as SerializedTableCellNode).rowSpan = 4;
    editor.setEditorState(editor.parseEditorState(json));
    editor.update(() => $table().markDirty(), {discrete: true});
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('| a |   |', '| - | - |', '|   | 1 |', '|   | 2 |'),
      );
    });
  });

  it('aligns the column of a node selection in a cell', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | -: |', '| 1 | 2 |'),
        );
        const selection = $createNodeSelection();
        selection.add($cells()[1][1].getAllTextNodes()[0].getKey());
        $setSelection(selection);
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('| a |  b  |', '| - | :-: |', '| 1 |  2  |'),
      );
    });
  });

  it('aligns the columns a selection spans', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b | c |', '| - | - | - |', '| 1 | 2 | 3 |'),
        );
        $cells()[1][1].getAllTextNodes()[0].select(0, 0);
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
    // GFM has no justified column.
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('| a |  b  | c |', '| - | :-: | - |', '| 1 |  2  | 3 |'),
      );
    });
    editor.update(
      () => {
        const [[a], [, , three]] = $cells();
        $setSelection($createTableSelectionFrom($table(), three, a));
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
    editor.read(() => {
      expect($table().getFormatType()).toBe('');
      expect($convertToMarkdownString()).toBe(
        table('|  a |  b |  c |', '| -: | -: | -: |', '|  1 |  2 |  3 |'),
      );
    });
  });

  it('keeps the alignment of a column a merged body cell spans', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () => {
        const [, [one, two]] = $cells();
        two.remove();
        one.setColSpan(2);
      }),
    ).toBe(table('|  a  | b |', '| :-: | - |', '|  1  |   |'));
  });

  it('aligns the columns from the anchor cell to the focus cell', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'),
        );
        const [, [one], [three]] = $cells();
        const selection = one.getAllTextNodes()[0].select(0, 0);
        const [text] = three.getAllTextNodes();
        selection.focus.set(text.getKey(), 1, 'text');
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table('|  a  | b |', '| :-: | - |', '|  1  | 2 |', '|  3  | 4 |'),
      );
    });
  });

  it('aligns the columns of a selection that ends after the table', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          [table('| a | b |', '| - | - |', '| 1 | 2 |'), 'after'].join('\n\n'),
        );
        const selection = $cells()[1][1].getAllTextNodes()[0].select(0, 0);
        const after = $getRoot().getLastChildOrThrow<ElementNode>();
        selection.focus.set(after.getKey(), 1, 'element');
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        [table('| a |  b |', '| - | -: |', '| 1 |  2 |'), 'after'].join('\n\n'),
      );
    });
  });

  it('aligns the columns of a selection from one table to another', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          [
            table('| a |', '| - |', '| 1 |'),
            'mid',
            table('| b |', '| - |', '| 2 |'),
          ].join('\n\n'),
        );
        const [first, , second] = $getRoot().getChildren();
        const selection = $cells($assertNodeType(first, $isTableNode))[1][0]
          .getAllTextNodes()[0]
          .select(0, 0);
        const [text] = $cells(
          $assertNodeType(second, $isTableNode),
        )[1][0].getAllTextNodes();
        selection.focus.set(text.getKey(), 1, 'text');
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
    editor.read(() => {
      // The blocks between the tables are formatted as rich text does.
      expect(
        $assertNodeType(
          $getRoot().getChildAtIndex(1),
          $isParagraphNode,
        ).getFormatType(),
      ).toBe('center');
      expect($convertToMarkdownString()).toBe(
        [
          table('|  a  |', '| :-: |', '|  1  |'),
          'mid',
          table('|  b  |', '| :-: |', '|  2  |'),
        ].join('\n\n'),
      );
    });
  });

  it('aligns a column by the text of its cells, as a pasted table is', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        for (const row of $cells()) {
          $assertNodeType(row[1].getFirstChild(), $isElementNode).setFormat(
            'center',
          );
        }
      }),
    ).toBe(table('| a |  b  |', '| - | :-: |', '| 1 |  2  |'));
  });

  it('keeps column alignment for justify from outside the table', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(
          ['before', table('| a | b |', '| :-: | :-: |', '| 1 | 2 |')].join(
            '\n\n',
          ),
        );
        const selection = $getRoot()
          .getFirstChildOrThrow<ElementNode>()
          .select(0, 0);
        const [text] = $cells(
          $assertNodeType($getRoot().getChildAtIndex(1), $isTableNode),
        )[0][0].getAllTextNodes();
        selection.focus.set(text.getKey(), 1, 'text');
      },
      {discrete: true},
    );
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        [
          'before',
          table('|  a  |  b  |', '| :-: | :-: |', '|  1  |  2  |'),
        ].join('\n\n'),
      );
    });
  });

  it('keeps a column’s alignment over a block’s in a cell below', () => {
    expect(
      convert(table('| a | b |', '| :-: | -: |', '| 1 | 2 |'), () => {
        const [, [one, two]] = $cells();
        $assertNodeType(one.getFirstChild(), $isElementNode).setFormat(
          'justify',
        );
        $assertNodeType(two.getFirstChild(), $isElementNode).setFormat('left');
      }),
    ).toBe(table('|  a  |  b |', '| :-: | -: |', '|  1  |  2 |'));
  });

  it('keeps column alignment when a row is inserted above the header', () => {
    expect(
      convert(table('| a |', '| -: |', '| 1 |'), () => {
        $insertTableRowAtNode($cells()[0][0], false);
      }),
    ).toBe(table('|    |', '| -: |', '|  a |', '|  1 |'));
  });

  it('clears the alignment of the table', () => {
    expect(
      convert(table('| a | b |', '| :- | - |', '| 1 | 2 |'), () => {
        $table().setFormat('right');
      }),
    ).toBe(table('| a  | b |', '| :- | - |', '| 1  | 2 |'));
  });

  it('cuts a row span past the last row', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        $cells()[1][0].setRowSpan(3);
      }),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('keeps the text format of the first block of a joined cell', () => {
    using editor = createEditor(true);
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        $assertNodeType(cell.getFirstChild(), $isParagraphNode).setTextFormat(
          IS_BOLD,
        );
        cell.append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.read(() => {
      const [cell] = $cells()[1];
      expect(cell.getChildrenSize()).toBe(1);
      expect(
        $assertNodeType(cell.getFirstChild(), $isParagraphNode).getTextFormat(),
      ).toBe(IS_BOLD);
    });
  });

  it('leaves a checkbox typed in a list item in a cell as text', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastShortcutsExtension,
          MdastTaskListExtension,
          MdastTableExtension,
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [text] = $cells()[1][0].getAllTextNodes();
        text
          .getParentOrThrow()
          .replace(
            $createListNode('bullet').append(
              $createListItemNode().append(text),
            ),
          );
        text.select(0, 0);
      },
      {discrete: true},
    );
    for (const chunk of ['[', ' ', ']', ' ']) {
      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.insertText(chunk);
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      expect($cells()[1][0].getTextContent()).toBe('[ ] x');
    });
  });

  // A quote can only be in a cell without MdastStrictTableExtension.
  it.each([
    ['paragraph', true],
    ['quote', false],
    ['paragraph in a container', false],
  ])(
    'leaves a block marker typed in a %s in a cell as text',
    (kind, strict) => {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            MdastCommonMarkExtension,
            MdastShortcutsExtension,
            strict ? MdastStrictTableExtension : MdastTableExtension,
          ],
          name: '[root]',
          theme: {tableScrollableWrapper: 'table-wrapper'},
        }),
      );
      editor.update(
        () => {
          $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
          const [text] = $cells()[1][0].getAllTextNodes();
          if (kind === 'quote') {
            text.getParentOrThrow().replace($createQuoteNode().append(text));
          } else if (!strict) {
            text
              .getParentOrThrow()
              .replace(
                $createQuoteNode()
                  .setIsShadowRoot(true)
                  .append($createParagraphNode().append(text)),
              );
          }
          text.select(0, 0);
        },
        {discrete: true},
      );
      for (const chunk of ['#', ' ']) {
        editor.update(
          () => {
            const selection = $getSelection();
            assert($isRangeSelection(selection));
            selection.insertText(chunk);
          },
          {discrete: true},
        );
      }
      editor.read(() => {
        expect($convertToMarkdownString()).toBe(
          table('| a   |', '| --- |', '| # x |'),
        );
      });
    },
  );
});
