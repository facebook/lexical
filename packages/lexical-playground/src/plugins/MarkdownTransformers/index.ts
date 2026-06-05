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
  ElementTransformer,
  isTableRowDivider,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TextMatchTransformer,
  Transformer,
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
  $getState,
  $isParagraphNode,
  $isTextNode,
  $setState,
  createState,
  LexicalNode,
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
      maxWidth: 800,
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

export const EQUATION: TextMatchTransformer = {
  dependencies: [EquationNode],
  export: node => {
    if (!$isEquationNode(node)) {
      return null;
    }

    return `$${node.getEquation()}$`;
  },
  importRegExp: /\$([^$]+?)\$/,
  regExp: /\$([^$]+?)\$$/,
  replace: (textNode, match) => {
    const [, equation] = match;
    const equationNode = $createEquationNode(equation, true);
    textNode.replace(equationNode);
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
const TABLE_COL_WIDTHS_REG_EXP =
  /^<!--\s*lexical-table-column-widths:\s*([0-9.,\s]+)\s*-->\s?$/;
const MARKDOWN_TABLE_MIN_COLUMN_WIDTH = 75;
const MARKDOWN_TABLE_COLUMN_PADDING = 32;
const MARKDOWN_TABLE_CHAR_WIDTH = 8;
const tableColumnWidthsManuallyResizedState = createState(
  'tableColumnWidthsManuallyResized',
  {
    parse: Boolean,
  },
);

export function $setTableColumnWidthsManuallyResized(
  table: TableNode,
  value: boolean,
): TableNode {
  return $setState(table, tableColumnWidthsManuallyResizedState, value);
}

function $hasTableColumnWidthsManuallyResized(table: TableNode): boolean {
  return $getState(table, tableColumnWidthsManuallyResizedState);
}

export const TABLE_COL_WIDTHS: ElementTransformer = {
  dependencies: [TableNode],
  export: () => null,
  regExp: TABLE_COL_WIDTHS_REG_EXP,
  replace: (parentNode, _1, match) => {
    const previousSibling = parentNode.getPreviousSibling();
    if (!$isTableNode(previousSibling)) {
      return false;
    }

    const colWidths = parseTableColumnWidths(match[1]);
    if (
      colWidths == null ||
      colWidths.length !== getTableColumnsSize(previousSibling)
    ) {
      return false;
    }

    previousSibling.setColWidths(colWidths);
    $setTableColumnWidthsManuallyResized(previousSibling, true);
    parentNode.remove();
  },
  type: 'element',
};

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
          rowOutput.push(
            $convertToMarkdownString(PLAYGROUND_TRANSFORMERS, cell)
              .replace(/\n/g, '\\n')
              .trim(),
          );
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(_ => '---').join(' | ')} |`);
      }
    }

    const colWidths = node.getColWidths();
    if (
      colWidths != null &&
      colWidths.length > 0 &&
      $hasTableColumnWidthsManuallyResized(node)
    ) {
      output.push(
        `<!-- lexical-table-column-widths: ${colWidths
          .map(width => Math.round(width))
          .join(',')} -->`,
      );
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    // Header row
    if (isTableRowDivider(match[0])) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) {
        return;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) {
        return;
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
    const newColWidths = getEstimatedTableColumnWidths(rows, maxCells);

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
      previousSibling.setColWidths(
        mergeTableColumnWidths(previousSibling.getColWidths(), newColWidths),
      );
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      table.setColWidths(newColWidths);
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

function parseTableColumnWidths(textContent: string): Array<number> | null {
  const colWidths = textContent.split(',').map(width => Number(width.trim()));
  return colWidths.length > 0 &&
    colWidths.every(width => Number.isFinite(width) && width > 0)
    ? colWidths
    : null;
}

function getEstimatedTableColumnWidths(
  rows: Array<Array<TableCellNode>>,
  columnCount: number,
): Array<number> {
  return Array.from({length: columnCount}, (_, columnIndex) => {
    const maxTextLength = rows.reduce((maxLength, cells) => {
      const textContent = cells[columnIndex]?.getTextContent() || '';
      return Math.max(maxLength, textContent.length);
    }, 0);
    return Math.max(
      MARKDOWN_TABLE_MIN_COLUMN_WIDTH,
      Math.ceil(
        maxTextLength * MARKDOWN_TABLE_CHAR_WIDTH +
          MARKDOWN_TABLE_COLUMN_PADDING,
      ),
    );
  });
}

function mergeTableColumnWidths(
  prevColWidths: readonly number[] | undefined,
  nextColWidths: readonly number[],
): Array<number> {
  if (prevColWidths == null) {
    return [...nextColWidths];
  }
  return nextColWidths.map((width, columnIndex) =>
    Math.max(width, prevColWidths[columnIndex] || 0),
  );
}

const $createTableCell = (textContent: string): TableCellNode => {
  textContent = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(textContent, PLAYGROUND_TRANSFORMERS, cell);
  return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].split('|').map(text => $createTableCell(text));
};

export const PLAYGROUND_TRANSFORMERS: Array<Transformer> = [
  TABLE_COL_WIDTHS,
  TABLE,
  HR,
  IMAGE,
  EMOJI,
  EQUATION,
  TWEET,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];
