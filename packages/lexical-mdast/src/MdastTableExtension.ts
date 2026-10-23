/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler, MdastImportHandler, MdastNode} from './types';
import type {
  AlignType,
  PhrasingContent,
  Table,
  TableCell,
  TableRow,
} from 'mdast';

import {configExtension} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $findCellNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $unmergeCellNode,
  TableCellHeaderStates,
  TableCellNode,
  TableExtension,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  type ElementFormatType,
  INSERT_PARAGRAPH_COMMAND,
  type LexicalNode,
  mergeRegister,
  ParagraphNode,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append, inlineMarker} from './handlers';
import {MdastExtension} from './MdastExtension';

/** An inline HTML `<br>` tag, the line break a GFM cell can hold. */
const BR_RE = /^<br[\s/>]/i;

/** The column alignment GFM writes for an element format. */
function gfmAlign(format: ElementFormatType): AlignType {
  return format === 'left' || format === 'center' || format === 'right'
    ? format
    : null;
}

/**
 * A copy of `nodes` with each node `replace` returns an array for swapped
 * for it, and the children of the others mapped in turn.
 */
function mapPhrasing(
  nodes: readonly MdastNode[],
  replace: (node: MdastNode) => MdastNode[] | undefined,
): PhrasingContent[] {
  return nodes.flatMap(
    node =>
      replace(node) ||
      ('children' in node
        ? ({
            ...node,
            children: mapPhrasing(node.children, replace),
          } as MdastNode)
        : node),
  ) as PhrasingContent[];
}

/** A cell at a row and column of a table, which a merged cell spans. */
interface GridCell {
  cell: TableCellNode;
  /** Whether the cell starts at this row and column. */
  origin: boolean;
}

/**
 * The table rows of `table`, and the cells of each by column. Children that
 * aren't table rows or cells are skipped, and a row may be shorter than
 * others.
 */
function $tableGrid(table: TableNode): [TableRowNode[], GridCell[][]] {
  const rows = table.getChildren().filter($isTableRowNode);
  const grid: GridCell[][] = rows.map(() => []);
  rows.forEach((row, rowIndex) => {
    let column = 0;
    for (const cell of row.getChildren().filter($isTableCellNode)) {
      while (grid[rowIndex][column]) {
        column++;
      }
      const rowEnd = Math.min(rows.length, rowIndex + cell.getRowSpan());
      for (let i = rowIndex; i < rowEnd; i++) {
        for (let j = column; j < column + cell.getColSpan(); j++) {
          grid[i][j] = {cell, origin: i === rowIndex && j === column};
        }
      }
    }
  });
  return [rows, grid];
}

/**
 * The inline content of a cell as lines: those of each block in it, a
 * nested block's on lines of its own. Also returns the blocks with no
 * inline form (block decorators), and the lines each block element spans.
 */
function $cellLines(cell: TableCellNode): {
  blocks: Map<string, [number, number]>;
  decorators: LexicalNode[];
  lines: LexicalNode[][];
} {
  const lines: LexicalNode[][] = [];
  const blocks = new Map<string, [number, number]>();
  const decorators: LexicalNode[] = [];
  let line: LexicalNode[] | undefined;
  const $visit = (node: LexicalNode) => {
    if ($isElementNode(node) && !node.isInline()) {
      line = undefined;
      const first = lines.length;
      node.getChildren().forEach($visit);
      if (lines.length === first) {
        lines.push([]);
      }
      blocks.set(node.getKey(), [first, lines.length - 1]);
      line = undefined;
    } else if ($isDecoratorNode(node) && !node.isInline()) {
      decorators.push(node);
    } else {
      if (!line) {
        lines.push((line = []));
      }
      line.push(node);
    }
  };
  cell.getChildren().forEach($visit);
  if (lines.length === 0) {
    lines.push([]);
  }
  return {blocks, decorators, lines};
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  // A pipe GFM reads as escaped before anything else, which micromark
  // leaves escaped in raw HTML and autolinks.
  const unescapePipes = (value: string) => value.replace(/\\\|/g, '|');
  const replace = (child: MdastNode): MdastNode[] | undefined => {
    if (child.type === 'html' || child.type === 'htmlInline') {
      return BR_RE.test(child.value) &&
        !('children' in child && child.children.length > 0)
        ? [{type: 'break'}]
        : [
            {
              ...child,
              value: unescapePipes(child.value),
              ...('children' in child && {
                children: mapPhrasing(child.children, replace),
              }),
            } as MdastNode,
          ];
    }
    if (child.type === 'link' && inlineMarker(ctx, child) === '<') {
      return [
        {
          ...child,
          children: child.children.map(text =>
            text.type === 'text'
              ? {...text, value: unescapePipes(text.value)}
              : text,
          ),
          url: unescapePipes(child.url),
        },
      ];
    }
  };
  // Each row has the header row's cells, as GFM reads it: those past them
  // are dropped and missing ones are empty.
  const header = node.children[0].children;
  return $append(
    $createTableNode(),
    node.children.map((row, rowIndex) =>
      $append(
        $createTableRowNode(),
        header.map((_, column) => {
          const cell = row.children[column];
          return $append(
            $createTableCellNode(
              rowIndex === 0
                ? TableCellHeaderStates.ROW
                : TableCellHeaderStates.NO_STATUS,
            ).setFormat(align[column] || ''),
            [
              $append(
                $createParagraphNode(),
                cell
                  ? ctx.importChildren({
                      ...cell,
                      children: mapPhrasing(cell.children, replace),
                    })
                  : [],
              ),
            ],
          );
        }),
      ),
    ),
  );
};

