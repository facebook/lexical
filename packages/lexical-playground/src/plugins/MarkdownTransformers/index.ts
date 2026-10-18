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
 * {@link $createTableCell} undoes. Code takes no escapes, so a backslash
 * of its own right before one (`a\|b`) gets another, or the escape would
 * be read as an escaped backslash; GFM can't write that code exactly.
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
              ? match.replace(/(\\*)\|/g, (_, inCode: string) =>
                  escapeInCell(inCode, '|'),
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
  /^[ \t]*(?:<br|```|\$\$|#{1,6}\s|>|[-*+]\s|\d{1,9}[.)]\s)/i;

const $createTableCell = (
  textContent: string,
  transformers: Transformer[] = [],
): TableCellNode => {
  // GFM trims a cell's padding, which is only spaces and tabs.
  const text = textContent.replace(/^[ \t]+|[ \t]+$/g, '');
  // A `<br>` inside a paragraph is read as a space-like mark, so that
  // formatting and links around it (`**a<br>b**`) stay whole, and the mark
  // becomes a line break once the cell is read. The cell must not have the
  // mark, as a character or as a reference.
  const mark = ['\u3000', '\u205f', '\u2009'].find(
    c => !text.includes(c) && !RegExp(`&#0*${c.charCodeAt(0)};`).test(text),
  );
  // The legacy `\n` separates a cell's lines where it has no `<br>`.
  const legacy = !/<br\s*\/?>/i.test(text);
  let fenced = false;
  let lineStart = 0;
  // The emphasis runs and link brackets open in the current paragraph: a
  // `<br>` inside them (`**a<br># b**`) doesn't end it.
  const runs = new Set<string>();
  let brackets = 0;
  const markdown = text.replace(
    /\\[^]|(`{1,2})(?!`)[^]*?[^`]\1(?!`)|(`{3,})(?!`)(?:(?!<br)[^])*?[^`]\2(?!`)|`+|\*+|_+|~~|[[\]]|[ \t]*<br\s*\/?>[ \t]*/gi,
    (match: string, short?: string, long?: string, offset?: number) => {
      const end = offset! + match.length;
      if (match === '[' || match === ']') {
        brackets = Math.max(0, brackets + (match === '[' ? 1 : -1));
        return match;
      }
      if (/^[*_~]/.test(match)) {
        // A run between spaces (a list marker, `2 * 3`) or an underscore
        // inside a word neither opens nor closes.
        const around = (re: RegExp) =>
          re.test(offset === lineStart ? ' ' : text[offset! - 1]) &&
          re.test(text[end] ?? ' ');
        if (!around(/\s/) && !(match[0] === '_' && around(/\w/))) {
          runs[runs.has(match) ? 'delete' : 'add'](match);
        }
        return match;
      }
      if (match[0] === '`') {
        // Code spans take no escapes but a pipe's.
        return short !== undefined || long !== undefined
          ? match.replace(/\\\|/g, '|')
          : match;
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
      lineStart = end;
      const fenceLine = /^[ \t]*```/.test(line);
      if (fenceLine) {
        fenced = !fenced;
      }
      if (
        mark === undefined ||
        fenced ||
        fenceLine ||
        line === '' ||
        (runs.size === 0 &&
          brackets === 0 &&
          CELL_BLOCK_START_REG_EXP.test(text.slice(lineStart)))
      ) {
        runs.clear();
        brackets = 0;
        return '\n';
      }
      return mark;
    },
  );
  // Generating the nodes, unlike converting into the cell, leaves the
  // selection alone.
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
    ...$generateNodesFromMarkdownString(markdown, transformers),
  );
  if (mark !== undefined) {
    // An inline equation holds its line breaks as newlines.
    for (const {node} of $dfsIterator(cell)) {
      if ($isEquationNode(node)) {
        node.setEquation(node.getEquation().split(mark).join('\n'));
      }
    }
    for (const node of cell.getAllTextNodes()) {
      const offsets: number[] = [];
      const nodeText = node.getTextContent();
      for (
        let i = nodeText.indexOf(mark);
        i !== -1;
        i = nodeText.indexOf(mark, i + 1)
      ) {
        offsets.push(i, i + 1);
      }
      for (const piece of offsets.length > 0
        ? node.splitText(...offsets)
        : []) {
        if (piece.getTextContent() === mark) {
          piece.replace($createLineBreakNode());
        }
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
