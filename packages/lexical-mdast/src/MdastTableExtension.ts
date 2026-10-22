/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastHtmlExtension, RawHtmlBlockPart} from './MdastHtmlExtension';
import type {
  MdastExportHandler,
  MdastImportContext,
  MdastImportHandler,
  MdastNode,
} from './types';
import type {TableCellNode, TableRowNode} from '@lexical/table';
import type {
  AlignType,
  BlockContent,
  Code,
  Emphasis,
  Heading,
  Html,
  HtmlBlock,
  Paragraph,
  Parent,
  PhrasingContent,
  Table,
  TableCell,
  TableRow,
  Text,
} from 'mdast';

import {$getPeerDependency, configExtension} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableExtension,
  TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getState,
  $isElementNode,
  $setState,
  arrayValue,
  createState,
  declarePeerDependency,
  defineExtension,
  enumValue,
  type LexicalNode,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append} from './handlers';
import {MdastExtension} from './MdastExtension';
import {rawHtmlBlock} from './MdastHtmlExtension';

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
          const format = align[i];
          if (format && $isTableCellNode(cell) && cell.getFormatType() === '') {
            cell.setFormat(format);
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
      // A block aligned in a way GFM can't write (justified) has none.
      const format = child.getFormatType();
      const align = format === '' ? own : alignValue(format);
      if (shared !== undefined && shared !== align) {
        return null;
      }
      shared = align;
    }
  }
  return shared === undefined ? own : shared;
}

/**
 * The number of `tag` void elements (`<br>`, `<br/>`, `<br />`, any case)
 * that `node` is a run of, or 0 when it is anything else. With
 * `MdastHtmlExtension` a run arrives as one `htmlInline` node.
 */
function voidTags(node: MdastNode, tag: 'br' | 'hr'): number {
  return (node.type === 'html' || node.type === 'htmlInline') &&
    !('children' in node && node.children.length > 0) &&
    VOID_TAGS_RE[tag].test(node.value)
    ? node.value.split('<').length - 1
    : 0;
}

const VOID_TAGS_RE = {
  br: /^\s*(?:<br\s*\/?>\s*)+$/i,
  hr: /^\s*(?:<hr\s*\/?>\s*)+$/i,
};

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
 * A cell's phrasing content with each `<br>` in it a line break, and `\|`
 * read as a pipe: GFM reads it so before anything else, which micromark
 * leaves to code, math and HTML.
 */
function readPipes(nodes: PhrasingContent[]): PhrasingContent[] {
  return mapPhrasing(nodes, node => {
    const breaks = voidTags(node, 'br');
    if (breaks > 0) {
      return Array.from({length: breaks}, () => ({type: 'break'}));
    }
    const {value} = node as {value?: string};
    return /^(?:html|htmlInline|inlineMath)$/.test(node.type)
      ? [
          {
            ...node,
            value: value!.replace(/\\\|/g, '|'),
            ...('children' in node && {children: readPipes(node.children)}),
          } as PhrasingContent,
        ]
      : undefined;
  });
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
  // A cell holds no line end, so a break in it at the top is a `<br>`.
  for (const child of readPipes(cell.children)) {
    if (child.type === 'break') {
      lines.push([]);
    } else {
      lines[lines.length - 1].push(child);
    }
  }
  // The cell's own edges were trimmed by the parser, and keep what it left.
  return lines.map((line, i) => trimEdges(line, i > 0, i < lines.length - 1));
}

/**
 * `line` with the spaces and tabs a separator was written with trimmed from
 * its `start` or `end`, and the text left empty dropped.
 */
