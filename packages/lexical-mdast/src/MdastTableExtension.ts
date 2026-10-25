/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler, MdastImportHandler, MdastNode} from './types';
import type {AlignType, PhrasingContent, Table, TableCell} from 'mdast';
import type {
  Handle,
  Options as ToMarkdownExtension,
} from 'mdast-util-to-markdown';

import {configExtension} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $findTableNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getSlotHost,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  defineExtension,
  type ElementFormatType,
  type ElementNode,
  type LexicalNode,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append, $isBlockLevelNode, $slotNodes, inlineMarker} from './handlers';
import {MdastExtension} from './MdastExtension';

/**
 * An inline HTML `<br>` tag (or `</br>`, which HTML reads as one), the line
 * break a GFM cell can hold.
 */
const BR_RE = /^<\/?br[\s/>]/i;

/** The column alignment GFM writes for an element format. */
function gfmAlign(format: ElementFormatType): AlignType {
  return format === 'left' || format === 'center' || format === 'right'
    ? format
    : null;
}

/**
 * Replaces each node for which `replace` returns an array with that array,
 * maps the children of every node the same way, and returns `nodes` itself
 * when nothing changed.
 */
function mapPhrasing(
  nodes: readonly MdastNode[],
  replace: (node: MdastNode) => MdastNode[] | undefined,
): PhrasingContent[] {
  let changed = false;
  const mapped = nodes.flatMap(node => {
    const replaced = replace(node);
    const result = (replaced || [node]).map(child => {
      const children =
        'children' in child && mapPhrasing(child.children, replace);
      return children && children !== child.children
        ? ({...child, children} as MdastNode)
        : child;
    });
    changed = changed || replaced !== undefined || result[0] !== node;
    return result;
  });
  return (changed ? mapped : nodes) as PhrasingContent[];
}

/** The host the node is in a named slot of, or else its parent. */
function $slotHostOrParent(node: LexicalNode): LexicalNode | null {
  return $getSlotHost(node) || node.getParent();
}

/** The cell of `table` that `node` is in, through named slots too. */
function $cellIn(node: LexicalNode, table: TableNode): TableCellNode | null {
  for (let n: LexicalNode | null = node; n; n = $slotHostOrParent(n)) {
    if ($isTableCellNode(n) && table.is($findTableNode(n))) {
      return n;
    }
  }
  return null;
}

/**
 * The format of the text in a cell: that of the block its first line with
 * content is in, or of the nearest block around it in the cell that has
 * one, or else the cell's. Blocks in a nested table count for nothing (the
 * nested table has its own alignment). A start or end format (as pasted
 * HTML often has) takes no GFM alignment.
 */
function $cellFormat(cell: TableCellNode): ElementFormatType {
  const {lines, owners} = $cellLines(cell);
  const first = lines.findIndex(line =>
    line.some(node => !$isLineBreakNode(node)),
  );
  let format: ElementFormatType = '';
  for (
    let node: LexicalNode | null = owners[Math.max(first, 0)];
    node && !node.is(cell);
    node = $slotHostOrParent(node)
  ) {
    // Text in a nested table has that table's alignment, not this one's,
    // and the table's own format places it.
    format = $isTableNode(node)
      ? ''
      : format || ($isElementNode(node) ? node.getFormatType() : '');
  }
  return format || cell.getFormatType();
}

/** A cell at a row and column of a table, which a merged cell spans. */
interface GridCell {
  cell: TableCellNode;
  /** Whether the cell starts at this row and column. */
  origin: boolean;
}

/**
 * The rows and columns `cell` spans from `rowIndex` in a table of
 * `rowCount` rows: a row span of 0 (as in HTML) or past the last row runs
 * to the last row, and any other span below 1 is 1.
 */
function $cellSpans(
  cell: TableCellNode,
  rowIndex: number,
  rowCount: number,
): [number, number] {
  const rowSpan = cell.getRowSpan();
  return [
    rowSpan === 0
      ? rowCount - rowIndex
      : Math.min(Math.max(1, rowSpan), rowCount - rowIndex),
    Math.max(1, cell.getColSpan()),
  ];
}

