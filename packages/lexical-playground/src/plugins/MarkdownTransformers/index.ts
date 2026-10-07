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
import {
  $copyNode,
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
 * Characters that `text` doesn't contain, by themselves or as a numeric
 * character reference (`&#57344;`), which reads as its character: the
 * first `count` of `candidates`, then private-use characters.
 */
function unusedChars(
  text: string,
  count: number,
  candidates: readonly number[] = [],
): string[] {
  const used = new Set<number>();
  for (const char of text) {
    used.add(char.codePointAt(0)!);
  }
  for (const [, decimal, hex] of text.matchAll(/&#(?:(\d+)|x([\da-f]+));/gi)) {
    used.add(decimal ? parseInt(decimal, 10) : parseInt(hex, 16));
  }
  const chars: string[] = [];
  for (const code of candidates) {
    if (chars.length < count && !used.has(code)) {
      chars.push(String.fromCharCode(code));
    }
  }
  for (let code = 0xe000; chars.length < count; code++) {
    if (!used.has(code)) {
      chars.push(String.fromCharCode(code));
    }
  }
  return chars;
}

// Space characters that a line break can stand in for while a cell is
// read: Markdown takes them, like the line ending they replace, as
// whitespace beside emphasis (`a<br>**(b)**`), and `.` matches them.
const LINE_BREAK_MARKS = [
  0x3000, 0x205f, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
  0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x1680,
];

/** The characters that stand in for line breaks and code while a cell is read. */
interface CellMarks {
  codeEnd: string;
  codeStart: string;
  lineBreak: string;
}

/**
 * Writes a line break inside a table cell as `mark`, and adds its key to
 * `written`. It runs before the default line break export, which would put
 * the break's hard line break marker (`\` or two spaces) in front of it,
 * and `\<br>` reads back as an escaped `<`. A line break in a code block
 * is exported by the code block, as a newline.
 */
function tableCellLineBreak(
  mark: string,
  written: Set<string>,
): TextMatchTransformer {
  return {
    dependencies: [LineBreakNode],
    export: node => {
      if (!$isLineBreakNode(node)) {
        return null;
      }
      written.add(node.getKey());
      return mark;
    },
    regExp: /$^/,
    type: 'text-match',
  };
}

/**
 * Writes a paragraph at the top of a table cell, where each paragraph is a
 * line. An empty one is an empty line, written as `mark` (with its key
 * added to `written`), since Markdown has no empty paragraphs. One that is
 * only whitespace keeps it as character references, which aren't trimmed.
 * Any other has a block marker it starts with escaped (`\#`), since the
 * line after a `<br>` reads as a block where one could start.
 */
function tableCellParagraph(
  mark: string,
  written: Set<string>,
): ElementTransformer {
  return {
    dependencies: [],
    export: (node, exportChildren) => {
      if (!$isParagraphNode(node) || !$isTableCellNode(node.getParent())) {
        return null;
      }
      if (
        node
          .getChildren()
          .every(
            child => $isTextNode(child) && child.getTextContent().trim() === '',
          )
      ) {
        const text = node.getTextContent();
        if (text !== '') {
          return text.replace(/\s/g, spaceReference);
        }
        written.add(node.getKey());
        return mark;
      }
      return escapeBlockStart(exportChildren(node));
    },
    regExp: /$^/,
    replace: () => false,
    type: 'element',
  };
}

/**
 * `line` with the marker that makes it start a block in a cell escaped, so
 * it reads as text: `\# a`, `\- a`, `1\. a`, `\---`, `\$$`.
 */
function escapeBlockStart(line: string): string {
  if (!BLOCK_START_REG_EXP.test(line)) {
    return line;
  }
  const ordered = /^( {0,3}\d{1,9})([.)])/.exec(line);
  return ordered !== null
    ? ordered[1] + '\\' + line.slice(ordered[1].length)
    : line.replace(/^( {0,3})/, '$1\\');
}

/** A space or tab as a character reference, which isn't trimmed. */
function spaceReference(space: string): string {
  return space && `&#${space.charCodeAt(0)};`;
}

/** A cell's content as the Markdown of one GFM cell. */
function $exportTableCell(cell: TableCellNode): string {
  // The marks must not be in the Markdown, which also holds what isn't
  // text, such as link URLs, so a mark that turns up more often than the
  // nodes written as it is passed over.
  let avoid = cell.getTextContent();
  for (;;) {
    const [mark, emptyMark] = unusedChars(avoid, 2);
    const written = new Set<string>();
    const writtenEmpty = new Set<string>();
    const markdown = encodeTableCell(
      $convertToMarkdownString(
        [
          tableCellLineBreak(mark, written),
          tableCellParagraph(emptyMark, writtenEmpty),
          ...PLAYGROUND_TRANSFORMERS,
        ],
        cell,
      ).trim(),
      emptyMark,
    );
    const parts = markdown.split(mark);
    const emptyParts = markdown.split(emptyMark);
    if (
      parts.length - 1 <= written.size &&
      emptyParts.length - 1 <= writtenEmpty.size
    ) {
      // An empty paragraph is an empty line between the `<br>`s around it.
      // A line after a line break is escaped like a paragraph's first.
      // Spaces beside a line break would read back as the cell's padding,
      // so the one next to it is a character reference.
      return emptyParts
        .join('')
        .split(mark)
        .map((line, i) => (i > 0 ? escapeBlockStart(line) : line))
        .join(mark)
        .replace(
          new RegExp(`([ \\t]?)${mark}([ \\t]?)`, 'g'),
          (_, before: string, after: string) =>
            spaceReference(before) + mark + spaceReference(after),
        )
        .split(mark)
        .join('<br>');
    }
    avoid += mark + emptyMark;
  }
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

      const textContent = firstChild.getTextContent();
      // A delimiter row with no table above it stayed text.
      if (isTableDelimiterRow(textContent)) {
        break;
      }

      const cells = mapToTableCells(textContent);

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
      getTableColumnsSize(previousSibling) === maxCells
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
  if (!isTableRowDivider(line)) {
    return false;
  }
  const match = line.match(TABLE_ROW_REG_EXP);
  return (
    match !== null && splitTableRow(match[1]).every(cell => cell.includes('-'))
  );
}

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

const CODE_FENCE_OPEN_REG_EXP = /^[ \t]*(`{3,})[^`\n]*$/;
const CODE_FENCE_CLOSE_REG_EXP = /^[ \t]*(`{3,})[ \t]*$/;

// A pipe after an odd run of backslashes.
const ESCAPED_PIPE_REG_EXP = /(?:^|[^\\])(?:\\\\)*\\\|/;

/**
 * A code span as it is written in a cell. GFM splits a row on each pipe
 * that no backslash escapes, then drops the backslash of each `\|` in a
 * cell, code spans included, so each pipe in code gets a backslash of its
 * own. Code with a backslash right before a pipe can't be written that way,
 * since `\\|` is an escaped backslash and then a pipe that splits the row,
 * so it is written as HTML, with its punctuation as character references,
 * which {@link codeFromHtml} reads back.
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

// A `<code>` element that has only text, past backslash escapes.
const CODE_HTML_REG_EXP = /\\[^]|<code>([^<]*)<\/code>/gi;

/**
 * The code of a `<code>` element that has only text, between the marks
 * that {@link $marksToNodes} turns into a code span after the cell is
 * parsed. A code span would read as a code block if its fence were three
 * backticks or more at the start of a line, so the code is escaped instead.
 */
function codeFromHtml(html: string, marks: CellMarks): string {
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
  return (
    marks.codeStart +
    // A character reference is decoded after backslash escapes, so `&` is
    // one too.
    code.replace(/[!-/:-@[-`{-~]/g, char =>
      char === '&' ? '&#38;' : '\\' + char,
    ) +
    marks.codeEnd
  );
}