function trimEdges(
  line: PhrasingContent[],
  start: boolean,
  end: boolean,
): PhrasingContent[] {
  return line
    .map((node, i): PhrasingContent => {
      if (node.type !== 'text') {
        return node;
      }
      let {value} = node;
      if (i === 0 && start) {
        value = value.replace(/^[ \t]+/, '');
      }
      if (i === line.length - 1 && end) {
        // By hand: a regex is quadratic on a long run of spaces inside.
        let to = value.length;
        while (to > 0 && /[ \t]/.test(value[to - 1])) {
          to--;
        }
        value = value.slice(0, to);
      }
      return {...node, value};
    })
    .filter(node => node.type !== 'text' || node.value !== '');
}

/**
 * The blocks of a cell's line: each `<hr>` in it is a rule, as export
 * writes one, and the phrasing around it a paragraph of its own, trimmed as
 * beside a `<br>`.
 */
function $lineBlocks(
  line: PhrasingContent[],
  ctx: MdastImportContext,
): LexicalNode[] {
  const runs: PhrasingContent[][] = [[]];
  const rules: LexicalNode[][] = [];
  for (const child of line) {
    const rule = Array.from({length: voidTags(child, 'hr')}, () =>
      ctx.importNode({type: 'thematicBreak'}),
    ).flat();
    if (rule.length > 0) {
      rules.push(rule);
      runs.push([]);
    } else {
      runs[runs.length - 1].push(child);
    }
  }
  return runs.flatMap((run, i) => {
    const children = trimEdges(run, i > 0, i < rules.length);
    return [
      ...(children.length > 0 || runs.length === 1
        ? [
            $append(
              $createParagraphNode(),
              ctx.importChildren({children, type: 'tableCell'}),
            ),
          ]
        : []),
      ...(rules[i] || []),
    ];
  });
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  return $append(
    $createTableNode(),
    node.children.map((row, rowIndex) =>
      $append(
        $createTableRowNode(),
        // A row has the header's cells, as GFM reads it: those past them
        // are dropped and missing ones are empty.
        Array.from(node.children[0].children, (_, columnIndex) => {
          const cell: TableCell = row.children[columnIndex] || {
            children: [],
            type: 'tableCell',
          };
          // Every cell of the column carries the alignment, so it renders as
          // the cell's text-align and moves with the cells when columns are
          // edited.
          return $append(
            $createTableCellNode(
              rowIndex === 0
                ? TableCellHeaderStates.ROW
                : TableCellHeaderStates.NO_STATUS,
            ).setFormat(align[columnIndex] || ''),
            cellLines(cell).flatMap(line => $lineBlocks(line, ctx)),
          );
        }),
      ),
    ),
  );
};

function isRule(node: PhrasingContent | undefined): boolean {
  return node !== undefined && voidTags(node, 'hr') > 0;
}

// Fresh nodes, as an exported tree may be edited in place.
function rawHtml(value: '<br>' | '<hr>'): Html {
  return {type: 'html', value};
}

const FORMATTING_RE = /^(?:emphasis|strong|delete)$/;

/**
 * Rejoins formatting that export split around a line break (`**a**`, break,
 * `**b**`), so the break is written inside it, where import reads a `<br>`
 * as a line break rather than a paragraph boundary.
 */
function joinAtBreaks(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  const joined: PhrasingContent[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const prev = joined[joined.length - 1];
    // The breaks from here, and the node after them.
    let end = i;
    while (nodes[end] && nodes[end].type === 'break') {
      end++;
    }
    const next = nodes[end];
    if (
      end > i &&
      prev &&
      next &&
      prev.type === next.type &&
      FORMATTING_RE.test(prev.type)
    ) {
      joined[joined.length - 1] = {
        ...prev,
        children: [
          ...(prev as Emphasis).children,
          ...nodes.slice(i, end),
          ...(next as Emphasis).children,
        ],
      } as PhrasingContent;
      i = end;
    } else {
      joined.push(nodes[i]);
    }
  }
  return joined;
}

/**
 * Whether a GFM cell holds what was exported to it as it is. When one
 * doesn't, its table is written as HTML if the editor has
 * `MdastHtmlExtension`, or else as close as a cell can come.
 */
