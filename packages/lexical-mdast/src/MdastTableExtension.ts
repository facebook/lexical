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
import {DOMImportExtension} from '@lexical/html';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableImportRules,
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
    new RegExp(`^\\s*(?:<${tag}\\s*\\/?>\\s*)+$`, 'i').test(node.value)
    ? node.value.split('<').length - 1
    : 0;
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
    const count = voidTags(child, 'br');
    for (let i = 0; i < count; i++) {
      lines.push([]);
    }
    if (count === 0) {
      lines[lines.length - 1].push(
        ...mapPhrasing([child], node => {
          const breaks = voidTags(node, 'br');
          if (breaks > 0) {
            return Array.from({length: breaks}, () => ({type: 'break'}));
          }
          // GFM reads `\|` in a cell as a pipe before anything else, which
          // micromark leaves to code.
          const {value} = node as {value?: string};
          return /^(?:html|htmlInline|inlineMath)$/.test(node.type)
            ? [{...node, value: value!.replace(/\\\|/g, '|')}]
            : undefined;
        }),
      );
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
        value = value.replace(/[ \t]+$/, '');
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
            cellLines(cell).flatMap(line => $lineBlocks(line, ctx)),
          ),
        ),
      ),
    ),
  );
};

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

/** `value` on one line: a line end in it has no form in a cell. */
function rawLine(value: string, fit: CellFit): string {
  if (/[\r\n]/.test(value)) {
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

/** The code of an MDX expression, which has no escape for a pipe. */
function scriptLine(code: string, fit: CellFit): string {
  if (code.includes('|')) {
    fit.exact = false;
  }
  return escapePipes(rawLine(code, fit), fit);
}

/**
 * Text that reads character references (a JSX or directive attribute's
 * string) on one line and without pipes, with its `&` as one too.
 */
function references(text: string): string {
  return text.replace(/[\r\n|&]/g, found => `&#${found.charCodeAt(0)};`);
}

// Raw HTML with text that reads no references, so a pipe in it has no form.
const RAW_TEXT_RE = /<(?:script|style|textarea|title)(?=[\s/>]|$)/i;

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
    const {attributes, children} = node as {
      attributes?: unknown;
      children?: PhrasingContent[];
    };
    if (type === 'break' || type === 'thematicBreak') {
      // GFM has no rule in a cell but HTML's, which import reads back.
      return [rawHtml(type === 'break' ? '<br>' : '<hr>')];
    }
    if (FORMATTING_RE.test(type)) {
      return [{...node, children: cellPhrasing(children!, fit)} as Emphasis];
    }
    if ((type === 'text' || type === 'inlineCode') && /[\r\n]/.test(value!)) {
      // Code takes no `<br>`, so a code span per line is only near it.
      if (type !== 'text') {
        fit.exact = false;
      }
      return value!
        .split(/\r?\n|\r/)
        .flatMap((line, i): PhrasingContent[] => [
          ...(i > 0 ? [rawHtml('<br>')] : []),
          ...(line ? cellPhrasing([{...node, value: line} as Text], fit) : []),
        ]);
    }
    if (type === 'inlineCode' || type === 'inlineMath') {
      // gfm-table escapes the pipes in code itself.
      return [
        {
          ...node,
          value: escapePipes(
            rawLine(value!, fit),
            fit,
            type === 'inlineCode' ? '' : '\\',
          ),
        } as PhrasingContent,
      ];
    }
    if (/^html(?:Block|Inline)?$/.test(type)) {
      // A line end beside embedded Markdown (a `<template>` holding its
      // place) only sets it apart, but blocks embedded one after another
      // have no line of their own.
      const html = value!.replace(/\s+/g, (space, at: number, all: string) =>
        /[\r\n]/.test(space) &&
        (all.startsWith('</template>', at - 11) ||
          all.startsWith('<template data-mdast-child=', at + space.length))
          ? ''
          : space,
      );
      if (
        /<\/template><template/.test(html) ||
        (html.includes('|') && RAW_TEXT_RE.test(html))
      ) {
        fit.exact = false;
      }
      return [
        {
          ...node,
          value: rawLine(html, fit).replace(/\|/g, '&#124;'),
          // `MdastHtmlExtension`'s raw HTML with Markdown embedded in it:
          // phrasing, or the paragraphs of block HTML.
          ...(children && {
            children:
              type === 'htmlBlock'
                ? (children as unknown as BlockContent[]).map(child =>
                    child.type === 'paragraph'
                      ? {...child, children: cellPhrasing(child.children, fit)}
                      : ((fit.exact = false), child),
                  )
                : cellPhrasing(children, fit),
          }),
        } as PhrasingContent,
      ];
    }
    if (type === 'mdxTextExpression') {
      return [{...node, value: scriptLine(value || '', fit)} as Html];
    }
    if (type === 'mdxJsxTextElement' || type === 'textDirective') {
      return [
        {
          ...node,
          // A string reads references; an expression's code is as above.
          ...(attributes != null && {
            attributes: Array.isArray(attributes)
              ? attributes.map(
                  (attribute: {type: string; value?: string | Html | null}) => {
                    const attributeValue = attribute.value;
                    return {
                      ...attribute,
                      value:
                        typeof attributeValue !== 'string'
                          ? attributeValue && {
                              ...attributeValue,
                              value: scriptLine(
                                attributeValue.value || '',
                                fit,
                              ),
                            }
                          : attribute.type !== 'mdxJsxAttribute'
                            ? scriptLine(attributeValue, fit)
                            : references(attributeValue),
                    };
                  },
                )
              : Object.fromEntries(
                  Object.entries(attributes).map(([name, attributeValue]) => [
                    name,
                    attributeValue == null
                      ? attributeValue
                      : references(String(attributeValue)),
                  ]),
                ),
          }),
          ...(children && {children: cellPhrasing(children, fit)}),
        } as unknown as PhrasingContent,
      ];
    }
    return undefined;
  });
}

