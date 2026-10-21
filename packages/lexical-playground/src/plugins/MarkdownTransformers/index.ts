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
import {$isLinkNode} from '@lexical/link';
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
 * can't write in one span, is split there by an empty HTML comment. Fenced
 * code takes none at all, which {@link escapeInCell} accounts for.
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
        /^[ \t]*(?<fence>`{3,})[^`\n]*$(?:\n[^]*?(?:\n[ \t]*\k<fence>`*[ \t]*$|(?![^])))?|(?<backslashes>\\*)(?<char>\||<(?=br\s*\/?>))|\\[^]|(?<short>`{1,2})(?!`)[^]*?[^`]\k<short>(?!`)|(?<long>`{3,})(?!`)[^\n]*?[^`\n]\k<long>(?!`)|`+/gim,
        (match: string, ...args: unknown[]) => {
          const {fence, backslashes, char, short, long} = args[
            args.length - 1
          ] as Partial<Record<string, string>>;
          const ticks = short ?? long;
          return fence !== undefined
            ? match.replace(
                /(\\*)(\||<(?=br\s*\/?>)|\n)/gi,
                (_, inCode: string, c: string) => escapeInCell(inCode, c, true),
              )
            : char !== undefined
              ? escapeInCell(backslashes!, char)
              : ticks !== undefined
                ? match.replace(
                    /(\\*)\|/g,
                    (_, inCode: string) =>
                      inCode +
                      (inCode.length % 2
                        ? `${ticks}<!---->${ticks}\\|`
                        : '\\|'),
                  )
                : match;
        },
      )
      .replace(/\n/g, '<br>')
  );
}

/**
 * `char` after `backslashes` as a cell writes it. In text, whose own
 * backslashes come in pairs, an escape is added. Fenced code takes none of
 * its own, so its backslashes are doubled, and a pipe or a `<br>` that is
 * text takes one more, while a line end keeps an even run.
 */
function escapeInCell(
  backslashes: string,
  char: string,
  fenced = false,
): string {
  return fenced
    ? backslashes + backslashes + (char === '\n' ? '' : '\\') + char
    : backslashes + (backslashes.length % 2 ? '\\\\' : '\\') + char;
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

// A line that opens a code block.
const CELL_FENCE_LINE_REG_EXP = /[ \t]*`{3,}(?:(?!<br)[^`])*(?:<br|$)/iy;

