/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ChildSchema} from '@lexical/html';

import {
  contextValue,
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  ImportTextFormat,
  ImportTextStyle,
  sel,
} from '@lexical/html';
import {$descendantsMatching} from '@lexical/utils';
import {
  $createParagraphNode,
  $isInlineElementOrDecoratorNode,
  $isLineBreakNode,
  $isTextNode,
  configExtension,
  defineExtension,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  isHTMLTableRowElement,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';

import {PIXEL_VALUE_REG_EXP} from './constants';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderStates,
} from './LexicalTableCellNode';
import {TableExtension} from './LexicalTableExtension';
import {$createTableNode} from './LexicalTableNode';
import {$createTableRowNode, $isTableRowNode} from './LexicalTableRowNode';

function isValidVerticalAlign(
  verticalAlign?: null | string,
): verticalAlign is 'middle' | 'bottom' {
  return verticalAlign === 'middle' || verticalAlign === 'bottom';
}

/**
 * Bitmask of TextNode format bits implied by a `<th>` / `<td>`'s
 * inline styles (`font-weight: bold`, `font-style: italic`, and
 * `underline` / `line-through` in `text-decoration`).
 */
function cellTextFormatMask(style: CSSStyleDeclaration): number {
  let mask = 0;
  const fontWeight = style.fontWeight;
  if (fontWeight === '700' || fontWeight === 'bold') {
    mask |= IS_BOLD;
  }
  if (style.fontStyle === 'italic') {
    mask |= IS_ITALIC;
  }
  const decoration = (style.textDecoration || '').split(' ');
  if (decoration.includes('underline')) {
    mask |= IS_UNDERLINE;
  }
  if (decoration.includes('line-through')) {
    mask |= IS_STRIKETHROUGH;
  }
  return mask;
}

/**
 * Coalesce inline + line-break runs in a cell into paragraphs. Mirrors
 * the legacy `removeSingleLineBreakNode` cleanup so a sole `<br>` doesn't
 * survive as a paragraph's only child.
 */
function $packageCellChildren(children: LexicalNode[]): LexicalNode[] {
  const result: LexicalNode[] = [];
  let paragraph: ParagraphNode | null = null;

  const flushSingleLineBreak = () => {
    if (paragraph !== null) {
      const first = paragraph.getFirstChild();
      if ($isLineBreakNode(first) && paragraph.getChildrenSize() === 1) {
        first.remove();
      }
    }
  };

  for (const child of children) {
    if (
      $isInlineElementOrDecoratorNode(child) ||
      $isTextNode(child) ||
      $isLineBreakNode(child)
    ) {
      if (paragraph !== null) {
        paragraph.append(child);
      } else {
        paragraph = $createParagraphNode().append(child);
        result.push(paragraph);
      }
    } else {
      flushSingleLineBreak();
      result.push(child);
      paragraph = null;
    }
  }
  flushSingleLineBreak();
  if (result.length === 0) {
    result.push($createParagraphNode());
  }
  return result;
}

const TableRule = defineImportRule({
  $import: (ctx, el) => {
    const node = $createTableNode();
    if (el.hasAttribute('data-lexical-row-striping')) {
      node.setRowStriping(true);
    }
    if (el.hasAttribute('data-lexical-frozen-column')) {
      node.setFrozenColumns(1);
    }
    if (el.hasAttribute('data-lexical-frozen-row')) {
      node.setFrozenRows(1);
    }
    const colGroup = el.querySelector(':scope > colgroup');
    if (colGroup) {
      let columns: number[] | undefined = [];
      for (const col of colGroup.querySelectorAll<HTMLTableColElement>(
        ':scope > col',
      )) {
        let width = col.style.width || '';
        if (!PIXEL_VALUE_REG_EXP.test(width)) {
          width = col.getAttribute('width') || '';
          if (!/^\d+$/.test(width)) {
            columns = undefined;
            break;
          }
        }
        columns.push(parseFloat(width));
      }
      if (columns) {
        node.setColWidths(columns);
      }
    }
    return [
      node.splice(
        0,
        0,
        $descendantsMatching(ctx.$importChildren(el), $isTableRowNode),
      ),
    ];
  },
  match: sel.tag('table'),
  name: '@lexical/table/table',
});

const TableRowRule = defineImportRule({
  $import: (ctx, el) => {
    const height = PIXEL_VALUE_REG_EXP.test(el.style.height)
      ? parseFloat(el.style.height)
      : undefined;
    return [
      $createTableRowNode(height).splice(
        0,
        0,
        $descendantsMatching(ctx.$importChildren(el), $isTableCellNode),
      ),
    ];
  },
  match: sel.tag('tr'),
  name: '@lexical/table/tr',
});

