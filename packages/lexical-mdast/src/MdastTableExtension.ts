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
  Html,
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
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $isElementNode,
  defineExtension,
  enumValue,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append} from './handlers';
import {MdastExtension} from './MdastExtension';

/** A GFM column alignment as mdast spells it; anything else reads as `null`. */
const alignValue = enumValue<AlignType>([null, 'left', 'center', 'right']);

/**
 * The GFM alignment a cell renders with: its own element format (what
 * import sets, and what `FORMAT_ELEMENT_COMMAND` sets on a cell selection),
 * else the format its block children share (what that command sets with
 * the caret in a single cell).
 */
function $getCellAlign(cell: TableCellNode): AlignType {
  const own = alignValue(cell.getFormatType());
  if (own !== null) {
    return own;
  }
  let shared: AlignType | undefined;
  for (const child of cell.getChildren()) {
    if ($isElementNode(child) && !child.isInline()) {
      const align = alignValue(child.getFormatType());
      if (shared !== undefined && shared !== align) {
        return null;
      }
      shared = align;
    }
  }
  return shared || null;
}

/**
 * The number of line breaks a `<br>` run stands for (`<br>`, `<br/>`,
 * `<br />`, any case), or 0 when `node` is anything else. With
 * `MdastHtmlExtension` the tags arrive as one `htmlInline` node.
 */
function brCount(node: MdastNode): number {
  return (node.type === 'html' || node.type === 'htmlInline') &&
    !('children' in node && node.children.length > 0) &&
    /^\s*(?:<br\s*\/?>\s*)+$/i.test(node.value)
    ? node.value.split(/<br/i).length - 1
    : 0;
}

function isRuleHtml(node: MdastNode): boolean {
  return (
    (node.type === 'html' || node.type === 'htmlInline') &&
    /^\s*<hr\s*\/?>\s*$/i.test(node.value)
  );
}

/**
 * A deep copy of `nodes` with each node that `replace` returns an array for
 * swapped for that array; the children of the others are mapped in turn.
 */
function mapPhrasing(
  nodes: readonly PhrasingContent[],
  replace: (node: PhrasingContent) => PhrasingContent[] | undefined,
): PhrasingContent[] {
  return nodes.flatMap(
    node =>
      replace(node) ||
      ('children' in node
        ? ({
            ...node,
            children: mapPhrasing(node.children, replace),
          } as PhrasingContent)
        : node),
  );
}

/**
 * Splits a cell's phrasing content into lines at each `<br>`, which is the
 * conventional line separator in a GFM cell. Each line is a paragraph,
 * which is what Enter inserts in a table cell, and the whitespace a `<br>`
 * was written with (`a <br> b`) is trimmed. A `<br>` nested in other
 * phrasing content (`**a<br>b**`) is a line break.
 */
function cellLines(cell: TableCell): PhrasingContent[][] {
  const lines: PhrasingContent[][] = [[]];
  for (const child of cell.children) {
    const count = brCount(child);
    for (let i = 0; i < count; i++) {
      lines.push([]);
    }
    if (count === 0) {
      lines[lines.length - 1].push(
        ...mapPhrasing([child], node => {
          const breaks = brCount(node);
          if (breaks > 0) {
            return Array.from({length: breaks}, () => ({type: 'break'}));
          }
          return node.type === 'htmlInline' ? [node] : undefined;
        }),
      );
    }
  }
  // The cell's own edges were trimmed by the parser, and keep what it left.
  return lines.map((line, lineIndex) =>
    line
      .map((node, i): PhrasingContent => {
        if (node.type !== 'text') {
          return node;
        }
        let {value} = node;
        if (i === 0 && lineIndex > 0) {
          value = value.replace(/^[ \t]+/, '');
        }
        if (i === line.length - 1 && lineIndex < lines.length - 1) {
          value = value.replace(/[ \t]+$/, '');
        }
        return {...node, value};
      })
      .filter(node => node.type !== 'text' || node.value !== ''),
  );
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  return $append(
    $createTableNode(),
    node.children.map((row, rowIndex) =>
      $append(
        $createTableRowNode(),
        row.children.map((cell, columnIndex) =>
          // Every cell of the column carries the alignment, so it renders as
          // the cell's text-align and moves with the cells when columns are
          // edited.
          $append(
            $createTableCellNode(
              rowIndex === 0
                ? TableCellHeaderStates.ROW
                : TableCellHeaderStates.NO_STATUS,
            ).setFormat(align[columnIndex] || ''),
            cellLines(cell).flatMap(line => {
              // A line of only `<hr>` is a rule, as export writes one.
              const rule =
                line.length === 1 && isRuleHtml(line[0])
                  ? ctx.importNode({type: 'thematicBreak'})
                  : [];
              return rule.length > 0
                ? rule
                : [
                    $append(
                      $createParagraphNode(),
                      ctx.importChildren({children: line, type: 'tableCell'}),
                    ),
                  ];
            }),
          ),
        ),
      ),
    ),
  );
};

function lineBreakHtml(): Html {
  return {type: 'html', value: '<br>'};
}

/**
 * Rewrites exported phrasing content for a GFM cell, which holds one line:
 * line breaks (`break` nodes and newlines in text or code) become `<br>`,
 * which gfm-table would otherwise write as spaces, and raw HTML is put on
 * one line with its pipes as references (`&#124;`), since a cell splits on
 * `|` even inside HTML.
 */