const $exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  // A merged cell is written where it starts, with empty cells where it
  // spans, and every row as wide as the widest.
  const [rows, grid] = $tableGrid(node);
  const width = Math.max(0, ...grid.map(cells => cells.length));
  const children: TableRow[] = [];
  rows.forEach((row, rowIndex) => {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here. Cells stay: dropping
    // one would shift the remaining cells into other columns.
    if (!ctx.isIncluded(row)) {
      return;
    }
    children.push({
      children: Array.from({length: width}, (_, column): TableCell => {
        const at = grid[rowIndex][column];
        return {
          children:
            at && at.origin
              ? mapPhrasing(
                  $cellLines(at.cell).lines.flatMap((line, i) => [
                    ...(i > 0 ? [{type: 'break'} as const] : []),
                    ...ctx.exportInline(line),
                  ]),
                  child =>
                    // A cell holds one line: a line break in it is written
                    // as `<br>`, and a pipe in raw HTML escaped, as one is
                    // everywhere else in it.
                    child.type === 'break'
                      ? [{type: 'html', value: '<br>'}]
                      : child.type === 'html'
                        ? [{...child, value: child.value.replace(/\|/g, '\\|')}]
                        : undefined,
                )
              : [],
          type: 'tableCell',
        };
      }),
      type: 'tableRow',
    });
  });
  // GFM aligns columns, by the alignment of the header row's cells.
  return {
    align: Array.from({length: width}, (_, column) => {
      const at = (grid[0] || [])[column];
      return at ? gfmAlign(at.cell.getFormatType()) : null;
    }),
    children,
    type: 'table',
  };
};

/**
 * Keeps `table` to what a GFM table holds: a header row, then body rows,
 * of unmerged cells that each hold one unindented paragraph, and a column
 * alignment that each cell of the column has as its element format.
 */
function $normalizeTable(table: TableNode): void {
  // The alignment of each column is its header cell's, unless a block in
  // one of its cells was aligned. It is read before merged cells are split,
  // as the cells split off have no format.
  let [, grid] = $tableGrid(table);
  const align = (grid[0] || []).map(at => at.cell.getFormatType());
  for (const cells of grid) {
    cells.forEach(({cell}, column) => {
      for (const block of cell.getChildren()) {
        if ($isElementNode(block) && block.getFormatType() !== '') {
          align[column] = block.getFormatType();
        }
      }
    });
  }
  for (const cells of grid) {
    for (const {cell, origin} of cells) {
      if (origin && (cell.getColSpan() > 1 || cell.getRowSpan() > 1)) {
        $unmergeCellNode(cell);
      }
    }
  }
  [, grid] = $tableGrid(table);
  let last: LexicalNode = table;
  grid.forEach((cells, rowIndex) =>
    cells.forEach(({cell}, column) => {
      const headerState =
        rowIndex === 0
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS;
      if (cell.getHeaderStyles() !== headerState) {
        cell.setHeaderStyles(headerState);
      }
      const format = gfmAlign(align[column] || '') || '';
      if (cell.getFormatType() !== format) {
        cell.setFormat(format);
      }
      const children = cell.getChildren();
      const paragraph = children[0];
      if (children.length === 1 && $isParagraphNode(paragraph)) {
        if (paragraph.getFormatType() !== '') {
          paragraph.setFormat('');
        }
        if (paragraph.getIndent() !== 0) {
          paragraph.setIndent(0);
        }
        return;
      }
      // Each line of the cell, joined by line breaks.
      const {blocks, decorators, lines} = $cellLines(cell);
      const joined = $createParagraphNode();
      const ends: [number, number][] = lines.map((line, i) => {
        if (i > 0) {
          joined.append($createLineBreakNode());
        }
        const start = joined.getChildrenSize();
        joined.append(...line);
        return [start, joined.getChildrenSize()];
      });
      // A selection point in a block being removed moves to its lines.
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        for (const point of selection.getStartEndPoints()) {
          const span =
            point.key === cell.getKey()
              ? [0, lines.length - 1]
              : blocks.get(point.key);
          if (point.type === 'element' && span) {
            point.set(
              joined.getKey(),
              point.offset === 0 ? ends[span[0]][0] : ends[span[1]][1],
              'element',
            );
          }
        }
      }
      // A block with no inline form moves out of the table.
      for (const decorator of decorators) {
        last = last.insertAfter(decorator);
      }
      cell.clear().append(joined);
    }),
  );
}