const TableCellRule = defineImportRule({
  $import: (ctx, el) => {
    const isHeader = el.nodeName === 'TH';
    const width = PIXEL_VALUE_REG_EXP.test(el.style.width)
      ? parseFloat(el.style.width)
      : undefined;
    let headerState = TableCellHeaderStates.NO_STATUS;
    if (isHeader) {
      const scope = el.getAttribute('scope');
      if (scope === 'col') {
        headerState = TableCellHeaderStates.COLUMN;
      } else if (scope === 'row') {
        headerState = TableCellHeaderStates.ROW;
      } else {
        const parentRow = el.parentElement;
        const isInHeaderRow =
          isHTMLTableRowElement(parentRow) &&
          ((parentRow.parentElement &&
            parentRow.parentElement.nodeName === 'THEAD') ||
            parentRow.rowIndex === 0);
        const isFirstColumn = el.cellIndex === 0;
        if (isInHeaderRow) {
          headerState |= TableCellHeaderStates.ROW;
        }
        if (isFirstColumn) {
          headerState |= TableCellHeaderStates.COLUMN;
        }
        if (headerState === TableCellHeaderStates.NO_STATUS) {
          headerState = TableCellHeaderStates.ROW;
        }
      }
    }
    const cell = $createTableCellNode(headerState, el.colSpan, width);
    cell.__rowSpan = el.rowSpan;
    const backgroundColor = el.style.backgroundColor;
    if (backgroundColor !== '') {
      cell.__backgroundColor = backgroundColor;
    }
    const verticalAlign = el.style.verticalAlign;
    if (isValidVerticalAlign(verticalAlign)) {
      cell.__verticalAlign = verticalAlign;
    }
    // Propagate the cell's bold/italic/underline/strikethrough as
    // format bits, and the cell's `color` as a parsed-style record.
    // The core `#text` rule reads both at construction time and
    // applies them to each TextNode — no post-walk needed.
    const inheritedFormat = ctx.get(ImportTextFormat);
    const cellFormat = inheritedFormat | cellTextFormatMask(el.style);
    const inheritedStyle = ctx.get(ImportTextStyle);
    const color = el.style.color;
    const cellStyle: Readonly<Record<string, string>> = color
      ? {...inheritedStyle, color}
      : inheritedStyle;
    const branchContext = [];
    if (cellFormat !== inheritedFormat) {
      branchContext.push(contextValue(ImportTextFormat, cellFormat));
    }
    if (cellStyle !== inheritedStyle) {
      branchContext.push(contextValue(ImportTextStyle, cellStyle));
    }
    const rawChildren =
      branchContext.length === 0
        ? ctx.$importChildren(el)
        : ctx.$importChildren(el, {context: branchContext});
    return [cell.splice(0, 0, $packageCellChildren(rawChildren))];
  },
  match: sel.tag('td', 'th'),
  name: '@lexical/table/cell',
});

/**
 * A {@link ChildSchema} that enforces TableNode invariants: only
 * `TableRowNode` children are accepted; orphan `TableCellNode` runs are
 * wrapped in a synthesized row.
 *
 * @experimental
 */
export const TableSchema: ChildSchema = {
  $accepts: $isTableRowNode,
  $packageRun: run =>
    run.every($isTableCellNode)
      ? [$createTableRowNode().splice(0, 0, run)]
      : [],
  name: 'TableSchema',
};

/**
 * A {@link ChildSchema} that enforces TableRowNode invariants: only
 * `TableCellNode` children are accepted; non-cell children are dropped
 * (the legacy converter does the same via `$descendantsMatching`).
 *
 * @experimental
 */
export const TableRowSchema: ChildSchema = {
  $accepts: $isTableCellNode,
  name: 'TableRowSchema',
};

/**
 * Import rules for {@link TableNode}, {@link TableRowNode}, and
 * {@link TableCellNode}.
 *
 * @experimental
 */
export const TableImportRules = [TableRule, TableRowRule, TableCellRule];

/**
 * Bundles {@link TableImportRules} (plus {@link CoreImportExtension})
 * into a single dependency.
 *
 * @experimental
 */
export const TableImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    // Registers TableNode, TableRowNode, TableCellNode so the rules can
    // safely $create them.
    TableExtension,
    configExtension(DOMImportExtension, {rules: TableImportRules}),
  ],
  name: '@lexical/table/Import',
});