interface CellFit {
  exact: boolean;
}

/** `value` on one line, noting in `fit` that a line end in it has no form. */
function rawLine(value: string, fit?: CellFit): string {
  if (fit && /[\r\n]/.test(value)) {
    fit.exact = false;
  }
  return value.replace(/\r\n?|\n/g, ' ');
}

/**
 * A raw value with each pipe escaped as `\|`, which GFM reads back as a
 * pipe before anything else, even in code and math. A pipe after a
 * backslash has no such form that micromark reads as GFM does, so it is
 * not exact, and it gets the backslash that keeps the row whole.
 */
function escapePipes(value: string, fit: CellFit, escape = '\\'): string {
  // Each run of backslashes is read once, with the pipe after it.
  return value.replace(/(\\*)(\|?)/g, (found, slashes: string, pipe) => {
    if (!pipe) {
      return found;
    }
    if (slashes.length % 2) {
      fit.exact = false;
      slashes += '\\';
    }
    return slashes + escape + '|';
  });
}

/**
 * Rewrites exported phrasing content for a GFM cell, which holds one line:
 * line breaks (`break` nodes and newlines in text) become `<br>`, which
 * gfm-table would otherwise write as spaces, a rule `<hr>`, and the pipes
 * in raw values are escaped, since a cell splits on `|` even in code. What
 * has no form on one line (a line end in code, math or HTML) is noted in
 * `fit` and written with spaces.
 */
function cellPhrasing(
  nodes: readonly PhrasingContent[],
  fit: CellFit,
): PhrasingContent[] {
  return mapPhrasing(joinAtBreaks(nodes), node => {
    const type = node.type as string;
    const {value} = node as {value?: string};
    const {children} = node as {children?: PhrasingContent[]};
    if (type === 'break' || type === 'thematicBreak') {
      // GFM has no rule in a cell but HTML's, which import reads back.
      return [rawHtml(type === 'break' ? '<br>' : '<hr>')];
    }
    if (FORMATTING_RE.test(type)) {
      return [{...node, children: cellPhrasing(children!, fit)} as Emphasis];
    }
    if (type === 'text' && /[\r\n]/.test(value!)) {
      return value!
        .split(/\r?\n|\r/)
        .flatMap((line, i): PhrasingContent[] => [
          ...(i > 0 ? [rawHtml('<br>')] : []),
          ...(line ? [{...node, value: line} as Text] : []),
        ]);
    }
    if (type === 'inlineCode' || type === 'inlineMath') {
      // gfm-table escapes the pipes in code itself.
      return [
        {
          ...node,
          // A line end in code reads as a space anywhere, so it fits.
          value: escapePipes(
            rawLine(value!, type === 'inlineCode' ? undefined : fit),
            fit,
            type === 'inlineCode' ? '' : '\\',
          ),
        } as PhrasingContent,
      ];
    }
    if (type === 'html' || type === 'htmlBlock') {
      // A line end beside embedded Markdown (a `<template>` holding its
      // place) only sets it apart, but blocks embedded one after another
      // have no line of their own.
      const html = value!.replace(/\s+/g, (space, at: number, all: string) =>
        /[\r\n]/.test(space) &&
        (all.startsWith('</template>', at - 11) ||
          all.startsWith('<template data-mdast-child=', at + space.length))
          ? space.replace(/[\r\n]/g, '')
          : space,
      );
      if (
        /<\/template>[^\S\r\n]*[\r\n]\s*<template data-mdast-child=/.test(
          value!,
        )
      ) {
        fit.exact = false;
      }
      return [
        {
          ...node,
          value: escapePipes(rawLine(html, fit), fit),
          // `MdastHtmlExtension`'s raw HTML with Markdown embedded in it,
          // which a cell holds as paragraphs. (Its `htmlInline` is only
          // read.)
          ...(children && {
            children: (children as unknown as BlockContent[]).map(child =>
              child.type === 'paragraph'
                ? {...child, children: cellPhrasing(child.children, fit)}
                : ((fit.exact = false), child),
            ),
          }),
        } as PhrasingContent,
      ];
    }
    return undefined;
  });
}

