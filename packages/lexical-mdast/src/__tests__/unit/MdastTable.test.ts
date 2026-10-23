/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$createLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createHeadingNode} from '@lexical/rich-text';
import {
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  defineExtension,
  INSERT_PARAGRAPH_COMMAND,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
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

  it('reads alignment into the cells of each column and writes it back', () => {
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
    using editor = createEditor();
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
    const markdown = table(
      '| a |',
      '| - |',
      '| a\\|b `c\\|d` <span title="e\\|f"> <http://g\\|h> [i](j\\|k) |',
    );
    using editor = createEditor();
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    editor.read(() => {
      expect($cells()[1][0].getTextContent()).toBe(
        'a|b c|d <span title="e|f"> http://g|h i',
      );
    });
  });

  it('inserts a line break for Enter in a cell', () => {
    using editor = createEditor();
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
    expect(
      convert(table('| a |', '| - |', '| x |'), () => {
        const cell = $cells()[1][0];
        cell.append(
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

  it('keeps the first row the header row', () => {
    using editor = createEditor();
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

  it('splits merged cells', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        const [first, second] = $cells()[1];
        second.remove();
        first.setColSpan(2);
      }),
    ).toBe(table('| a | b |', '| - | - |', '| 1 |   |'));
  });

  it('aligns a column when a block in one of its cells is aligned', () => {
    expect(
      convert(table('| a | b |', '| - | - |', '| 1 | 2 |'), () => {
        $assertNodeType(
          $cells()[1][1].getFirstChild(),
          $isElementNode,
        ).setFormat('center');
      }),
    ).toBe(table('| a |  b  |', '| - | :-: |', '| 1 |  2  |'));
  });

  it('clears an alignment GFM has no form for', () => {
    expect(
      convert(table('| a |', '| :-: |', '| 1 |'), () => {
        $cells()[0][0].setFormat('justify');
      }),
    ).toBe(table('| a |', '| - |', '| 1 |'));
  });

  it('exports only the rows a selection reaches', () => {
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
      expect($convertSelectionToMarkdownString()).toBe(
        table('| 3 |   |', '| - | - |'),
      );
    });
  });
});