/**
 * Writes a cell's Markdown as one line. Outside code blocks, a line break
 * and the blank line between paragraphs become `<br>`, and a `<br>` that is
 * text is escaped (`\<br>`) except in code spans, which take no escapes.
 * Inside a code block, which takes no escapes either, each newline becomes
 * a `<br>` (so blank lines survive), and a backslash, a pipe and a `<br>`
 * that are code are backslash-escaped, which {@link decodeTableCell} undoes.
 */
function encodeTableCell(markdown: string, emptyMark: string = ''): string {
  const lines = markdown.split('\n');
  let result = '';
  let text = '';
  const flushText = () => {
    result += splitCodeSpans(text)
      .map((part, i) =>
        i % 2 === 1
          ? encodeCodeSpan(part)
          : // Escapes a pipe, a `<br>` and a `<code>` that are text, past
            // what a backslash already escapes (in `\\|`, the backslash).
            part.replace(/\\[^]|\||<(?=br\s*\/?>|code>)/gi, match =>
              match.length > 1 ? match : '\\' + match,
            ),
      )
      .join('')
      .replace(/\n\n?/g, (separator, offset: number, encoded: string) => {
        // The blank line that ends a list or a quote is kept as an empty
        // line, or the paragraph after it would continue its last line.
        // So does the line that ends one before an empty paragraph.
        const start = encoded.lastIndexOf('\n\n', offset - 1);
        const block = encoded.slice(start === -1 ? 0 : start + 2);
        const endsBlock =
          separator.length > 1 ||
          (emptyMark !== '' &&
            encoded[offset + 1] === emptyMark &&
            encoded[offset - 1] !== emptyMark);
        return endsBlock && CONTAINER_START_REG_EXP.test(block)
          ? '<br><br>'
          : '<br>';
      });
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
      // An info string is escaped like the code.
      result += line.replace(/[\\|]|<(?=br\s*\/?>)/gi, '\\$&');
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
const CELL_FENCE_OPEN_REG_EXP = /^[ \t]*(`{3,})[^`]*?(?=<br\s*\/?>|\\n|$)/i;
const CELL_FENCE_CLOSE_REG_EXP = /^[ \t]*(`{3,})[ \t]*(?=<br\s*\/?>|\\n|$)/i;

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
  const breaks: CellBreak[] = [];
  // Whether the block being read is a list or a quote, which an empty line
  // ends.
  let container = isContainerStart(lines[0]);
  let ended = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1];
    let kind: CellBreak;
    if (line.fence !== null || prev.fence !== null || ended) {
      kind = 'newline';
      ended = false;
    } else if (container && line.text.trim() === '') {
      kind = 'newline';
      ended = true;
    } else {
      kind =
        BLOCK_START_REG_EXP.test(line.text) ||
        BLOCK_LINE_REG_EXP.test(prev.text) ||
        // A nested list item is indented past the parent's content.
        (container && NESTED_LIST_ITEM_REG_EXP.test(line.text))
          ? 'block'
          : 'inline';
    }
    if (ended) {
      container = false;
    } else if (kind !== 'inline') {
      container =
        isContainerStart(line) ||
        (container && NESTED_LIST_ITEM_REG_EXP.test(line.text));
    }
    breaks.push(kind);
  }
  return breaks;
}

// A list item at any indentation.
const NESTED_LIST_ITEM_REG_EXP = /^[ \t]*(?:[-*+]|\d{1,9}[.)])\s/;

// A line that starts a list item or a quote.
const CONTAINER_START_REG_EXP = /^ {0,3}(?:>|[-*+]\s|\d{1,9}[.)]\s)/;

function isContainerStart(line: CellLine): boolean {
  return line.fence === null && CONTAINER_START_REG_EXP.test(line.text);
}

/**
 * A cell's Markdown with its line separators decoded, for
 * `$convertFromMarkdownString`. `<br>` separates lines in a cell, and the
 * literal `\n` this transformer used to write still does, but neither
 * inside a code span nor after a backslash escape (`\<br>`, `C:\\new`).
 * A separator that `newline` picks becomes a newline; any other becomes
 * the line break mark, which {@link $marksToNodes} turns into a line break
 * after parsing, so formatting and links that span it (`**a<br>b**`,
 * `[a<br>b](url)`) stay whole. A pipe is escaped (`\|`) everywhere in a
 * row, code spans included, so it is unescaped here.
 */
function decodeTableCell(
  lines: CellLine[],
  newline: readonly boolean[],
  marks: CellMarks,
): string {
  const mark = marks.lineBreak;
  // Each line's text, and the separator after it.
  const parts: string[] = [];
  lines.forEach((line, i) => {
    if (i > 0) {
      // Spaces at the end of a line of code are code.
      if (lines[i - 1].fence !== 'code') {
        parts.push(parts.pop()!.replace(/[ \t]+$/, ''));
      }
      parts.push(newline[i - 1] ? '\n' : mark);
    }
    if (line.fence === 'code') {
      parts.push(
        line.text.replace(/\\([\\|<n])/g, (_, char: string) =>
          char === 'n' ? '\n' : char,
        ),
      );
    } else if (line.fence === 'open') {
      parts.push(line.text.replace(/\\([\\|<])/g, '$1'));
    } else if (line.fence !== null) {
      parts.push(line.text);
    } else {
      const body = splitCodeSpans(line.text)
        .map((part, k) => {
          const unescaped = part.replace(/\\\|/g, '|');
          return k % 2 === 1
            ? unescaped
            : unescaped.replace(
                CODE_HTML_REG_EXP,
                (match, html: string | undefined) =>
                  html === undefined ? match : codeFromHtml(html, marks),
              );
        })
        .join('');
      // Only the cell's padding is trimmed after a line break.
      parts.push(
        i > 0 && parts[parts.length - 1] === mark
          ? body.replace(/^[ \t]+/, '')
          : body,
      );
    }
  });
  const result = parts.join('');
  // The line break mark is a space, which Markdown trims from the end of a
  // line, so a line that ends with one ends with an empty code span too,
  // which {@link $marksToNodes} removes.
  return result
    .split('\n')
    .map(line =>
      line.endsWith(mark) ? line + marks.codeStart + marks.codeEnd : line,
    )
    .join('\n');
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

/**
 * Turns each line break mark in the text under `cell` into a line break,
 * and the text between code marks into a code span.
 */
function $marksToNodes(cell: TableCellNode, marks: CellMarks): void {
  // Code marks can land in different text nodes.
  let code = false;
  for (const node of cell.getAllTextNodes()) {
    const text = node.getTextContent();
    // The nodes that replace `node`, built in one pass so that a cell with
    // many line breaks is read in linear time.
    const nodes: LexicalNode[] = [];
    let start = 0;
    const pushText = (end: number) => {
      if (end > start) {
        const piece = $copyNode(node).setTextContent(text.slice(start, end));
        nodes.push(
          code && !piece.hasFormat('code') ? piece.toggleFormat('code') : piece,
        );
      }
    };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (
        char === marks.lineBreak ||
        char === marks.codeStart ||
        char === marks.codeEnd
      ) {
        pushText(i);
        start = i + 1;
        if (char === marks.lineBreak) {
          nodes.push($createLineBreakNode());
        } else {
          code = char === marks.codeStart;
        }
      }
    }
    if (start === 0) {
      if (code && !node.hasFormat('code')) {
        node.toggleFormat('code');
      }
      continue;
    }
    pushText(text.length);
    node.getParentOrThrow().splice(node.getIndexWithinParent(), 1, nodes);
  }
}

const $createTableCell = (textContent: string): TableCellNode => {
  // GFM trims a cell's padding.
  const text = textContent.trim();
  const [lineBreak] = unusedChars(text, 1, LINE_BREAK_MARKS);
  const [codeStart, codeEnd] = unusedChars(text + lineBreak, 2);
  const marks: CellMarks = {codeEnd, codeStart, lineBreak};
  const lines = splitCellLines(text);
  const breaks = cellBreaks(lines);
  // Only inline syntax can span a line break.
  if (breaks.includes('block') && /[*_~[$]/.test(text)) {
    // Text that would start a block can't when it follows a `<br>` inside
    // inline syntax (`**a<br># b**`, `[a<br>- b](url)`). Read every such
    // separator as a line break first, and keep the ones that land in
    // formatted text or an inline element.
    const probe = $createTableCellNode().append(
      ...$generateNodesFromMarkdownString(
        decodeTableCell(
          lines,
          breaks.map(kind => kind === 'newline'),
          marks,
        ),
        PLAYGROUND_TRANSFORMERS,
      ),
    );
    const marked = $markNodes(probe, lineBreak);
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
  // Generating the nodes, unlike converting into the cell, leaves the
  // selection alone.
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
    ...$generateNodesFromMarkdownString(
      decodeTableCell(
        lines,
        breaks.map(kind => kind !== 'inline'),
        marks,
      ),
      PLAYGROUND_TRANSFORMERS,
    ),
  );
  $marksToNodes(cell, marks);
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
