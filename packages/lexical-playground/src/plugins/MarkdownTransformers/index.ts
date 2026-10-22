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
  regExp: /(?!)/,
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
    .replace(/\n/g, '<br>');
}

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];
    // A nested table is written as its lines, which a cell reads as text.
    const transformers = [TABLE_CELL_LINE_BREAK, ...PLAYGROUND_TRANSFORMERS];

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
      output.push(
        `| ${(rowOutput.every(cell => /^:?-+:?$/.test(cell))
          ? rowOutput.map(cell => cell.replace(/[-:]/, '\\$&'))
          : rowOutput
        ).join(' | ')} |`,
      );
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(_ => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match, isImport) => {
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
    const above = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;
    // A row read below a header takes the header's cells, as in GFM.
    if ($isTableNode(above) && isImport) {
      const header = above.getFirstChild();
      const cell = $isTableRowNode(header) ? header.getFirstChild() : null;
      if (
        $isTableCellNode(cell) &&
        cell.hasHeaderState(TableCellHeaderStates.ROW)
      ) {
        maxCells = above.getColumnCount();
      }
    }
    // Typed rows above stayed paragraphs; an imported row above is a table
    // already, and a paragraph there was text (an escaped pipe).
    let sibling = isImport ? null : above;

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
  type: 'element',
};

/**
 * Whether `line` is a GFM delimiter row: every cell a run of dashes, with
 * an optional colon at either end, padded with spaces and tabs.
 */
function isTableDelimiterRow(line: string): boolean {
  const match = line.match(TABLE_ROW_REG_EXP);
  return (
    match !== null &&
    splitTableRow(match[1]).every(cell => /^[ \t]*:?-+:?[ \t]*$/.test(cell))
  );
}

/**
 * A cell read as GFM reads it: its padding trimmed, `\|` as a pipe, and
 * each `<br>` a line end, with the spaces beside it kept.
 */
const $createTableCell = (
  textContent: string,
  transformers: Transformer[] = [],
): TableCellNode =>
  // Generating the nodes, unlike converting into the cell, leaves the
  // selection alone.
  $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
    ...$generateNodesFromMarkdownString(
      trimCell(textContent)
        .replace(/\\\|/g, '|')
        .replace(/<br\s*\/?>/gi, '\n'),
      transformers,
    ),
  );

const $mapToTableCells = (textContent: string): TableCellNode[] | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  const transformers = getCellTransformers();
  // A row ends at its last pipe, unless that pipe is escaped (`| x \|`),
  // when it is the last cell's content.
  const cells = splitTableRow(match[1] + '|');
  if (cells[cells.length - 1] === '') {
    cells.pop();
  }
  return cells.map(text => $createTableCell(text, transformers));
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
