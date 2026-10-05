/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeExtension} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellHeaderStates,
  TableExtension,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastHtmlExtension,
  MdastTableExtension,
  MdastTaskListExtension,
} from '../../index';

function createEditor(withHtml: boolean): LexicalEditorWithDispose {
  // The caller is responsible for disposal (with `using`).
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastTaskListExtension,
        MdastTableExtension,
        ...(withHtml ? [MdastHtmlExtension] : []),
        // Node packages whose DOM import rules the cell HTML should reach.
        RichTextExtension,
        ListExtension,
        CodeExtension,
        TableExtension,
      ],
      name: '[root]',
    }),
  );
}

/** The body row's cell content, without the column padding. */
function bodyLine(markdown: string): string {
  return markdown.split('\n')[2].replace(/^\| | +\|$/g, '');
}

function table(body: string): string {
  return `| a |\n| - |\n| ${body} |`;
}

/** The second row's cell as a compact tree of node types and texts. */
function $bodyCellShape(): unknown {
  const shape = (node: LexicalNode): unknown => {
    if ($isTextNode(node)) {
      return node.getTextContent();
    }
    if (!$isElementNode(node)) {
      return node.getType();
    }
    const json = node.exportJSON() as {
      checked?: boolean;
      language?: string;
      listType?: string;
      tag?: string;
    };
    const label = [
      node.getType(),
      json.tag,
      json.listType,
      json.checked,
      json.language,
    ]
      .filter(part => part !== undefined)
      .join(':');
    return {[label]: node.getChildren().map(shape)};
  };
  const tableNode = $getRoot().getFirstChildOrThrow();
  const row = $isElementNode(tableNode) ? tableNode.getChildAtIndex(1) : null;
  const cell = $isElementNode(row) ? row.getFirstChild() : null;
  return $isElementNode(cell) ? cell.getChildren().map(shape) : null;
}

function importCell(markdown: string): {markdown: string; shape: unknown} {
  using editor = createEditor(true);
  editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
  return editor.read(() => ({
    markdown: $convertToMarkdownString(),
    shape: $bodyCellShape(),
  }));
}

function $appendCell(...children: LexicalNode[]): void {
  $getRoot()
    .clear()
    .append(
      $createTableNode().append(
        $createTableRowNode().append(
          $createTableCellNode(TableCellHeaderStates.ROW).append(
            $createParagraphNode().append($createTextNode('a')),
          ),
        ),
        $createTableRowNode().append(
          $createTableCellNode().append(...children),
        ),
      ),
    );
}

function $buildBlocks(): void {
  $appendCell(
    $createParagraphNode().append($createTextNode('intro')),
    $createListNode('number', 3).append(
      $createListItemNode().append($createTextNode('one')),
      $createListItemNode().append(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('nested')),
        ),
      ),
    ),
    $createHeadingNode('h3').append($createTextNode('title')),
    $createCodeNode('js').append(
      $createTextNode('a | *b*'),
      $createLineBreakNode(),
      $createTextNode('  c'),
    ),
    $createParagraphNode(),
  );
}

describe('MdastTableExtension with MdastHtmlExtension', () => {
  it('writes blocks in a cell as one line of HTML and reads them back', () => {
    using editor = createEditor(true);
    editor.update($buildBlocks, {discrete: true});
    const markdown = editor.read(() => $convertToMarkdownString());
    expect(bodyLine(markdown)).toBe(
      'intro<ol start="3"><li>one<ul><li>nested</li></ul></li></ol><h3>title</h3><pre data-language="js">a \\| \\*b\\*<br>  c</pre><br>',
    );
    const shape = editor.read($bodyCellShape);
    editor.update(() => $convertFromMarkdownString(markdown), {discrete: true});
    expect(editor.read($bodyCellShape)).toEqual(shape);
    expect(editor.read(() => $convertToMarkdownString())).toBe(markdown);
  });

  it('flattens the same blocks into lines without MdastHtmlExtension', () => {
    using editor = createEditor(false);
    editor.update($buildBlocks, {discrete: true});
    expect(bodyLine(editor.read(() => $convertToMarkdownString()))).toBe(
      'intro<br>one<br>nested<br>title<br>`a \\| *b*`<br>`  c`<br>',
    );
  });

  it('reads a GitHub task list, a quote and a rule in a cell', () => {
    const markdown = table(
      '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" disabled checked>done</li><li class="task-list-item"><input type="checkbox" disabled>todo</li></ul><blockquote>q<br>**r**</blockquote><hr>',
    );
    const result = importCell(markdown);
    expect(result.shape).toEqual([
      {
        'list:ul:check': [
          {'listitem:true': ['done']},
          {'listitem:false': ['todo']},
        ],
      },
      {quote: ['q', 'linebreak', 'r']},
      'horizontalrule',
    ]);
    expect(bodyLine(result.markdown)).toBe(bodyLine(markdown));
  });

  it.each([
    [
      'x<ul><li>i</li></ul>y',
      [
        {paragraph: ['x']},
        {'list:ul:bullet': [{listitem: ['i']}]},
        {paragraph: ['y']},
      ],
    ],
    [
      '<br><ul><li>i</li></ul>',
      [{paragraph: []}, {'list:ul:bullet': [{listitem: ['i']}]}],
    ],
    [
      '<ul><li>i</li></ul><br>',
      [{'list:ul:bullet': [{listitem: ['i']}]}, {paragraph: []}],
    ],
    [
      '<ul><li>i</li></ul><br><br>y',
      [
        {'list:ul:bullet': [{listitem: ['i']}]},
        {paragraph: []},
        {paragraph: ['y']},
      ],
    ],
    [
      '<ul><li>i</li></ul> <h2>h</h2>',
      [{'list:ul:bullet': [{listitem: ['i']}]}, {'heading:h2': ['h']}],
    ],
  ])('reads %s as the cell blocks it separates', (body, shape) => {
    const result = importCell(table(body));
    expect(result.shape).toEqual(shape);
    // The lines beside a block keep their `<br>`s only where they're empty.
    expect(bodyLine(result.markdown)).toBe(
      body.replace('</ul> <h2>', '</ul><h2>'),
    );
  });
});
