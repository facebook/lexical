/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode, CodeNode} from '@lexical/code-core';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension';
import {
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  CHECK_LIST,
  CODE,
  ELEMENT_TRANSFORMERS,
  type ElementTransformer,
  MULTILINE_ELEMENT_TRANSFORMERS,
  type MultilineElementTransformer,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import {
  $computeTableMapSkipCellCheck,
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
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type ElementFormatType,
  type LexicalNode,
  LineBreakNode,
  type ParagraphNode,
} from 'lexical';

import {
  $createEquationNode,
  $isEquationNode,
  EquationNode,
} from '../../nodes/EquationNode';
import {$createImageNode, $isImageNode, ImageNode} from '../../nodes/ImageNode';
import {$createTweetNode, $isTweetNode, TweetNode} from '../../nodes/TweetNode';
import emojiList from '../../utils/emoji-list';

export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    // TODO: Get rid of isImport flag
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  triggerOnEnter: true,
  type: 'element',
};

export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: node => {
    if (!$isImageNode(node)) {
      return null;
    }

    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({
      altText,
      src,
    });
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};

export const EMOJI: TextMatchTransformer = {
  dependencies: [],
  export: () => null,
  importRegExp: /:([a-z0-9_]+):/,
  regExp: /:([a-z0-9_]+):$/,
  replace: (textNode, [, name]) => {
    const emoji = emojiList.find(e => e.aliases.includes(name))?.emoji;
    if (emoji) {
      textNode.replace($createTextNode(emoji));
    }
  },
  trigger: ':',
  type: 'text-match',
};

function escapeInlineEquation(equation: string): string {
  return equation.replace(/([\\$])/g, '\\$1');
}

function unescapeInlineEquation(equation: string): string {
  return equation.replace(/\\([\\$])/g, '$1');
}

export const BLOCK_EQUATION: MultilineElementTransformer = {
  dependencies: [EquationNode],
  export: node => {
    if (!$isEquationNode(node) || node.isInline()) {
      return null;
    }

    return `$$\n${node.getEquation()}\n$$`;
  },
  regExpEnd: /^\$\$\s*$/,
  regExpStart: /^\$\$\s*$/,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween) => {
    const equationLines = linesInBetween ?? [];
    if (equationLines[0] === '') {
      equationLines.shift();
    }
    if (equationLines[equationLines.length - 1] === '') {
      equationLines.pop();
    }
    rootNode.append($createEquationNode(equationLines.join('\n'), false));
  },
  type: 'multiline-element',
};

export const EQUATION: TextMatchTransformer = {
  dependencies: [EquationNode],
  export: node => {
    if (!$isEquationNode(node)) {
      return null;
    }

    const equation = node.getEquation();
    return node.isInline() ? `$${escapeInlineEquation(equation)}$` : null;
  },
  importRegExp: /\$((?:\\.|[^$\\\n])+?)\$/,
  regExp: /^\$\$([^$]+?)\$\$$|(?:^|[^$])\$((?:\\.|[^$\\\n])+?)\$$/,
  replace: (textNode, match) => {
    const [, firstEquation, secondEquation] = match;
    const isInline = !match[0].startsWith('$$');
    const equation = firstEquation ?? secondEquation;
    const equationNode = isInline
      ? $createEquationNode(unescapeInlineEquation(equation), true)
      : new EquationNode(equation, false);
    if (isInline) {
      const prefix =
        match[0][0] === '$' || match[0][0] === '\\' ? '' : match[0][0];
      if (prefix === '') {
        textNode.replace(equationNode);
      } else {
        textNode.setTextContent(prefix);
        textNode.insertAfter(equationNode);
      }
    } else {
      textNode.getParentOrThrow().replace(equationNode);
    }
  },
  trigger: '$',
  type: 'text-match',
};

