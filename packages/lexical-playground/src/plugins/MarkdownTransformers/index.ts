/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension';
import {
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  type ElementTransformer,
  isTableRowDivider,
  MULTILINE_ELEMENT_TRANSFORMERS,
  type MultilineElementTransformer,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
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
import {$dfsIterator} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
  LineBreakNode,
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
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;

/**
 * Writes a line break in a table cell as a bare newline, which becomes a
 * `<br>`. The default export would put a hard line break's marker (`\` or
 * two spaces) in front of it, and `\<br>` reads back as an escaped `<`.
 */
const TABLE_CELL_LINE_BREAK: TextMatchTransformer = {
  dependencies: [LineBreakNode],
  export: node => ($isLineBreakNode(node) ? '\n' : null),
  regExp: /$^/,
  type: 'text-match',
};

/**
 * The transformers that read a cell: PLAYGROUND_TRANSFORMERS as it is now,
 * but TABLE. A GFM cell can't hold a table, and its pipes are unescaped
 * before it is read, so a line such as `\|q\|` must not read as one.
 */
function getCellTransformers(): Transformer[] {
  return PLAYGROUND_TRANSFORMERS.filter(t => t !== TABLE);
}

/**
 * A cell's content as the Markdown of one GFM cell: each newline is a
 * `<br>`, and a pipe or a `<br>` that is text is backslash-escaped, which
 * {@link $createTableCell} undoes. Code takes no escapes but a pipe's, so
 * code with an odd run of backslashes before a pipe (`a\|b`), which GFM
 * can't write in one span, is split there by an empty HTML comment.
 */
function $exportTableCell(
  cell: TableCellNode,
  transformers: Transformer[],
): string {
  return (
    $convertToMarkdownString(transformers, cell)
      .replace(/^[ \t]+|[ \t]+$/g, '')
      // A code span keeps its `<br>` as text, which it reads as.
      .replace(
        /(\\*)(\||<(?=br\s*\/?>))|\\[^]|(`{1,2})(?!`)[^]*?[^`]\3(?!`)|(`{3,})(?!`)[^\n]*?[^`\n]\4(?!`)|`+/gi,
        (match, backslashes?: string, char?: string, ...spans: unknown[]) =>
          char !== undefined
            ? escapeInCell(backslashes!, char)
            : spans[0] !== undefined || spans[1] !== undefined
              ? match.replace(
                  /(\\*)\|/g,
                  (_, inCode: string) =>
                    inCode +
                    (inCode.length % 2
                      ? `${spans[0] ?? spans[1]}<!---->${spans[0] ?? spans[1]}\\|`
                      : '\\|'),
                )
              : match,
      )
      .replace(/\n/g, '<br>')
  );
}

function escapeInCell(backslashes: string, char: string): string {
  return backslashes + (backslashes.length % 2 ? '\\\\' : '\\') + char;
}
export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];
    const transformers = [TABLE_CELL_LINE_BREAK, ...getCellTransformers()];

    for (const row of node.getChildren()) {
      const rowOutput = [];
      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        // It's TableCellNode so it's just to make flow happy
        if ($isTableCellNode(cell)) {
          rowOutput.push($exportTableCell(cell, transformers));
          // The top-left cell of a table with both header kinds is ROW|COLUMN.
          if (cell.hasHeaderState(TableCellHeaderStates.ROW)) {
            isHeaderRow = true;
          }
        }
      }

      // A row of dashes and colons would read as a delimiter row.
      const line = `| ${rowOutput.join(' | ')} |`;
      output.push(
        isTableDelimiterRow(line)
          ? `| ${rowOutput.map(cell => cell.replace(/[-:]/, '\\$&')).join(' | ')} |`
          : line,
      );
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(_ => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
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

    const matchCells = $mapToTableCells(match[0]);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

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
      $getTableColumnsSize(previousSibling) === maxCells
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
  type: 'element',
};

/**
 * Whether `line` is a GFM delimiter row, which has at least one dash in
 * every cell. `isTableRowDivider` also accepts a row of empty cells
 * (`|  |  |`), which is how an empty row is written.
 */
function isTableDelimiterRow(line: string): boolean {
  const match = line.match(TABLE_ROW_REG_EXP);
  return (
    match !== null &&
    isTableRowDivider(line) &&
    splitTableRow(match[1]).every(cell => cell.includes('-'))
  );
}

function $getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

// A line that starts a block, which a `<br>` before it ends a line for.
const CELL_BLOCK_START_REG_EXP =
  /[ \t]*(?:<br|```|\$\$|#{1,6}\s|>|[-*+]\s|\d{1,9}[.)]\s)/iy;

// A line that opens with a code span of three or more backticks, which
// would otherwise read as a code block.
const CELL_CODE_SPAN_LINE_REG_EXP = /[ \t]*`{3,}(?!`)(?:(?!<br)[^`])*`/iy;

// The spaces a cell's `<br>`s are read as where the cell has one free.
const MARKS = '           ';

function testAt(regExp: RegExp, text: string, index: number): boolean {
  regExp.lastIndex = index;
  return regExp.test(text);
}

const $createTableCell = (
  textContent: string,
  transformers: Transformer[] = [],
): TableCellNode => {
  // GFM trims a cell's padding, which is only spaces and tabs.
  const text = textContent.replace(/^[ \t]+|[ \t]+$/g, '');
  // The reader's marks are characters the cell doesn't have, written or as
  // a reference, so they can't be mistaken for its text.
  const refs = new Set(
    Array.from(text.matchAll(/&#(\d+);/g), match => Number(match[1])),
  );
  const isFree = (char: string) =>
    !text.includes(char) && !refs.has(char.charCodeAt(0));
  let nextFree = 0xe000;
  // The next free private-use character.
  const free = (): string => {
    for (; ; nextFree++) {
      const char = String.fromCharCode(nextFree);
      if (isFree(char)) {
        nextFree++;
        return char;
      }
    }
  };
  // A `<br>` inside a paragraph is read as a space-like mark, so that
  // formatting and links around it (`**a<br>b**`) stay whole, and the mark
  // becomes a line break once the cell is read.
  const mark = [...MARKS].find(isFree) ?? free();
  // A guard keeps a line that opens with a code span from reading as a code
  // block, and is dropped once the cell is read.
  const guard = free();
  // The legacy `\n` separates a cell's lines where it has no `<br>`.
  const legacy = !/<br\s*\/?>/i.test(text);
  // Reads the cell with the `<br>`s at the offsets in `blocks` ending their
  // paragraph. Without `blocks`, each `<br>` before text that starts a block
  // is read as a character of its own, returned with its offset.
  const $read = (
    blocks?: number[],
  ): [TableCellNode, [offset: number, char: string][]] => {
    const candidates: [number, string][] = [];
    let fence = '';
    let lineStart = 0;
    const guardAt = (offset: number) =>
      fence === '' && testAt(CELL_CODE_SPAN_LINE_REG_EXP, text, offset)
        ? guard
        : '';
    const markdown =
      guardAt(0) +
      text.replace(
        /\\[^]|(`{1,2})(?!`)[^]*?[^`]\1(?!`)(?:<!---->\1(?!`)[^]*?[^`]\1(?!`))*|(`{3,})(?!`)(?:(?!<br)[^])*?[^`]\2(?!`)(?:<!---->\2(?!`)(?:(?!<br)[^])*?[^`]\2(?!`))*|`+|[ \t]*<br\s*\/?>[ \t]*/gi,
        (match: string, short?: string, long?: string, offset?: number) => {
          if (match[0] === '`') {
            const ticks = short ?? long;
            // Code spans take no escapes but a pipe's, and a span that
            // export split before an escaped pipe is joined again.
            return ticks === undefined
              ? match
              : match
                  .replace(
                    /(\\*)(`+)<!---->(`+)\\\|/g,
                    (split, backslashes: string, end: string, start: string) =>
                      backslashes.length % 2 === 1 &&
                      end === ticks &&
                      start === ticks
                        ? backslashes + '\\|'
                        : split,
                  )
                  .replace(/\\\|/g, '|');
          }
          if (match[0] === '\\') {
            const char = match[1];
            return char === '|' ||
              (char === '<' && /^br\s*\/?>/i.test(text.slice(offset! + 2)))
              ? char
              : char === 'n' && legacy
                ? '\n'
                : match;
          }
          // The whitespace a `<br>` is written with is padding too.
          const line = text.slice(lineStart, offset);
          lineStart = offset! + match.length;
          // A code block opens with a fence and closes with a line of at
          // least as many backticks.
          const fenceMatch = /^[ \t]*(`{3,})([^`]*)$/.exec(line);
          const fenceLine =
            fenceMatch !== null &&
            (fence === '' ||
              (fenceMatch[1].length >= fence.length &&
                fenceMatch[2].trim() === ''));
          if (fenceLine) {
            fence = fence === '' ? fenceMatch[1] : '';
          }
          if (
            fence !== '' ||
            fenceLine ||
            line === '' ||
            (blocks !== undefined && blocks.includes(offset!))
          ) {
            return '\n' + guardAt(lineStart);
          }
          if (
            blocks === undefined &&
            testAt(CELL_BLOCK_START_REG_EXP, text, lineStart)
          ) {
            const char = free();
            candidates.push([offset!, char]);
            return char;
          }
          return mark;
        },
      );
    // Generating the nodes, unlike converting into the cell, leaves the
    // selection alone.
    return [
      $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
        ...$generateNodesFromMarkdownString(markdown, transformers),
      ),
      candidates,
    ];
  };
  const [first, candidates] = $read();
  let cell = first;
  if (candidates.length > 0) {
    // A `<br>` before text that starts a block ends the paragraph, unless
    // formatting, a link, an equation or an image reads as spanning it.
    const blocks = new Set<string>();
    for (const node of cell.getAllTextNodes()) {
      if (node.getFormat() === 0 && !node.getParentOrThrow().isInline()) {
        for (const [, char] of candidates) {
          if (node.getTextContent().includes(char)) {
            blocks.add(char);
          }
        }
      }
    }
    [cell] = $read(
      candidates.flatMap(([offset, char]) =>
        blocks.has(char) ? [offset] : [],
      ),
    );
  }
  for (const {node} of $dfsIterator(cell)) {
    if ($isEquationNode(node)) {
      // An inline equation holds its line breaks as newlines.
      node.setEquation(node.getEquation().split(mark).join('\n'));
    } else if ($isImageNode(node)) {
      node.setAltText(node.getAltText().split(mark).join('<br>'));
    }
  }
  for (const node of cell.getAllTextNodes()) {
    const nodeText = node.getTextContent();
    const offsets: number[] = [];
    for (let i = 0; i < nodeText.length; i++) {
      if (nodeText[i] === mark || nodeText[i] === guard) {
        offsets.push(i, i + 1);
      }
    }
    for (const piece of offsets.length > 0 ? node.splitText(...offsets) : []) {
      const pieceText = piece.getTextContent();
      if (pieceText === mark) {
        piece.replace($createLineBreakNode());
      } else if (pieceText === guard) {
        piece.remove();
      }
    }
  }
  return cell;
};

const $mapToTableCells = (textContent: string): TableCellNode[] | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  const transformers = getCellTransformers();
  return splitTableRow(match[1]).map(text =>
    $createTableCell(text, transformers),
  );
};

/** Splits a row on its pipes; escaped pipes (`\|`) are cell content. */
function splitTableRow(text: string): string[] {
  const cells = [''];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '|') {
      cells.push('');
    } else {
      // A backslash escapes the next character, pipe or not (`\\|`).
      const end = text[i] === '\\' ? i + 2 : i + 1;
      cells[cells.length - 1] += text.slice(i, end);
      i = end - 1;
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