/** Normalizes the table a changed cell is in. */
function $markTableDirty(node: LexicalNode): void {
  const row = node.getParent();
  const table = row && row.getParent();
  if ($isTableNode(table)) {
    table.markDirty();
  }
}

/**
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in the `@lexical/table`
 * nodes it ships.
 *
 * Import reads a table as GFM does: the first row is the header row, each
 * row has the header row's cells, column alignment is set on each cell of
 * the column as its element format, `<br>` is a line break, and an escaped
 * pipe is a pipe in raw HTML and autolinks too. Export writes any table as
 * GFM can: a cell's blocks and line breaks as lines separated by `<br>`, a
 * merged cell with empty cells where it spans, and the alignment of the
 * header row's cells as the column alignment. Add
 * {@link MdastStrictTableExtension} to keep tables in the editor to what GFM
 * holds, so they read back as they are.
 *
 * @example
 * ```ts
 * import {MdastShortcutsExtension, MdastTableExtension} from '@lexical/mdast';
 * import {buildEditorFromExtensions} from '@lexical/extension';
 * import {defineExtension} from 'lexical';
 *
 * const editor = buildEditorFromExtensions(
 *   defineExtension({
 *     dependencies: [MdastShortcutsExtension, MdastTableExtension],
 *     name: '[root]',
 *   }),
 * );
 * ```
 * @experimental
 */
export const MdastTableExtension = defineExtension({
  dependencies: [
    configExtension(MdastExtension, {
      exportRules: [{$export: $exportTable, type: TableNode}],
      importRules: [{$import: $importTable, type: 'table'}],
      mdastExtensions: [/* @__PURE__ */ gfmTableFromMarkdown()],
      micromarkExtensions: [/* @__PURE__ */ gfmTable()],
      toMarkdownExtensions: [/* @__PURE__ */ gfmTableToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
});

/**
 * Table editing kept to what a GFM table holds, so that tables read back
 * from Markdown as they are: {@link MdastTableExtension} with
 * `TableExtension`, configured without cell background colors. The first
 * row is the header row; a cell holds one paragraph of
 * inline content, whose line breaks are written as `<br>` (Enter in a cell
 * inserts one); and columns are aligned rather than cells. A column's
 * alignment is its header cell's element format, which each of its cells
 * is given, and aligning a block in any of its cells aligns it; an
 * alignment GFM has no form for (justify, start, end) clears it. Blocks
 * put into a cell become lines of its paragraph, except block decorators,
 * which move after the table, and merged cells are split.
 *
 * @experimental
 */
export const MdastStrictTableExtension = defineExtension({
  dependencies: [
    MdastTableExtension,
    // Not `hasCellMerge: false`: its transform would split a merged cell
    // before the alignment of the columns it spans is read.
    configExtension(TableExtension, {hasCellBackgroundColor: false}),
  ],
  name: '@lexical/mdast/StrictTable',
  register: editor =>
    mergeRegister(
      editor.registerNodeTransform(TableNode, $normalizeTable),
      editor.registerNodeTransform(TableCellNode, $markTableDirty),
      editor.registerNodeTransform(ParagraphNode, node => {
        const cell = node.getParent();
        if ($isTableCellNode(cell)) {
          $markTableDirty(cell);
        }
      }),
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const cell = $findCellNode(selection.anchor.getNode());
          if (cell && cell.is($findCellNode(selection.focus.getNode()))) {
            selection.insertLineBreak();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ),
});
