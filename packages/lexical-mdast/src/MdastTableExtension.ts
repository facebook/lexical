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
  Emphasis,
  Html,
  HtmlBlock,
  HtmlInline,
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
  $getState,
  $isElementNode,
  $setState,
  arrayValue,
  createState,
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
 * The column alignment v0.52 kept on the table rather than on its cells,
 * read where a saved state's cells have none.
 */
const legacyAlignState = createState('mdastTableAlign', {
  parse: arrayValue(alignValue),
  resetOnCopyNode: true,
});

/** Moves the alignment a v0.52 state kept on a table onto its cells. */
function $moveLegacyAlign(table: TableNode) {
  const align = $getState(table, legacyAlignState);
  if (align.length > 0) {
    $setState(table, legacyAlignState, []);
    for (const row of table.getChildren()) {
      if ($isTableRowNode(row)) {
        row.getChildren().forEach((cell, i) => {
          if ($isTableCellNode(cell) && cell.getFormatType() === '') {
            cell.setFormat(align[i] || '');
          }
        });
      }
    }
  }
}

/**
 * The GFM alignment a cell renders with: the one its block children share,
 * each with its own element format (what `FORMAT_ELEMENT_COMMAND` sets with
 * the caret in a single cell) or else the cell's (what import sets, and
 * what that command sets on a cell selection).
 */