// A token of fenced code: backticks, or a run of backslashes and what
// export wrote it before.
const CELL_FENCED_TOKEN_REG_EXP = /`+|(\\+)(\||<br\s*\/?>)?/iy;

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
  // a reference that reads as one, so they can't be mistaken for its text.
  const refs = new Set(
    Array.from(text.matchAll(/\\[^]|&#(\d{1,7});/g), ([, digits]) =>
      Number(digits),
    ),
  );
  let nextFree = 0xe000;
  // The next character the cell doesn't have, from the private-use ones.
  const free = (): string => {
    while (
      text.includes(String.fromCodePoint(nextFree)) ||
      refs.has(nextFree)
    ) {
      nextFree++;
    }
    return String.fromCodePoint(nextFree++);
  };
  // A `<br>` inside a paragraph is read as a mark between spaces, which
  // emphasis reads as a space, so that formatting and links around it
  // (`**a<br>b**`) stay whole, and the mark becomes a line break once the
  // cell is read.
  const mark = free();
  // A guard keeps a line that opens with a code span from reading as a code
  // block, and is dropped once the cell is read.
  const guard = free();
  // The legacy `\n` separates a cell's lines where it has no `<br>`, but in
  // an equation or a link's destination, which can hold one of their own
  // (`$\nabla$`). An equation, as TeX writers do, has no space inside its
  // dollar signs and no digit after them, unlike amounts (`$5\nb $3`).
  const legacy = !/<br\s*\/?>/i.test(text);
  const ownLines = Array.from(
    text.matchAll(/\$(?! )[^$]*[^ $]\$(?!\d)|\]\([^)]*\)/g),
    found => [found.index!, found.index! + found[0].length],
  );
  // Reads the cell with the `<br>`s at the offsets in `blocks` ending their
  // paragraph. Without `blocks`, each `<br>` before text that starts a block
  // is read as a character of its own between spaces, returned with its
  // offset.
  const $read = (
    blocks?: number[],
  ): [cell: TableCellNode, candidates: [number, string][]] => {
    const candidates: [number, string][] = [];
    let fence = '';
    let lineStart = 0;
    // Whether the line at `lineStart` starts a line of the Markdown.
    let atLineStart = true;
    // Whether that line opens a code block.
    let opening = testAt(CELL_FENCE_LINE_REG_EXP, text, 0);
    const guardAt = (offset: number) =>
      fence === '' && testAt(CELL_CODE_SPAN_LINE_REG_EXP, text, offset)
        ? guard
        : '';
    const tokens =
      /\\[^]|(?<short>`{1,2})(?!`)[^]*?[^`]\k<short>(?!`)(?:<!---->\k<short>(?!`)[^]*?[^`]\k<short>(?!`))*|(?<long>`{3,})(?!`)(?:(?!<br)[^])*?[^`]\k<long>(?!`)(?:<!---->\k<long>(?!`)(?:(?!<br)[^])*?[^`]\k<long>(?!`))*|`+|(?<lead>[ \t]*)<br\s*\/?>(?<trail>[ \t]*)/gi;
    const readToken = (
      match: string,
      {short, long, lead = '', trail = ''}: Partial<Record<string, string>>,
    ): string => {
      const offset = tokens.lastIndex - match.length;
      if (
        (fence !== '' || opening) &&
        (match[0] === '`' || match[0] === '\\')
      ) {
        // Fenced code has no code spans, and takes no escapes but those
        // export writes, which halve a run of backslashes; an odd run ends
        // in an escape.
        CELL_FENCED_TOKEN_REG_EXP.lastIndex = offset;
        const [run, backslashes, char] = CELL_FENCED_TOKEN_REG_EXP.exec(text)!;
        const escaped = char !== undefined && backslashes.length % 2 === 1;
        tokens.lastIndex =
          CELL_FENCED_TOKEN_REG_EXP.lastIndex -
          (char === undefined || escaped ? 0 : char.length);
        return char === undefined
          ? run
          : backslashes.slice(0, backslashes.length >> 1) +
              (escaped ? char : '');
      }
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
          (char === '<' && /^br\s*\/?>/i.test(text.slice(offset + 2)))
          ? char
          : char === 'n' &&
              legacy &&
              !ownLines.some(([start, end]) => offset > start && offset < end)
            ? '\n'
            : match;
      }
      // The whitespace a `<br>` is written with is padding, but in code and
      // before a block.
      const line = text.slice(lineStart, offset);
      lineStart = offset + match.length;
      // A code block opens with a fence at the start of a line, and
      // closes at a line of at least as many backticks.
      const fenceMatch = atLineStart
        ? /^[ \t]*(`{3,})([^`]*)$/.exec(line)
        : null;
      const fenceLine =
        fenceMatch !== null &&
        (fence === '' ||
          (fenceMatch[1].length >= fence.length &&
            fenceMatch[2].trim() === ''));
      if (fenceLine) {
        fence = fence === '' ? fenceMatch[1] : '';
      }
      const startsBlock = testAt(CELL_BLOCK_START_REG_EXP, text, lineStart);
      const block = line !== '' && fence === '' && !fenceLine && startsBlock;
      atLineStart =
        fence !== '' ||
        fenceLine ||
        line === '' ||
        (block && blocks !== undefined && blocks.includes(offset));
      opening =
        atLineStart &&
        fence === '' &&
        testAt(CELL_FENCE_LINE_REG_EXP, text, lineStart);
      if (atLineStart) {
        // Code keeps the whitespace around its line breaks, and a block its
        // indentation (a nested list item's).
        return fence === ''
          ? '\n' + (startsBlock ? trail : '') + guardAt(lineStart)
          : (fenceLine ? '' : lead) + '\n' + trail;
      }
      let char = mark;
      if (block && blocks === undefined) {
        char = free();
        candidates.push([offset, char]);
      }
      return ` ${char} `;
    };
    let markdown = guardAt(0);
    let last = 0;
    for (let found; (found = tokens.exec(text)) !== null; ) {
      markdown +=
        text.slice(last, found.index) + readToken(found[0], found.groups!);
      last = tokens.lastIndex;
    }
    markdown += text.slice(last);
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
  let chars = candidates.map(([, char]) => char).join('');
  if (chars !== '') {
    // A `<br>` before text that starts a block ends the paragraph, unless
    // formatting, a link, an equation or an image reads as spanning it.
    // Code spans don't take a `<br>`, so code that does is a code block's.
    const blocks = new Set<string>();
    const candidate = new RegExp(`[${chars}]`, 'gu');
    for (const node of cell.getAllTextNodes()) {
      if (
        (node.getFormat() === 0 || node.hasFormat('code')) &&
        !node.getParentOrThrow().isInline()
      ) {
        for (const [char] of node.getTextContent().matchAll(candidate)) {
          blocks.add(char);
        }
      }
    }
    if (blocks.size > 0) {
      [cell] = $read(
        candidates.flatMap(([offset, char]) =>
          blocks.has(char) ? [offset] : [],
        ),
      );
      chars = '';
    }
  }
  // The reader's marks, with the spaces they were read between.
  const marks = new RegExp(`${guard}| ?[${mark}${chars}] ?`, 'gu');
  const restore = (value: string) => value.replace(marks, '<br>');
  const texts: TextNode[] = [];
  for (const {node} of $dfsIterator(cell)) {
    if ($isTextNode(node)) {
      texts.push(node);
    } else if ($isEquationNode(node)) {
      // An inline equation holds its line breaks as newlines.
      node.setEquation(node.getEquation().replace(marks, '\n'));
    } else if ($isImageNode(node)) {
      node
        .setAltText(restore(node.getAltText()))
        .setSrc(restore(node.getSrc()));
    } else if ($isLinkNode(node)) {
      node
        .setURL(restore(node.getURL()))
        .setTitle(node.getTitle() && restore(node.getTitle()!));
    }
  }
  for (const node of texts) {
    const offsets: number[] = [];
    for (const match of node.getTextContent().matchAll(marks)) {
      offsets.push(match.index!, match.index! + match[0].length);
    }
    for (const piece of offsets.length > 0 ? node.splitText(...offsets) : []) {
      // Every mark in the text is a piece of its own.
      const pieceText = piece.getTextContent();
      if (pieceText === guard) {
        piece.remove();
      } else if (pieceText.replace(marks, '') !== pieceText) {
        piece.replace($createLineBreakNode());
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
  // A backslash escapes the next character, pipe or not (`\\|`).
  for (const [token] of text.matchAll(/\\?[^]/g)) {
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