function cellPhrasing(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  return mapPhrasing(nodes, node => {
    if (node.type === 'break') {
      return [lineBreakHtml()];
    }
    if (node.type === 'html') {
      return [
        {
          type: 'html',
          value: node.value.replace(/\r?\n|\r/g, ' ').replace(/\|/g, '&#124;'),
        },
      ];
    }
    if (
      (node.type === 'text' || node.type === 'inlineCode') &&
      /[\r\n]/.test(node.value)
    ) {
      return node.value
        .split(/\r?\n|\r/)
        .flatMap((value, i): PhrasingContent[] => [
          ...(i > 0 ? [lineBreakHtml()] : []),
          ...(value ? [{...node, value}] : []),
        ]);
    }
    return undefined;
  });
}

// The phrasing content that holds phrasing content, with that of the
// directive and MDX extensions to mdast.
const PHRASING_PARENT_RE =
  /^(?:delete|emphasis|link|linkReference|strong|textDirective|mdxJsxTextElement)$/;

/**
 * The phrasing content of a cell's exported blocks as one line: a GFM cell
 * can't hold blocks, so each one with phrasing (a paragraph, a heading, a
 * list item's paragraph, a line of code) is a line of its own, and lines
 * are separated by `<br>`, empty ones included.
 */
function cellContent(nodes: readonly MdastNode[]): PhrasingContent[] {
  const lines: PhrasingContent[][] = [];
  const visit = (node: MdastNode) => {
    switch (node.type) {
      case 'paragraph':
      case 'heading':
      case 'tableCell':
        lines.push(cellPhrasing(node.children));
        return;
      case 'code':
        for (const value of node.value.split(/\r?\n|\r/)) {
          lines.push(value ? [{type: 'inlineCode', value}] : []);
        }
        return;
      case 'html':
        lines.push(cellPhrasing([node]));
        return;
      case 'thematicBreak':
        // GFM has no rule in a cell but HTML's, which import reads back.
        lines.push([{type: 'html', value: '<hr>'}]);
        return;
      case 'definition':
        // Definitions are the document's, and no node exports one.
        return;
    }
    if ('children' in node && !PHRASING_PARENT_RE.test(node.type)) {
      node.children.forEach(visit);
    } else {
      // Phrasing content exported at the cell's top level (an image, a
      // footnote reference, an inline decorator's fallback) stays on the
      // current line.
      if (lines.length === 0) {
        lines.push([]);
      }
      lines[lines.length - 1].push(...cellPhrasing([node as PhrasingContent]));
    }
  };
  nodes.forEach(visit);
  return lines.flatMap((line, i) =>
    i > 0 ? [lineBreakHtml(), ...line] : line,
  );
}

const $exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  const rows: TableRow[] = [];
  // The cells in each column, and how many of them have each alignment.
  const columns: {aligned: Map<AlignType, number>; cells: number}[] = [];
  // The header is the table's first row of cells, which a selection's
  // export may leave out.
  const headerRow = node
    .getChildren()
    .find(
      row => $isTableRowNode(row) && row.getChildren().some($isTableCellNode),
    );
  // Read even when a selection's export leaves the header row out.
  const headerAlign: AlignType[] = [];
  if ($isTableRowNode(headerRow)) {
    headerRow
      .getChildren()
      .filter($isTableCellNode)
      .forEach((cell, index) => {
        headerAlign[index] = $getCellAlign(cell);
      });
  }
  for (const row of node.getChildren()) {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here. Cells stay: dropping
    // one would shift the remaining cells into other columns.
    if (!$isTableRowNode(row) || !ctx.isIncluded(row)) {
      continue;
    }
    const cells: TableCell[] = [];
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) {
        continue;
      }
      const cellAlign = $getCellAlign(cell);
      const column = (columns[cells.length] ??= {aligned: new Map(), cells: 0});
      column.cells++;
      if (cellAlign !== null) {
        column.aligned.set(cellAlign, (column.aligned.get(cellAlign) ?? 0) + 1);
      }
      cells.push({
        children: cellContent(ctx.exportChildren(cell)),
        type: 'tableCell',
      });
    }
    rows.push({children: cells, type: 'tableRow'});
  }
  // GFM aligns columns, not cells: a column takes the alignment that most
  // of its cells have, so aligning one body cell doesn't align its column,
  // or else that of its header cell, the cell the delimiter row is under,
  // so rows inserted into an aligned column don't clear it.
  const align = Array.from(columns, (column, i): AlignType => {
    if (column) {
      for (const [cellAlign, count] of column.aligned) {
        if (count * 2 > column.cells) {
          return cellAlign;
        }
      }
    }
    return headerAlign[i] || null;
  });
  return {
    align,
    children: rows,
    type: 'table',
  };
};

/**
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in the `@lexical/table`
 * nodes it ships. The first table row is treated as the header row in both
 * directions. A GFM cell holds a single line, so each paragraph and line
 * break in a cell is written as a `<br>`-separated line, and `<br>` reads
 * back as a paragraph boundary. Other blocks in a cell (lists, headings,
 * quotes, code) are flattened into lines. Column alignment is the element format of the column's cells
 * (`TableCellNode.setFormat`), exported as the alignment most of the
 * column's cells have, or else its header cell's.
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
