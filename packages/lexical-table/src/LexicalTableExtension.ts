/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {mergeRegister} from '@lexical/utils';
import {defineExtension, safeCast} from 'lexical';

import {TableCellNode} from './LexicalTableCellNode';
import {
  $isScrollableTablesActive,
  setScrollableTablesActive,
  TableNode,
} from './LexicalTableNode';
import {
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
} from './LexicalTablePluginHelpers';
import {TableRowNode} from './LexicalTableRowNode';

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
}

/**
 * Configures {@link TableNode}, {@link TableRowNode}, {@link TableCellNode} and
 * registers table behaviors (see {@link TableConfig})
 */
export const TableExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: safeCast<TableConfig>({
    hasCellBackgroundColor: true,
    hasCellMerge: true,
    hasHorizontalScroll: true,
    hasTabHandler: true,
  }),
  name: '@lexical/table/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
  register(editor, config, state) {
    const stores = state.getOutput();
    return mergeRegister(
      effect(() => {
        const hasHorizontalScroll = stores.hasHorizontalScroll.value;
        const hadHorizontalScroll = $isScrollableTablesActive(editor);
        if (hadHorizontalScroll !== hasHorizontalScroll) {
          setScrollableTablesActive(editor, hasHorizontalScroll);
          // Registering the transform has the side-effect of marking all existing
          // TableNodes as dirty. The handler is immediately unregistered.
          editor.registerNodeTransform(TableNode, () => {})();
        }
      }),
      registerTablePlugin(editor),
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
          : editor.registerNodeTransform(TableCellNode, (node) => {
              if (node.getBackgroundColor() !== null) {
                node.setBackgroundColor(null);
              }
            }),
      ),
    );
  },
});
