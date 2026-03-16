/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isTableNode, TableNode} from '@lexical/table';
import {$dfs, $findMatchingParent} from '@lexical/utils';
import {$getNodeByKey, $isRootOrShadowRoot, LexicalEditor} from 'lexical';
import {useEffect} from 'react';

const PIXEL_VALUE_REG_EXP = /^(\d+(?:\.\d+)?)px$/;

function calculateHorizontalInsets(
  dom: HTMLElement,
  editorWindow: Window,
): number {
  const computedStyle = editorWindow.getComputedStyle(dom);
  const paddingLeft = computedStyle.getPropertyValue('padding-left') || '0px';
  const paddingRight = computedStyle.getPropertyValue('padding-right') || '0px';
  const borderLeftWidth =
    computedStyle.getPropertyValue('border-left-width') || '0px';
  const borderRightWidth =
    computedStyle.getPropertyValue('border-right-width') || '0px';

  if (
    !PIXEL_VALUE_REG_EXP.test(paddingLeft) ||
    !PIXEL_VALUE_REG_EXP.test(paddingRight) ||
    !PIXEL_VALUE_REG_EXP.test(borderLeftWidth) ||
    !PIXEL_VALUE_REG_EXP.test(borderRightWidth)
  ) {
    return 0;
  }
  const paddingLeftPx = parseFloat(paddingLeft);
  const paddingRightPx = parseFloat(paddingRight);
  const borderLeftWidthPx = parseFloat(borderLeftWidth);
  const borderRightWidthPx = parseFloat(borderRightWidth);

  return (
    paddingLeftPx + paddingRightPx + borderLeftWidthPx + borderRightWidthPx
  );
}

function getTotalTableWidth(colWidths: readonly number[]): number {
  return colWidths.reduce((curWidth, width) => curWidth + width, 0);
}

function $calculateResizeRootTables(
  tables: ReadonlySet<TableNode>,
): ReadonlyArray<TableNode> {
  const inputTables: ReadonlySet<LexicalNode> = tables;
  const roots: TableNode[] = [];
  for (const table of tables) {
    if (
      $findMatchingParent(table, (n) => n !== table && inputTables.has(n)) ===
      null
    ) {
      roots.push(table);
    }
  }
  return roots;
}

function $resizeDOMColWidthsToFit(
  editor: LexicalEditor,
  node: TableNode,
): void {
  const editorWindow = editor._window;
  if (!editorWindow) {
    return;
  }
  const allNestedTables = $dfs(node)
    .map((n) => n.node)
    .filter($isTableNode);
  for (const table of allNestedTables) {
    const element = editor.getElementByKey(table.getKey());
    if (!element) {
      continue;
    }
    const tableParent = table.getParent();
    if (!tableParent) {
      continue;
    }
    const parentShadowRoot = $findMatchingParent(
      tableParent,
      $isRootOrShadowRoot,
    );
    const fitContainer = parentShadowRoot
      ? editor.getElementByKey(parentShadowRoot.getKey())
      : editor.getRootElement();
    if (!fitContainer) {
      continue;
    }

    const oldColWidths = table.getColWidths();
    if (!oldColWidths) {
      continue;
    }

    const availableWidth = fitContainer.getBoundingClientRect().width;
    const horizontalInsets = calculateHorizontalInsets(
      fitContainer,
      editorWindow,
    );
    const usableWidth = availableWidth - horizontalInsets;
    const tableWidth = getTotalTableWidth(oldColWidths);

    const proportionalWidth = Math.min(1, usableWidth / tableWidth);

    table.scaleDOMColWidths(element, proportionalWidth);
  }
}

/**
 * When mounted, listens for table mutations and resizes nested tables so they
 * fit the width of their container (nearest root or shadow root). Only affects
 * DOM column widths; underlying column widths are not modified.
 */
export default function TableFitNestedTablePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerMutationListener(TableNode, (nodeMutations) => {
      editor.getEditorState().read(() => {
        const modifiedTables = new Set<TableNode>();
        for (const [nodeKey, mutation] of nodeMutations) {
          if (mutation === 'created' || mutation === 'updated') {
            const tableNode = $getNodeByKey<TableNode>(nodeKey);
            if (tableNode) {
              modifiedTables.add(tableNode);
            }
          }
        }
        const resizeRoots = $calculateResizeRootTables(modifiedTables);
        resizeRoots.forEach((root) => {
          $resizeDOMColWidthsToFit(editor, root);
        });
      });
    });
  }, [editor]);

  return null;
}
