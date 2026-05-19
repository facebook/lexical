/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ChildSchema} from '@lexical/html';

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
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
  isHTMLElement,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';

import {PIXEL_VALUE_REG_EXP} from './constants';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderStates,
} from './LexicalTableCellNode';
import {$createTableNode} from './LexicalTableNode';
import {$createTableRowNode, $isTableRowNode} from './LexicalTableRowNode';

function isValidVerticalAlign(
  verticalAlign?: null | string,
): verticalAlign is 'middle' | 'bottom' {
  return verticalAlign === 'middle' || verticalAlign === 'bottom';
}

/**
 * Read the inline-style format bits on a `<th>` / `<td>` and apply them
 * to TextNode descendants. Mirrors the legacy `$convertTableCellNodeElement`
 * post-processing — but expressed as a per-child mutation on the imported
 * lexical nodes rather than a forChild hook.
 */
function applyCellStyleToTextDescendants(
  cellStyle: CSSStyleDeclaration,
  children: LexicalNode[],
): void {
  const textDecoration = ((cellStyle && cellStyle.textDecoration) || '').split(
    ' ',
  );
  const hasBold =
    cellStyle.fontWeight === '700' || cellStyle.fontWeight === 'bold';
  const hasLineThrough = textDecoration.includes('line-through');
  const hasItalic = cellStyle.fontStyle === 'italic';
  const hasUnderline = textDecoration.includes('underline');
  const color = cellStyle.color;

  const apply = (node: LexicalNode): void => {
    if ($isTextNode(node)) {
      if (hasBold) {
        node.toggleFormat('bold');
      }
      if (hasLineThrough) {
        node.toggleFormat('strikethrough');
      }
      if (hasItalic) {
        node.toggleFormat('italic');
      }
      if (hasUnderline) {
        node.toggleFormat('underline');
      }
      if (color) {
        const existingStyle = node.getStyle();
        if (!existingStyle.includes('color:')) {
          node.setStyle(existingStyle + `color: ${color};`);
        }
      }
    } else if (
      'getChildren' in node &&
      typeof node.getChildren === 'function'
    ) {
      const inner = (
        node as unknown as {getChildren(): LexicalNode[]}
      ).getChildren();
      for (const c of inner) {
        apply(c);
      }
    }
  };
  for (const child of children) {
    apply(child);
  }
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
        paragraph = $createParagraphNode();
        paragraph.append(child);
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
      for (const col of colGroup.querySelectorAll(':scope > col')) {
        let width = (col as HTMLElement).style.width || '';
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
    const children = ctx.$importChildren(el);
    node.append(...$descendantsMatching(children, $isTableRowNode));
    return [node];
  },
  match: sel.tag('table'),
  name: '@lexical/table/table',
});

const TableRowRule = defineImportRule({
  $import: (ctx, el) => {
    let height: number | undefined = undefined;
    if (PIXEL_VALUE_REG_EXP.test(el.style.height)) {
      height = parseFloat(el.style.height);
    }
    const node = $createTableRowNode(height);
    const children = ctx.$importChildren(el);
    node.append(...$descendantsMatching(children, $isTableCellNode));
    return [node];
  },
  match: sel.tag('tr'),
  name: '@lexical/table/tr',
});

const TableCellRule = defineImportRule({
  $import: (ctx, el) => {
    const isHeader = el.nodeName === 'TH';
    let width: number | undefined;
    if (PIXEL_VALUE_REG_EXP.test(el.style.width)) {
      width = parseFloat(el.style.width);
    }
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
          isHTMLElement(parentRow) &&
          parentRow.nodeName === 'TR' &&
          isHTMLElement(parentRow.parentElement) &&
          (parentRow.parentElement.nodeName === 'THEAD' ||
            (parentRow as HTMLTableRowElement).rowIndex === 0);
        const isFirstColumn = (el as HTMLTableCellElement).cellIndex === 0;
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
    const cell = $createTableCellNode(
      headerState,
      (el as HTMLTableCellElement).colSpan,
      width,
    );
    cell.__rowSpan = (el as HTMLTableCellElement).rowSpan;
    const backgroundColor = el.style.backgroundColor;
    if (backgroundColor !== '') {
      cell.__backgroundColor = backgroundColor;
    }
    const verticalAlign = el.style.verticalAlign;
    if (isValidVerticalAlign(verticalAlign)) {
      cell.__verticalAlign = verticalAlign;
    }
    const rawChildren = ctx.$importChildren(el);
    applyCellStyleToTextDescendants(el.style, rawChildren);
    const packaged = $packageCellChildren(rawChildren);
    cell.append(...packaged);
    return [cell];
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
  accepts: child => $isTableRowNode(child),
  name: 'TableSchema',
  packageRun(run) {
    if (run.every($isTableCellNode)) {
      const row = $createTableRowNode();
      row.append(...run);
      return [row];
    }
    return [];
  },
};

/**
 * A {@link ChildSchema} that enforces TableRowNode invariants: only
 * `TableCellNode` children are accepted; non-cell children are dropped
 * (the legacy converter does the same via `$descendantsMatching`).
 *
 * @experimental
 */
export const TableRowSchema: ChildSchema = {
  accepts: child => $isTableCellNode(child),
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
    configExtension(DOMImportExtension, {rules: TableImportRules}),
  ],
  name: '@lexical/table/Import',
});
