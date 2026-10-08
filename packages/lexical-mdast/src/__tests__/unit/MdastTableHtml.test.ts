/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Nodes as MdastNode, RootContent} from 'mdast';

import {$createCodeNode, CodeExtension} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  configExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  QuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
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
  MdastExtension,
  MdastHtmlExtension,
  MdastTableExtension,
  MdastTaskListExtension,
  rawHtmlBlock,
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

  it.each(['\nx\n', 'x\n\n', '\n'])(
    'keeps the empty last line of a code block in a cell: %j',
    code => {
      using editor = createEditor(true);
      editor.update(
        () =>
          $appendCell(
            $createCodeNode('js').append(
              ...code
                .split('\n')
                .flatMap((line, i): LexicalNode[] => [
                  ...(i > 0 ? [$createLineBreakNode()] : []),
                  ...(line ? [$createTextNode(line)] : []),
                ]),
            ),
          ),
        {discrete: true},
      );
      const markdown = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(editor.read(() => $convertToMarkdownString())).toBe(markdown);
      const cellCode = editor.read(() => {
        const shape = $bodyCellShape() as {'code:js': unknown[]}[];
        return shape[0]['code:js'];
      });
      expect(
        cellCode.map(part => (part === 'linebreak' ? '\n' : part)).join(''),
      ).toBe(code);
    },
  );

  it('keeps a block exported as inline HTML on a line of its own', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(MdastExtension, {
            exportRules: [
              {
                $export: () => [{type: 'html', value: '<span>x</span>'}],
                type: QuoteNode,
              },
            ],
          }),
          MdastCommonMarkExtension,
          MdastTableExtension,
          MdastHtmlExtension,
          RichTextExtension,
          TableExtension,
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () =>
        $appendCell(
          $createParagraphNode().append($createTextNode('a')),
          $createQuoteNode().append($createTextNode('q')),
        ),
      {discrete: true},
    );
    expect(bodyLine(editor.read(() => $convertToMarkdownString()))).toBe(
      'a<br><span>x</span>',
    );
  });

  function exportRawHtml(
    withHtml: boolean,
    $export: () => RootContent[],
  ): LexicalEditorWithDispose {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(MdastExtension, {
            exportRules: [{$export, type: QuoteNode}],
          }),
          MdastCommonMarkExtension,
          MdastTableExtension,
          ...(withHtml ? [MdastHtmlExtension] : []),
          RichTextExtension,
          TableExtension,
        ],
        name: '[root]',
      }),
    );
    editor.update(
      () => $appendCell($createQuoteNode().append($createTextNode('q'))),
      {discrete: true},
    );
    return editor;
  }

  it.each([
    [
      '<pre>a|b\n  c</pre><span\ntitle="x|y\nz">w</span>',
      '<pre>a&#124;b&#10;  c</pre><span title="x&#124;y&#10;z">w</span>',
    ],
    [
      "<!-- don't -->\n<b\nclass='a b'>y</b>",
      "<!-- don't -->&#10;<b class='a b'>y</b>",
    ],
    [
      '<div style="white-space: pre-wrap">a\n\u00a0b</div>',
      '<div style="white-space: pre-wrap">a&#10;\u00a0b</div>',
    ],
    [
      '<textarea>a<b\nc</textarea><script>a||b\nc</script>',
      '<textarea>a<b&#10;c</textarea><script>a&#124;&#124;b c</script>',
    ],
  ])('writes raw HTML %j in a cell on one line', (value, line) => {
    using editor = exportRawHtml(false, () => [{type: 'html', value}]);
    expect(bodyLine(editor.read(() => $convertToMarkdownString()))).toBe(line);
  });

  it('reads the newlines and pipes of raw HTML in a cell back', () => {
    using editor = exportRawHtml(true, () => [
      {type: 'html', value: '<pre>a|b\n  c</pre>'},
    ]);
    const markdown = editor.read(() => $convertToMarkdownString());
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toContain(
      'a|b\n  c',
    );
  });

  it('writes an htmlBlock in a cell on one line', () => {
    using editor = exportRawHtml(true, () => [
      rawHtmlBlock(
        '<details><summary>\n',
        [{type: 'text', value: 's|t'}],
        '\n</summary>\n\n',
        {
          flow: [
            {children: [{type: 'text', value: 'b'}], type: 'paragraph'},
            {children: [{type: 'text', value: 'c'}], type: 'paragraph'},
          ],
        },
        '\n</details>',
      ),
    ]);
    const markdown = editor.read(() => $convertToMarkdownString());
    expect(markdown.split('\n')).toHaveLength(3);
    expect(bodyLine(markdown)).toBe(
      '<details><summary>&#10;s\\|t&#10;</summary>&#10;&#10;b<br>c&#10;</details>',
    );
  });

  it.each([false, true])(
    'keeps the spaces at the edges of a line in a cell (HTML extension: %s)',
    withHtml => {
      using editor = createEditor(withHtml);
      editor.update(
        () =>
          $appendCell(
            $createParagraphNode().append(
              $createTextNode('a  '),
              $createLineBreakNode(),
              $createTextNode('\tb'),
            ),
            $createParagraphNode().append($createTextNode(' ')),
            $createParagraphNode().append($createTextNode('c ')),
          ),
        {discrete: true},
      );
      const markdown = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      const cell = editor.read(() =>
        $getRoot()
          .getLastDescendant()
          ?.getParents()
          .find($isTableCellNode)
          ?.getChildren()
          .map(node => node.getTextContent()),
      );
      expect(cell).toEqual(['a  ', '\tb', ' ', 'c ']);
      expect(editor.read(() => $convertToMarkdownString())).toBe(markdown);
    },
  );

  it('still trims the spaces written around a <br>', () => {
    using editor = createEditor(false);
    editor.update(() => $convertFromMarkdownString(table('a <br>  b')), {
      discrete: true,
    });
    expect(
      editor.read(() =>
        $getRoot()
          .getLastDescendant()
          ?.getParents()
          .find($isTableCellNode)
          ?.getChildren()
          .map(node => node.getTextContent()),
      ),
    ).toEqual(['a', 'b']);
  });

  it('keeps a line of only whitespace after a block in a cell', () => {
    using editor = createEditor(true);
    editor.update(
      () =>
        $appendCell(
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('a')),
          ),
          $createParagraphNode().append($createTextNode('  ')),
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('b')),
          ),
          // Not padding in GFM, so not trimmed either.
          $createParagraphNode().append($createTextNode('\u00a0')),
          $createParagraphNode().append($createTextNode(' x ')),
        ),
      {discrete: true},
    );
    const markdown = editor.read(() => $convertToMarkdownString());
    editor.update(() => $convertFromMarkdownString(markdown), {
      discrete: true,
    });
    expect(
      editor.read(() =>
        $getRoot()
          .getLastDescendant()
          ?.getParents()
          .find($isTableCellNode)
          ?.getChildren()
          .map(node => [node.getType(), node.getTextContent()]),
      ),
    ).toEqual([
      ['list', 'a'],
      ['paragraph', '  '],
      ['list', 'b'],
      ['paragraph', '\u00a0'],
      ['paragraph', ' x '],
    ]);
  });

  it.each([
    ['', 'a <br>  b', ['a', 'b']],
    ['', 'a<br>&#32;b', ['a', ' b']],
    // Blank lines before it, and a heading whose marker is read by offset.
    ['h\n=\n\n\n', 'a<br>&#32;b', ['a', ' b']],
  ])('reads %j%j in a tree without offsets', (prefix, body, lines) => {
    // A tree transform may leave nodes with lines and columns only.
    const dropOffsets = (node: MdastNode) => {
      if (node.position) {
        delete node.position.start.offset;
        delete node.position.end.offset;
      }
      if ('children' in node) {
        node.children.forEach(dropOffsets);
      }
    };
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          MdastCommonMarkExtension,
          MdastTableExtension,
          TableExtension,
          configExtension(MdastExtension, {
            mdastExtensions: [{transforms: [dropOffsets]}],
          }),
        ],
        name: '[root]',
      }),
    );
    editor.update(() => $convertFromMarkdownString(prefix + table(body)), {
      discrete: true,
    });
    if (prefix !== '') {
      expect(editor.read(() => $convertToMarkdownString())).toMatch(/^h\n=+\n/);
    }
    expect(
      editor.read(() =>
        $getRoot()
          .getLastDescendant()
          ?.getParents()
          .find($isTableCellNode)
          ?.getChildren()
          .map(node => node.getTextContent()),
      ),
    ).toEqual(lines);
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