// The phrasing content that holds phrasing content, with that of the
// directive and MDX extensions to mdast.
const PHRASING_PARENT_RE =
  /^(?:delete|emphasis|link|linkReference|strong|textDirective|mdxJsxTextElement)$/;

/**
 * The phrasing content of a cell's exported blocks as one line, separated
 * by `<br>`, empty ones included. A GFM cell holds paragraphs and rules as
 * they are; any other block (a heading, a list, a quote, code) is noted in
 * `fit` and flattened, each block with phrasing (a list item's paragraph, a
 * line of code) a line of its own.
 */
function cellContent(
  nodes: readonly MdastNode[],
  fit: CellFit,
): PhrasingContent[] {
  const phrase = (phrasing: PhrasingContent[]) => cellPhrasing(phrasing, fit);
  const lines: PhrasingContent[][] = [];
  // The line of the last top-level phrasing, which phrasing right after it
  // runs on.
  let phrasing: PhrasingContent[] = [];
  const visit = (node: MdastNode) => {
    const type = node.type as string;
    switch (type) {
      case 'math':
        // Math in a line of its own, which is near it.
        fit.exact = false;
        lines.push(
          phrase([{...node, type: 'inlineMath'} as unknown as PhrasingContent]),
        );
        return;
      case 'paragraph':
        lines.push(phrase((node as Paragraph).children));
        return;
      case 'tableCell':
        // A nested table's cell, which its own export already wrote.
        lines.push((node as TableCell).children);
        return;
      case 'thematicBreak':
        lines.push([rawHtml('<hr>')]);
        return;
      case 'html':
        lines.push(phrase([node as Html]));
        return;
      case 'code':
        fit.exact = false;
        for (const value of (node as Code).value.split(/\r?\n|\r/)) {
          lines.push(value ? phrase([{type: 'inlineCode', value}]) : []);
        }
        return;
    }
    if (!('children' in node) || PHRASING_PARENT_RE.test(type)) {
      // Phrasing content exported at the cell's top level (an image, a
      // footnote reference, an inline decorator's fallback) is a line of its
      // own after a block's, and runs on with the phrasing before it.
      if (lines[lines.length - 1] !== phrasing) {
        lines.push((phrasing = []));
      }
      phrasing.push(...phrase([node as PhrasingContent]));
      return;
    }
    fit.exact = false;
    if (type === 'heading') {
      lines.push(phrase((node as Heading).children));
    } else {
      (node as Parent).children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  // A rule ends the lines beside it, as import reads it.
  return lines.flatMap((line, i) =>
    i > 0 && !isRule(line[0]) && !isRule(lines[i - 1][lines[i - 1].length - 1])
      ? [rawHtml('<br>'), ...line]
      : line,
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
  // The alignment of each cell in each column.
  const columns: AlignType[][] = [];
  for (const row of rows) {
    row
      .getChildren()
      .filter($isTableCellNode)
      .forEach((cell, i) => (columns[i] ??= []).push($getCellAlign(cell)));
  }
  // The header is the table's first row, which a selection's export may
  // leave out.
  const headerRow = table.getFirstChild();
  const legacy = $getState(table, legacyAlignState);
  const headerCells = $isTableRowNode(headerRow)
    ? headerRow.getChildren().filter($isTableCellNode)
    : [];
  return Array.from(
    columns,
    (aligns, i): AlignType =>
      (['left', 'center', 'right'] as const).find(
        align => aligns.filter(a => a === align).length * 2 > aligns.length,
      ) ||
      (headerCells[i] && $getCellAlign(headerCells[i])) ||
      // A v0.52 table not yet updated still has its alignment on the table.
      legacy[i] ||
      null,
  );
}

/**
 * The GFM alignment of each column of `table`, which export writes in its
 * delimiter row: the alignment most of the column's cells render with
 * (their element format, or their paragraphs'), or else its header cell's.
 *
 * @experimental
 */
export function $getTableColumnAlign(table: TableNode): AlignType[] {
  return $alignColumns(table, table.getChildren().filter($isTableRowNode));
}

/**
 * A table as HTML, for one with a cell that GFM can't hold: Markdown is
 * read between blank lines in HTML, so each cell holds its blocks as they
 * are, as GFM and CommonMark readers read it.
 */
function htmlTable(cells: MdastNode[][][], align: AlignType[][]): HtmlBlock {
  const parts: RawHtmlBlockPart[] = ['<table>\n'];
  cells.forEach((row, rowIndex) => {
    const tag = rowIndex ? 'td' : 'th';
    parts.push(
      rowIndex
        ? rowIndex === 1
          ? '<tbody>\n<tr>\n'
          : '<tr>\n'
        : '<thead>\n<tr>\n',
    );
    row.forEach((blocks, column) => {
      const cellAlign = align[rowIndex][column];
      parts.push(
        // GitHub keeps only `align`, and HTML import reads `text-align`.
        `<${tag}${cellAlign ? ` align="${cellAlign}" style="text-align: ${cellAlign}"` : ''}>`,
        // An empty cell's one empty paragraph is no Markdown.
        ...(blocks.length > 1 ||
        blocks.some(
          block => block.type !== 'paragraph' || block.children.length > 0,
        )
          ? [
              '\n\n',
              {
                // Markdown has no empty paragraph, but HTML's reads back.
                flow: blocks.map(block =>
                  block.type === 'paragraph' && block.children.length === 0
                    ? {type: 'html', value: '<p></p>'}
                    : block,
                ) as BlockContent[],
              },
              '\n\n',
            ]
          : []),
        `</${tag}>\n`,
      );
    });
    parts.push(rowIndex ? '</tr>\n' : '</tr>\n</thead>\n');
  });
  parts.push(cells.length > 1 ? '</tbody>\n</table>' : '</table>');
  return rawHtmlBlock(...parts);
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
  const cellNodes = rows.map(row => row.getChildren().filter($isTableCellNode));
  const cells = cellNodes.map(row => row.map(cell => ctx.exportChildren(cell)));
  const fit: CellFit = {exact: true};
  const lines = cells.map(row => row.map(blocks => cellContent(blocks, fit)));
  if (
    !fit.exact &&
    $getPeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html')
  ) {
    // HTML aligns each cell as it is.
    return htmlTable(
      cells,
      cellNodes.map(row => row.map($getCellAlign)),
    );
  }
  return {
    align: $alignColumns(node, rows),
    children: lines.map(
      (row): TableRow => ({
        children: row.map(
          (children): TableCell => ({children, type: 'tableCell'}),
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
 * back as a paragraph boundary, or as a line break inside formatting or a
 * link, and a pipe in code, math or HTML is escaped as GFM reads it. A
 * table with a cell GFM can't hold as it is (a list, heading, quote or code
 * block, or a line end in math or HTML) is written as an HTML table
 * with Markdown in its cells when the editor has `MdastHtmlExtension`, and
 * otherwise with those blocks flattened into lines. Column alignment is the
 * element format of the column's cells (`TableCellNode.setFormat`),
 * exported as the alignment most of the column's cells have, or else its
 * header cell's. It depends on `TableExtension`, which can be configured
 * with `configExtension(TableExtension, {...})`.
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
    // The table nodes, and the HTML import rules a table written as HTML
    // reads back with.
    TableExtension,
  ],
  name: '@lexical/mdast/Table',
  peerDependencies: [
    declarePeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html'),
  ],
  register: editor => editor.registerNodeTransform(TableNode, $moveLegacyAlign),
});
