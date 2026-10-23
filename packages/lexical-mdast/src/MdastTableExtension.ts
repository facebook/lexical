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
  $computeTableMapSkipCellCheck,
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $findTableNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  registerTableCellUnmergeTransform,
  TableCellHeaderStates,
  TableCellNode,
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

import {$append} from './handlers';
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

/**
 * The lines of a cell: the inline content of each block in it, a nested
 * block's on lines of its own. A block decorator has no inline form and
 * is left out.
 */
function $cellLines(cell: TableCellNode): LexicalNode[][] {
  const lines: LexicalNode[][] = [];
  let line: LexicalNode[] | undefined;
  const $visit = (node: LexicalNode) => {
    if ($isElementNode(node) && !node.isInline()) {
      line = undefined;
      const count = lines.length;
      node.getChildren().forEach($visit);
      if (lines.length === count) {
        lines.push([]);
      }
      line = undefined;
    } else if (!$isDecoratorNode(node) || node.isInline()) {
      if (!line) {
        lines.push((line = []));
      }
      line.push(node);
    }
  };
  cell.getChildren().forEach($visit);
  return lines;
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
    const start = child.position && child.position.start.offset;
    if (child.type === 'link' && start != null && ctx.source[start] === '<') {
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
  // Each row has the header's cells, as GFM reads it: those past them are
  // dropped and missing ones are empty.
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
  // A grid of the cells, which writes a merged cell as one cell and empty
  // ones where it spans, and every row as wide as the widest.
  const [grid] = $computeTableMapSkipCellCheck(node, null, null);
  const rows = node.getChildren();
  const width = Math.max(...grid.map(row => row.length));
  const children: TableRow[] = [];
  grid.forEach((cells, rowIndex) => {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here. Cells stay: dropping
    // one would shift the remaining cells into other columns.
    if (!ctx.isIncluded(rows[rowIndex])) {
      return;
    }
    children.push({
      children: Array.from({length: width}, (_, column): TableCell => {
        const map = cells[column];
        return {
          children:
            map && map.startRow === rowIndex && map.startColumn === column
              ? mapPhrasing(
                  $cellLines(map.cell).flatMap((line, i) => [
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
  // GFM aligns columns, which the header row's cells hold.
  return {
    align: Array.from({length: width}, (_, column) => {
      const map = grid[0] && grid[0][column];
      return map ? gfmAlign(map.cell.getFormatType()) : null;
    }),
    children,
    type: 'table',
  };
};

/**
 * Keeps `table` to what a GFM table holds: a header row and body rows of
 * cells that each hold one paragraph, unindented, with no block in it, and
 * column alignment, which each cell of a column has as its element format.
 * Aligning a block in a cell aligns its column.
 */
function $normalizeTable(table: TableNode): void {
  const grid = table
    .getChildren()
    .map(row =>
      $isTableRowNode(row) ? row.getChildren().filter($isTableCellNode) : [],
    );
  const align = (grid[0] || []).map(cell => cell.getFormatType());
  for (const cells of grid) {
    cells.forEach((cell, column) => {
      for (const block of cell.getChildren()) {
        if ($isElementNode(block) && block.getFormatType() !== '') {
          align[column] = block.getFormatType();
        }
      }
    });
  }
  grid.forEach((cells, rowIndex) =>
    cells.forEach((cell, column) => {
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
      const blocks = cell.getChildren();
      const paragraph = blocks[0];
      if (blocks.length === 1 && $isParagraphNode(paragraph)) {
        if (paragraph.getFormatType() !== '') {
          paragraph.setFormat('');
        }
        if (paragraph.getIndent() !== 0) {
          paragraph.setIndent(0);
        }
      } else {
        const joined = $createParagraphNode();
        $cellLines(cell).forEach((line, i) => {
          if (i > 0) {
            joined.append($createLineBreakNode());
          }
          joined.append(...line);
        });
        cell.clear().append(joined);
      }
    }),
  );
}

/** Normalizes the table a changed cell or paragraph is in. */
function $markTableDirty(node: LexicalNode): void {
  const table = $findTableNode(node);
  if (table) {
    table.markDirty();
  }
}

/**
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in `@lexical/table`.
 *
 * Tables in the editor are kept to what GFM can write, so they read back
 * as they are: the first row is the header row, a cell holds one line of
 * inline content, with its line breaks written as `<br>` (Enter in a cell
 * inserts one), and columns are aligned rather than cells, by the element
 * format of their cells (aligning a paragraph in a cell aligns its
 * column). Blocks put into a cell become lines of its paragraph, and
 * merged cells are split. Add `TableExtension` (with `hasCellMerge: false`)
 * for table editing. Import reads a table as GFM does: each row has the header row's
 * cells, and an escaped pipe is a pipe in raw HTML and autolinks too.
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
  register: editor =>
    mergeRegister(
      registerTableCellUnmergeTransform(editor),
      editor.registerNodeTransform(TableNode, $normalizeTable),
      editor.registerNodeTransform(TableCellNode, $markTableDirty),
      editor.registerNodeTransform(ParagraphNode, $markTableDirty),
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if (
            $isRangeSelection(selection) &&
            $findTableNode(selection.anchor.getNode())
          ) {
            selection.insertLineBreak();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ),
});
