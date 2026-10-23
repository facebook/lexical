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
import type {
  Handle,
  Options as ToMarkdownExtension,
} from 'mdast-util-to-markdown';

import {configExtension} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $findCellNode,
  $findTableNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
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
  $getNodeByKeyOrThrow,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  type ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
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
 * `nodes` with each node `replace` returns an array for swapped for it, and
 * the children of the others mapped in turn: a copy where anything changed,
 * else `nodes` itself.
 */
function mapPhrasing(
  nodes: readonly MdastNode[],
  replace: (node: MdastNode) => MdastNode[] | undefined,
): PhrasingContent[] {
  let changed = false;
  const mapped = nodes.flatMap(node => {
    let result = replace(node);
    if (!result && 'children' in node) {
      const children = mapPhrasing(node.children, replace);
      result =
        children === node.children
          ? undefined
          : [{...node, children} as MdastNode];
    }
    changed = changed || result !== undefined;
    return result || [node];
  });
  return (changed ? mapped : nodes) as PhrasingContent[];
}

/** A cell at a row and column of a table, which a merged cell spans. */
interface GridCell {
  cell: TableCellNode;
  /** Whether the cell starts at this row and column. */
  origin: boolean;
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
      // A row span of 0 spans the rest of the rows, as in HTML.
      const rowSpan = cell.getRowSpan();
      const rowEnd =
        rowSpan > 0 ? Math.min(rows.length, rowIndex + rowSpan) : rows.length;
      const colEnd = column + Math.max(1, cell.getColSpan());
      for (let i = rowIndex; i < rowEnd; i++) {
        for (let j = column; j < colEnd; j++) {
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
 * no inline form (block decorators), the lines each block spans, and the
 * block (or the cell) each line is in.
 */
function $cellLines(cell: TableCellNode): {
  blocks: Map<string, [number, number]>;
  decorators: LexicalNode[];
  lines: LexicalNode[][];
  owners: LexicalNode[];
} {
  const lines: LexicalNode[][] = [];
  const owners: LexicalNode[] = [];
  const blocks = new Map<string, [number, number]>();
  const decorators: LexicalNode[] = [];
  let line: LexicalNode[] | undefined;
  const $visit = (node: LexicalNode, owner: LexicalNode) => {
    if ($isElementNode(node) && !node.isInline()) {
      line = undefined;
      const first = lines.length;
      node.getChildren().forEach(child => $visit(child, node));
      if (lines.length === first) {
        lines.push([]);
        owners.push(node);
      }
      blocks.set(node.getKey(), [first, lines.length - 1]);
      line = undefined;
    } else if ($isDecoratorNode(node) && !node.isInline()) {
      // It spans no line, before the line after it.
      blocks.set(node.getKey(), [lines.length, lines.length - 1]);
      decorators.push(node);
    } else {
      if (!line) {
        lines.push((line = []));
        owners.push(owner);
      }
      line.push(node);
    }
  };
  cell.getChildren().forEach(child => $visit(child, cell));
  if (lines.length === 0) {
    lines.push([]);
    owners.push(cell);
  }
  return {blocks, decorators, lines, owners};
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  // A pipe GFM reads as escaped before anything else, which micromark
  // leaves escaped in raw HTML and in autolinks.
  const unescapePipes = (value: string) => value.replace(/\\\|/g, '|');
  const replace = (child: MdastNode): MdastNode[] | undefined => {
    if (child.type === 'html' || child.type === 'htmlInline') {
      if (
        BR_RE.test(child.value) &&
        !('children' in child && child.children.length > 0)
      ) {
        return [{type: 'break'}];
      }
      const value = unescapePipes(child.value);
      return value === child.value
        ? undefined
        : [
            {
              ...child,
              value,
              ...('children' in child && {
                children: mapPhrasing(child.children, replace),
              }),
            } as MdastNode,
          ];
    }
    // An autolink, `<…>` or literal, rather than `[text](url)`, which reads
    // its escapes as text does. Its text is its URL, as written.
    const marker = child.type === 'link' && inlineMarker(ctx, child);
    if (
      child.type === 'link' &&
      marker &&
      marker !== '[' &&
      child.url.includes('\\|')
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
  // spans, and every row as wide as the widest. Block decorators, which a
  // cell can't hold, are written after the table.
  const {grid, rows} = $tableGrid(node);
  const width = grid.reduce((max, cells) => Math.max(max, cells.length), 0);
  const children: TableRow[] = [];
  const decorators: LexicalNode[] = [];
  // The lines of each cell in the rows a selection export reaches, from the
  // first line it reaches to the last (an empty one by its block), and the
  // block decorators it reaches in them.
  const written = new Map<TableCellNode, LexicalNode[][]>();
  rows.forEach((row, rowIndex) => {
    if (ctx.isIncluded(row)) {
      grid[rowIndex].forEach(({cell}) => {
        if (!written.has(cell)) {
          const {lines, owners, decorators: blocks} = $cellLines(cell);
          const reached = lines.map((line, i) =>
            line.length > 0
              ? line.some(ctx.isIncluded)
              : ctx.isIncluded(owners[i]),
          );
          written.set(
            cell,
            lines.slice(reached.indexOf(true), reached.lastIndexOf(true) + 1),
          );
          decorators.push(...blocks.filter(ctx.isIncluded));
        }
      });
    }
  });
  const linesOf = (cell: TableCellNode) => written.get(cell) || [];
  rows.forEach((row, rowIndex) => {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here, as are rows where it
    // reaches only block decorators. Cells stay: dropping one would shift
    // the remaining cells into other columns.
    const cells = grid[rowIndex];
    if (
      !ctx.isIncluded(row) ||
      (cells.length > 0 && !cells.some(at => linesOf(at.cell).length > 0))
    ) {
      return;
    }
    children.push({
      children: Array.from({length: width}, (_, column): TableCell => {
        const at = cells[column];
        const cellChildren: PhrasingContent[] = [];
        if (at && at.origin) {
          // The lines of the cell, separated by breaks (which the cell
          // writer below writes as `<br>`).
          linesOf(at.cell).forEach((line, i) => {
            if (i > 0) {
              cellChildren.push({type: 'break'});
            }
            cellChildren.push(...ctx.exportInline(line));
          });
        }
        return {children: cellChildren, type: 'tableCell'};
      }),
      type: 'tableRow',
    });
  });
  const exported = ctx.exportChildren(decorators);
  if (children.length === 0 || width === 0) {
    return exported;
  }
  // GFM aligns columns, by the alignment of the header row's cells.
  return [
    {
      align: Array.from({length: width}, (_, column) => {
        const at = (grid[0] || [])[column];
        return at ? gfmAlign(at.cell.getFormatType()) : null;
      }),
      children,
      type: 'table',
    },
    ...exported,
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
 * (percent-encoding a pipe in an autolink) or splits the cell in.
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
                children: mapPhrasing(cell.children, child =>
                  child.type === 'break' ? [cellLine('<br>')] : undefined,
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
 * Keeps `table` to what a GFM table holds: a header row, then body rows,
 * of unmerged cells that each hold one unindented paragraph, and a column
 * alignment that each cell of the column has as its element format.
 */
function $normalizeTable(table: TableNode): void {
  // Merged cells are split, and the cells split off keep their format. A
  // row span past the last row (or of 0, the rest of the rows) is cut to it
  // first, as the split can't fill it, and a column span of 0 is 1 (as the
  // grid reads them).
  let {grid} = $tableGrid(table);
  // A table with no cells has nothing GFM can write.
  if (!grid.some(cells => cells.length > 0)) {
    table.remove();
    return;
  }
  let split = false;
  grid.forEach((cells, rowIndex) =>
    cells.forEach(({cell, origin}) => {
      if (origin) {
        const rowSpan = cell.getRowSpan();
        if (!(rowSpan > 0 && rowSpan <= grid.length - rowIndex)) {
          cell.setRowSpan(grid.length - rowIndex);
        }
        if (cell.getColSpan() < 1) {
          cell.setColSpan(1);
        }
        if (cell.getColSpan() > 1 || cell.getRowSpan() > 1) {
          $unmergeCellNode(cell);
          split = true;
        }
      }
    }),
  );
  if (split) {
    ({grid} = $tableGrid(table));
  }
  // The columns are aligned as the cells of the first row with an aligned
  // cell are (the header row, unless a row was inserted above it); other
  // formats, of the table or a block in a cell, are cleared.
  const alignRow =
    grid.find(cells =>
      cells.some(({cell}) => gfmAlign(cell.getFormatType())),
    ) || [];
  const align = alignRow.map(({cell}) => gfmAlign(cell.getFormatType()));
  if (table.getFormatType() !== '') {
    table.setFormat('');
  }
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
      const format = align[column] || '';
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
      // Each line of the cell, joined by line breaks. A selection point on
      // a block being removed moves to the same place in its lines.
      const {blocks, decorators, lines} = $cellLines(cell);
      const selection = $getSelection();
      const points = $isRangeSelection(selection)
        ? selection
            .getStartEndPoints()
            .filter(
              point =>
                point.type === 'element' &&
                (point.key === cell.getKey() || blocks.has(point.key)),
            )
        : [];
      const targets = points.map(point => {
        const element = point.getNode();
        return $isElementNode(element)
          ? element.getChildAtIndex(point.offset)
          : null;
      });
      // The paragraph takes the text format of the cell's first block, the
      // format text typed into an empty one gets.
      const block = cell.getFirstChild();
      const joined = $isElementNode(block)
        ? $createParagraphNode()
            .setTextFormat(block.getTextFormat())
            .setTextStyle(block.getTextStyle())
        : $createParagraphNode();
      const ends = lines.map((line, i) => {
        if (i > 0) {
          joined.append($createLineBreakNode());
        }
        const start = joined.getChildrenSize();
        joined.append(...line);
        return [start, joined.getChildrenSize()];
      });
      points.forEach((point, i) => {
        const target = targets[i];
        const targetSpan = target && blocks.get(target.getKey());
        const span = blocks.get(point.key) || [0, lines.length - 1];
        point.set(
          joined.getKey(),
          target && joined.is(target.getParent())
            ? target.getIndexWithinParent()
            : targetSpan
              ? targetSpan[0] < ends.length
                ? ends[targetSpan[0]][0]
                : ends[ends.length - 1][1]
              : ends[span[1]][1],
          'element',
        );
      });
      // A block with no inline form moves out of the table.
      for (const decorator of decorators) {
        last = last.insertAfter(decorator);
      }
      cell.clear().append(joined);
    }),
  );
}

/**
 * Aligns the columns of the cells the selection reaches in each table (from
 * the first to the last), for an alignment GFM has, and ignores any other:
 * GFM aligns columns, not cells or blocks.
 */
function $formatColumns(format: ElementFormatType): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) && !$isTableSelection(selection)) {
    return false;
  }
  // The cells the selection reaches, by table.
  const reached = new Map<string, Set<string>>();
  for (const node of [selection.anchor.getNode(), ...selection.getNodes()]) {
    const cell = $findCellNode(node);
    const table = cell && $findTableNode(cell);
    if (table) {
      const cells = reached.get(table.getKey()) || new Set();
      reached.set(table.getKey(), cells.add(cell.getKey()));
    }
  }
  const aligns = gfmAlign(format) !== null || format === '';
  let found = false;
  reached.forEach((cells, key) => {
    const {grid} = $tableGrid($getNodeByKeyOrThrow<TableNode>(key));
    const columns = grid.flatMap(row =>
      row.flatMap(({cell}, column) =>
        cells.has(cell.getKey()) ? [column] : [],
      ),
    );
    found = found || columns.length > 0;
    const from = Math.min(...columns);
    const to = Math.max(...columns);
    grid.forEach(row =>
      row.forEach(({cell}, column) => {
        if (
          aligns &&
          column >= from &&
          column <= to &&
          cell.getFormatType() !== format
        ) {
          cell.setFormat(format);
        }
      }),
    );
  });
  // Blocks outside a table the selection reaches are formatted as usual.
  return (
    found &&
    $findCellNode(selection.anchor.getNode()) !== null &&
    $findCellNode(selection.focus.getNode()) !== null
  );
}

/** Normalizes the table a changed cell is in. */
function $markTableDirty(node: LexicalNode): void {
  const table = $findTableNode(node);
  if (table) {
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
 * merged cell with empty cells where it spans, block decorators in a cell
 * after the table, and the alignment of the header row's cells as the
 * column alignment. Add
 * {@link MdastStrictTableExtension} to keep tables in the editor to what GFM
 * holds.
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
      toMarkdownExtensions: [gfmTableCellsToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
});

/**
 * Table editing kept to what a GFM table holds, so that the content of a
 * table reads back from Markdown as it is: {@link MdastTableExtension} with
 * `TableExtension`, configured without cell background colors. The first
 * row is the header row; a cell holds one paragraph of inline content,
 * whose line breaks are written as `<br>` (Enter in a cell inserts one);
 * and columns are aligned rather than cells. A column's alignment is the
 * element format of its cells, which it is read from (the first of them
 * that has one). `FORMAT_ELEMENT_COMMAND` in a table aligns the columns
 * from the selection's anchor cell to its focus cell, and does nothing for
 * an alignment GFM has no form for (justify, start, end); the formats of
 * the table and of the blocks in cells are cleared. Blocks put into a cell
 * become lines of its paragraph, except block decorators, which move after
 * the table, and merged cells are split.
 *
 * @experimental
 */
export const MdastStrictTableExtension = defineExtension({
  dependencies: [
    MdastTableExtension,
    configExtension(TableExtension, {hasCellBackgroundColor: false}),
  ],
  name: '@lexical/mdast/StrictTable',
  register: editor =>
    mergeRegister(
      editor.registerNodeTransform(TableNode, $normalizeTable),
      editor.registerNodeTransform(TableCellNode, $markTableDirty),
      editor.registerNodeTransform(ParagraphNode, node => {
        if ($isTableCellNode(node.getParent())) {
          $markTableDirty(node);
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
            // A line break, through its command where something handles it.
            if (!editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)) {
              selection.insertLineBreak();
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // Ahead of TableExtension, which formats a table selection's cells
      // and their blocks, or the table.
      editor.registerCommand(
        FORMAT_ELEMENT_COMMAND,
        $formatColumns,
        COMMAND_PRIORITY_CRITICAL,
      ),
    ),
});