export const TWEET: ElementTransformer = {
  dependencies: [TweetNode],
  export: node => {
    if (!$isTweetNode(node)) {
      return null;
    }

    return `<tweet id="${node.getId()}" />`;
  },
  regExp: /<tweet id="([^"]+?)"\s?\/>\s?$/,
  replace: (textNode, _1, match) => {
    const [, id] = match;
    const tweetNode = $createTweetNode(id);
    textNode.replace(tweetNode);
  },
  triggerOnEnter: true,
  type: 'element',
};

// Very primitive table setup
// A row may be indented by up to three spaces and end in spaces and tabs,
// and a CRLF line in a carriage return.
const TABLE_ROW_REG_EXP = /^ {0,3}\|([^]+)\|[ \t\r]*$/;

// Stands in for the `<` of text that reads as a `<br>`, which the text
// export would escape twice.
const ESCAPED_LT = '\uFDD0';

/**
 * A line break in a table cell, which is a `<br>`. Export writes a bare
 * newline, which becomes one: the default export would put a hard line
 * break's marker (`\` or two spaces) in front of it, and `\<br>` reads back
 * as an escaped `<`. Text that reads as a `<br>` is written with its `<`
 * escaped, through a placeholder the text export leaves alone. Import reads
 * a `<br>` wherever GFM does, inside formatting and links too, but not in
 * code or after an escaping backslash.
 */
const TABLE_CELL_LINE_BREAK: TextMatchTransformer = {
  dependencies: [LineBreakNode],
  export: (node, _, exportFormat) =>
    $isLineBreakNode(node)
      ? '\n'
      : $isEquationNode(node)
        ? $exportCellEquation(node)
        : $isTextNode(node) && !node.hasFormat('code')
          ? exportFormat(
              node,
              node
                .getTextContent()
                .replace(/<(?=br(?:[\s/][^<>]*)?>)/gi, ESCAPED_LT),
            )
          : null,
  // With attributes too, as GFM allows.
  importRegExp: /<br(?:[\s/][^<>]*)?>/i,
  regExp: /(?!)/,
  replace: textNode => {
    textNode.replace($createLineBreakNode());
  },
  type: 'text-match',
};

/**
 * An equation in a table cell, which holds one line, as an inline one.
 */
function $exportCellEquation(node: EquationNode): string {
  return `$${escapeInlineEquation(node.getEquation().replace(/\n/g, ' '))}$`;
}

/**
 * A block GFM's cell can't hold, written as what it can: a code block as a
 * code span for each of its lines, which a cell reads back as code, and a
 * block equation as an inline one.
 */
