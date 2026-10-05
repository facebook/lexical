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
 * Reads a `<br>` that decoding left inside inline formatting in a cell
 * (see {@link decodeTableCell}) as a line break.
 */
const TABLE_CELL_LINE_BREAK_IMPORT: TextMatchTransformer = {
  dependencies: [LineBreakNode],
  importRegExp: /<br>/,
  regExp: /$^/,
  replace: textNode => {
    textNode.replace($createLineBreakNode());
  },
  type: 'text-match',
};

/**
 * A private-use character that `text` doesn't contain, to stand in for the
 * line breaks in a cell's Markdown until the `<br>`s that are text in it are
 * escaped.
 */
function lineBreakMark(text: string): string {
  let code = 0xe000;
  while (text.includes(String.fromCharCode(code))) {
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
  // A GFM cell can't contain a newline or an unescaped pipe: line breaks
  // and the blank line between paragraphs become `<br>`.
  return escapeTableCellBreaks(
    $convertToMarkdownString(
      [tableCellLineBreak(mark), ...PLAYGROUND_TRANSFORMERS],
      cell,
    ).trim(),
  )
    .replace(/\n\n?/g, '<br>')
    .split(mark)
    .join('<br>')
    .replace(/\\?\|/g, '\\|');
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

// A line separator inside a cell: `<br>`, the legacy `\n`, or a newline.
const CELL_LINE_END_REG_EXP = /<br\s*\/?>|\\n|\n/i;
const CELL_LINE_START_REG_EXP = /(?:^|<br\s*\/?>|\\n|\n)[ \t]*$/i;

/**
 * Whether the backtick run from `start` to `end` is a code block fence: at
 * least three backticks at the start of one of the cell's lines, with no
 * backtick in the rest of that line (the info string or nothing).
 */
function isCodeFence(text: string, start: number, end: number): boolean {
  if (end - start < 3 || !CELL_LINE_START_REG_EXP.test(text.slice(0, start))) {
    return false;
  }
  const rest = text.slice(end);
  const lineEnd = rest.search(CELL_LINE_END_REG_EXP);
  return !rest.slice(0, lineEnd === -1 ? rest.length : lineEnd).includes('`');
}

/**
 * Splits Markdown into the parts outside code spans and the code spans
 * themselves (odd indices), whose closing backtick run is exactly as long
 * as the opening one. An unmatched run, or a code block fence, is ordinary
 * text, so the line separators in a code block are read like any other.
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
    let end = i;
    while (text[end] === '`') {
      end++;
    }
    if (isCodeFence(text, i, end)) {
      i = end;
      continue;
    }
    const fence = text.slice(i, end);
    let close = text.indexOf(fence, end);
    while (close !== -1 && text[close + fence.length] === '`') {
      let next = close;
      while (text[next] === '`') {
        next++;
      }
      close = text.indexOf(fence, next);
    }
    if (close === -1) {
      i = end;
      continue;
    }
    parts.push(text.slice(start, i), text.slice(i, close + fence.length));
    start = i = close + fence.length;
  }
  parts.push(text.slice(start));
  return parts;
}

/** The inline delimiters whose runs are tracked across a cell's `<br>`s. */
const CELL_DELIMITER_REG_EXP = /^(?:\*+|_+|~~|==)/;

/**
 * A cell's Markdown with its line separators as newlines, where the lines
 * are read like any other. `<br>` separates lines in a cell, and the literal
 * `\n` this transformer used to write is still read, but neither inside a
 * code span nor after a backslash escape (`\<br>`, `C:\\new`), where they
 * are text. A `<br>` inside open inline formatting (`**a<br>b**`) stays,
 * for {@link TABLE_CELL_LINE_BREAK_IMPORT} to read as a line break, since a
 * newline would split the formatting's markers onto separate lines. A pipe
 * is escaped (`\|`) everywhere in a row, code spans included, so it is
 * unescaped here.
 */
function decodeTableCell(text: string): string {
  let result = '';
  // The delimiters (`**`, `*`, `_`, ...) opened on the current line.
  const open = new Set<string>();
  const newLine = () => {
    result = result.replace(/[ \t]+$/, '') + '\n';
    open.clear();
  };
  splitCodeSpans(text).forEach((part, partIndex) => {
    if (partIndex % 2 === 1) {
      result += part.replace(/\\\|/g, '|');
      return;
    }
    let i = 0;
    while (i < part.length) {
      const rest = part.slice(i);
      const br = /^<br\s*\/?>[ \t]*/i.exec(rest);
      const delimiter = CELL_DELIMITER_REG_EXP.exec(rest);
      if (rest[0] === '\\') {
        const escaped = rest.slice(0, 2);
        if (escaped === '\\|') {
          result += '|';
        } else if (escaped === '\\n') {
          newLine();
        } else if (/^\\<br\s*\/?>/i.test(rest)) {
          // Text, which TABLE_CELL_LINE_BREAK_IMPORT must not match.
          result += '&#60;';
        } else {
          result += escaped;
        }
        i += 2;
      } else if (br) {
        if (open.size > 0) {
          result = result.replace(/[ \t]+$/, '') + '<br>';
        } else {
          newLine();
        }
        i += br[0].length;
      } else if (delimiter) {
        // A run opens when followed by non-space and closes when preceded
        // by it; `_` inside a word (snake_case) does neither.
        const run = delimiter[0];
        const before = result.slice(-1);
        const after = rest.charAt(run.length);
        const canOpen = after !== '' && !/\s/.test(after);
        const canClose = before !== '' && !/\s/.test(before);
        const intraword = /\w/.test(before) && /\w/.test(after);
        const kinds =
          run[0] === '*' || run[0] === '_'
            ? [
                ...(run.length >= 2 ? [run[0] + run[0]] : []),
                ...(run.length % 2 === 1 ? [run[0]] : []),
              ]
            : [run];
        if (!(run[0] === '_' && intraword)) {
          for (const kind of kinds) {
            if (open.has(kind) && canClose) {
              open.delete(kind);
            } else if (canOpen) {
              open.add(kind);
            }
          }
        }
        result += run;
        i += run.length;
      } else {
        result += rest[0];
        i++;
      }
    }
  });
  return result;
}

/**
 * Escapes the `<br>` that is text in a cell's Markdown (outside code
 * spans), so that it doesn't read back as a line separator.
 */
function escapeTableCellBreaks(text: string): string {
  return splitCodeSpans(text)
    .map((part, i) =>
      i % 2 === 1 ? part : part.replace(/<(br\s*\/?>)/gi, '\\<$1'),
    )
    .join('');
}

const $createTableCell = (textContent: string): TableCellNode => {
  // GFM trims a cell's padding.
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(
    decodeTableCell(textContent.trim()),
    [TABLE_CELL_LINE_BREAK_IMPORT, ...PLAYGROUND_TRANSFORMERS],
    cell,
  );
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
    } else if (text[i] === '\\' && text[i + 1] === '|') {
      cells[cells.length - 1] += '\\|';
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