// The phrasing content that holds phrasing content, with that of
// `MdastHtmlExtension` and of the directive and MDX extensions to mdast.
const PHRASING_PARENT_RE =
  /^(?:delete|emphasis|link|linkReference|strong|htmlInline|textDirective|mdxJsxTextElement)$/;

// Flow content of mdast extensions that has a phrasing twin, which a cell
// can hold in its place. Only an expression is the same in a line.
const PHRASING_TWIN: Record<string, string> = {
  containerDirective: 'textDirective',
  leafDirective: 'textDirective',
  math: 'inlineMath',
  mdxFlowExpression: 'mdxTextExpression',
  mdxJsxFlowElement: 'mdxJsxTextElement',
};

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
  phrase: (phrasing: PhrasingContent[]) => PhrasingContent[] = phrasing =>
    cellPhrasing(phrasing, fit),
): PhrasingContent[] {
  const lines: PhrasingContent[][] = [];
  // The line of the last top-level phrasing, which phrasing right after it
  // runs on.
  let phrasing: PhrasingContent[] = [];
  const visit = (node: MdastNode) => {
    const type = node.type as string;
    const twin = PHRASING_TWIN[type];
    if (twin) {
      if (type !== 'mdxFlowExpression') {
        fit.exact = false;
      }
      return visit({
        ...node,
        type: twin,
        // A leaf directive's label is phrasing already. Phrasing is
        // rewritten once, with the twin's.
        ...('children' in node &&
          type !== 'leafDirective' && {
            children: cellContent(node.children, fit, same => same),
          }),
      } as MdastNode);
    }
    switch (type) {
      case 'paragraph':
      case 'tableCell':
        lines.push(phrase((node as Paragraph).children));
        return;
      case 'thematicBreak':
        lines.push([rawHtml('<hr>')]);
        return;
      case 'html':
        lines.push(phrase([node as Html]));
        return;
      case 'definition':
        // Definitions are the document's, and no node exports one.
        return;
    }
    if (!('children' in node) || PHRASING_PARENT_RE.test(type)) {
      // Phrasing content exported at the cell's top level (an image, a
      // footnote reference, an inline decorator's fallback) is a line of its
      // own after a block's, and runs on with the phrasing before it.
      if (type !== 'code') {
        if (lines[lines.length - 1] !== phrasing) {
          lines.push((phrasing = []));
        }
        phrasing.push(...phrase([node as PhrasingContent]));
        return;
      }
    }
    fit.exact = false;
    if (type === 'code') {
      for (const value of (node as Code).value.split(/\r?\n|\r/)) {
        lines.push(value ? phrase([{type: 'inlineCode', value}]) : []);
      }
    } else if (type === 'heading') {
      lines.push(phrase((node as Heading).children));
    } else if (type !== 'htmlBlock') {
      // The Markdown in `MdastHtmlExtension`'s block HTML, which is only
      // written as part of HTML, isn't flattened.
      (node as Parent).children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return lines.flatMap((line, i) =>
    i > 0 ? [rawHtml('<br>'), ...line] : line,
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
  // The header is the table's first row of cells, which a selection's
  // export may leave out.
  const headerRow = table
    .getChildren()
    .find(
      row => $isTableRowNode(row) && row.getChildren().some($isTableCellNode),
    );
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
 */
export function $getTableColumnAlign(table: TableNode): AlignType[] {
  return $alignColumns(table, table.getChildren().filter($isTableRowNode));
}

/**
 * A table as HTML, for one with a cell that GFM can't hold: Markdown is
 * read between blank lines in HTML, so each cell holds its blocks as they
 * are, and GFM readers, CommonMark ones and MDX alike read it.
 */
function htmlTable(cells: MdastNode[][][], align: AlignType[]): HtmlBlock {
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
      const cellAlign = align[column];
      parts.push(
        // GitHub keeps only `align`, and HTML import reads `text-align`.
        `<${tag}${cellAlign ? ` align="${cellAlign}" style="text-align: ${cellAlign}"` : ''}>`,
        ...(blocks.length > 0
          ? ['\n\n', {flow: blocks as BlockContent[]}, '\n\n']
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
  const cells = rows.map(row =>
    row
      .getChildren()
      .filter($isTableCellNode)
      .map(cell => ctx.exportChildren(cell)),
  );
  const fit: CellFit = {exact: true};
  const lines = cells.map(row => row.map(blocks => cellContent(blocks, fit)));
  const align = $alignColumns(node, rows);
  if (
    !fit.exact &&
    $getPeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html')
  ) {
    return htmlTable(cells, align);
  }
  return {
    align,
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
 * block, or a line end in math or HTML) is written as an HTML table with
 * Markdown in its cells when the editor has `MdastHtmlExtension`, and
 * otherwise with those blocks flattened into lines. Column alignment is the
 * element format of the
 * column's cells (`TableCellNode.setFormat`), exported as the alignment
 * most of the column's cells have, or else its header cell's.
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
    // A table written as HTML reads back through HTML import.
    configExtension(DOMImportExtension, {rules: TableImportRules}),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
  peerDependencies: [
    declarePeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html'),
  ],
  register: editor => editor.registerNodeTransform(TableNode, $moveLegacyAlign),
});