const TABLE_CELL_BLOCK: ElementTransformer = {
  dependencies: [CodeNode, EquationNode],
  export: node =>
    $isEquationNode(node)
      ? $exportCellEquation(node)
      : $isCodeNode(node)
        ? node
            .getTextContent()
            .split('\n')
            .map(line => {
              // A loop, as one argument per run would overflow the stack.
              let longest = 0;
              for (const [run] of line.matchAll(/`+/g)) {
                longest = Math.max(longest, run.length);
              }
              const fence = '`'.repeat(longest + 1);
              // A reader strips a space from each end of a span with
              // something else in it.
              return line && /^[ `]|[ `]$/.test(line) && /[^ ]/.test(line)
                ? `${fence} ${line} ${fence}`
                : line && fence + line + fence;
            })
            .join('\n')
        : null,
  regExp: /(?!)/,
  replace: () => false,
  type: 'element',
};

/**
 * The transformers that read a cell, which holds inline content only, as in
 * GFM: those of PLAYGROUND_TRANSFORMERS as it is now that read text, and a
 * `<br>` as a line break.
 */
function getCellTransformers(): Transformer[] {
  return [
    TABLE_CELL_LINE_BREAK,
    ...PLAYGROUND_TRANSFORMERS.filter(
      t => t.type === 'text-format' || t.type === 'text-match',
    ),
  ];
}

/**
 * `text` without the spaces and tabs at its ends, which GFM trims from a
 * cell. The end is trimmed by hand: a regex is quadratic on a long run of
 * spaces inside.
 */
function trimCell(text: string): string {
  let end = text.length;
  while (end > 0 && /[ \t]/.test(text[end - 1])) {
    end--;
  }
  return text.slice(0, end).replace(/^[ \t]+/, '');
}

/**
 * A cell's content as the Markdown of one GFM cell: each newline is a
 * `<br>`, and each pipe is escaped as `\|`, which GFM reads back as a pipe
 * before anything else, even in code.
 */
function $exportTableCell(
  cell: TableCellNode,
  transformers: Transformer[],
): string {
  return trimCell($convertToMarkdownString(transformers, cell))
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
    .replaceAll(ESCAPED_LT, '\\<');
}

// The alignment a delimiter cell (`:-:`) gives its column, and back.
const DELIMITER_ALIGN: Record<string, ElementFormatType> = {
  '-': '',
  '-:': 'right',
  ':-': 'left',
  ':-:': 'center',
};

export const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];
    // A nested table is written as its lines, which a cell reads as text.
    const transformers = [
      TABLE_CELL_LINE_BREAK,
      TABLE_CELL_BLOCK,
      ...PLAYGROUND_TRANSFORMERS.filter(
        t => t !== CODE && t !== BLOCK_EQUATION,
      ),
    ];

    // GFM drops the cells past the header's, so every row is written as wide
    // as the table, with an empty cell for each place a merged cell covers.
    const [map] = $computeTableMapSkipCellCheck(node, null, null);
    const width = map.reduce((max, row) => Math.max(max, row.length), 0);
    map.forEach((row, rowIndex) => {
      const cells = Array.from({length: width}, (_, i) => row[i]);
      output.push(
        `| ${cells
          .map((value, i) =>
            value && value.startRow === rowIndex && value.startColumn === i
              ? $exportTableCell(value.cell, transformers)
              : '',
          )
          .join(' | ')} |`,
      );
      // GFM reads the first row as the header, and its cells' alignment as
      // their columns'.
      if (rowIndex === 0) {
        output.push(
          `| ${cells
            .map(value => {
              const align = value && value.cell.getFormatType();
              return `${align === 'left' || align === 'center' ? ':' : ''}---${align === 'right' || align === 'center' ? ':' : ''}`;
            })
            .join(' | ')} |`,
        );
      }
    });

    return output.join('\n');
  },
  // GFM reads a table from a header row and a delimiter row with as many
  // cells, and then each row below it, with the header's cells.
  handleImportAfterStartMatch: ({lines, rootNode, startLineIndex}) => {
    const header = readTableRow(lines[startLineIndex]);
    const delimiter = lines[startLineIndex + 1] ?? '';
    const delimiterCells = readTableRow(delimiter);
    if (
      !header ||
      !delimiterCells ||
      delimiterCells.length !== header.length ||
      !delimiterCells.every(isTableDelimiterCell)
    ) {
      return null;
    }
    const align = delimiterCells.map(
      cell => DELIMITER_ALIGN[cell.trim().replace(/-+/, '-')],
    );
    const rows = [header];
    let end = startLineIndex + 1;
    for (let row; (row = readTableRow(lines[end + 1] ?? '')); end++) {
      rows.push(row);
    }
    const transformers = getCellTransformers();
    const table = $createTableNode().append(
      ...rows.map(row =>
        $createTableRowNode().append(
          ...align.map((format, i) =>
            $createTableCell(row[i] ?? '', transformers)
              .setHeaderStyles(
                row === header
                  ? TableCellHeaderStates.ROW
                  : TableCellHeaderStates.NO_STATUS,
              )
              .setFormat(format),
          ),
        ),
      ),
    );
    rootNode.append(table);
    return [true, end];
  },
  regExpStart: TABLE_ROW_REG_EXP,
  // Called for a row typed into the editor, which the space typed after it
  // turns into a table. Enter, which runs every multiline transformer, is
  // left to insert its line.
  replace: (parentNode, _1, match) => {
    if (!/\s$/.test(match[0])) {
      return false;
    }
    // Header row
    if (isTableDelimiterRow(match[0])) {
      // With no table above it, the line stays text.
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) {
        return false;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) {
        return false;
      }

      // Add header state to row cells
      lastRow.getChildren().forEach(cell => {
        if (!$isTableCellNode(cell)) {
          return;
        }
        cell.setHeaderStyles(
          TableCellHeaderStates.ROW,
          TableCellHeaderStates.ROW,
        );
      });

      // Remove line
      parentNode.remove();
      return;
    }

    // The regex matched the whole row.
    const matchCells = $mapToTableCells(match[0])!;

    const rows = [matchCells];
    let maxCells = matchCells.length;
    // Rows typed above stayed paragraphs.
    let sibling = parentNode.getPreviousSibling();

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const textContent = firstChild.getTextContent();
      // A delimiter row with no table above it stayed text.
      if (isTableDelimiterRow(textContent)) {
        break;
      }

      const cells = $mapToTableCells(textContent);

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < cells.length ? cells[i] : $createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();
    let target = table;
    if (
      $isTableNode(previousSibling) &&
      previousSibling.getColumnCount() === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
      target = previousSibling;
    } else {
      parentNode.replace(table);
    }

    // Only a table in the document takes the selection: nodes generated
    // apart from it leave the selection where it was.
    if (target.isAttached()) {
      target.selectEnd();
    }
  },
  type: 'multiline-element',
};

