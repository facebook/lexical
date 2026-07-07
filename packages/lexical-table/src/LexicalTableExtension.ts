/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {CoreImportExtension, DOMImportExtension} from '@lexical/html';
import {
  $fullReconcile,
  configExtension,
  defineExtension,
  mergeRegister,
  safeCast,
} from 'lexical';

import {TableCellNode} from './LexicalTableCellNode';
import {
  $isScrollableTablesActive,
  $isStickyScrollbarActive,
  setScrollableTablesActive,
  setStickyScrollbarActive,
  TableNode,
} from './LexicalTableNode';
import {
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
} from './LexicalTablePluginHelpers';
import {TableRowNode} from './LexicalTableRowNode';
import {TableImportRules} from './TableImportExtension';

export interface TableConfig {
  /**
   * When `false` (default `true`), merged cell support (colspan and rowspan) will be disabled and all
   * tables will be forced into a regular grid with 1x1 table cells.
   */
  hasCellMerge: boolean;
  /**
   * When `false` (default `true`), the background color of TableCellNode will always be removed.
   */
  hasCellBackgroundColor: boolean;
  /**
   * When `true` (default `true`), the tab key can be used to navigate table cells.
   */
  hasTabHandler: boolean;
  /**
   * When `true` (default `true`), tables will be wrapped in a `<div>` to enable horizontal scrolling
   */
  hasHorizontalScroll: boolean;
  /**
   * When `true` (default `false`), a sticky scrollbar is rendered below each table that overflows horizontally.
   * Requires `hasHorizontalScroll` to be `true`.
   */
  hasStickyScrollbar: boolean;
  /**
   * When `true` (default `false`), nested tables will be allowed.
   *
   * @experimental Nested tables are not officially supported.
   */
  hasNestedTables: boolean;
}

/**
 * Configures {@link TableNode}, {@link TableRowNode}, {@link TableCellNode} and
 * registers table behaviors (see {@link TableConfig})
 */
export const TableExtension = /* @__PURE__ */ defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: /* @__PURE__ */ safeCast<TableConfig>({
    hasCellBackgroundColor: true,
    hasCellMerge: true,
    hasHorizontalScroll: true,
    hasNestedTables: false,
    hasStickyScrollbar: false,
    hasTabHandler: true,
  }),
  dependencies: [
    // DOMImportExtension support for the nodes registered here. Inert
    // unless the editor routes HTML through the pipeline (e.g. via
    // ClipboardDOMImportExtension or $generateNodesFromDOMViaExtension).
    CoreImportExtension,
    /* @__PURE__ */ configExtension(DOMImportExtension, {
      rules: TableImportRules,
    }),
  ],
  name: '@lexical/table/Table',
  nodes: () => [TableNode, TableRowNode, TableCellNode],
  register(editor, config, state) {
    const stores = state.getOutput();
    return mergeRegister(
      effect(() => {
        const hasHorizontalScroll = stores.hasHorizontalScroll.value;
        const hasStickyScrollbar =
          stores.hasStickyScrollbar.value && hasHorizontalScroll;
        const hadHorizontalScroll = $isScrollableTablesActive(editor);
        const hadStickyScrollbar = $isStickyScrollbarActive(editor);
        if (
          hadHorizontalScroll !== hasHorizontalScroll ||
          hadStickyScrollbar !== hasStickyScrollbar
        ) {
          setScrollableTablesActive(editor, hasHorizontalScroll);
          setStickyScrollbarActive(editor, hasStickyScrollbar);
          editor.update($fullReconcile);
        }
      }),
      registerTablePlugin(editor, stores),
      effect(() =>
        registerTableSelectionObserver(editor, stores.hasTabHandler.value),
      ),
      effect(() =>
        stores.hasCellMerge.value
          ? undefined
          : registerTableCellUnmergeTransform(editor),
      ),
      effect(() =>
        stores.hasCellBackgroundColor.value
          ? undefined
          : editor.registerNodeTransform(TableCellNode, node => {
              if (node.getBackgroundColor() !== null) {
                node.setBackgroundColor(null);
              }
            }),
      ),
    );
  },
});

/**
 * Bundles {@link TableImportRules} together with the runtime
 * {@link TableExtension}.
 *
 * @experimental
 * @deprecated {@link TableExtension} now registers
 * {@link TableImportRules} (and `CoreImportExtension`) itself — depend on
 * it directly instead.
 */
export const TableImportExtension = /* @__PURE__ */ defineExtension({
  dependencies: [TableExtension],
  name: '@lexical/table/Import',
});