function $getCellAlign(cell: TableCellNode): AlignType {
  const own = alignValue(cell.getFormatType());
  let shared: AlignType | undefined;
  for (const child of cell.getChildren()) {
    if ($isElementNode(child) && !child.isInline()) {
      const align = alignValue(child.getFormatType()) ?? own;
      if (shared !== undefined && shared !== align) {
        return null;
      }
      shared = align;
    }
  }
  return shared === undefined ? own : shared;
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
 * Rejoins formatting that export split around a line break (`**a**`, break,
 * `**b**`), so the break is written inside it, where import reads a `<br>`
 * as a line break rather than a paragraph boundary.
 */
function joinAtBreaks(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  const joined: PhrasingContent[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const prev = joined[joined.length - 1];
    const next = nodes[i + 1];
    if (
      nodes[i].type === 'break' &&
      prev &&
      next &&
      prev.type === next.type &&
      /^(?:emphasis|strong|delete)$/.test(prev.type)
    ) {
      joined[joined.length - 1] = {
        ...prev,
        children: [
          ...(prev as Emphasis).children,
          nodes[i],
          ...(next as Emphasis).children,
        ],
      } as PhrasingContent;
      i++;
    } else {
      joined.push(nodes[i]);
    }
  }
  return joined.map(node =>
    /^(?:emphasis|strong|delete)$/.test(node.type)
      ? ({
          ...node,
          children: joinAtBreaks((node as Emphasis).children),
        } as PhrasingContent)
      : node,
  );
}

/**
 * Rewrites exported phrasing content for a GFM cell, which holds one line:
 * line breaks (`break` nodes and newlines in text or code) become `<br>`,
 * which gfm-table would otherwise write as spaces, and raw HTML is put on
 * one line with its pipes as references (`&#124;`), since a cell splits on
 * `|` even inside HTML.
 */
function cellPhrasing(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  return mapPhrasing(joinAtBreaks(nodes), node => {
    if (node.type === 'break') {
      return [lineBreakHtml()];
    }
    const raw = node as Html | HtmlBlock | HtmlInline;
    if (/^html(?:Block|Inline)?$/.test(raw.type)) {
      return [
        {
          ...raw,
          // A line end beside embedded Markdown (a `<template>` holding its
          // place) only sets it apart. Any other is a reference (`&#10;`),
          // which reads as the line end it was in text, `<pre>` and
          // attribute values, but a space between a tag's attributes.
          value: raw.value
            .replace(
              /[ \t]*(?:\r?\n|\r)[ \t]*(?=<template data-mdast-child=)|(<\/template>)[ \t]*(?:\r?\n|\r)[ \t]*/g,
              '$1',
            )
            .replace(
              /(<(?:[^>"']|"[^"]*"|'[^']*')*>)|\r?\n|\r/g,
              (_, tag?: string) =>
                tag
                  ? tag.replace(
                      /("[^"]*"|'[^']*')|\r?\n|\r/g,
                      (__, quoted?: string) =>
                        quoted ? quoted.replace(/\r?\n|\r/g, '&#10;') : ' ',
                    )
                  : '&#10;',
            )
            .replace(/\|/g, '&#124;'),
          // `MdastHtmlExtension`'s raw HTML with Markdown embedded in it:
          // each embedded block is one line too.
          ...('children' in raw && {
            children:
              raw.type === 'htmlBlock'
                ? raw.children.map(child => ({
                    children: cellContent([child]),
                    type: 'paragraph',
                  }))
                : cellPhrasing(raw.children),
          }),
        } as PhrasingContent,
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

// The phrasing content that holds phrasing content, with that of
// `MdastHtmlExtension` and of the directive and MDX extensions to mdast.
const PHRASING_PARENT_RE =
  /^(?:delete|emphasis|link|linkReference|strong|htmlInline|textDirective|mdxJsxTextElement)$/;

// Flow content of mdast extensions that has a phrasing twin, which a cell
// can hold.
const PHRASING_TWIN: Record<string, string> = {
  containerDirective: 'textDirective',
  leafDirective: 'textDirective',
  math: 'inlineMath',
  mdxFlowExpression: 'mdxTextExpression',
  mdxJsxFlowElement: 'mdxJsxTextElement',
};

/**
 * The phrasing content of a cell's exported blocks as one line: a GFM cell
 * can't hold blocks, so each one with phrasing (a paragraph, a heading, a
 * list item's paragraph, a line of code) is a line of its own, and lines
 * are separated by `<br>`, empty ones included.
 */
function cellContent(nodes: readonly MdastNode[]): PhrasingContent[] {
  const lines: PhrasingContent[][] = [];
  // The line of the last top-level phrasing, which phrasing right after it
  // runs on.
  let phrasing: PhrasingContent[] = [];
  const visit = (node: MdastNode) => {
    const twin = PHRASING_TWIN[node.type];
    if (twin) {
      return visit({
        ...node,
        type: twin,
        ...('children' in node
          ? {children: cellContent(node.children)}
          : 'value' in node && {value: node.value.replace(/\s+/g, ' ')}),
      } as MdastNode);
    }
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
      case 'htmlBlock':
        lines.push(cellPhrasing([node as PhrasingContent]));
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
      // footnote reference, an inline decorator's fallback) is a line of its
      // own after a block's, and runs on with the phrasing before it.
      if (lines[lines.length - 1] !== phrasing) {
        lines.push((phrasing = []));
      }
      phrasing.push(...cellPhrasing([node as PhrasingContent]));
    }
  };
  nodes.forEach(visit);
  return lines.flatMap((line, i) =>
    i > 0 ? [lineBreakHtml(), ...line] : line,
  );
}

/**
 * The GFM alignment of each column of `table`'s `rows`. GFM aligns columns,
 * not cells: a column takes the alignment that most of its cells have, so
 * aligning one body cell doesn't align its column, or else that of its
 * header cell, the cell the delimiter row is under, so rows inserted into an
 * aligned column don't clear it.
 */
function $alignColumns(
  table: TableNode,
  rows: readonly TableRowNode[],
): AlignType[] {
  // The cells in each column, and how many of them have each alignment.
  const columns: {aligned: Map<AlignType, number>; cells: number}[] = [];
  for (const row of rows) {
    row
      .getChildren()
      .filter($isTableCellNode)
      .forEach((cell, i) => {
        const cellAlign = $getCellAlign(cell);
        const column = (columns[i] ??= {aligned: new Map(), cells: 0});
        column.cells++;
        if (cellAlign !== null) {
          column.aligned.set(
            cellAlign,
            (column.aligned.get(cellAlign) ?? 0) + 1,
          );
        }
      });
  }
  // The header is the table's first row of cells, which a selection's
  // export may leave out.
  const headerRow = table
    .getChildren()
    .find(
      row => $isTableRowNode(row) && row.getChildren().some($isTableCellNode),
    );
  const headerCells = $isTableRowNode(headerRow)
    ? headerRow.getChildren().filter($isTableCellNode)
    : [];
  return Array.from(columns, (column, i): AlignType => {
    for (const [cellAlign, count] of column.aligned) {
      if (count * 2 > column.cells) {
        return cellAlign;
      }
    }
    return (headerCells[i] && $getCellAlign(headerCells[i])) || null;
  });
}

/**
 * The GFM alignment of each column of `table`, which export writes in its
 * delimiter row: the alignment most of the column's cells render with
 * (their element format, or their paragraphs'), or else its header cell's.
 */
export function $getTableColumnAlign(table: TableNode): AlignType[] {
  return $alignColumns(table, table.getChildren().filter($isTableRowNode));
}

const $exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  // Structural iteration bypasses the walk's selection filter, so rows a
  // selection export does not reach are skipped here. Cells stay: dropping
  // one would shift the remaining cells into other columns.
  const rows = node
    .getChildren()
    .filter(
      (row): row is TableRowNode => $isTableRowNode(row) && ctx.isIncluded(row),
    );
  return {
    align: $alignColumns(node, rows),
    children: rows.map(
      (row): TableRow => ({
        children: row
          .getChildren()
          .filter($isTableCellNode)
          .map(
            (cell): TableCell => ({
              children: cellContent(ctx.exportChildren(cell)),
              type: 'tableCell',
            }),
          ),
        type: 'tableRow',
      }),
    ),
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
  register: editor => editor.registerNodeTransform(TableNode, $moveLegacyAlign),
});