/**
 * The table rows of `table`, and the cells of each by column (a sparse
 * array where a row has no cell). Children that aren't table rows or cells
 * are skipped. Unlike `$computeTableMap`, this reads any table, whatever
 * transforms the editor has.
 */
function $tableGrid(table: TableNode): {
  grid: GridCell[][];
  rows: TableRowNode[];
} {
  const rows = table.getChildren().filter($isTableRowNode);
  const grid: GridCell[][] = rows.map(() => []);
  rows.forEach((row, rowIndex) => {
    let column = 0;
    for (const cell of row.getChildren().filter($isTableCellNode)) {
      while (grid[rowIndex][column]) {
        column++;
      }
      const [rowSpan, colSpan] = $cellSpans(cell, rowIndex, rows.length);
      for (let i = rowIndex; i < rowIndex + rowSpan; i++) {
        for (let j = column; j < column + colSpan; j++) {
          grid[i][j] = {cell, origin: i === rowIndex && j === column};
        }
      }
    }
  });
  return {grid, rows};
}

/**
 * The inline content of a cell as lines (at least one): those of each block
 * in it, a nested block's on lines of its own. Also returns the blocks with
 * no inline form (block decorators), and the block (or the cell) each line
 * is in.
 */
function $cellLines(cell: TableCellNode): {
  decorators: LexicalNode[];
  lines: LexicalNode[][];
  owners: ElementNode[];
} {
  const lines: LexicalNode[][] = [];
  const owners: ElementNode[] = [];
  const decorators: LexicalNode[] = [];
  let line: LexicalNode[] | undefined;
  const $visit = (node: LexicalNode, owner: ElementNode) => {
    if (!$isBlockLevelNode(node)) {
      if (!line) {
        lines.push((line = []));
        owners.push(owner);
      }
      line.push(node);
      return;
    }
    line = undefined;
    if ($isElementNode(node)) {
      const first = lines.length;
      const firstDecorator = decorators.length;
      $visitContent(node);
      // An empty block is an empty line; one of block decorators is none.
      if (lines.length === first && decorators.length === firstDecorator) {
        lines.push([]);
        owners.push(node);
      }
      line = undefined;
    } else {
      decorators.push(node);
    }
  };
  // A block's named slots come first (in the order they were filled), and
  // a slot with no content is no line.
  const $visitContent = (node: ElementNode) => {
    for (const slot of $slotNodes(node)) {
      const start = lines.length;
      $visit(slot, node);
      line = undefined;
      if (lines.slice(start).every(slotLine => slotLine.length === 0)) {
        lines.length = owners.length = start;
      }
    }
    node.getChildren().forEach(child => $visit(child, node));
  };
  $visitContent(cell);
  if (lines.length === 0) {
    lines.push([]);
    owners.push(cell);
  }
  return {decorators, lines, owners};
}

/**
 * Unescapes a pipe GFM reads as escaped before anything else, which
 * micromark leaves escaped in raw HTML and in autolinks.
 */
