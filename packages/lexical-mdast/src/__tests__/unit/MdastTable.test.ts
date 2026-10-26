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
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableCellNode,
  type TableNode,
  type TableRowNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
  configExtension,
  defineExtension,
  type ElementNode,
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
  MdastTableExtension,
} from '../../index';

function createEditor(): LexicalEditorWithDispose {
  // The caller is responsible for disposal (with `using`).
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastExtension,
        MdastTableExtension,
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
function convert(markdown: string, $edit?: () => void): string {
  using editor = createEditor();
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
    expect(convert(markdown)).toBe(markdown);
  });

  it('gives each row the header row’s cells', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 | 3 |', '| x |')),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |', '| x |   |'));
  });

  it('reads alignment into the paragraphs of each column and writes it back', () => {
    using editor = createEditor();
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
        expect(
          row.map(cell =>
            $assertNodeType(
              cell.getFirstChild(),
              $isElementNode,
            ).getFormatType(),
          ),
        ).toEqual(['left', 'center', 'right', '']);
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
    using editor = createEditor();
    editor.update(
      () =>
        $convertFromMarkdownString(
          table(
            '| a |',
            '| - |',
            '| x<br>y **p<BR/>q** <br class="c">z</br>w |',
          ),
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
      ).toBe('x\ny p\nq \nz\nw');
      expect($convertToMarkdownString()).toBe(
        table(
          '| a                                |',
          '| -------------------------------- |',
          '| x<br>y **p**<br>**q** <br>z<br>w |',
        ),
      );
    });
  });

  it('reads and writes the pipes in a cell as GFM does', () => {
    using editor = createEditor();
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
      convert(table('| a |', '| - |', '| x |'), () => {
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
      }),
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
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |'), () => {
        const [, [one], [three]] = $cells();
        three.remove();
        one.setRowSpan(0);
      }),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |', '|   | 4 |'));
  });

  it('writes the block decorators of a cell after the table', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        $cells()[1][0].append($createHorizontalRuleNode());
      }),
    ).toBe(table('| a |', '| - |', '| x |', '', '***'));
  });

  it('writes the alignment of the header cell, not of the cells below it', () => {
    expect(
      convert(table('| a | b |', '| - | -: |', '| 1 | 2 |'), () => {
        const [[, b], [one, two]] = $cells();
        $assertNodeType(one.getFirstChild(), $isElementNode).setFormat(
          'center',
        );
        $assertNodeType(b.getFirstChild(), $isElementNode).setFormat('');
        $assertNodeType(two.getFirstChild(), $isElementNode).setFormat('right');
      }),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('writes the alignment of the text in a cell as its column’s', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        $assertNodeType(
          $cells()[0][1].getFirstChild(),
          $isElementNode,
        ).setFormat('center');
      }),
    ).toBe(table('| a |  b  |', '| - | :-: |', '| 1 |  2  |'));
  });

  it('skips a row where a selection reaches only a block decorator', () => {
    using editor = createEditor();
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

  it('writes a column unaligned when the text in its header is', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () =>
        $assertNodeType(
          $cells()[0][0].getFirstChild(),
          $isElementNode,
        ).setFormat('justify'),
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('writes a column unaligned when the text in its cell is', () => {
    expect(
      convert(table('| a | b |', '| :-: | - |', '| 1 | 2 |'), () => {
        $assertNodeType(
          $cells()[0][0].getFirstChild(),
          $isElementNode,
        ).setFormat('justify');
        $assertNodeType(
          $cells()[1][0].getFirstChild(),
          $isElementNode,
        ).setFormat('justify');
      }),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('writes the alignment of the text in a cell over the cell’s', () => {
    expect(
      convert(table('| a |', '| :-: |', '| 1 |'), () => {
        $assertNodeType(
          $cells()[0][0].getFirstChild(),
          $isElementNode,
        ).setFormat('right');
      }),
    ).toBe(table('|  a |', '| -: |', '|  1 |'));
  });

  it('writes a row a merged cell spans with an empty cell', () => {
    expect(
      convert(table('| a |', '| - |', '| 1 |', '| 2 |'), () => {
        const [, [one], [two]] = $cells();
        two.remove();
        one.setRowSpan(2);
      }),
    ).toBe(table('| a |', '| - |', '| 1 |', '|   |'));
  });

  it('writes a merged cell with empty cells where it spans, aligned as it is', () => {
    expect(
      convert(table('| a | b | c |', '| :- | - | - |', '| 1 | 2 | 3 |'), () => {
        const [[a, b], [one, two]] = $cells();
        b.remove();
        a.setColSpan(2);
        two.remove();
        one.setColSpan(2);
      }),
    ).toBe(table('| a  |    | c |', '| :- | :- | - |', '| 1  |    | 3 |'));
  });

  it('writes a line ending in a cell’s text as a space, unescaped', () => {
    const markdown = table('| a         |', '| --------- |', '| a # b   c |');
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        $cells()[1][0].getAllTextNodes()[0].setTextContent('a\n# b \n c');
      }),
    ).toBe(markdown);
    expect(convert(markdown)).toBe(markdown);
  });

  it('reads alignment from the first line with text in a header cell', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const [[cell]] = $cells();
        cell
          .clear()
          .append(
            $createParagraphNode(),
            $createParagraphNode().append($createLineBreakNode()),
            $createParagraphNode().append($createTextNode(' ')),
            $createParagraphNode()
              .setFormat('center')
              .append($createTextNode('H')),
          );
      }),
    ).toBe(
      table(
        '| <br><br><br> <br>H |',
        '| :----------------: |',
        '|          x         |',
      ),
    );
  });

  it('skips what isn’t a row or cell', () => {
    expect(
      convert(table('| a |', '| - |', '| 1 |'), () => {
        $table().append($createParagraphNode());
        $table()
          .getFirstChildOrThrow<TableRowNode>()
          .append($createTextNode('x'));
      }),
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
    using editor = createEditor();
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
      convert(table('| a |', '| - |', '| x |'), () => {
        const [cell] = $cells()[1];
        cell.getFirstChildOrThrow().insertBefore($createParagraphNode());
        cell.append($createParagraphNode());
      }),
    ).toBe(table('| a         |', '| --------- |', '| <br>x<br> |'));
  });

  it('writes the lines of a cell a selection reaches', () => {
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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

  it('writes a table selection of a nested table as that table', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString(table('| a |', '| - |', '| x |'));
        const [cell] = $cells()[1];
        const p = $createTableCellNode().append(
          $createParagraphNode().append($createTextNode('p')),
        );
        const q = $createTableCellNode().append(
          $createParagraphNode().append($createTextNode('q')),
        );
        const inner = $createTableNode().append(
          $createTableRowNode().append(p, q),
        );
        cell.append(inner);
        $setSelection($createTableSelectionFrom(inner, p, q));
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        table('| p | q |', '| - | - |'),
      );
    });
  });

  it('imports a table with no rows as nothing', () => {
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
    using editor = createEditor();
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
  it('reads alignment from the first item of a list in a cell', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const [[cell]] = $cells();
        const item = $createListItemNode().append($createTextNode('y'));
        cell.clear().append($createListNode('bullet').append(item));
        item.setFormat('center');
      }),
    ).toBe(table('|  y  |', '| :-: |', '|  x  |'));
  });

  it('reads alignment from a quote around the text in a cell', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const [[cell]] = $cells();
        cell.clear().append(
          $createQuoteNode()
            .setFormat('center')
            .append($createParagraphNode().append($createTextNode('a'))),
        );
      }),
    ).toBe(table('|  a  |', '| :-: |', '|  x  |'));
  });

  it('reads no alignment from text in a nested table', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const [[cell]] = $cells();
        cell
          .clear()
          .append(
            $createTableNode().append(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode()
                    .setFormat('center')
                    .append($createTextNode('p')),
                ),
              ),
            ),
          );
      }),
    ).toBe(table('| p |', '| - |', '| x |'));
  });

  it('reads a start format as none over the cell’s, and a quote around a nested table', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        const [[a, b]] = $cells();
        a.setFormat('center');
        $assertNodeType(a.getFirstChild(), $isElementNode).setFormat('start');
        b.clear().append(
          $createQuoteNode()
            .setFormat('right')
            .append(
              $createTableNode().append(
                $createTableRowNode().append(
                  $createTableCellNode().append(
                    $createParagraphNode().append($createTextNode('p')),
                  ),
                ),
              ),
            ),
        );
      }),
    ).toBe(table('| a |  p |', '| - | -: |', '| 1 |  2 |'));
  });

  it('reads no alignment from the format placing a nested table', () => {
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const [[cell]] = $cells();
        cell.clear().append(
          $createTableNode()
            .setFormat('center')
            .append(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode().append($createTextNode('p')),
                ),
              ),
            ),
        );
      }),
    ).toBe(table('| p |', '| - |', '| x |'));
  });

  it('reads a negative row span as 1', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () =>
        $cells()[0][0].setRowSpan(-1),
      ),
    ).toBe(table('| a | b |', '| - | - |', '| 1 | 2 |'));
  });

  it('leaves out a table with no cells', () => {
    expect(
      convert(
        ['before', table('| a |', '| - |', '| 1 |'), 'after'].join('\n\n'),
        () => {
          $cells($assertNodeType($getRoot().getChildAtIndex(1), $isTableNode))
            .flat()
            .forEach(cell => cell.remove());
        },
      ),
    ).toBe('before\n\nafter');
  });

  it('writes the lines of a code block in a cell as inline code', () => {
    expect(
      convert(
        [table('| a |', '| - |', '| 1 |'), '```\nx|y\n\nz\n```'].join('\n\n'),
        () => {
          const code = $getRoot().getLastChildOrThrow();
          $cells()[1][0].clear().append(code);
        },
      ),
    ).toBe(
      table(
        '| a                 |',
        '| ----------------- |',
        '| `x\\|y`<br><br>`z` |',
      ),
    );
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

  it('writes the row of a cell of only block decorators a selection ends in', () => {
    using editor = createEditor();
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
        [table('| 1 | 2 |', '| - | - |', '|   |   |'), '***'].join('\n\n'),
      );
    });
  });

  it('copies a column of cells holding only block decorators', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $convertFromMarkdownString(
          ['x', table('| a | b |', '| - | - |'), 'y'].join('\n\n'),
        );
        const tableNode = $assertNodeType(
          $getRoot().getChildAtIndex(1),
          $isTableNode,
        );
        $cells(tableNode)[0][1].clear().append($createHorizontalRuleNode());
        $getRoot().select(0, 3);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($convertSelectionToMarkdownString()).toBe(
        ['x', table('| a |   |', '| - | - |'), '***', 'y'].join('\n\n'),
      );
    });
  });

  it('keeps a table whose cells hold only block decorators', () => {
    expect(
      convert(table('| a |', '| - |'), () => {
        $cells()[0][0].clear().append($createHorizontalRuleNode());
      }),
    ).toBe([table('|   |', '| - |'), '***'].join('\n\n'));
  });
});
