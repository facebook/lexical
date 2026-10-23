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
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {
  $createTableSelectionFrom,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
  type TableRowNode,
} from '@lexical/table';
import {
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
  TextNode,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
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

  it('reads the pipes in a cell as GFM does', () => {
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
    ).toBe(table('| a  |    | c |', '| :- | :- | - |', '| 1  |    | 3 |'));
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
    // A pipe after an odd run of backslashes, which a cell can't hold, is
    // still escaped.
    editor.update(
      () => {
        $cells()[1][0].getAllTextNodes()[0].setTextContent('<i title="\\|">');
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertToMarkdownString()).toBe(
        table(
          '| a                |',
          '| ---------------- |',
          '| <i title="\\\\\\|"> |',
        ),
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
      expect($convertSelectionToMarkdownString()).toBe(table('| y |', '| - |'));
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

  it('exports only the rows a selection reaches', () => {
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
      expect($convertSelectionToMarkdownString()).toBe(
        table('| 3 |   |', '| - | - |'),
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

  it('splits merged cells, keeping the alignment of their columns', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () => {
        const [[a, b], [one, two]] = $cells();
        b.remove();
        a.setColSpan(2);
        two.remove();
        one.setColSpan(2);
      }),
    ).toBe(table('|  a  |     |', '| :-: | :-: |', '|  1  |     |'));
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

  it('ignores the alignment of a block in a cell', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () => {
        const [, [one, two]] = $cells();
        $assertNodeType(one.getFirstChild(), $isElementNode).setFormat(
          'justify',
        );
        $assertNodeType(two.getFirstChild(), $isElementNode).setFormat('left');
      }),
    ).toBe(table('|  a  | b |', '| :-: | - |', '|  1  | 2 |'));
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

  // A quote can only be in a cell without MdastStrictTableExtension.
  it.each([
    ['paragraph', true],
    ['quote', false],
  ])('leaves a block marker typed in a %s in a cell as text', (_, strict) => {
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
        if (!strict) {
          text.getParentOrThrow().replace($createQuoteNode().append(text));
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
  });
});