function unescapePipes(value: string): string {
  return value.replace(/\\\|/g, '|');
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  const replace = (child: MdastNode): MdastNode[] | undefined => {
    if (child.type === 'html' || child.type === 'htmlInline') {
      if (BR_RE.test(child.value)) {
        return [{type: 'break'}];
      }
      const value = unescapePipes(child.value);
      return value === child.value ? undefined : [{...child, value}];
    }
    // An autolink, `<…>` or literal, rather than `[text](url)`, which reads
    // its escapes as text does. Its text is its URL, as written.
    if (
      child.type === 'link' &&
      child.url.includes('\\|') &&
      (inlineMarker(ctx, child) || '[') !== '['
    ) {
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
  if (node.children.length === 0) {
    return [];
  }
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
            ),
            [
              $append(
                $createParagraphNode().setFormat(align[column] || ''),
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
  // A selection export that starts and ends in one cell of the table (or
  // selects nodes in it) writes the cell's nodes as they are, as copying in
  // a cell does; a table selection of its cells writes a table.
  const {selection} = ctx;
  const ends = $isNodeSelection(selection)
    ? selection.getNodes()
    : $isRangeSelection(selection) ||
        ($isTableSelection(selection) &&
          !node.is($findTableNode(selection.anchor.getNode())))
      ? [selection.anchor.getNode(), selection.focus.getNode()]
      : [];
  const endCell = ends.length > 0 ? $cellIn(ends[0], node) : null;
  if (endCell && ends.every(end => endCell.is($cellIn(end, node)))) {
    return ctx.exportBlocks(endCell);
  }
  // A merged cell is written where it starts, with empty cells where it
  // spans, and every row as wide as the widest. Block decorators, which a
  // cell can't hold, are written after the table.
  const {grid, rows} = $tableGrid(node);
  const decorators: LexicalNode[] = [];
  // The lines of a cell a selection export reaches (an empty one by its
  // block); the block decorators it reaches are collected.
  const cellsLines = new Map<TableCellNode, LexicalNode[][]>();
  const $linesOf = (cell: TableCellNode) => {
    let cached = cellsLines.get(cell);
    if (!cached) {
      const cellLines = $cellLines(cell);
      cached = cellLines.lines.filter((line, i) =>
        line.length > 0
          ? line.some(ctx.isIncluded)
          : ctx.isIncluded(cellLines.owners[i]),
      );
      cellsLines.set(cell, cached);
      decorators.push(...cellLines.decorators.filter(ctx.isIncluded));
    }
    return cached;
  };
  const written: GridCell[][] = [];
  let from = Infinity;
  let to = -1;
  rows.forEach((row, rowIndex) => {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here, as are rows where it
    // reaches only block decorators.
    if (!ctx.isIncluded(row)) {
      return;
    }
    const cells = grid[rowIndex];
    // The cells that start in the row, if any, else those spanning it.
    const own = cells.some(({origin}) => origin);
    if (
      cells.length > 0 &&
      !cells.some(
        ({cell, origin}) => (origin || !own) && $linesOf(cell).length > 0,
      )
    ) {
      return;
    }
    cells.forEach(({cell}, column) => {
      if ($linesOf(cell).length > 0) {
        from = Math.min(from, column);
        to = Math.max(to, column);
      }
    });
    written.push(cells);
  });
  if (to < 0) {
    return ctx.exportChildren(decorators);
  }
  // The columns from the first a selection export reaches to the last.
  const columns = <T>(map: (column: number) => T) =>
    Array.from({length: to - from + 1}, (_, i) => map(from + i));
  return [
    {
      // A column has the alignment of the text in its header cell (one a
      // merged header cell spans, that cell's), as GFM writes it under that
      // cell.
      align: columns(column => {
        const header = grid.length > 0 && grid[0][column];
        return header ? gfmAlign($cellFormat(header.cell)) : null;
      }),
      children: written.map(cells => ({
        children: columns(
          (column): TableCell => ({
            children:
              cells[column] && cells[column].origin
                ? // The lines of the cell, separated by breaks (which the
                  // cell writer below writes as `<br>`).
                  $linesOf(cells[column].cell).flatMap(
                    (line, i): PhrasingContent[] =>
                      i > 0
                        ? [{type: 'break'}, ...ctx.exportInline(line)]
                        : ctx.exportInline(line),
                  )
                : [],
            type: 'tableCell',
          }),
        ),
        type: 'tableRow',
      })),
      type: 'table',
    },
    // Exported after the cells, in document order.
    ...ctx.exportChildren(decorators),
  ];
};

/** A space or tab as a character reference. */
const encodeSpace = (space: string) => `&#x${space === ' ' ? 20 : 9};`;

/** A node of Markdown that the table handler writes as it is. */
const CELL_LINE = 'lexicalTableCellLine';
const cellLine = (value: string) =>
  ({type: CELL_LINE, value}) as unknown as PhrasingContent;

/**
 * `gfmTableToMarkdown`, with the content of each cell written as one line:
 * as it would be outside a table, with a line break written as `<br>`,
 * line endings as spaces, a space or tab at either edge (which GFM trims)
 * encoded, and each pipe GFM would end the cell at escaped (one after an
 * even run of backslashes, as GFM reads a backslash and a pipe in a cell
 * as a pipe before anything else). That covers raw HTML, code and
 * autolinks, which `gfmTableToMarkdown` writes as their handlers do
 * (percent-encoding a pipe in an autolink) or splits the cell in. A
 * backslash before a pipe in code or raw HTML has no form in a cell (GFM
 * reads the pair as a pipe whatever is written), so it is lost.
 *
 * @__NO_SIDE_EFFECTS__
 */
function gfmTableCellsToMarkdown(): ToMarkdownExtension {
  const extension = gfmTableToMarkdown();
  const handlers = extension.handlers || {};
  const handleTable = handlers.table as Handle;
  const table: Handle = (node: Table, parent, state, info) => {
    const exit = state.enter('phrasing');
    const children = node.children.map(row => ({
      ...row,
      children: row.children.map(cell => {
        const line = cellLine(
          state
            .containerPhrasing(
              {
                ...cell,
                // A line ending in text is written as the space it reads
                // as, before the text is escaped for where it is.
                children: mapPhrasing(cell.children, child =>
                  child.type === 'break'
                    ? [cellLine('<br>')]
                    : child.type === 'text' && /[\r\n]/.test(child.value)
                      ? [
                          {
                            ...child,
                            value: child.value.replace(/\r?\n|\r/g, ' '),
                          },
                        ]
                      : undefined,
                ),
              },
              {...info, after: ' ', before: ' '},
            )
            .replace(/\r?\n|\r/g, ' ')
            .replace(/^[\t ]/, encodeSpace)
            // A backslash before the last space would escape its `&`.
            .replace(
              /(\\*)([\t ])$/,
              (_, slashes: string, space: string) =>
                `${slashes}${slashes.length % 2 ? '\\' : ''}${encodeSpace(space)}`,
            )
            .replace(/(\\*)\|/g, (pipe, slashes: string) =>
              slashes.length % 2 ? pipe : `${slashes}\\|`,
            ),
        );
        return {...cell, children: [line]};
      }),
    }));
    exit();
    return handleTable({...node, children}, parent, state, info);
  };
  return {
    ...extension,
    handlers: {
      ...handlers,
      [CELL_LINE]: (node: {value: string}) => node.value,
      table,
    } as typeof handlers,
  };
}

/**
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in the `@lexical/table`
 * nodes it ships.
 *
 * Import reads a table as GFM does: the first row is the header row, each row
 * has the header row's cells, column alignment is set on the paragraph of each
 * cell of the column as its element format, `<br>` is a line break, and an
 * escaped pipe is a pipe in raw HTML, and in autolinks imported from Markdown
 * source (an mdast tree without it can't tell an autolink from `[text](url)`).
 * Export writes any table as near as GFM allows: a cell's blocks (a block's
 * named slots first) and line breaks as lines separated by `<br>`, a merged
 * cell with empty cells where it spans, block decorators in a cell after the
 * table, and as a column's alignment, that of the text in its header cell (the
 * format of the block its first line with content is in, or of the nearest
 * block around it with one, or else of the cell, where blocks in a nested table
 * count for nothing and start and end are none; a merged header cell's for each
 * column it spans), none for one GFM can't express. The alignment of other
 * cells has no form in GFM.
 *
 * @example
 * ```ts
 * import {MdastTableExtension} from '@lexical/mdast';
 * import {buildEditorFromExtensions} from '@lexical/extension';
 * import {TableExtension} from '@lexical/table';
 * import {defineExtension} from 'lexical';
 *
 * const editor = buildEditorFromExtensions(
 *   defineExtension({
 *     // TableExtension adds table editing: commands and table selection.
 *     dependencies: [MdastTableExtension, TableExtension],
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
      toMarkdownExtensions: [gfmTableCellsToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
});
