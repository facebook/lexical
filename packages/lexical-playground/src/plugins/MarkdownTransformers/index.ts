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
  $convertFromMarkdownString,
  $convertToMarkdownString,
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
import {
  $createLineBreakNode,
  $createTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
  LineBreakNode,
  type TextNode,
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
 * A private-use character that `text` doesn't contain, to stand in for the
 * line breaks in a cell's Markdown while it is encoded or decoded.
 */
function lineBreakMark(text: string): string {
  // A numeric character reference (`&#57344;`) reads as its character.
  const references = new Set<number>();
  for (const [, decimal, hex] of text.matchAll(/&#(?:(\d+)|x([\da-f]+));/gi)) {
    references.add(decimal ? parseInt(decimal, 10) : parseInt(hex, 16));
  }
  let code = 0xe000;
  while (text.includes(String.fromCharCode(code)) || references.has(code)) {
    code++;
  }
  return String.fromCharCode(code);
}

/**
 * Writes a line break inside a table cell as `mark`. It runs before the
 * default line break export, which would put the break's hard line break
 * marker (`\` or two spaces) in front of it, and `\<br>` reads back as an
 * escaped `<`.
 */
function tableCellLineBreak(mark: string): TextMatchTransformer {
  return {
    dependencies: [LineBreakNode],
    export: node => ($isLineBreakNode(node) ? mark : null),
    regExp: /$^/,
    type: 'text-match',
  };
}

/** A cell's content as the Markdown of one GFM cell. */
function $exportTableCell(cell: TableCellNode): string {
  const mark = lineBreakMark(cell.getTextContent());
  return encodeTableCell(
    $convertToMarkdownString(
      [tableCellLineBreak(mark), ...PLAYGROUND_TRANSFORMERS],
      cell,
    ).trim(),
  )
    .split(mark)
    .join('<br>');
}

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];

    for (const row of node.getChildren()) {
      const rowOutput = [];
      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        // It's TableCellNode so it's just to make flow happy
        if ($isTableCellNode(cell)) {
          rowOutput.push($exportTableCell(cell));
          // The top-left cell of a table with both header kinds is ROW|COLUMN.
          if (cell.hasHeaderState(TableCellHeaderStates.ROW)) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(_ => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    // Header row
    if (isTableRowDivider(match[0])) {
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

    const matchCells = mapToTableCells(match[0]);

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

      const cells = mapToTableCells(firstChild.getTextContent());

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
    if (
      $isTableNode(previousSibling) &&
      getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element',
};

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

/**
 * Splits Markdown into the parts outside code spans and the code spans
 * themselves (odd indices), whose closing backtick run is exactly as long
 * as the opening one. An unmatched run is ordinary text.
 */
function splitCodeSpans(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] !== '`') {
      i++;
      continue;
    }
    const close = codeSpanEnd(text, i);
    if (close === -1) {
      while (text[i] === '`') {
        i++;
      }
      continue;
    }
    parts.push(text.slice(start, i), text.slice(i, close));
    start = i = close;
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * The end of the code span that the backtick run at `start` opens: after a
 * closing run exactly as long as the opening one, or -1 when there is none.
 */
function codeSpanEnd(text: string, start: number): number {
  let end = start;
  while (text[end] === '`') {
    end++;
  }
  const fence = text.slice(start, end);
  let close = text.indexOf(fence, end);
  while (close !== -1 && text[close + fence.length] === '`') {
    while (text[close] === '`') {
      close++;
    }
    close = text.indexOf(fence, close);
  }
  return close === -1 ? -1 : close + fence.length;
}

const CODE_FENCE_OPEN_REG_EXP = /^ {0,3}(`{3,})[^`\n]*$/;
const CODE_FENCE_CLOSE_REG_EXP = /^ {0,3}(`{3,})[ \t]*$/;

// A pipe after an odd run of backslashes.
const ESCAPED_PIPE_REG_EXP = /(?:^|[^\\])(?:\\\\)*\\\|/;

/**
 * A code span as it is written in a cell. GFM splits a row on each pipe
 * that no backslash escapes, then drops the backslash of each `\|` in a
 * cell, code spans included, so each pipe in code gets a backslash of its
 * own. Code with a backslash right before a pipe can't be written that way,
 * since `\\|` is an escaped backslash and then a pipe that splits the row,
 * so it is written as HTML, with its punctuation as character references,
 * which {@link codeSpanFromHtml} reads back.
 */
function encodeCodeSpan(span: string): string {
  if (!ESCAPED_PIPE_REG_EXP.test(span)) {
    return span.replace(/\|/g, '\\|');
  }
  const fence = span.length - span.replace(/^`+/, '').length;
  let code = span.slice(fence, -fence);
  if (/^ [^]* $/.test(code) && code.trim() !== '') {
    code = code.slice(1, -1);
  }
  return `<code>${code.replace(
    /[^\p{L}\p{N} ]/gu,
    char => `&#${char.codePointAt(0)};`,
  )}</code>`;
}

const CODE_HTML_REG_EXP = /<code>([^<]*)<\/code>/gi;

/** A code span with the code of a `<code>` element that has only text. */
function codeSpanFromHtml(html: string): string {
  const code = html.replace(
    /&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot));/gi,
    (reference, decimal?: string, hex?: string, name?: string) => {
      if (name !== undefined) {
        return {amp: '&', gt: '>', lt: '<', quot: '"'}[
          name.toLowerCase() as 'amp' | 'gt' | 'lt' | 'quot'
        ];
      }
      const codePoint = decimal ? parseInt(decimal, 10) : parseInt(hex!, 16);
      return codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : reference;
    },
  );
  const fence = '`'.repeat(
    Math.max(0, ...Array.from(code.matchAll(/`+/g), run => run[0].length)) + 1,
  );
  // A space keeps a backtick or a padded code span from merging into the
  // fence or losing its padding.
  const pad = /^[` ]|[` ]$/.test(code) && code.trim() !== '' ? ' ' : '';
  return fence + pad + code + pad + fence;
}

/**
 * Writes a cell's Markdown as one line. Outside code blocks, a line break
 * and the blank line between paragraphs become `<br>`, and a `<br>` that is
 * text is escaped (`\<br>`) except in code spans, which take no escapes.
 * Inside a code block, which takes no escapes either, each newline becomes
 * a `<br>` (so blank lines survive), and a backslash, a pipe and a `<br>`
 * that are code are backslash-escaped, which {@link decodeTableCell} undoes.
 */
function encodeTableCell(markdown: string): string {
  const lines = markdown.split('\n');
  let result = '';
  let text = '';
  const flushText = () => {
    result += splitCodeSpans(text)
      .map((part, i) =>
        i % 2 === 1
          ? encodeCodeSpan(part)
          : // Escapes a pipe and a `<br>` that are text, past what a
            // backslash already escapes (in `\\|`, the backslash).
            part.replace(/\\[^]|\||<(?=br\s*\/?>)/gi, match =>
              match.length > 1 ? match : '\\' + match,
            ),
      )
      .join('')
      .replace(/\n\n?/g, '<br>');
    text = '';
  };
  let fence: string | null = null;
  lines.forEach((line, i) => {
    const separator = i > 0 ? '\n' : '';
    if (fence === null) {
      const open = CODE_FENCE_OPEN_REG_EXP.exec(line);
      if (open === null) {
        text += separator + line;
        return;
      }
      fence = open[1];
      text += separator;
      flushText();
      result += line;
      return;
    }
    const close = CODE_FENCE_CLOSE_REG_EXP.exec(line);
    result +=
      '<br>' +
      (close !== null && close[1].length >= fence.length
        ? line
        : line.replace(/[\\|]|<(?=br\s*\/?>)/gi, '\\$&'));
    if (close !== null && close[1].length >= fence.length) {
      fence = null;
    }
  });
  flushText();
  return result;
}

/** One of a cell's lines, and where it is relative to a code block. */
interface CellLine {
  fence: 'open' | 'code' | 'close' | null;
  text: string;
}

// The line separators in a cell: `<br>`, or the legacy `\n`.
const CELL_BREAK_REG_EXP = /<br\s*\/?>/iy;
const CELL_FENCE_OPEN_REG_EXP = /^ {0,3}(`{3,})[^`]*?(?=<br\s*\/?>|\\n|$)/i;
const CELL_FENCE_CLOSE_REG_EXP = /^ {0,3}(`{3,})[ \t]*(?=<br\s*\/?>|\\n|$)/i;

/** Splits a cell's Markdown into its lines. */
function splitCellLines(text: string): CellLine[] {
  const lines: CellLine[] = [];
  let fence: string | null = null;
  let i = 0;
  for (;;) {
    const rest = text.slice(i);
    let kind: CellLine['fence'] = null;
    if (fence === null) {
      const open = CELL_FENCE_OPEN_REG_EXP.exec(rest);
      if (open !== null) {
        fence = open[1];
        kind = 'open';
      }
    } else {
      const close = CELL_FENCE_CLOSE_REG_EXP.exec(rest);
      kind =
        close !== null && close[1].length >= fence.length ? 'close' : 'code';
    }
    let end = i;
    let separator = 0;
    while (end < text.length) {
      CELL_BREAK_REG_EXP.lastIndex = end;
      const br = CELL_BREAK_REG_EXP.exec(text);
      if (br !== null) {
        separator = br[0].length;
        break;
      }
      if (text[end] === '\\') {
        if (text[end + 1] === 'n') {
          separator = 2;
          break;
        }
        end += 2;
      } else if (text[end] === '`' && kind === null) {
        // `<br>` in a code span is code.
        const spanEnd = codeSpanEnd(text, end);
        end = spanEnd === -1 ? end + 1 : spanEnd;
      } else {
        end++;
      }
    }
    lines.push({fence: kind, text: text.slice(i, Math.min(end, text.length))});
    if (kind === 'close') {
      fence = null;
    }
    if (end >= text.length) {
      return lines;
    }
    i = end + separator;
  }
}

// A line that must start a block of its own: a heading, a quote, a list
// item, a thematic break, or a block equation.
const BLOCK_START_REG_EXP =
  /^ {0,3}(?:#{1,6}(?:\s|$)|>|[-*+]\s|\d{1,9}[.)]\s|([-*_])(?:[ \t]*\1){2,}[ \t]*$|\$\$)/;
// A line that a block of its own ends: a heading or a thematic break.
const BLOCK_LINE_REG_EXP =
  /^ {0,3}(?:#{1,6}(?:\s|$)|([-*_])(?:[ \t]*\1){2,}[ \t]*$)/;

/**
 * How each separator between a cell's lines reads: as a newline where a
 * block needs one (in a code block, and beside a fence), as a newline that
 * a block would start or end if it isn't inside inline syntax (before a
 * line that starts a block, or after one that a block ends), or as a line
 * break inside a paragraph.
 */
type CellBreak = 'newline' | 'block' | 'inline';

function cellBreaks(lines: CellLine[]): CellBreak[] {
  return lines.slice(1).map((line, i) => {
    const prev = lines[i];
    if (line.fence !== null || prev.fence !== null) {
      return 'newline';
    }
    return BLOCK_START_REG_EXP.test(line.text) ||
      BLOCK_LINE_REG_EXP.test(prev.text)
      ? 'block'
      : 'inline';
  });
}

/**
 * A cell's Markdown with its line separators decoded, for
 * `$convertFromMarkdownString`. `<br>` separates lines in a cell, and the
 * literal `\n` this transformer used to write still does, but neither
 * inside a code span nor after a backslash escape (`\<br>`, `C:\\new`).
 * A separator that `newline` picks becomes a newline; any other becomes
 * `mark`, which {@link $createTableCell} turns into a line break after
 * parsing, so formatting and links that span it (`**a<br>b**`,
 * `[a<br>b](url)`) stay whole. A pipe is escaped (`\|`) everywhere in a
 * row, code spans included, so it is unescaped here.
 */
function decodeTableCell(
  lines: CellLine[],
  newline: readonly boolean[],
  mark: string,
): string {
  let result = '';
  lines.forEach((line, i) => {
    if (i > 0) {
      result = result.replace(/[ \t]+$/, '');
      result += newline[i - 1] ? '\n' : mark;
    }
    if (line.fence === 'code') {
      result += line.text.replace(/\\([\\|<n])/g, (_, char: string) =>
        char === 'n' ? '\n' : char,
      );
    } else if (line.fence !== null) {
      result += line.text;
    } else {
      const body = splitCodeSpans(line.text)
        .map((part, k) => {
          const unescaped = part.replace(/\\\|/g, '|');
          return k % 2 === 1
            ? unescaped
            : unescaped.replace(CODE_HTML_REG_EXP, (_, html: string) =>
                codeSpanFromHtml(html),
              );
        })
        .join('');
      result += i > 0 && result.endsWith(mark) ? body.trimStart() : body;
    }
  });
  return result;
}

/** The text nodes under `cell` that hold each `mark`, in order. */
function $markNodes(cell: TableCellNode, mark: string): TextNode[] {
  return cell.getAllTextNodes().flatMap(node =>
    node
      .getTextContent()
      .split(mark)
      .slice(1)
      .map(() => node),
  );
}

/** Turns each `mark` in the text under `cell` into a line break. */
function $markToLineBreaks(cell: TableCellNode, mark: string): void {
  for (const node of cell.getAllTextNodes()) {
    const textContent = node.getTextContent();
    if (!textContent.includes(mark)) {
      continue;
    }
    const offsets: number[] = [];
    for (let i = 0; i < textContent.length; i++) {
      if (textContent[i] === mark) {
        offsets.push(i, i + 1);
      }
    }
    for (const piece of node.splitText(...offsets)) {
      if (piece.getTextContent() === mark) {
        piece.replace($createLineBreakNode());
      }
    }
  }
}

const $createTableCell = (textContent: string): TableCellNode => {
  // GFM trims a cell's padding.
  const text = textContent.trim();
  const mark = lineBreakMark(text);
  const lines = splitCellLines(text);
  const breaks = cellBreaks(lines);
  if (breaks.includes('block')) {
    // Text that would start a block can't when it follows a `<br>` inside
    // inline syntax (`**a<br># b**`, `[a<br>- b](url)`). Read every such
    // separator as a line break first, and keep the ones that land in
    // formatted text or an inline element.
    const probe = $createTableCellNode();
    $convertFromMarkdownString(
      decodeTableCell(
        lines,
        breaks.map(kind => kind === 'newline'),
        mark,
      ),
      PLAYGROUND_TRANSFORMERS,
      probe,
    );
    const marked = $markNodes(probe, mark);
    const unmarked = breaks.flatMap((kind, i) =>
      kind === 'newline' ? [] : [i],
    );
    if (marked.length === unmarked.length) {
      marked.forEach((node, k) => {
        const parent = node.getParent();
        if (
          node.getFormat() !== 0 ||
          ($isElementNode(parent) && parent.isInline())
        ) {
          breaks[unmarked[k]] = 'inline';
        }
      });
    }
  }
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(
    decodeTableCell(
      lines,
      breaks.map(kind => kind !== 'inline'),
      mark,
    ),
    PLAYGROUND_TRANSFORMERS,
    cell,
  );
  $markToLineBreaks(cell, mark);
  return cell;
};

const mapToTableCells = (textContent: string): TableCellNode[] | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return splitTableRow(match[1]).map(text => $createTableCell(text));
};

/** Splits a row on its pipes; escaped pipes (`\|`) are cell content. */
function splitTableRow(text: string): string[] {
  const cells = [''];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '|') {
      cells.push('');
    } else if (text[i] === '\\' && i + 1 < text.length) {
      // A backslash escapes the next character, pipe or not (`\\|`).
      cells[cells.length - 1] += text.slice(i, i + 2);
      i++;
    } else {
      cells[cells.length - 1] += text[i];
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