/**
 * Whether `line` is a GFM delimiter row: every cell a run of dashes, with
 * an optional colon at either end, padded with spaces and tabs.
 */
function isTableDelimiterRow(line: string): boolean {
  const cells = readTableRow(line);
  return cells !== null && cells.every(isTableDelimiterCell);
}

function isTableDelimiterCell(cell: string): boolean {
  return /^[ \t]*:?-+:?[ \t]*$/.test(cell);
}

/**
 * A cell read from its Markdown, a line of inline content. Two `<br>` in a
 * row, which export writes between paragraphs, start a new paragraph.
 */
function $createTableCell(
  textContent: string,
  transformers: Transformer[] = [],
): TableCellNode {
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  // Generating the nodes, unlike converting into the cell, leaves the
  // selection alone.
  for (const node of $generateNodesFromMarkdownString(
    trimCell(textContent).replace(/\\\|/g, '|'),
    transformers,
  )) {
    cell.append(node);
    if (!$isParagraphNode(node)) {
      continue;
    }
    let paragraph: ParagraphNode = node;
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      if ($isLineBreakNode(children[i]) && $isLineBreakNode(children[i + 1])) {
        children[i].remove();
        children[++i].remove();
        const next = $createParagraphNode();
        paragraph.insertAfter(next);
        paragraph = next;
      } else if (paragraph !== node) {
        paragraph.append(children[i]);
      }
    }
  }
  return cell;
}

/**
 * The cells of the row `line` as written, or null if it is not a row. A
 * row ends at its last pipe, unless that pipe is escaped (`| x \\|`), when
 * it is the last cell's content.
 */
function readTableRow(line: string): string[] | null {
  const match = line.match(TABLE_ROW_REG_EXP);
  if (!match) {
    return null;
  }
  const cells = splitTableRow(match[1] + '|');
  if (cells[cells.length - 1] === '') {
    cells.pop();
  }
  return cells;
}

const $mapToTableCells = (textContent: string): TableCellNode[] | null => {
  const transformers = getCellTransformers();
  const cells = readTableRow(textContent);
  return cells && cells.map(text => $createTableCell(text, transformers));
};

/**
 * Splits a row on its pipes. A pipe after a backslash is cell content, as
 * GFM reads it, whatever is before the backslash (`\\|`).
 */
function splitTableRow(text: string): string[] {
  const cells = [''];
  for (const [token] of text.matchAll(/\\\||[^]/g)) {
    if (token === '|') {
      cells.push('');
    } else {
      cells[cells.length - 1] += token;
    }
  }
  return cells;
}

export const PLAYGROUND_TRANSFORMERS: Transformer[] = [
  TABLE,
  HR,
  IMAGE,
  EMOJI,
  BLOCK_EQUATION,
  EQUATION,
  TWEET,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];
